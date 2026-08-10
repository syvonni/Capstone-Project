const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const speakeasy = require("speakeasy");
const User = require("../models/User");
const { generateCode, generateToken } = require("../lib/codes");
const { resetRequests } = require("../lib/authRequestsStore");
const ResetRequest = require("../models/ResetRequest");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const { perEmailRateLimit } = require("../middleware/rateLimit");
const { decryptWithHash, encryptWithHash } = require("../lib/secretCipher");
const {
  sendOtp,
  sendForgotPasswordNotAvailableEmail,
} = require("../lib/mailer");
const { trackIP, isUnusualIP } = require("../lib/ipTracker");
const {
  checkLockout,
  incrementFailedAttempts,
} = require("../lib/accountLockout");
const securityMonitor = require("../middleware/securityMonitor");
const {
  checkPasswordHistory,
  addToPasswordHistory,
} = require("../lib/passwordHistory");
const { validatePasswordStrength } = require("../lib/passwordValidator");
const { logAuditEvent } = require("../lib/auditClient");
const { isBusinessOwnerRole, isAdminRole } = require("../lib/roleHelpers");
const {
  verifyTurnstileToken,
  shouldRequireCaptcha,
} = require("../lib/turnstile");
const { sendAdminAlert } = require("../lib/notificationService");

/**
 * Create a security incident on admin-service for staff/admin forgot-password attempt.
 * No-op if ADMIN_SERVICE_URL is not set or the request fails (log only).
 */
async function createSecurityIncidentForForgotPasswordAttempt({
  userId,
  userEmail,
  roleSlug,
  ipAddress,
  userAgent,
}) {
  const { createHttpClient } = require("../../../../shared/lib/httpClient");
  const internalKey = process.env.ADMIN_SERVICE_INTERNAL_API_KEY || "";
  try {
    const adminClient = createHttpClient("admin", {
      headers: { "X-Internal-API-Key": internalKey },
    });
    await adminClient.post(
      "/api/admin/tamper/incidents",
      {
        eventType: "staff_or_admin_forgot_password_attempted",
        userId: String(userId),
        userEmail,
        roleSlug: roleSlug || "",
        ipAddress: ipAddress || "",
        userAgent: userAgent || "",
      },
    );
  } catch (err) {
    console.error(
      "Failed to create security incident for forgot-password attempt:",
      err?.message || err,
    );
  }
}

const router = express.Router();

const emailOnlySchema = Joi.object({
  email: Joi.string().email().required(),
  captchaToken: Joi.string().allow("", null).optional(),
});

const verifyCodeSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

const changePasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  resetToken: Joi.string().required(),
  password: Joi.string().min(12).max(200).required(), // Updated to 12 minimum
});

const changeEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  resetToken: Joi.string().required(),
  newEmail: Joi.string().email().required(),
});

const sendCodeLimiter = perEmailRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  code: "reset_code_rate_limited",
  message: "Too many reset code requests; try again later.",
});

