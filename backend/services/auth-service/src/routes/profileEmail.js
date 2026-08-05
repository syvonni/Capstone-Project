const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const EmailChangeRequest = require("../models/EmailChangeRequest");
const ChangeEmailOtpRequest = require("../models/ChangeEmailOtpRequest");
const respond = require("../middleware/respond");
const { requireJwt } = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const { generateCode } = require("../lib/codes");
const { sendOtp } = require("../lib/mailer");
const { changeEmailRequests } = require("../lib/authRequestsStore");
const { sanitizeEmail } = require("../lib/sanitizer");
const { logAuditEvent } = require("../lib/auditClient");
const { sendEmailChangeNotification } = require("../lib/notificationService");
const inAppNotificationService = require("../services/notificationService");
const { isBusinessOwnerRole, isAdminRole } = require("../lib/roleHelpers");
const {
  profileUpdateRateLimit,
  adminApprovalRateLimit,
} = require("../middleware/rateLimit");
const {
  requireFieldPermission,
  requireVerification,
} = require("../middleware/fieldPermissions");
const {
  verifyCode,
  checkVerificationStatus,
  clearVerificationRequest,
} = require("../lib/verificationService");
const AdminApproval = require("../models/AdminApproval");
const webauthnServer = require("@simplewebauthn/server");
const webauthnRouter = require("./webauthn");
const authenticationChallenges =
  webauthnRouter.authenticationChallenges || new Map();
const { consumeEmailChangeVerified } = require("../lib/mfaStepUpVerify");

const router = express.Router();

const changeEmailAuthenticatedSchema = Joi.object({
  password: Joi.string().min(6).max(200).required(),
  newEmail: Joi.string().email().required(),
});

const changeEmailStartSchema = Joi.object({
  newEmail: Joi.string().email().required(),
});

const changeEmailVerifySchema = Joi.object({
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
  currentEmail: Joi.string().email().optional(),
  email: Joi.string().email().optional(),
});

async function requireJwtOptional(req, res, next) {
  const auth = String(req.headers["authorization"] || "");
  const hasBearerToken = /^Bearer\s+.+$/i.test(auth);
  if (!hasBearerToken) return next();
  return requireJwt(req, res, next);
}

const changeEmailConfirmStartSchema = Joi.object({
  email: Joi.string().email().optional(),
});

const changeEmailConfirmVerifySchema = Joi.object({
  code: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[0-9]{6}$/),
      Joi.string().valid("PASSKEY_BYPASS"),
    )
    .required(),
});

// POST /api/auth/change-email/confirm/passkey/start
// Step-up start for passkey-only users before allowing email confirm bypass
router.post(
  "/change-email/confirm/passkey/start",
  requireJwt,
  async (req, res) => {
    try {
      const userId = req._userId;
      const user = await User.findById(userId);
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");

      const hasPasskeys =
        Array.isArray(user.webauthnCredentials) &&
        user.webauthnCredentials.length > 0;
      if (!hasPasskeys)
        return respond.error(res, 400, "no_passkeys", "No passkeys registered");

      const allowCredentials = (user.webauthnCredentials || [])
        .map((c) => {
          const credId = String(c.credId || "").trim();
          if (!credId) return null;
          return {
            id: credId,
            type: "public-key",
            transports: c.transports || [],
          };
        })
        .filter(Boolean);

      const rpID = process.env.WEBAUTHN_RPID || "localhost";
      const options = await webauthnServer.generateAuthenticationOptions({
        rpID,
        timeout: 60000,
        allowCredentials:
          allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: "preferred",
      });

      let challengeToStore = options.challenge;
      if (Buffer.isBuffer(challengeToStore))
        challengeToStore = challengeToStore.toString("base64url");
      else if (challengeToStore instanceof Uint8Array)
        challengeToStore = Buffer.from(challengeToStore).toString("base64url");
      else if (typeof challengeToStore !== "string")
        challengeToStore = Buffer.from(challengeToStore).toString("base64url");

      authenticationChallenges.set(
        "email_change_" + String(userId),
        challengeToStore,
      );
      return res.json({ publicKey: options });
    } catch (err) {
      console.error(
        "POST /api/auth/change-email/confirm/passkey/start error:",
        err,
      );
      return respond.error(
        res,
        500,
        "passkey_start_failed",
        "Failed to start passkey verification",
      );
    }
  },
);

const updateEmailSchema = Joi.object({
  newEmail: Joi.string().email().required(),
  verificationCode: Joi.string().optional(),
  mfaCode: Joi.string().optional(),
});

