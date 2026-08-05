const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const respond = require("../middleware/respond");
const { requireJwt } = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const { generateCode } = require("../lib/codes");
const { sendOtp } = require("../lib/mailer");
const { changePasswordRequests } = require("../lib/authRequestsStore");
const { decryptWithHash, encryptWithHash } = require("../lib/secretCipher");
const { validatePasswordStrength } = require("../lib/passwordValidator");
const {
  checkPasswordHistory,
  addToPasswordHistory,
} = require("../lib/passwordHistory");
const { sanitizeString } = require("../lib/sanitizer");
const { logAuditEvent } = require("../lib/auditClient");
const {
  sendPasswordChangeNotification,
} = require("../lib/notificationService");
const inAppNotificationService = require("../services/notificationService");
const webauthnServer = require("@simplewebauthn/server");
const webauthnRouter = require("./webauthn");
const authenticationChallenges =
  webauthnRouter.authenticationChallenges || new Map();
const { consumePasswordChangeVerified } = require("../lib/mfaStepUpVerify");
const speakeasy = require("speakeasy");

const router = express.Router();

const changePasswordAuthenticatedSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(200).required(),
  newPassword: Joi.string().min(6).max(200).required(),
});

const changePasswordStartSchema = Joi.object({
  // No fields required - just needs JWT auth to identify user
});

const changePasswordVerifySchema = Joi.object({
  code: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[0-9]{6}$/),
      Joi.string().valid("PASSKEY_BYPASS"),
    )
    .required(),
  newPassword: Joi.string().min(12).max(200).required(),
});

// POST /api/auth/change-password/passkey/start
// Step-up start for passkey-only users before allowing password change bypass
router.post("/change-password/passkey/start", requireJwt, async (req, res) => {
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
      "pwd_change_" + String(userId),
      challengeToStore,
    );
    return res.json({ publicKey: options });
  } catch (err) {
    console.error("POST /api/auth/change-password/passkey/start error:", err);
    return respond.error(
      res,
      500,
      "passkey_start_failed",
      "Failed to start passkey verification",
    );
  }
});