const verifyLimiter = perEmailRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  code: "reset_verify_rate_limited",
  message: "Too many verification attempts; try again later.",
});

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  sendCodeLimiter,
  validateBody(emailOnlySchema),
  async (req, res) => {
    try {
      if (shouldRequireCaptcha(req)) {
        const captchaResult = await verifyTurnstileToken(
          req.body.captchaToken,
          req.ip,
        );
        if (!captchaResult.success) {
          return respond.error(
            res,
            400,
            "captcha_failed",
            "CAPTCHA verification failed",
          );
        }
      }

      let { email } = req.body || {};
      const emailKey = String(email).toLowerCase().trim();
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Check existence — always return generic response to prevent email enumeration
      const user = await User.findOne({ email: emailKey })
        .populate("role")
        .select("+mfaSecret")
        .lean();
      if (!user) return res.json({ sent: true });

      const roleSlug = user.role?.slug || "user";
      const hasMfa =
        user.mfaEnabled && user.mfaSecret && user.mfaSecret.trim() !== "";

      console.log(
        `[Forgot Password] User: ${emailKey}, MFA Enabled: ${user.mfaEnabled}, Has Secret: ${!!user.mfaSecret}, Secret Length: ${user.mfaSecret?.length || 0}, hasMfa: ${hasMfa}`,
      );

      if (!isBusinessOwnerRole(roleSlug)) {
        // Admin/staff: send "not available" email (no code), alert admins, return resetNotAvailable so UI skips verify step
        await logAuditEvent("security_event", user._id, "User", user._id, {
          role: roleSlug,
          fieldChanged: "recovery",
          oldValue: "",
          newValue: "",
          ip: ipAddress,
          userAgent,
          reason: "recovery_not_available_for_role",
        }).catch((err) => console.error("Audit log failed:", err));
        sendAdminAlert("staff_or_admin_forgot_password_attempted", {
          userId: String(user._id),
          userEmail: user.email,
          roleSlug,
          ipAddress,
          userAgent,
        }).catch((err) => console.error("Admin alert failed:", err));
        createSecurityIncidentForForgotPasswordAttempt({
          userId: user._id,
          userEmail: user.email,
          roleSlug,
          ipAddress,
          userAgent,
        }).catch(() => {});

        const emailResult = await sendForgotPasswordNotAvailableEmail({
          to: email,
          roleSlug,
        });
        if (!emailResult || !emailResult.success) {
          console.error(
            `[Password Reset] Failed to send not-available email to ${email}:`,
            emailResult?.error || "Unknown error",
          );
          return respond.error(
            res,
            500,
            "email_send_failed",
            `Failed to send email: ${emailResult?.error || "Please check your email configuration"}`,
          );
        }

        // Return same shape as success so UI still shows verify step; attacker never gets a code in email
        return res.json({ sent: true });
      }

      // Business owner: check MFA status and handle accordingly
      const lockoutCheck = await checkLockout(user._id);
      if (lockoutCheck.locked) {
        return respond.error(
          res,
          423,
          "account_locked",
          `Account is temporarily locked. Try again in ${lockoutCheck.remainingMinutes} minutes.`,
        );
      }

      // Check for suspicious activity: unusual IP
      const ipCheck = await isUnusualIP(user._id, ipAddress);
      const suspiciousActivity = ipCheck.isUnusual;

      // Track IP for future comparisons
      await trackIP(user._id, ipAddress);

      // Detect suspicious patterns
      if (suspiciousActivity) {
        // Log suspicious activity
        securityMonitor.detectSuspiciousActivity(req);

        // Increment failed attempts (treats unusual IP as suspicious)
        await incrementFailedAttempts(user._id);

        // Log to audit trail
        await logAuditEvent("security_event", user._id, "User", user._id, {
          role: roleSlug,
          fieldChanged: "recovery",
          oldValue: "",
          newValue: "unusual_ip_detected",
          ip: ipAddress,
          userAgent,
          reason: ipCheck.reason,
        });
      }

      // If user has MFA enabled, don't send email OTP - require MFA verification
      if (hasMfa) {
        // Create audit log for MFA-based recovery
        await logAuditEvent(
          "account_recovery_initiated",
          user._id,
          "User",
          user._id,
          {
            role: roleSlug,
            fieldChanged: "password",
            oldValue: "",
            newValue: "mfa_verification_required",
            ip: ipAddress,
            userAgent,
            suspiciousActivityDetected: suspiciousActivity,
            recoveryMethod: "mfa_first",
          },
        );

        const payload = { sent: true, requiresMfa: true };
        if (suspiciousActivity) {
          payload.warning =
            "Unusual login location detected. If this wasn't you, please contact support immediately.";
        }
        return res.json(payload);
      }

      // No MFA - send email OTP (existing flow)
      const code = generateCode();
      const expiresAtMs = Date.now() + 10 * 60 * 1000; // 10 minutes
      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      if (useDB) {
        await ResetRequest.findOneAndUpdate(
          { email: emailKey },
          {
            code,
            expiresAt: new Date(expiresAtMs),
            verified: false,
            resetToken: null,
            metadata: {
              ipAddress,
              userAgent,
              suspiciousActivityDetected: suspiciousActivity,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } else {
        resetRequests.set(emailKey, {
          code,
          expiresAt: expiresAtMs,
          verified: false,
          resetToken: null,
          metadata: {
            ipAddress,
            userAgent,
            suspiciousActivityDetected: suspiciousActivity,
          },
        });
      }

      const emailResult = await sendOtp({
        to: email,
        code,
        subject: "Reset your password",
        purpose: "password_reset",
      });
      if (!emailResult || !emailResult.success) {
        console.error(
          `[Password Reset] Failed to send OTP email to ${email}:`,
          emailResult?.error || "Unknown error",
        );
        return respond.error(
          res,
          500,
          "email_send_failed",
          `Failed to send reset code: ${emailResult?.error || "Please check your email configuration"}`,
        );
      }

      // Log recovery initiation to blockchain
      await logAuditEvent(
        "account_recovery_initiated",
        user._id,
        "User",
        user._id,
        {
          role: roleSlug,
          fieldChanged: "password",
          oldValue: "",
          newValue: "recovery_requested",
          ip: ipAddress,
          userAgent,
          suspiciousActivityDetected: suspiciousActivity,
          recoveryMethod: "email_otp",
        },
      );

      const payload = { sent: true, requiresMfa: false };
      if (suspiciousActivity) {
        payload.warning =
          "Unusual login location detected. If this wasn't you, please contact support immediately.";
      }
      if (process.env.NODE_ENV !== "production") payload.devCode = code;
      return res.json(payload);
    } catch (err) {
      console.error("POST /api/auth/forgot-password error:", err);
      return respond.error(
        res,
        500,
        "reset_start_failed",
        "Failed to send reset code",
      );
    }
  },
);

// POST /api/auth/forgot-password/resend
// Resend verification code for an existing forgot password request
router.post(
  "/forgot-password/resend",
  sendCodeLimiter,
  validateBody(emailOnlySchema),
  async (req, res) => {
    try {
      // No CAPTCHA required for resend - user already verified once
      let { email } = req.body || {};
      const emailKey = String(email).toLowerCase().trim();
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Check existence — always return generic response to prevent email enumeration
      const user = await User.findOne({ email: emailKey })
        .populate("role")
        .select("+mfaSecret")
        .lean();
      if (!user) return res.json({ sent: true });

      const roleSlug = user.role?.slug || "user";
      const hasMfa =
        user.mfaEnabled && user.mfaSecret && user.mfaSecret.trim() !== "";

      if (!isBusinessOwnerRole(roleSlug)) {
        // Admin/staff: send "not available" email (no code), alert admins
        await logAuditEvent("security_event", user._id, "User", user._id, {
          role: roleSlug,
          fieldChanged: "recovery",
          oldValue: "",
          newValue: "",
          ip: ipAddress,
          userAgent,
          reason: "recovery_not_available_for_role",
        });
        await createSecurityIncidentForForgotPasswordAttempt({
          userId: user._id,
          userEmail: emailKey,
          roleSlug,
          ipAddress,
          userAgent,
        });
        const emailResult = await sendForgotPasswordNotAvailableEmail({
          to: email,
          roleSlug,
        });
        if (!emailResult || !emailResult.success) {
          console.error(
            `[Password Reset Resend] Failed to send not-available email to ${email}:`,
            emailResult?.error || "Unknown error",
          );
          return respond.error(
            res,
            500,
            "email_send_failed",
            `Failed to send email: ${emailResult?.error || "Please check your email configuration"}`,
          );
        }
        return res.json({ sent: true });
      }

      // If user has MFA enabled, don't send email OTP - require MFA verification
      if (hasMfa) {
        const payload = { sent: true, requiresMfa: true };
        return res.json(payload);
      }

      // Business owner without MFA: generate and send reset code
      const code = generateCode();
      const expiresAtMs = Date.now() + 10 * 60 * 1000; // 10 minutes
      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      if (useDB) {
        await ResetRequest.findOneAndUpdate(
          { email: emailKey },
          {
            code,
            expiresAt: new Date(expiresAtMs),
            verified: false,
            resetToken: null,
            metadata: {
              ipAddress,
              userAgent,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } else {
        resetRequests.set(emailKey, {
          code,
          expiresAt: expiresAtMs,
          verified: false,
          resetToken: null,
          metadata: {
            ipAddress,
            userAgent,
          },
        });
      }

      // Create audit log
      await logAuditEvent("password_reset", user._id, "User", user._id, {
        role: roleSlug,
        fieldChanged: "code_sent",
        oldValue: "",
        newValue: "",
        ip: ipAddress,
        userAgent,
        method: "resend",
      });

      // Send email
      const emailResult = await sendOtp({
        to: email,
        code,
        subject: "Password Reset Code (Resend)",
        purpose: "password_reset",
      });
      if (!emailResult || !emailResult.success) {
        console.error(
          `[Forgot Password Resend] Failed to send OTP email to ${email}:`,
          emailResult?.error || "Unknown error",
        );
        return respond.error(
          res,
          500,
          "email_send_failed",
          `Failed to send reset email: ${emailResult?.error || "Please check your email configuration"}`,
        );
      }

      const payload = { sent: true, requiresMfa: false };
      if (process.env.NODE_ENV !== "production") payload.devCode = code;
      return res.json(payload);
    } catch (err) {
      console.error("POST /api/auth/forgot-password/resend error:", err);
      return respond.error(
        res,
        500,
        "resend_failed",
        "Failed to resend reset code",
      );
    }
  },
);

// POST /api/auth/verify-code
router.post(
  "/verify-code",
  verifyLimiter,
  validateBody(verifyCodeSchema),
  async (req, res) => {
    try {
      const { email, code } = req.body || {};
      const emailKey = String(email).toLowerCase();
      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      let reqObj = null;
      if (useDB) {
        reqObj = await ResetRequest.findOne({ email: emailKey });
        if (!reqObj)
          return respond.error(
            res,
            404,
            "reset_request_not_found",
            "No reset request found",
          );
        if (Date.now() > new Date(reqObj.expiresAt).getTime())
          return respond.error(res, 410, "code_expired", "Code expired");
        if (String(reqObj.code) !== String(code))
          return respond.error(res, 401, "invalid_code", "Invalid code");
        const token = generateToken();
        reqObj.verified = true;
        reqObj.resetToken = token;
        await reqObj.save();
        const user = await User.findOne({ email: emailKey })
          .populate("role")
          .lean();
        const allowedToReset = user
          ? isBusinessOwnerRole(user.role?.slug || "user")
          : true;
        return res.json({ verified: true, resetToken: token, allowedToReset });
      } else {
        reqObj = resetRequests.get(emailKey);
        if (!reqObj)
          return respond.error(
            res,
            404,
            "reset_request_not_found",
            "No reset request found",
          );
        if (Date.now() > reqObj.expiresAt)
          return respond.error(res, 410, "code_expired", "Code expired");
        if (String(reqObj.code) !== String(code))
          return respond.error(res, 401, "invalid_code", "Invalid code");
        const token = generateToken();
        reqObj.verified = true;
        reqObj.resetToken = token;
        resetRequests.set(emailKey, reqObj);
        const user = await User.findOne({ email: emailKey })
          .populate("role")
          .lean();
        const allowedToReset = user
          ? isBusinessOwnerRole(user.role?.slug || "user")
          : true;
        return res.json({ verified: true, resetToken: token, allowedToReset });
      }
    } catch (err) {
      console.error("POST /api/auth/verify-code error:", err);
      return respond.error(
        res,
        500,
        "reset_verify_failed",
        "Failed to verify code",
      );
    }
  },
);

// POST /api/auth/forgot-password/verify-mfa
// Verify MFA for forgot password (MFA-enabled accounts)
router.post(
  "/forgot-password/verify-mfa",
  validateBody(
    Joi.object({
      email: Joi.string().email().required(),
      code: Joi.string().required(),
    }),
  ),
  async (req, res) => {
    try {
      const { email, code } = req.body || {};
      const emailKey = String(email).toLowerCase().trim();
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Find user
      const user = await User.findOne({ email: emailKey })
        .populate("role")
        .lean();
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");

      const roleSlug = user.role?.slug || "user";
      if (!isBusinessOwnerRole(roleSlug)) {
        return respond.error(
          res,
          403,
          "not_allowed",
          "Password reset not allowed for this account type",
        );
      }

      // Check if MFA is enabled
      if (!user.mfaEnabled || !user.mfaSecret) {
        return respond.error(
          res,
          400,
          "mfa_not_enabled",
          "MFA is not enabled for this account",
        );
      }

      // Verify TOTP code
      let decryptedSecret = "";
      try {
        decryptedSecret = decryptWithHash(user.passwordHash, user.mfaSecret);
      } catch (err) {
        console.error("Failed to decrypt MFA secret:", err);
        return respond.error(res, 500, "mfa_error", "Failed to verify MFA");
      }

      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: "base32",
        token: code,
        window: 1, // Allow 1 step tolerance (30 seconds before/after)
      });

      if (!verified) {
        // Track failed MFA attempt
        await incrementFailedAttempts(user._id);
        return respond.error(res, 401, "invalid_mfa_code", "Invalid MFA code");
      }

      // Generate reset token
      const resetToken = generateToken();
      const expiresAtMs = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store reset request
      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      if (useDB) {
        await ResetRequest.findOneAndUpdate(
          { email: emailKey },
          {
            verified: true,
            resetToken,
            expiresAt: new Date(expiresAtMs),
            metadata: {
              ipAddress,
              userAgent,
              verificationMethod: "mfa",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } else {
        resetRequests.set(emailKey, {
          verified: true,
          resetToken,
          expiresAt: expiresAtMs,
          metadata: {
            ipAddress,
            userAgent,
            verificationMethod: "mfa",
          },
        });
      }

      // Create audit log
      await logAuditEvent(
        "account_recovery_verified",
        user._id,
        "User",
        user._id,
        {
          role: roleSlug,
          fieldChanged: "password",
          oldValue: "",
          newValue: "mfa_verified",
          ip: ipAddress,
          userAgent,
          recoveryMethod: "mfa_verified",
        },
      );

      return res.json({
        verified: true,
        resetToken,
        allowedToReset: true,
        message: "MFA verified. You can now reset your password.",
      });
    } catch (err) {
      console.error("POST /api/auth/forgot-password/verify-mfa error:", err);
      return respond.error(
        res,
        500,
        "mfa_verify_failed",
        "Failed to verify MFA",
      );
    }
  },
);

// POST /api/auth/change-password
router.post(
  "/change-password",
  validateBody(changePasswordSchema),
  async (req, res) => {
    try {
      const { email, resetToken, password } = req.body || {};
      const emailKey = String(email).toLowerCase();
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      let valid = false;
      let verificationMethod = "email"; // default
      if (useDB) {
        const reqDoc = await ResetRequest.findOne({ email: emailKey }).lean();
        valid =
          !!reqDoc &&
          !!reqDoc.verified &&
          String(reqDoc.resetToken) === String(resetToken);
        if (reqDoc && reqDoc.metadata && reqDoc.metadata.verificationMethod) {
          verificationMethod = reqDoc.metadata.verificationMethod;
        }
      } else {
        const reqObj = resetRequests.get(emailKey);
        valid =
          !!reqObj &&
          !!reqObj.verified &&
          String(reqObj.resetToken) === String(resetToken);
        if (reqObj && reqObj.metadata && reqObj.metadata.verificationMethod) {
          verificationMethod = reqObj.metadata.verificationMethod;
        }
      }
      if (!valid) {
        return respond.error(
          res,
          401,
          "invalid_reset_token",
          "Invalid or missing reset token",
        );
      }

      const doc = await User.findOne({ email }).populate("role");
      if (!doc)
        return respond.error(res, 404, "user_not_found", "User not found");

      const docRoleSlug = doc.role?.slug || "user";
      if (!isBusinessOwnerRole(docRoleSlug)) {
        return respond.error(
          res,
          403,
          "forgot_password_not_available",
          "Password reset is not available for this account.",
        );
      }

      // Check account lockout
      const lockoutCheck = await checkLockout(doc._id);
      if (lockoutCheck.locked) {
        return respond.error(
          res,
          423,
          "account_locked",
          `Account is temporarily locked. Try again in ${lockoutCheck.remainingMinutes} minutes.`,
        );
      }

      // Validate password strength (12+ chars, upper, lower, number, special)
      const strengthCheck = validatePasswordStrength(password);
      if (!strengthCheck.valid) {
        return respond.error(
          res,
          400,
          "weak_password",
          strengthCheck.errors.join("; "),
        );
      }

      // Check password history (prevent reuse of last 5)
      const historyCheck = await checkPasswordHistory(
        password,
        doc.passwordHistory || [],
      );
      if (historyCheck.inHistory) {
        return respond.error(
          res,
          400,
          "password_in_history",
          "Cannot reuse any of your last 5 passwords",
        );
      }

      const oldHash = String(doc.passwordHash);
      let mfaPlain = "";
      try {
        if (doc.mfaSecret) mfaPlain = decryptWithHash(oldHash, doc.mfaSecret);
      } catch (_) {
        mfaPlain = "";
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Add old password to history
      const updatedHistory = addToPasswordHistory(
        oldHash,
        doc.passwordHistory || [],
      );

      // Update user: password, history, invalidate sessions
      doc.passwordHash = passwordHash;
      doc.passwordChangedAt = new Date();
      doc.passwordHistory = updatedHistory;
      doc.tokenVersion = (doc.tokenVersion || 0) + 1; // Invalidate all sessions

      // Handle MFA based on verification method
      if (verificationMethod === "mfa" && doc.mfaEnabled && mfaPlain) {
        // User verified with MFA, preserve MFA by re-encrypting with new password
        try {
          doc.mfaSecret = encryptWithHash(doc.passwordHash, mfaPlain);
          // No need to require re-enrollment since we preserved MFA
          console.log(
            `[Password Change] MFA preserved for ${email} (verified via MFA)`,
          );
        } catch (err) {
          console.error("Failed to re-encrypt MFA secret:", err);
          // Fallback: disable MFA and require re-enrollment
          doc.mfaReEnrollmentRequired = true;
          doc.mfaEnabled = false;
          doc.mfaSecret = "";
        }
      } else {
        // Email verification or MFA not enabled, require MFA re-enrollment if it was enabled
        if (doc.mfaEnabled) {
          doc.mfaReEnrollmentRequired = true;
          doc.mfaEnabled = false;
          doc.mfaSecret = "";
          console.log(
            `[Password Change] MFA disabled for ${email}, re-enrollment required (verified via email)`,
          );
        }
      }

      await doc.save();

      // Track IP
      await trackIP(doc._id, ipAddress);

      // Create audit log
      const roleSlug = doc.role?.slug || "user";
      await logAuditEvent(
        "account_recovery_completed",
        doc._id,
        "User",
        doc._id,
        {
          role: roleSlug,
          fieldChanged: "password",
          oldValue: "[REDACTED]",
          newValue: "[REDACTED]",
          ip: ipAddress,
          userAgent,
          tokenVersion: doc.tokenVersion,
          mfaReEnrollmentRequired: doc.mfaReEnrollmentRequired || false,
          mfaPreserved: verificationMethod === "mfa" && doc.mfaEnabled,
          recoveryMethod: "password_reset",
          verificationMethod,
        },
      );

      // Cleanup reset state
      if (useDB) await ResetRequest.deleteOne({ email: emailKey });
      else resetRequests.delete(emailKey);

      const response = {
        updated: true,
        mfaReEnrollmentRequired: doc.mfaReEnrollmentRequired || false,
        message: doc.mfaReEnrollmentRequired
          ? "Password changed successfully. Please re-enroll MFA on next login."
          : "Password changed successfully. Your MFA settings have been preserved.",
      };

      if (verificationMethod === "mfa" && doc.mfaEnabled) {
        response.mfaPreserved = true;
      }

      return res.json(response);
    } catch (err) {
      console.error("POST /api/auth/change-password error:", err);
      return respond.error(
        res,
        500,
        "change_password_failed",
        "Failed to change password",
      );
    }
  },
);

// POST /api/auth/change-email
router.post(
  "/change-email",
  validateBody(changeEmailSchema),
  async (req, res) => {
    try {
      const { email, resetToken, newEmail } = req.body || {};

      const currentEmailKey = String(email).toLowerCase();
      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      let valid = false;
      if (useDB) {
        const reqDoc = await ResetRequest.findOne({
          email: currentEmailKey,
        }).lean();
        valid =
          !!reqDoc &&
          !!reqDoc.verified &&
          String(reqDoc.resetToken) === String(resetToken);
      } else {
        const reqObj = resetRequests.get(currentEmailKey);
        valid =
          !!reqObj &&
          !!reqObj.verified &&
          String(reqObj.resetToken) === String(resetToken);
      }
      if (!valid) {
        return respond.error(
          res,
          401,
          "invalid_reset_token",
          "Invalid or missing reset token",
        );
      }

      const normalizedNewEmail = String(newEmail).trim();
      if (!normalizedNewEmail) {
        return respond.error(
          res,
          400,
          "invalid_new_email",
          "newEmail cannot be empty",
        );
      }

      // Ensure the new email is not already taken
      const existing = await User.findOne({ email: normalizedNewEmail }).lean();
      if (existing) {
        return respond.error(res, 409, "email_exists", "Email already exists");
      }

      // Load the current user by the provided email
      const doc = await User.findOne({ email }).populate("role");
      if (!doc) {
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      // Update email
      doc.email = normalizedNewEmail;
      await doc.save();

      // Cleanup reset state for the old email
      if (useDB) await ResetRequest.deleteOne({ email: currentEmailKey });
      else resetRequests.delete(currentEmailKey);

      const safe = {
        id: String(doc._id),
        role: doc.role && doc.role.slug ? doc.role.slug : doc.role,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
        termsAccepted: doc.termsAccepted,
        createdAt: doc.createdAt,
      };

      return res.json(safe);
    } catch (err) {
      console.error("POST /api/auth/change-email error:", err);
      return respond.error(
        res,
        500,
        "change_email_failed",
        "Failed to change email",
      );
    }
  },
);

module.exports = router;