const updateAdminEmailSchema = Joi.object({
  newEmail: Joi.string().email().required(),
  verificationCode: Joi.string().optional(),
  mfaCode: Joi.string().optional(),
});

// POST /api/auth/change-email-authenticated
// Change email for a logged-in user by verifying current password.
router.post(
  "/change-email-authenticated",
  requireJwt,
  validateBody(changeEmailAuthenticatedSchema),
  async (req, res) => {
    try {
      const { password, newEmail } = req.body || {};

      // Use userId from JWT token (already validated by requireJwt middleware)
      const userId = req._userId;
      if (!userId)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      let doc = null;
      try {
        doc = await User.findById(userId);
      } catch (_) {
        doc = null;
      }
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const ok = await bcrypt.compare(password, doc.passwordHash);
      if (!ok)
        return respond.error(res, 401, "invalid_password", "Invalid password");

      const normalized = String(newEmail || "")
        .trim()
        .toLowerCase();
      if (!normalized)
        return respond.error(res, 400, "invalid_email", "Invalid email");
      if (normalized === String(doc.email || "").toLowerCase()) {
        return respond.error(
          res,
          400,
          "same_email",
          "New email must be different from current",
        );
      }
      const exists = await User.findOne({ email: normalized }).lean();
      if (exists)
        return respond.error(res, 409, "email_in_use", "Email already in use");

      doc.email = normalized;
      doc.mfaEnabled = false;
      doc.mfaSecret = "";
      doc.fprintEnabled = false;
      doc.mfaMethod = "";
      doc.mfaDisablePending = false;
      doc.mfaDisableRequestedAt = null;
      doc.mfaDisableScheduledFor = null;
      doc.tokenFprint = "";
      await doc.save();

      return res.json({
        message: "Email updated successfully",
        email: doc.email,
      });
    } catch (err) {
      console.error("POST /api/auth/change-email-authenticated error:", err);
      return respond.error(
        res,
        500,
        "change_email_failed",
        "Failed to change email",
      );
    }
  },
);