// POST /api/auth/change-password-authenticated
// Change password for a logged-in user by verifying current password.
router.post(
  "/change-password-authenticated",
  requireJwt,
  validateBody(changePasswordAuthenticatedSchema),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};

      // Sanitize inputs
      const sanitizedCurrentPassword = sanitizeString(currentPassword || "");
      const sanitizedNewPassword = sanitizeString(newPassword || "");

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
        doc = await User.findById(userId).populate("role");
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

      // Verify current password
      const ok = await bcrypt.compare(
        sanitizedCurrentPassword,
        doc.passwordHash,
      );
      if (!ok)
        return respond.error(
          res,
          401,
          "invalid_current_password",
          "Invalid current password",
        );

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(sanitizedNewPassword);
      if (!passwordValidation.valid) {
        return respond.error(
          res,
          400,
          "weak_password",
          "Password does not meet requirements",
          passwordValidation.errors,
        );
      }

      // Check if new password is in history
      const historyCheck = await checkPasswordHistory(
        sanitizedNewPassword,
        doc.passwordHistory || [],
      );
      if (historyCheck.inHistory) {
        return respond.error(
          res,
          400,
          "password_reused",
          "You cannot reuse a recently used password. Please choose a different password.",
        );
      }

      const oldHash = String(doc.passwordHash);
      const hadMfaSecret = !!doc.mfaSecret;
      const priorMfaEnabled = !!doc.mfaEnabled;
      const priorMfaMethod = String(doc.mfaMethod || "");
      let mfaPlain = "";
      try {
        if (hadMfaSecret) mfaPlain = decryptWithHash(oldHash, doc.mfaSecret);
      } catch (_) {
        mfaPlain = "";
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(sanitizedNewPassword, 10);

      // Add old password to history
      const updatedHistory = addToPasswordHistory(
        oldHash,
        doc.passwordHistory || [],
      );

      // Update user
      doc.passwordHash = newPasswordHash;
      doc.passwordChangedAt = new Date();
      doc.passwordHistory = updatedHistory;
      doc.tokenVersion = (doc.tokenVersion || 0) + 1; // Invalidate all sessions
      doc.mfaReEnrollmentRequired = false;
      doc.mfaDisablePending = false;
      doc.mfaDisableRequestedAt = null;
      doc.mfaDisableScheduledFor = null;
      doc.tokenFprint = "";

      if (hadMfaSecret) {
        if (!mfaPlain) {
          // Secret could not be decrypted with old password hash: enforce re-enrollment
          doc.mfaReEnrollmentRequired = true;
          doc.mfaEnabled = false;
          doc.mfaSecret = "";
          doc.mfaMethod = "";
        } else {
          try {
            doc.mfaSecret = encryptWithHash(doc.passwordHash, mfaPlain);
            doc.mfaEnabled = true;
            doc.mfaMethod = priorMfaMethod || "authenticator";
          } catch (_) {
            doc.mfaReEnrollmentRequired = true;
            doc.mfaEnabled = false;
            doc.mfaSecret = "";
            doc.mfaMethod = "";
          }
        }
      }
      await doc.save();

      // Create audit log
      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      await logAuditEvent("password_change", doc._id, "User", doc._id, {
        role: roleSlug,
        fieldChanged: "password",
        oldValue: "[REDACTED]",
        newValue: "[REDACTED]",
        ip,
        userAgent,
        tokenVersion: doc.tokenVersion,
        mfaReEnrollmentRequired: !!doc.mfaReEnrollmentRequired,
      });

      // Send password change notification (non-blocking)
      sendPasswordChangeNotification(doc._id, {
        timestamp: new Date(),
      }).catch((err) => {
        console.error("Failed to send password change notification:", err);
      });

      inAppNotificationService
        .createNotification(
          doc._id,
          "auth_password_changed",
          "Password changed",
          "Your password has been updated successfully.",
        )
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );

      const userSafe = {
        id: String(doc._id),
        role: doc.role && doc.role.slug ? doc.role.slug : doc.role,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
        isEmailVerified: !!doc.isEmailVerified,
        termsAccepted: doc.termsAccepted,
        createdAt: doc.createdAt,
        deletionPending: !!doc.deletionPending,
        deletionRequestedAt: doc.deletionRequestedAt,
        deletionScheduledFor: doc.deletionScheduledFor,
      };

      // Force 200 by adding a cache-busting header or modifying response headers
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");

      return res.json(userSafe);
    } catch (err) {
      console.error("POST /api/auth/change-password-authenticated error:", err);
      return respond.error(
        res,
        500,
        "change_password_failed",
        "Failed to change password",
      );
    }
  },
);

// POST /api/auth/change-password/start
// Step 1: send OTP to email to confirm password change
router.post(
  "/change-password/start",
  requireJwt,
  validateBody(changePasswordStartSchema),
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

      const email = String(doc.email || "").toLowerCase();

      const mfaMethod = String(doc.mfaMethod || "").toLowerCase();
      const hasTotpSecret = !!doc.mfaSecret;
      const isAuthenticatorMethod =
        mfaMethod.includes("authenticator") ||
        mfaMethod.includes("fingerprint");
      // Require TOTP step only when authenticator MFA is actually configured
      const hasMfa =
        hasTotpSecret && (doc.mfaEnabled === true || isAuthenticatorMethod);
      const hasPasskeys =
        doc.webauthnCredentials && doc.webauthnCredentials.length > 0;

      // Debug logging - detailed
      console.log(
        "[Password Change Debug] ==========================================",
      );
      console.log("[Password Change Debug] User:", email);
      console.log("[Password Change Debug] mfaEnabled:", doc.mfaEnabled);
      console.log("[Password Change Debug] mfaSecret exists:", !!doc.mfaSecret);
      console.log("[Password Change Debug] mfaMethods:", doc.mfaMethods);
      console.log(
        "[Password Change Debug] webauthnCredentials count:",
        doc.webauthnCredentials?.length || 0,
      );
      console.log("[Password Change Debug] hasMfa (TOTP):", hasMfa);
      console.log("[Password Change Debug] hasPasskeys:", hasPasskeys);
      console.log(
        "[Password Change Debug] ==========================================",
      );

      // If TOTP MFA is enabled, require authenticator verification first
      if (hasMfa) {
        console.log(
          "[Password Change Debug] -> TOTP MFA REQUIRED (hasMfa=true)",
        );
        return res.json({
          mfaRequired: true,
          mfaEnabled: true,
          hasPasskeys: hasPasskeys,
          method: "mfa",
          message: "Multi-factor authentication required",
        });
      }

      // Passkey-only users can proceed directly (session is already authenticated)
      if (hasPasskeys) {
        console.log(
          "[Password Change Debug] -> PASSKEY BYPASS (passkey-only user)",
        );
        return res.json({
          sent: false,
          mfaRequired: false,
          passkeyBypass: true,
          hasPasskeys: true,
          method: "passkey",
        });
      }

      console.log(
        "[Password Change Debug] -> SKIP MFA, sending email OTP (passkey-only or no MFA)",
      );
      // No TOTP and no passkey - proceed with email OTP
      const code = generateCode();
      const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
      const expiresAtMs = Date.now() + ttlMin * 60 * 1000;
      const key = email;

      // Store the request (password will be provided during verification)
      changePasswordRequests.set(key, {
        code,
        expiresAt: expiresAtMs,
        verified: false,
      });

      await sendOtp({
        to: email,
        code,
        subject: "Confirm password change",
        purpose: "password_change",
      });
      return res.json({
        sent: true,
        to: email,
        expiresAt: new Date(expiresAtMs).toISOString(),
        // Include dev code in non-production for testing
        ...(process.env.NODE_ENV !== "production" && { devCode: code }),
      });
    } catch (err) {
      console.error("POST /api/auth/change-password/start error:", err);
      return respond.error(
        res,
        500,
        "change_password_start_failed",
        "Failed to send verification code",
      );
    }
  },
);