// POST /api/auth/change-email/start
// Step 1: send OTP to the new email to confirm change
router.post(
  "/change-email/start",
  requireJwt,
  validateBody(changeEmailStartSchema),
  async (req, res) => {
    try {
      // Use userId from JWT token (already validated by requireJwt middleware)
      const userId = req._userId;
      if (!userId)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      let doc = null;
      try {
        doc = await User.findById(userId);
      } catch (_) {
        doc = null;
      }
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const currentEmail = String(doc.email || "").toLowerCase();
      const input = String(req.body.newEmail || "")
        .trim()
        .toLowerCase();
      if (!input)
        return respond.error(res, 400, "invalid_email", "Invalid email");
      if (input === currentEmail)
        return respond.error(
          res,
          400,
          "same_email",
          "New email must be different from current",
        );

      const exists = await User.findOne({ email: input }).lean();
      if (exists)
        return respond.error(res, 409, "email_in_use", "Email already in use");

      const code = generateCode();
      const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
      const expiresAtMs = Date.now() + ttlMin * 60 * 1000;
      const key = currentEmail;
      changeEmailRequests.set(key, {
        code,
        expiresAt: expiresAtMs,
        newEmail: input,
      });

      // Persist to DB so the flow survives server restarts
      await ChangeEmailOtpRequest.deleteMany({ userId: doc._id });
      await ChangeEmailOtpRequest.create({
        userId: doc._id,
        currentEmail: key,
        newEmail: input,
        code,
        expiresAt: new Date(expiresAtMs),
      });

      await sendOtp({
        to: input,
        code,
        subject: "Confirm email change",
        purpose: "email_change",
      });
      return res.json({
        sent: true,
        to: input,
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    } catch (err) {
      console.error("POST /api/auth/change-email/start error:", err);
      return respond.error(
        res,
        500,
        "change_email_start_failed",
        "Failed to send verification code",
      );
    }
  },
);

// POST /api/auth/change-email/verify
// Step 2: verify OTP and update user's email
router.post(
  "/change-email/verify",
  requireJwtOptional,
  validateBody(changeEmailVerifySchema),
  async (req, res) => {
    try {
      const requestedCurrentEmail = String(req.body?.currentEmail || "")
        .trim()
        .toLowerCase();
      const requestedNewEmail = String(req.body?.email || "")
        .trim()
        .toLowerCase();

      let doc = null;
      if (req._userId) {
        try {
          doc = await User.findById(req._userId);
        } catch (_) {
          doc = null;
        }
      }

      let key = String(doc?.email || "").toLowerCase();
      if (!key && requestedCurrentEmail) key = requestedCurrentEmail;

      let reqObj = key ? changeEmailRequests.get(key) : null;
      let persisted = null;
      if (!reqObj) {
        if (doc?._id) {
          persisted = await ChangeEmailOtpRequest.findOne({
            userId: doc._id,
          }).lean();
        } else if (requestedCurrentEmail) {
          const query = { currentEmail: requestedCurrentEmail };
          if (requestedNewEmail) query.newEmail = requestedNewEmail;
          persisted = await ChangeEmailOtpRequest.findOne(query).lean();
        }
        if (persisted && new Date(persisted.expiresAt).getTime() > Date.now()) {
          reqObj = {
            code: persisted.code,
            expiresAt: new Date(persisted.expiresAt).getTime(),
            newEmail: persisted.newEmail,
          };
          if (!key) key = String(persisted.currentEmail || "").toLowerCase();
          if (!doc && persisted.userId) {
            try {
              doc = await User.findById(persisted.userId);
            } catch (_) {
              doc = null;
            }
          }
        }
      }
      if (!doc && key) {
        doc = await User.findOne({ email: key });
      }
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );
      if (!reqObj)
        return respond.error(
          res,
          404,
          "change_email_request_not_found",
          "No change email request found. Please start the process again from the first step.",
        );
      if (Date.now() > reqObj.expiresAt) {
        changeEmailRequests.delete(key);
        await ChangeEmailOtpRequest.deleteMany({ userId: doc._id });
        return respond.error(
          res,
          410,
          "code_expired",
          "Verification code expired. Please request a new code.",
        );
      }

      const { code } = req.body || {};
      if (String(reqObj.code) !== String(code))
        return respond.error(res, 401, "invalid_code", "Invalid code");

      const nextEmail = String(reqObj.newEmail || "").toLowerCase();
      if (!nextEmail)
        return respond.error(res, 400, "invalid_email", "Invalid email");
      const exists = await User.findOne({ email: nextEmail }).lean();
      if (exists) {
        changeEmailRequests.delete(key);
        await ChangeEmailOtpRequest.deleteMany({ userId: doc._id });
        return respond.error(res, 409, "email_in_use", "Email already in use");
      }

      doc.email = nextEmail;
      doc.mfaEnabled = false;
      doc.mfaSecret = "";
      doc.fprintEnabled = false;
      doc.mfaMethod = "";
      doc.mfaDisablePending = false;
      doc.mfaDisableRequestedAt = null;
      doc.mfaDisableScheduledFor = null;
      doc.tokenFprint = "";
      await doc.save();
      changeEmailRequests.delete(key);
      await ChangeEmailOtpRequest.deleteMany({ userId: doc._id });
      return res.json({ updated: true, email: doc.email });
    } catch (err) {
      console.error("POST /api/auth/change-email/verify error:", err);
      return respond.error(
        res,
        500,
        "change_email_verify_failed",
        "Failed to verify change email",
      );
    }
  },
);

// POST /api/auth/change-email/confirm/start
router.post(
  "/change-email/confirm/start",
  requireJwt,
  validateBody(changeEmailConfirmStartSchema),
  async (req, res) => {
    try {
      const idHeader = req.headers["x-user-id"];
      const emailHeader = req._userEmail || req.headers["x-user-email"];
      let doc = null;
      if (idHeader) {
        try {
          doc = await User.findById(idHeader);
        } catch (_) {
          doc = null;
        }
      }
      if (!doc && emailHeader) {
        doc = await User.findOne({ email: emailHeader });
      }
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const mfaMethod = String(doc.mfaMethod || "").toLowerCase();
      const hasTotpSecret = !!doc.mfaSecret;
      const isAuthenticatorMethod =
        mfaMethod.includes("authenticator") ||
        mfaMethod.includes("fingerprint");
      const totpEnabled =
        hasTotpSecret && (doc.mfaEnabled === true || isAuthenticatorMethod);
      const hasPasskeys =
        Array.isArray(doc.webauthnCredentials) &&
        doc.webauthnCredentials.length > 0;

      if (!totpEnabled && hasPasskeys) {
        return res.json({
          sent: false,
          passkeyBypass: true,
          method: "passkey",
        });
      }

      const currentEmail = String(doc.email || "").toLowerCase();
      const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
      const expiresAtMs = Date.now() + ttlMin * 60 * 1000;
      const code = generateCode();
      changeEmailRequests.set(currentEmail, {
        code,
        expiresAt: expiresAtMs,
        newEmail: "",
      });
      await sendOtp({
        to: currentEmail,
        code,
        subject: "Confirm your email",
        purpose: "email_change",
      });
      return res.json({
        sent: true,
        to: currentEmail,
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    } catch (err) {
      console.error("POST /api/auth/change-email/confirm/start error:", err);
      return respond.error(
        res,
        500,
        "change_email_confirm_start_failed",
        "Failed to send verification code",
      );
    }
  },
);

// POST /api/auth/change-email/confirm/verify
router.post(
  "/change-email/confirm/verify",
  requireJwt,
  validateBody(changeEmailConfirmVerifySchema),
  async (req, res) => {
    try {
      const idHeader = req.headers["x-user-id"];
      const emailHeader = req._userEmail || req.headers["x-user-email"];
      let doc = null;
      if (idHeader) {
        try {
          doc = await User.findById(idHeader);
        } catch (_) {
          doc = null;
        }
      }
      if (!doc && emailHeader) {
        doc = await User.findOne({ email: emailHeader });
      }
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );
      const key = String(doc.email || "").toLowerCase();
      const reqObj = changeEmailRequests.get(key);
      const { code } = req.body || {};
      if (code === "PASSKEY_BYPASS") {
        if (!consumeEmailChangeVerified(doc._id)) {
          return respond.error(
            res,
            403,
            "verification_required",
            "Verify with your passkey first",
          );
        }
        return res.json({ verified: true });
      }

      if (!reqObj)
        return respond.error(
          res,
          404,
          "change_email_confirm_not_found",
          "No confirmation request found",
        );
      if (Date.now() > reqObj.expiresAt)
        return respond.error(res, 410, "code_expired", "Code expired");
      if (String(reqObj.code) !== String(code))
        return respond.error(res, 401, "invalid_code", "Invalid code");
      changeEmailRequests.delete(key);
      return res.json({ verified: true });
    } catch (err) {
      console.error("POST /api/auth/change-email/confirm/verify error:", err);
      return respond.error(
        res,
        500,
        "change_email_confirm_verify_failed",
        "Failed to verify email",
      );
    }
  },
);

// PATCH /api/auth/profile/email
// Update email (requires verification) - Business Owner
router.patch(
  "/profile/email",
  requireJwt,
  profileUpdateRateLimit(),
  validateBody(updateEmailSchema),
  requireFieldPermission("email"),
  requireVerification(),
  async (req, res) => {
    try {
      const { newEmail } = req.body || {};
      const doc = await User.findById(req._userId).populate("role");
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
      if (!isBusinessOwnerRole(roleSlug)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "This endpoint is only available for business owners",
        );
      }

      const sanitizedEmail = sanitizeEmail(newEmail);

      // Check if email already exists
      const existing = await User.findOne({ email: sanitizedEmail });
      if (existing && String(existing._id) !== String(doc._id)) {
        return respond.error(res, 409, "email_exists", "Email already exists");
      }

      const oldEmail = doc.email;

      // Check if there's a pending email change request
      const pendingRequest = await EmailChangeRequest.findOne({
        userId: doc._id,
        reverted: false,
        applied: false,
        expiresAt: { $gt: new Date() },
      });

      if (pendingRequest) {
        return respond.error(
          res,
          400,
          "email_change_pending",
          "You have a pending email change request. Please wait for it to be applied or revert it first.",
          { expiresAt: pendingRequest.expiresAt },
        );
      }

      // Create email change request (grace period)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const appUrl =
        process.env.FRONTEND_URL ||
        process.env.APP_URL ||
        "http://localhost:5173";
      const revertUrl = `${appUrl}/profile/email/revert`;

      const emailChangeRequest = await EmailChangeRequest.create({
        userId: doc._id,
        oldEmail,
        newEmail: sanitizedEmail,
        requestedAt: new Date(),
        expiresAt,
        reverted: false,
        applied: false,
      });

      // Update email immediately (but allow revert within grace period)
      doc.email = sanitizedEmail;
      doc.isEmailVerified = false; // Require re-verification
      doc.mfaReEnrollmentRequired = true; // Require MFA re-enrollment
      doc.mfaEnabled = false;
      doc.mfaSecret = "";
      doc.mfaMethod = "";
      await doc.save();

      // Clear verification request
      clearVerificationRequest(doc._id, "email_change");

      // Send notifications to both old and new email (non-blocking)
      sendEmailChangeNotification(doc._id, oldEmail, sanitizedEmail, {
        gracePeriodHours: 24,
        revertUrl,
      }).catch((err) => {
        console.error("Failed to send email change notifications:", err);
      });

      inAppNotificationService
        .createNotification(
          doc._id,
          "auth_email_changed",
          "Email changed",
          "Your email has been updated and verified.",
        )
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );

      // Create audit log
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      await logAuditEvent("email_change", doc._id, "User", doc._id, {
        role: roleSlug,
        fieldChanged: "email",
        oldValue: oldEmail,
        newValue: sanitizedEmail,
        ip,
        userAgent,
        mfaReEnrollmentRequired: true,
        emailChangeRequestId: String(emailChangeRequest._id),
        expiresAt,
      });

      // Get email change request info
      const emailChangeRequestInfo = await EmailChangeRequest.findOne({
        userId: doc._id,
        reverted: false,
        applied: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      const userSafe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
        isEmailVerified: doc.isEmailVerified,
        mfaReEnrollmentRequired: doc.mfaReEnrollmentRequired,
        emailChangeRequest: emailChangeRequestInfo
          ? {
              id: String(emailChangeRequestInfo._id),
              oldEmail: emailChangeRequestInfo.oldEmail,
              newEmail: emailChangeRequestInfo.newEmail,
              expiresAt: emailChangeRequestInfo.expiresAt,
              canRevert: emailChangeRequestInfo.isWithinGracePeriod(),
            }
          : null,
      };

      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error("PATCH /api/auth/profile/email error:", err);
      return respond.error(
        res,
        500,
        "email_update_failed",
        "Failed to update email",
      );
    }
  },
);

// POST /api/auth/profile/email/revert
// Revert email change within grace period
router.post("/profile/email/revert", requireJwt, async (req, res) => {
  try {
    const doc = await User.findById(req._userId).populate("role");
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
    if (!isBusinessOwnerRole(roleSlug)) {
      return respond.error(
        res,
        403,
        "forbidden",
        "This endpoint is only available for business owners",
      );
    }

    // Find active email change request
    const emailChangeRequest = await EmailChangeRequest.findOne({
      userId: doc._id,
      reverted: false,
      applied: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!emailChangeRequest) {
      return respond.error(
        res,
        404,
        "no_pending_change",
        "No pending email change request found or grace period has expired",
      );
    }

    if (!emailChangeRequest.isWithinGracePeriod()) {
      return respond.error(
        res,
        400,
        "grace_period_expired",
        "Grace period has expired. Email change cannot be reverted.",
      );
    }

    // Revert email
    const revertedEmail = emailChangeRequest.oldEmail;
    doc.email = revertedEmail;
    doc.isEmailVerified = true; // Keep verification status since reverting to old email
    await doc.save();

    // Mark request as reverted
    emailChangeRequest.reverted = true;
    emailChangeRequest.revertedAt = new Date();
    await emailChangeRequest.save();

    // Send notification (non-blocking)
    sendEmailChangeNotification(
      doc._id,
      emailChangeRequest.newEmail,
      revertedEmail,
      {
        gracePeriodHours: 0,
        type: "old_email",
      },
    ).catch((err) => {
      console.error("Failed to send revert notification:", err);
    });

    inAppNotificationService
      .createNotification(
        doc._id,
        "auth_email_reverted",
        "Email change reverted",
        "Your email has been reverted successfully.",
      )
      .catch((err) =>
        console.error("Failed to create auth notification:", err),
      );

    // Create audit log
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await logAuditEvent("email_change_reverted", doc._id, "User", doc._id, {
      role: roleSlug,
      fieldChanged: "email",
      oldValue: emailChangeRequest.newEmail,
      newValue: revertedEmail,
      ip,
      userAgent,
      emailChangeRequestId: String(emailChangeRequest._id),
    });

    return res.json({
      success: true,
      message: "Email change reverted successfully",
      user: {
        id: String(doc._id),
        email: doc.email,
      },
    });
  } catch (err) {
    console.error("POST /api/auth/profile/email/revert error:", err);
    return respond.error(
      res,
      500,
      "revert_failed",
      "Failed to revert email change",
    );
  }
});

// GET /api/auth/profile/email/change-status
// Get email change request status
router.get("/profile/email/change-status", requireJwt, async (req, res) => {
  try {
    const doc = await User.findById(req._userId).populate("role");
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
    if (!isBusinessOwnerRole(roleSlug)) {
      return respond.error(
        res,
        403,
        "forbidden",
        "This endpoint is only available for business owners",
      );
    }

    const emailChangeRequest = await EmailChangeRequest.findOne({
      userId: doc._id,
      reverted: false,
      applied: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!emailChangeRequest) {
      return res.json({
        hasPendingChange: false,
      });
    }

    return res.json({
      hasPendingChange: true,
      emailChangeRequest: {
        id: String(emailChangeRequest._id),
        oldEmail: emailChangeRequest.oldEmail,
        newEmail: emailChangeRequest.newEmail,
        requestedAt: emailChangeRequest.requestedAt,
        expiresAt: emailChangeRequest.expiresAt,
        canRevert: emailChangeRequest.isWithinGracePeriod(),
        remainingHours: Math.ceil(
          (emailChangeRequest.expiresAt.getTime() - Date.now()) /
            (60 * 60 * 1000),
        ),
      },
    });
  } catch (err) {
    console.error("GET /api/auth/profile/email/change-status error:", err);
    return respond.error(
      res,
      500,
      "status_check_failed",
      "Failed to check email change status",
    );
  }
});

// PATCH /api/auth/profile/email (Admin only - requires OTP/MFA + 2 admin approvals)
// Change email for admin
router.patch(
  "/profile/email",
  requireJwt,
  adminApprovalRateLimit(),
  validateBody(updateAdminEmailSchema),
  async (req, res) => {
    try {
      const { newEmail, verificationCode, mfaCode } = req.body || {};
      const doc = await User.findById(req._userId).populate("role");
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
      if (!isAdminRole(roleSlug)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "This endpoint is only available for admins",
        );
      }

      // Check verification first
      const purpose = "email_change";
      if (verificationCode) {
        const verifyResult = await verifyCode(
          doc._id,
          verificationCode,
          "otp",
          purpose,
        );
        if (!verifyResult.verified) {
          return respond.error(
            res,
            401,
            "verification_failed",
            verifyResult.error || "Invalid verification code",
          );
        }
      } else if (mfaCode) {
        const verifyResult = await verifyCode(doc._id, mfaCode, "mfa", purpose);
        if (!verifyResult.verified) {
          return respond.error(
            res,
            401,
            "verification_failed",
            verifyResult.error || "Invalid MFA code",
          );
        }
      } else {
        const status = await checkVerificationStatus(doc._id, purpose);
        if (!status.pending) {
          return respond.error(
            res,
            428,
            "verification_required",
            "Verification required before changing email. Please request verification first.",
          );
        }
        return respond.error(
          res,
          428,
          "verification_required",
          "Please provide verification code or MFA code",
        );
      }

      const sanitizedEmail = sanitizeEmail(newEmail);

      // Check if email already exists
      const existing = await User.findOne({ email: sanitizedEmail });
      if (existing && String(existing._id) !== String(doc._id)) {
        return respond.error(res, 409, "email_exists", "Email already exists");
      }

      const oldEmail = doc.email;

      // Create approval request
      const approvalId = AdminApproval.generateApprovalId();
      const approval = await AdminApproval.create({
        approvalId,
        requestType: "email_change",
        userId: doc._id,
        requestedBy: doc._id,
        requestDetails: {
          oldEmail,
          newEmail: sanitizedEmail,
        },
        status: "pending",
        requiredApprovals: 2,
        metadata: {
          ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
          verificationCompleted: true,
        },
      });

      // Clear verification request
      clearVerificationRequest(doc._id, purpose);

      // Create audit log for approval request
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      await logAuditEvent("admin_approval_request", doc._id, "User", doc._id, {
        role: roleSlug,
        fieldChanged: "email",
        oldValue: oldEmail,
        newValue: sanitizedEmail,
        ip,
        userAgent,
        approvalId,
        requestType: "email_change",
      });

      return res.json({
        success: true,
        approval: {
          approvalId: approval.approvalId,
          requestType: approval.requestType,
          status: approval.status,
          requiredApprovals: approval.requiredApprovals,
          message: "Approval request created. Waiting for 2 admin approvals.",
        },
      });
    } catch (err) {
      console.error("PATCH /api/auth/profile/email error:", err);
      return respond.error(
        res,
        500,
        "email_update_failed",
        "Failed to create approval request",
      );
    }
  },
);

module.exports = router;