// POST /api/auth/change-password/verify
// Step 2: verify OTP and change password
router.post(
  "/change-password/verify",
  requireJwt,
  validateBody(changePasswordVerifySchema),
  async (req, res) => {
    try {
      const { code, newPassword } = req.body || {};

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
        doc = await User.findById(userId).populate("role");
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

      const email = String(doc.email || "").toLowerCase();
      const reqObj = changePasswordRequests.get(email);

      // Handle passkey bypass
      if (code === "PASSKEY_BYPASS") {
        console.log("[Password Change] Passkey bypass used for user:", email);
        if (!consumePasswordChangeVerified(userId)) {
          return respond.error(
            res,
            403,
            "verification_required",
            "Verify with your passkey first",
          );
        }
      } else if (doc.mfaSecret && doc.mfaEnabled) {
        // TOTP user: verify the 6-digit code as a TOTP code
        console.log("[Password Change] TOTP verification for user:", email);
        let secretPlain = "";
        try {
          secretPlain = decryptWithHash(doc.passwordHash, doc.mfaSecret);
        } catch (err) {
          console.error("[Password Change] Failed to decrypt MFA secret:", err);
          return respond.error(res, 500, "mfa_error", "Failed to verify MFA");
        }

        const totpResult = speakeasy.totp.verify({
          secret: secretPlain,
          encoding: "base32",
          token: String(code),
          window: 1,
        });

        if (!totpResult) {
          return respond.error(
            res,
            401,
            "invalid_code",
            "Invalid verification code",
          );
        }
        console.log(
          "[Password Change] TOTP verified successfully for user:",
          email,
        );
      } else if (reqObj) {
        // Email OTP verification (non-MFA users)
        console.log(
          "[Password Change] Email OTP verification for user:",
          email,
        );
        if (Date.now() > reqObj.expiresAt) {
          changePasswordRequests.delete(email);
          return respond.error(
            res,
            410,
            "code_expired",
            "Verification code expired. Please request a new one.",
          );
        }
        if (String(reqObj.code) !== String(code)) {
          return respond.error(
            res,
            401,
            "invalid_code",
            "Invalid verification code",
          );
        }
      } else {
        // No valid verification method found
        return respond.error(
          res,
          404,
          "request_not_found",
          "No password change request found. Please start again.",
        );
      }

      const sanitizedNewPassword = sanitizeString(newPassword || "");

      // Validate new password strength again (safety check)
      const passwordValidation = validatePasswordStrength(sanitizedNewPassword);
      if (!passwordValidation.valid) {
        changePasswordRequests.delete(email);
        return respond.error(
          res,
          400,
          "weak_password",
          "Password does not meet requirements",
          passwordValidation.errors,
        );
      }

      // Check if new password is in history again (safety check)
      const historyCheck = await checkPasswordHistory(
        sanitizedNewPassword,
        doc.passwordHistory || [],
      );
      if (historyCheck.inHistory) {
        changePasswordRequests.delete(email);
        return respond.error(
          res,
          400,
          "password_reused",
          "You cannot reuse a recently used password. Please choose a different password.",
        );
      }

      const oldHash = String(doc.passwordHash);
      const hadMfaSecret = !!doc.mfaSecret;
      const priorMfaMethod = String(doc.mfaMethod || "");
      let mfaPlain = "";
      try {
        if (hadMfaSecret) mfaPlain = decryptWithHash(oldHash, doc.mfaSecret);
      } catch (_) {
        mfaPlain = "";
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(sanitizedNewPassword, 10);

      // Add old password to history
      const updatedHistory = addToPasswordHistory(
        oldHash,
        doc.passwordHistory || [],
      );

      // Update user
      doc.passwordHash = newPasswordHash;
      doc.passwordChangedAt = new Date();
      doc.passwordHistory = updatedHistory;
      doc.tokenVersion = (doc.tokenVersion || 0) + 1; // Invalidate all sessions
      doc.mfaReEnrollmentRequired = false;
      doc.mfaDisablePending = false;
      doc.mfaDisableRequestedAt = null;
      doc.mfaDisableScheduledFor = null;
      doc.tokenFprint = "";

      if (hadMfaSecret) {
        if (!mfaPlain) {
          // Secret could not be decrypted with old password hash: enforce re-enrollment
          doc.mfaReEnrollmentRequired = true;
          doc.mfaEnabled = false;
          doc.mfaSecret = "";
          doc.mfaMethod = "";
        } else {
          try {
            doc.mfaSecret = encryptWithHash(doc.passwordHash, mfaPlain);
            doc.mfaEnabled = true;
            doc.mfaMethod = priorMfaMethod || "authenticator";
          } catch (_) {
            doc.mfaReEnrollmentRequired = true;
            doc.mfaEnabled = false;
            doc.mfaSecret = "";
            doc.mfaMethod = "";
          }
        }
      }
      await doc.save();

      // Clean up the request
      changePasswordRequests.delete(email);

      // Create audit log
      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      await logAuditEvent("password_change", doc._id, "User", doc._id, {
        role: roleSlug,
        fieldChanged: "password",
        oldValue: "[REDACTED]",
        newValue: "[REDACTED]",
        ip,
        userAgent,
        tokenVersion: doc.tokenVersion,
        mfaReEnrollmentRequired: !!doc.mfaReEnrollmentRequired,
        method: "otp_verification",
      });

      // Send password change notification (non-blocking)
      sendPasswordChangeNotification(doc._id, {
        timestamp: new Date(),
      }).catch((err) => {
        console.error("Failed to send password change notification:", err);
      });

      inAppNotificationService
        .createNotification(
          doc._id,
          "auth_password_changed",
          "Password changed",
          "Your password has been updated successfully.",
        )
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );

      const userSafe = {
        id: String(doc._id),
        role: doc.role && doc.role.slug ? doc.role.slug : doc.role,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
        isEmailVerified: !!doc.isEmailVerified,
        termsAccepted: doc.termsAccepted,
        createdAt: doc.createdAt,
        deletionPending: !!doc.deletionPending,
        deletionRequestedAt: doc.deletionRequestedAt,
        deletionScheduledFor: doc.deletionScheduledFor,
      };

      // Generate new access token since tokenVersion was incremented
      // This ensures the user stays logged in after password change
      try {
        const { signAccessToken } = require("../middleware/auth");
        const { token, expiresAtMs } = signAccessToken(doc);
        userSafe.token = token;
        userSafe.expiresAt = new Date(expiresAtMs).toISOString();
      } catch (tokenErr) {
        console.error(
          "Failed to generate new token after password change:",
          tokenErr,
        );
        // Continue without token - user will need to log in again
      }

      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");

      return res.json(userSafe);
    } catch (err) {
      console.error("POST /api/auth/change-password/verify error:", err);
      return respond.error(
        res,
        500,
        "change_password_verify_failed",
        "Failed to verify code and change password",
      );
    }
  },
);

module.exports = router;
