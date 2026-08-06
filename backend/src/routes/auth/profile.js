const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Office = require("../../models/Office");
const AuditLog = require("../../models/AuditLog");
const AdminApproval = require("../../models/AdminApproval");
const EmailChangeRequest = require("../../models/EmailChangeRequest");
const { decryptWithHash, encryptWithHash } = require("../../lib/secretCipher");
const respond = require("../../middleware/respond");
const { requireJwt, requireRole } = require("../../middleware/auth");
const { validateBody, Joi } = require("../../middleware/validation");
const { generateCode, generateToken } = require("../../lib/codes");
const { sendOtp, sendStaffCredentialsEmail } = require("../../lib/mailer");
const {
  changeEmailRequests,
  changePasswordRequests,
} = require("../../lib/authRequestsStore");
const { validatePasswordStrength } = require("../../lib/passwordValidator");
const {
  checkPasswordHistory,
  addToPasswordHistory,
} = require("../../lib/passwordHistory");
const {
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeName,
  sanitizeIdNumber,
  containsSqlInjection,
  containsXss,
} = require("../../lib/sanitizer");
const {
  requestVerification,
  verifyCode,
  checkVerificationStatus,
  clearVerificationRequest,
} = require("../../lib/verificationService");
const {
  requireFieldPermission,
  requireVerification,
} = require("../../middleware/fieldPermissions");
const {
  isBusinessOwnerRole,
  isAdminRole,
  isStaffRole,
  getStaffRoles,
  refreshStaffRoleCache,
} = require("../../lib/roleHelpers");
const {
  verificationRateLimit,
  profileUpdateRateLimit,
  passwordChangeRateLimit,
  idUploadRateLimit,
  adminApprovalRateLimit,
} = require("../../middleware/rateLimit");
const { validateImageFile } = require("../../lib/fileValidator");
const {
  sendEmailChangeNotification,
  sendPasswordChangeNotification,
} = require("../../lib/notificationService");
const MaintenanceWindow = require("../../models/MaintenanceWindow");

/**
 * Calculate hash for audit log
 */
function calculateAuditHash(
  userId,
  eventType,
  fieldChanged,
  oldValue,
  newValue,
  role,
  metadata,
  timestamp,
) {
  const hashableData = {
    userId: String(userId),
    eventType,
    fieldChanged: fieldChanged || "",
    oldValue: oldValue || "",
    newValue: newValue || "",
    role,
    metadata: JSON.stringify(metadata || {}),
    timestamp: timestamp || new Date().toISOString(),
  };
  const dataString = JSON.stringify(hashableData);
  return crypto.createHash("sha256").update(dataString).digest("hex");
}

const router = express.Router();

function displayPhoneNumber(value) {
  const s = typeof value === "string" ? value : "";
  if (s.startsWith("__unset__")) return "";
  return s;
}

function generateTempPassword() {
  return crypto.randomBytes(12).toString("base64url");
}

function generateTempUsername(length = 12) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.randomBytes(
    Math.max(3, Math.min(40, Number(length) || 12)),
  );
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function deriveNamesFromEmail(email) {
  const local = String(email || "").split("@")[0] || "";
  const tokens = local.split(/[._\- ]+/).filter(Boolean);
  const first = tokens[0] || "Staff";
  const last = tokens.length > 1 ? tokens.slice(1).join(" ") : "User";
  return { firstName: first, lastName: last };
}

function normalizeOfficeCode(value) {
  return String(value || "")
    .replace("PNP‑FEU", "PNP-FEU")
    .trim()
    .toUpperCase();
}

/**
 * Helper function to create audit log and log to blockchain
 * Non-blocking - profile update succeeds even if blockchain logging fails
 */
async function createAuditLog(
  userId,
  eventType,
  fieldChanged,
  oldValue,
  newValue,
  role,
  metadata = {},
) {
  try {
    // Prepare metadata
    const fullMetadata = {
      ...metadata,
      ip: metadata.ip || "unknown",
      userAgent: metadata.userAgent || "unknown",
    };

    // Calculate hash before creating document (to avoid validation issues)
    const timestamp = new Date().toISOString();
    const hash = calculateAuditHash(
      userId,
      eventType,
      fieldChanged,
      oldValue || "",
      newValue || "",
      role,
      fullMetadata,
      timestamp,
    );

    // Create audit log entry with hash already calculated
    const auditLog = await AuditLog.create({
      userId,
      eventType,
      fieldChanged,
      oldValue: oldValue || "",
      newValue: newValue || "",
      role,
      metadata: fullMetadata,
      hash, // Set hash directly
    });

    return auditLog;
  } catch (error) {
    // Don't throw - audit logging failure shouldn't break profile updates
    console.error("Error creating audit log:", error);
    return null;
  }
}

const changePasswordAuthenticatedSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(200).required(),
  newPassword: Joi.string().min(6).max(200).required(),
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  phoneNumber: Joi.string().optional(),
  role: Joi.any().forbidden().messages({
    "any.unknown": "Role cannot be changed through this endpoint",
  }), // Explicitly forbid role changes
});

const uploadAvatarSchema = Joi.object({
  imageBase64: Joi.string().min(32).required(),
});

router.post(
  "/profile/avatar",
  requireJwt,
  validateBody(uploadAvatarSchema),
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

      const raw = String(req.body.imageBase64 || "");
      let mime = "";
      let dataStr = raw;
      if (raw.startsWith("data:")) {
        const parts = raw.split(",");
        const header = parts[0] || "";
        dataStr = parts[1] || "";
        const m = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/);
        mime = m ? m[1] : "";
      }
      const buf = Buffer.from(dataStr, "base64");
      if (!buf || buf.length < 1000)
        return respond.error(res, 400, "invalid_image", "Invalid image");
      let ext = "jpg";
      if (mime.includes("png")) ext = "png";
      if (mime.includes("jpeg")) ext = "jpg";
      if (mime.includes("webp")) ext = "webp";
      const path = require("path");
      const fs = require("fs");
      const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
      const avatarsDir = path.join(uploadsDir, "avatars");
      try {
        fs.mkdirSync(avatarsDir, { recursive: true });
      } catch (_) {}
      const filename = `${String(doc._id)}_${Date.now()}.${ext}`;
      const filePath = path.join(avatarsDir, filename);
      await fs.promises.writeFile(filePath, buf);
      doc.avatarUrl = `/uploads/avatars/${filename}`;
      await doc.save();
      return res.json({ success: true, avatarUrl: doc.avatarUrl });
    } catch (err) {
      console.error("POST /api/auth/profile/avatar error:", err);
      return respond.error(
        res,
        500,
        "avatar_upload_failed",
        "Failed to upload avatar",
      );
    }
  },
);

// POST /api/auth/profile/avatar-file - multipart upload
router.post("/profile/avatar-file", requireJwt, async (req, res) => {
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

    const multer = require("multer");
    const path = require("path");
    const fs = require("fs");
    const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
    const avatarsDir = path.join(uploadsDir, "avatars");
    try {
      fs.mkdirSync(avatarsDir, { recursive: true });
    } catch (_) {}
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, avatarsDir),
      filename: (_req, file, cb) => {
        const ext =
          path.extname(file.originalname || ".jpg").toLowerCase() || ".jpg";
        cb(null, `${String(doc._id)}_${Date.now()}${ext}`);
      },
    });
    const upload = multer({ storage }).single("avatar");

    upload(req, res, async (err) => {
      if (err) return respond.error(res, 400, "upload_failed", "Upload failed");
      const file = req.file;
      if (!file) return respond.error(res, 400, "no_file", "No file uploaded");
      doc.avatarUrl = `/uploads/avatars/${path.basename(file.path)}`;
      await doc.save();
      return res.json({ success: true, avatarUrl: doc.avatarUrl });
    });
  } catch (err) {
    console.error("POST /api/auth/profile/avatar-file error:", err);
    return respond.error(
      res,
      500,
      "avatar_upload_failed",
      "Failed to upload avatar",
    );
  }
});

router.delete("/profile/avatar", requireJwt, async (req, res) => {
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

    const path = require("path");
    const fs = require("fs");
    const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
    const avatarsDir = path.join(uploadsDir, "avatars");
    const basename = path.basename(String(doc.avatarUrl || ""));
    const filePath = basename ? path.join(avatarsDir, basename) : "";
    try {
      if (filePath) await fs.promises.unlink(filePath);
    } catch (_) {}
    doc.avatarUrl = "";
    await doc.save();
    return res.json({ success: true, message: "Avatar deleted" });
  } catch (err) {
    console.error("DELETE /api/auth/profile/avatar error:", err);
    return respond.error(
      res,
      500,
      "avatar_delete_failed",
      "Failed to delete avatar",
    );
  }
});

router.post("/profile/avatar/delete", requireJwt, async (req, res) => {
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

    const path = require("path");
    const fs = require("fs");
    const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
    const avatarsDir = path.join(uploadsDir, "avatars");
    const basename = path.basename(String(doc.avatarUrl || ""));
    const filePath = basename ? path.join(avatarsDir, basename) : "";
    try {
      if (filePath) await fs.promises.unlink(filePath);
    } catch (_) {}
    doc.avatarUrl = "";
    await doc.save();
    return res.json({ success: true, message: "Avatar deleted" });
  } catch (err) {
    console.error("POST /api/auth/profile/avatar/delete error:", err);
    return respond.error(
      res,
      500,
      "avatar_delete_failed",
      "Failed to delete avatar",
    );
  }
});

const changeEmailAuthenticatedSchema = Joi.object({
  password: Joi.string().min(6).max(200).required(),
  newEmail: Joi.string().email().required(),
});

const staffCreateSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().trim().min(1).max(100).optional(),
  lastName: Joi.string().trim().min(1).max(100).optional(),
  phoneNumber: Joi.string().trim().allow("", null).optional(),
  office: Joi.string().trim().required(),
  role: Joi.string().trim().required(),
});

const firstLoginChangeCredentialsSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(200).optional(),
  newPassword: Joi.string().min(6).max(200).required(),
  newUsername: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9][a-z0-9._-]{2,39}$/)
    .required(),
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

      await createAuditLog(
        doc._id,
        "password_change",
        "password",
        "[REDACTED]", // Don't log actual passwords
        "[REDACTED]",
        roleSlug,
        {
          ip,
          userAgent,
          tokenVersion: doc.tokenVersion,
          mfaReEnrollmentRequired: !!doc.mfaReEnrollmentRequired,
        },
      );

      // Send password change notification (non-blocking)
      sendPasswordChangeNotification(doc._id, {
        timestamp: new Date(),
      }).catch((err) => {
        console.error("Failed to send password change notification:", err);
      });

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
      // The 304 happens because Express/ETag sees the response hasn't changed.
      // To "make it 200", we can disable caching for this specific route.
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

const changePasswordStartSchema = Joi.object({
  newPassword: Joi.string().min(12).max(200).required(),
});

// POST /api/auth/change-password/start
// Step 1: send OTP to email to confirm password change
router.post(
  "/change-password/start",
  requireJwt,
  validateBody(changePasswordStartSchema),
  async (req, res) => {
    try {
      const { newPassword } = req.body || {};

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

      // Validate new password strength
      const sanitizedNewPassword = sanitizeString(newPassword || "");
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

      const email = String(doc.email || "").toLowerCase();
      const code = generateCode();
      const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
      const expiresAtMs = Date.now() + ttlMin * 60 * 1000;
      const key = email;

      // Store the request with the new password (will be hashed after OTP verification)
      changePasswordRequests.set(key, {
        code,
        expiresAt: expiresAtMs,
        newPassword: sanitizedNewPassword,
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

const changePasswordVerifySchema = Joi.object({
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

// POST /api/auth/change-password/verify
// Step 2: verify OTP and change password
router.post(
  "/change-password/verify",
  requireJwt,
  validateBody(changePasswordVerifySchema),
  async (req, res) => {
    try {
      const { code } = req.body || {};

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

      if (!reqObj)
        return respond.error(
          res,
          404,
          "request_not_found",
          "No password change request found. Please start again.",
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
      if (!reqObj.verified) {
        reqObj.verified = true;
        changePasswordRequests.set(email, reqObj);
      }

      const sanitizedNewPassword = reqObj.newPassword;

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

      await createAuditLog(
        doc._id,
        "password_change",
        "password",
        "[REDACTED]", // Don't log actual passwords
        "[REDACTED]",
        roleSlug,
        {
          ip,
          userAgent,
          tokenVersion: doc.tokenVersion,
          mfaReEnrollmentRequired: !!doc.mfaReEnrollmentRequired,
          method: "otp_verification",
        },
      );

      // Send password change notification (non-blocking)
      sendPasswordChangeNotification(doc._id, {
        timestamp: new Date(),
      }).catch((err) => {
        console.error("Failed to send password change notification:", err);
      });

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
        const { signAccessToken } = require("../../middleware/auth");
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

const changeEmailStartSchema = Joi.object({
  newEmail: Joi.string().email().required(),
});

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

const changeEmailVerifySchema = Joi.object({
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

// POST /api/auth/change-email/verify
// Step 2: verify OTP and update user's email
router.post(
  "/change-email/verify",
  requireJwt,
  validateBody(changeEmailVerifySchema),
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

      const key = String(doc.email || "").toLowerCase();
      const reqObj = changeEmailRequests.get(key);
      if (!reqObj)
        return respond.error(
          res,
          404,
          "change_email_request_not_found",
          "No change email request found",
        );
      if (Date.now() > reqObj.expiresAt)
        return respond.error(res, 410, "code_expired", "Code expired");

      const { code } = req.body || {};
      if (String(reqObj.code) !== String(code))
        return respond.error(res, 401, "invalid_code", "Invalid code");

      const nextEmail = String(reqObj.newEmail || "").toLowerCase();
      if (!nextEmail)
        return respond.error(res, 400, "invalid_email", "Invalid email");
      const exists = await User.findOne({ email: nextEmail }).lean();
      if (exists) {
        changeEmailRequests.delete(key);
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

const changeEmailConfirmStartSchema = Joi.object({
  email: Joi.string().email().optional(),
});

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

const changeEmailConfirmVerifySchema = Joi.object({
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

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
      if (!reqObj)
        return respond.error(
          res,
          404,
          "change_email_confirm_not_found",
          "No confirmation request found",
        );
      if (Date.now() > reqObj.expiresAt)
        return respond.error(res, 410, "code_expired", "Code expired");
      const { code } = req.body || {};
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
// GET /api/auth/users
router.get("/users", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const docs = await User.find({}).lean();

    // Manually fetch all roles to avoid populate errors with bad data
    const Role = require("../../models/Role");
    const allRoles = await Role.find({}).lean();
    const roleMap = new Map(allRoles.map((r) => [String(r._id), r]));
    const roleSlugMap = new Map(allRoles.map((r) => [r.slug, r]));

    const usersSafe = [];
    for (const doc of docs) {
      let roleData = null;

      // Handle ObjectId reference
      if (doc.role && mongoose.Types.ObjectId.isValid(doc.role)) {
        roleData = roleMap.get(String(doc.role));
      }
      // Handle string slug reference (legacy/bad data)
      else if (doc.role && typeof doc.role === "string") {
        roleData = roleSlugMap.get(doc.role);
        // Auto-fix if we found the role object for this string
        if (roleData) {
          try {
            await User.updateOne({ _id: doc._id }, { role: roleData._id });
          } catch (_) {}
        }
      }

      const roleSlug = roleData ? roleData.slug : "user";

      usersSafe.push({
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: displayPhoneNumber(doc.phoneNumber),
        username: doc.username || "",
        office: doc.office || "",
        isActive: doc.isActive !== false,
        isStaff: !!doc.isStaff,
        mustChangeCredentials: !!doc.mustChangeCredentials,
        mustSetupMfa: !!doc.mustSetupMfa,
        isEmailVerified: !!doc.isEmailVerified,
        termsAccepted: doc.termsAccepted,
        createdAt: doc.createdAt,
      });
    }

    return res.json(usersSafe);
  } catch (err) {
    console.error("GET /api/auth/users error:", err);
    return respond.error(res, 500, "users_load_failed", "Failed to load users");
  }
});

router.get("/staff", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    await refreshStaffRoleCache();
    const staffRoleSlugs = getStaffRoles();
    const staffRoles = await Role.find({
      slug: { $in: staffRoleSlugs },
    }).lean();
    const ids = staffRoles.map((r) => r._id);
    const docs = await User.find({ role: { $in: ids } })
      .populate("role")
      .lean();
    const staffSafe = docs.map((doc) => {
      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
      return {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        username: doc.username || "",
        office: doc.office || "",
        phoneNumber: displayPhoneNumber(doc.phoneNumber),
        isActive: doc.isActive !== false,
        mustChangeCredentials: !!doc.mustChangeCredentials,
        mustSetupMfa: !!doc.mustSetupMfa,
        createdAt: doc.createdAt,
      };
    });
    return res.json(staffSafe);
  } catch (err) {
    console.error("GET /api/auth/staff error:", err);
    return respond.error(res, 500, "staff_load_failed", "Failed to load staff");
  }
});

router.post(
  "/staff",
  requireJwt,
  requireRole(["admin"]),
  validateBody(staffCreateSchema),
  async (req, res) => {
    try {
      const { email, firstName, lastName, phoneNumber, office, role } =
        req.body || {};
      const emailKey = String(email).toLowerCase().trim();

      const exists = await User.findOne({ email: emailKey }).lean();
      if (exists)
        return respond.error(res, 409, "email_exists", "Email already exists");

      const roleDoc = await Role.findOne({
        slug: String(role || "").toLowerCase(),
      }).lean();
      if (!roleDoc || !roleDoc.isStaffRole) {
        return respond.error(res, 400, "role_not_found", "Role not found");
      }

      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const storedPhone =
        phoneNumber && String(phoneNumber).trim()
          ? String(phoneNumber).trim()
          : `__unset__${generateToken().slice(0, 16)}`;
      const canonicalOffice = normalizeOfficeCode(office);
      const officeDoc = await Office.findOne({
        code: canonicalOffice,
        isActive: true,
      }).lean();
      if (!officeDoc)
        return respond.error(res, 400, "office_not_found", "Office not found");

      const derived = deriveNamesFromEmail(emailKey);
      const safeFirstName = String(firstName || "").trim() || derived.firstName;
      const safeLastName = String(lastName || "").trim() || derived.lastName;

      const created = await User.create({
        role: roleDoc._id,
        firstName: safeFirstName,
        lastName: safeLastName,
        email: emailKey,
        phoneNumber: storedPhone,
        office: canonicalOffice,
        isStaff: true,
        isActive: false,
        mustChangeCredentials: true,
        mustSetupMfa: true,
        termsAccepted: true,
        passwordHash,
        passwordChangedAt: new Date(),
        isEmailVerified: true,
      });

      const roleLabel = roleDoc.name || role;
      await sendStaffCredentialsEmail({
        to: emailKey,
        tempPassword,
        office: canonicalOffice,
        roleLabel,
      });

      const safe = {
        id: String(created._id),
        role,
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        office: created.office || "",
        phoneNumber: displayPhoneNumber(created.phoneNumber),
        isActive: created.isActive !== false,
        mustChangeCredentials: !!created.mustChangeCredentials,
        mustSetupMfa: !!created.mustSetupMfa,
        createdAt: created.createdAt,
      };
      if (process.env.NODE_ENV !== "production") {
        safe.devTempPassword = tempPassword;
      }
      return res.status(201).json(safe);
    } catch (err) {
      if (err && err.code === 11000) {
        return respond.error(res, 409, "duplicate_key", "Duplicate user field");
      }
      console.error("POST /api/auth/staff error:", err);
      return respond.error(
        res,
        500,
        "staff_create_failed",
        "Failed to create staff account",
      );
    }
  },
);

// GET /api/auth/profile - return current user's profile (alias for /me)
router.get("/profile", requireJwt, async (req, res) => {
  try {
    const doc = await User.findById(req._userId).populate("role").lean();
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
    const userSafe = {
      id: String(doc._id),
      role: roleSlug,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phoneNumber: displayPhoneNumber(doc.phoneNumber),
      username: doc.username || "",
      office: doc.office || "",
      isActive: doc.isActive !== false,
      isStaff: !!doc.isStaff,
      mustChangeCredentials: !!doc.mustChangeCredentials,
      mustSetupMfa: !!doc.mustSetupMfa,
      isEmailVerified: !!doc.isEmailVerified,
      termsAccepted: doc.termsAccepted,
      createdAt: doc.createdAt,
      deletionPending: !!doc.deletionPending,
      deletionRequestedAt: doc.deletionRequestedAt,
      deletionScheduledFor: doc.deletionScheduledFor,
    };

    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    return res.json(userSafe);
  } catch (err) {
    console.error("GET /api/auth/profile error:", err);
    return respond.error(
      res,
      500,
      "profile_load_failed",
      "Failed to load profile",
    );
  }
});

// GET /api/auth/me - return current user's profile
router.get("/me", requireJwt, async (req, res) => {
  try {
    const doc = await User.findById(req._userId).populate("role").lean();
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
    const userSafe = {
      id: String(doc._id),
      role: roleSlug,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phoneNumber: displayPhoneNumber(doc.phoneNumber),
      username: doc.username || "",
      office: doc.office || "",
      isActive: doc.isActive !== false,
      isStaff: !!doc.isStaff,
      mustChangeCredentials: !!doc.mustChangeCredentials,
      mustSetupMfa: !!doc.mustSetupMfa,
      isEmailVerified: !!doc.isEmailVerified,
      termsAccepted: doc.termsAccepted,
      createdAt: doc.createdAt,
      deletionPending: !!doc.deletionPending,
      deletionRequestedAt: doc.deletionRequestedAt,
      deletionScheduledFor: doc.deletionScheduledFor,
    };

    // Force 200 by adding a cache-busting header or modifying response headers
    // The 304 happens because Express/ETag sees the response hasn't changed.
    // To "make it 200", we can disable caching for this specific route.
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    return res.json(userSafe);
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return respond.error(
      res,
      500,
      "profile_load_failed",
      "Failed to load profile",
    );
  }
});

router.post(
  "/first-login/change-credentials",
  requireJwt,
  validateBody(firstLoginChangeCredentialsSchema),
  async (req, res) => {
    try {
      const { currentPassword, newPassword, newUsername } = req.body || {};
      const doc = await User.findById(req._userId).populate("role");
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      if (!doc.mustChangeCredentials) {
        return respond.error(
          res,
          400,
          "credentials_already_updated",
          "Credentials already updated",
        );
      }

      const hasCurrentPassword =
        typeof currentPassword === "string" && currentPassword.length > 0;
      if (hasCurrentPassword) {
        const ok = await bcrypt.compare(
          String(currentPassword || ""),
          String(doc.passwordHash || ""),
        );
        if (!ok)
          return respond.error(
            res,
            401,
            "invalid_current_password",
            "Invalid current password",
          );
      }

      const usernameKey = String(newUsername).toLowerCase().trim();
      const exists = await User.findOne({
        username: usernameKey,
        _id: { $ne: doc._id },
      }).lean();
      if (exists)
        return respond.error(
          res,
          409,
          "username_exists",
          "Username already exists",
        );

      const oldHash = String(doc.passwordHash);
      let mfaPlain = "";
      try {
        if (doc.mfaSecret) mfaPlain = decryptWithHash(oldHash, doc.mfaSecret);
      } catch (_) {
        mfaPlain = "";
      }

      doc.username = usernameKey;
      doc.passwordHash = await bcrypt.hash(String(newPassword), 10);
      doc.passwordChangedAt = new Date();
      if (mfaPlain) {
        try {
          doc.mfaSecret = encryptWithHash(doc.passwordHash, mfaPlain);
        } catch (_) {}
      }

      doc.mustChangeCredentials = false;
      if (doc.isStaff) doc.isActive = doc.mustSetupMfa ? false : true;
      await doc.save();

      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";
      const userSafe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: displayPhoneNumber(doc.phoneNumber),
        username: doc.username || "",
        office: doc.office || "",
        isActive: doc.isActive !== false,
        isStaff: !!doc.isStaff,
        mustChangeCredentials: !!doc.mustChangeCredentials,
        mustSetupMfa: !!doc.mustSetupMfa,
        isEmailVerified: !!doc.isEmailVerified,
        termsAccepted: doc.termsAccepted,
        createdAt: doc.createdAt,
      };
      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error(
        "POST /api/auth/first-login/change-credentials error:",
        err,
      );
      return respond.error(
        res,
        500,
        "first_login_failed",
        "Failed to update credentials",
      );
    }
  },
);

// PATCH /api/auth/profile - update current user's profile (excluding email/password)
router.patch(
  "/profile",
  requireJwt,
  validateBody(updateProfileSchema),
  async (req, res) => {
    try {
      const doc = await User.findById(req._userId).populate("role");
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const { firstName, lastName, phoneNumber } = req.body || {};
      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";

      // Prevent role changes (only admins can change roles via admin endpoints)
      // Note: Joi schema already forbids this, but double-check for safety
      // Check original body before Joi validation strips it
      const originalBody = req.body;
      if (originalBody && originalBody.role !== undefined) {
        const { isStaffRole } = require("../../lib/roleHelpers");
        if (isStaffRole(roleSlug)) {
          return respond.error(
            res,
            403,
            "field_restricted",
            "Role cannot be changed by staff users",
          );
        }
        return respond.error(
          res,
          403,
          "field_restricted",
          "Role cannot be changed through this endpoint",
        );
      }

      // Check if staff is trying to change restricted fields
      if (isStaffRole(roleSlug)) {
        const { isRestrictedFieldForStaff } = require("../../lib/roleHelpers");
        if (
          req.body.password !== undefined &&
          isRestrictedFieldForStaff("password")
        ) {
          return respond.error(
            res,
            403,
            "field_restricted",
            "Password cannot be edited by staff users",
          );
        }
      }

      // Track changes for audit logging
      const changes = [];
      const oldValues = {};
      const newValues = {};

      if (typeof firstName === "string" && firstName.trim() !== doc.firstName) {
        oldValues.firstName = doc.firstName;
        newValues.firstName = firstName.trim();
        doc.firstName = firstName.trim();
        changes.push("firstName");
      }

      if (typeof lastName === "string" && lastName.trim() !== doc.lastName) {
        oldValues.lastName = doc.lastName;
        newValues.lastName = lastName.trim();
        doc.lastName = lastName.trim();
        changes.push("lastName");
      }

      if (
        typeof phoneNumber === "string" &&
        phoneNumber.trim() !== doc.phoneNumber
      ) {
        oldValues.phoneNumber = doc.phoneNumber;
        newValues.phoneNumber = phoneNumber.trim();
        doc.phoneNumber = phoneNumber.trim();
        changes.push("phoneNumber");
      }

      // If no changes, return early
      if (changes.length === 0) {
        const updatedDoc = await User.findById(doc._id).populate("role").lean();
        const roleSlugFinal =
          updatedDoc.role && updatedDoc.role.slug
            ? updatedDoc.role.slug
            : "user";
        const userSafe = {
          id: String(updatedDoc._id),
          role: roleSlugFinal,
          firstName: updatedDoc.firstName,
          lastName: updatedDoc.lastName,
          email: updatedDoc.email,
          phoneNumber: displayPhoneNumber(updatedDoc.phoneNumber),
          username: updatedDoc.username || "",
          office: updatedDoc.office || "",
          termsAccepted: updatedDoc.termsAccepted,
          createdAt: updatedDoc.createdAt,
        };
        return res.json({ updated: true, user: userSafe });
      }

      await doc.save();

      // Create audit logs for each changed field
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      for (const field of changes) {
        await createAuditLog(
          doc._id,
          field === "firstName" || field === "lastName"
            ? "name_update"
            : "contact_update",
          field,
          oldValues[field] || "",
          newValues[field] || "",
          roleSlug,
          {
            ip,
            userAgent,
            allChanges: changes,
          },
        );
      }

      // Refetch to ensure we have the latest data
      const updatedDoc = await User.findById(doc._id).populate("role").lean();
      const roleSlugFinal =
        updatedDoc.role && updatedDoc.role.slug ? updatedDoc.role.slug : "user";

      const userSafe = {
        id: String(updatedDoc._id),
        role: roleSlugFinal,
        firstName: updatedDoc.firstName,
        lastName: updatedDoc.lastName,
        email: updatedDoc.email,
        phoneNumber: displayPhoneNumber(updatedDoc.phoneNumber),
        username: updatedDoc.username || "",
        office: updatedDoc.office || "",
        termsAccepted: updatedDoc.termsAccepted,
        createdAt: updatedDoc.createdAt,
      };
      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error("PATCH /api/auth/profile error:", err);
      return respond.error(
        res,
        500,
        "profile_update_failed",
        "Failed to update profile",
      );
    }
  },
);

// ============================================
// Business Owner Profile Edit Endpoints
// ============================================

// POST /api/auth/profile/verification/request
// Request verification code for a field change
const requestVerificationSchema = Joi.object({
  field: Joi.string().required(),
  method: Joi.string().valid("otp", "mfa").default("otp"),
});

// Alias route: /api/auth/verification/request -> /api/auth/profile/verification/request
router.post(
  "/verification/request",
  requireJwt,
  verificationRateLimit(),
  validateBody(
    Joi.object({
      method: Joi.string().valid("otp", "mfa").default("otp"),
      purpose: Joi.string().required(),
    }),
  ),
  async (req, res) => {
    try {
      // Map purpose to field for compatibility with profile verification handler
      const purposeToField = {
        email_change: "email",
        password_change: "password",
      };
      const field = purposeToField[req.body.purpose] || req.body.purpose;

      // Call the verification service directly
      const { requestVerification } = require("../../lib/verificationService");
      const result = await requestVerification(
        req._userId,
        field,
        req.body.method || "otp",
      );

      if (!result.success) {
        return respond.error(
          res,
          400,
          "verification_request_failed",
          result.error,
        );
      }

      return res.json({
        success: true,
        method: result.method,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      console.error("POST /api/auth/verification/request error:", err);
      return respond.error(
        res,
        500,
        "verification_request_failed",
        "Failed to request verification",
      );
    }
  },
);

router.post(
  "/profile/verification/request",
  requireJwt,
  verificationRateLimit(),
  validateBody(requestVerificationSchema),
  async (req, res) => {
    try {
      const { field, method } = req.body || {};
      const doc = await User.findById(req._userId).populate("role");
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : "user";

      // Check if user is business owner
      if (!isBusinessOwnerRole(roleSlug)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "This endpoint is only available for business owners",
        );
      }

      // Check field permission
      const {
        checkFieldPermission,
      } = require("../../middleware/fieldPermissions");
      const permission = checkFieldPermission(roleSlug, field);
      if (!permission || !permission.requiresVerification) {
        return respond.error(
          res,
          400,
          "verification_not_required",
          `Field '${field}' does not require verification`,
        );
      }

      const purpose = `${field}_change`;
      const result = await requestVerification(doc._id, method, purpose);

      if (!result.success) {
        return respond.error(
          res,
          400,
          "verification_request_failed",
          result.error,
        );
      }

      return res.json({
        success: true,
        method: result.method,
        expiresAt: result.expiresAt,
        ...(result.devCode && { devCode: result.devCode }),
      });
    } catch (err) {
      console.error("POST /api/auth/profile/verification/request error:", err);
      return respond.error(
        res,
        500,
        "verification_request_failed",
        "Failed to request verification",
      );
    }
  },
);

// PATCH /api/auth/profile/email
// Update email (requires verification)
const updateEmailSchema = Joi.object({
  newEmail: Joi.string().email().required(),
  verificationCode: Joi.string().optional(),
  mfaCode: Joi.string().optional(),
});

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

      // Create audit log
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      await createAuditLog(
        doc._id,
        "email_change",
        "email",
        oldEmail,
        sanitizedEmail,
        roleSlug,
        {
          ip,
          userAgent,
          mfaReEnrollmentRequired: true,
          emailChangeRequestId: String(emailChangeRequest._id),
          expiresAt,
        },
      );

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

    // Create audit log
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await createAuditLog(
      doc._id,
      "email_change_reverted",
      "email",
      emailChangeRequest.newEmail,
      revertedEmail,
      roleSlug,
      {
        ip,
        userAgent,
        emailChangeRequestId: String(emailChangeRequest._id),
      },
    );

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

// PATCH /api/auth/profile/name
// Update name and date of birth (no verification required, but system verified)
const updateNameSchema = Joi.object({
  firstName: Joi.string()
    .min(1)
    .max(100)
    .custom((value, helpers) => {
      if (!value) return value;
      if (containsSqlInjection(value)) {
        return helpers.error("string.sqlInjection");
      }
      if (containsXss(value)) {
        return helpers.error("string.xss");
      }
      return value;
    })
    .optional(),
  lastName: Joi.string()
    .min(1)
    .max(100)
    .custom((value, helpers) => {
      if (!value) return value;
      if (containsSqlInjection(value)) {
        return helpers.error("string.sqlInjection");
      }
      if (containsXss(value)) {
        return helpers.error("string.xss");
      }
      return value;
    })
    .optional(),
  dateOfBirth: Joi.date().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided",
    "string.sqlInjection": "Invalid input: SQL injection attempt detected",
    "string.xss": "Invalid input: XSS attempt detected",
  });

router.patch(
  "/profile/name",
  requireJwt,
  profileUpdateRateLimit(),
  validateBody(updateNameSchema),
  async (req, res) => {
    try {
      const { firstName, lastName, dateOfBirth } = req.body || {};

      // Additional validation for SQL injection and XSS (double-check after Joi)
      if (firstName !== undefined) {
        if (containsSqlInjection(String(firstName))) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: SQL injection attempt detected",
          );
        }
        if (containsXss(String(firstName))) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: XSS attempt detected",
          );
        }
      }

      if (lastName !== undefined) {
        if (containsSqlInjection(String(lastName))) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: SQL injection attempt detected",
          );
        }
        if (containsXss(String(lastName))) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: XSS attempt detected",
          );
        }
      }

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

      const changes = [];
      const oldValues = {};

      if (firstName !== undefined) {
        const sanitized = sanitizeName(firstName);
        if (sanitized !== doc.firstName) {
          oldValues.firstName = doc.firstName;
          doc.firstName = sanitized;
          changes.push("firstName");
        }
      }

      if (lastName !== undefined) {
        const sanitized = sanitizeName(lastName);
        if (sanitized !== doc.lastName) {
          oldValues.lastName = doc.lastName;
          doc.lastName = sanitized;
          changes.push("lastName");
        }
      }

      if (dateOfBirth !== undefined) {
        const dob = new Date(dateOfBirth);
        if (dob.getTime() !== doc.dateOfBirth?.getTime()) {
          oldValues.dateOfBirth = doc.dateOfBirth;
          doc.dateOfBirth = dob;
          changes.push("dateOfBirth");
        }
      }

      if (changes.length === 0) {
        return res.json({ updated: false, message: "No changes detected" });
      }

      await doc.save();

      // Create audit log
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      // Use first field for fieldChanged (enum constraint), full list in metadata
      const primaryField = changes[0] || "firstName";
      await createAuditLog(
        doc._id,
        "name_update",
        primaryField,
        JSON.stringify(oldValues),
        JSON.stringify(
          changes.reduce((acc, field) => {
            acc[field] = doc[field];
            return acc;
          }, {}),
        ),
        roleSlug,
        {
          ip,
          userAgent,
          allChanges: changes,
        },
      );

      const userSafe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        dateOfBirth: doc.dateOfBirth,
      };

      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error("PATCH /api/auth/profile/name error:", err);
      return respond.error(
        res,
        500,
        "name_update_failed",
        "Failed to update name",
      );
    }
  },
);

// PATCH /api/auth/profile/contact
// Update contact number (no verification required)
const updateContactSchema = Joi.object({
  phoneNumber: Joi.alternatives()
    .try(
      Joi.string()
        .min(4)
        .max(15)
        .pattern(/^[0-9+\-() ]+$/, { name: "phone" })
        .custom((value, helpers) => {
          // Must contain at least one digit
          if (!/\d/.test(value)) {
            return helpers.error("string.pattern.base", { pattern: "phone" });
          }
          // Check for invalid patterns like 'abc123' (contains letters) - pattern should catch this, but double-check
          if (/[a-zA-Z]/.test(value)) {
            return helpers.error("string.pattern.base", { pattern: "phone" });
          }
          return value;
        })
        .required(),
      Joi.string().valid("", null).optional(),
    )
    .messages({
      "alternatives.match":
        "Phone number must be 4-15 characters and contain only digits, +, -, (, ), and spaces, or be empty",
      "string.pattern.base":
        "Phone number must contain only digits, +, -, (, ), and spaces",
      "string.min": "Phone number must be at least 4 characters",
      "string.max": "Phone number must be at most 15 characters",
    }),
});

// Custom validation middleware for phone numbers (before Joi)
// This MUST run before validateBody to catch invalid phone numbers that Joi alternatives might miss
function validatePhoneNumberMiddleware(req, res, next) {
  // Store original body before Joi processes it
  if (!req._originalBody) {
    req._originalBody = JSON.parse(JSON.stringify(req.body || {}));
  }

  const { phoneNumber } = req.body || {};
  // Only validate if phoneNumber is provided and not empty
  if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "") {
    const phoneStr = String(phoneNumber).trim();
    // Check length first
    if (phoneStr.length < 4) {
      return respond.error(
        res,
        400,
        "validation_error",
        "Phone number must be at least 4 characters",
      );
    }
    if (phoneStr.length > 15) {
      return respond.error(
        res,
        400,
        "validation_error",
        "Phone number must be at most 15 characters",
      );
    }
    // Check pattern (only digits, +, -, (, ), and spaces) - this will catch 'abc123'
    if (!/^[0-9+\-() ]+$/.test(phoneStr)) {
      return respond.error(
        res,
        400,
        "validation_error",
        "Phone number must contain only digits, +, -, (, ), and spaces",
      );
    }
    // Must contain at least one digit
    if (!/\d/.test(phoneStr)) {
      return respond.error(
        res,
        400,
        "validation_error",
        "Phone number must contain at least one digit",
      );
    }
  }
  next();
}

router.patch(
  "/profile/contact",
  requireJwt,
  profileUpdateRateLimit(),
  validatePhoneNumberMiddleware,
  validateBody(updateContactSchema),
  async (req, res) => {
    try {
      // Double-check validation here as a safety net (in case middleware didn't catch it)
      // Use original body if available, otherwise use req.body
      const originalPhoneNumber =
        req._originalBody && req._originalBody.phoneNumber !== undefined
          ? req._originalBody.phoneNumber
          : req.body.phoneNumber;

      if (
        originalPhoneNumber !== undefined &&
        originalPhoneNumber !== null &&
        originalPhoneNumber !== ""
      ) {
        const phoneStr = String(originalPhoneNumber).trim();
        if (phoneStr.length < 4 || phoneStr.length > 15) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Phone number must be 4-15 characters",
          );
        }
        if (!/^[0-9+\-() ]+$/.test(phoneStr)) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Phone number must contain only digits, +, -, (, ), and spaces",
          );
        }
        if (!/\d/.test(phoneStr)) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Phone number must contain at least one digit",
          );
        }
      }

      const { phoneNumber } = req.body || {};

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

      const sanitized = sanitizePhoneNumber(phoneNumber || "");
      const oldPhoneNumber = doc.phoneNumber;

      // If phoneNumber was provided but is invalid, reject it
      if (
        phoneNumber !== undefined &&
        phoneNumber !== null &&
        phoneNumber !== "" &&
        (sanitized.length < 4 || sanitized.length > 15)
      ) {
        return respond.error(
          res,
          400,
          "validation_error",
          "Phone number must be 4-15 characters after sanitization",
        );
      }

      if (sanitized === oldPhoneNumber) {
        return res.json({ updated: false, message: "No changes detected" });
      }

      // Check if phone number is already in use (if provided)
      if (sanitized) {
        const existing = await User.findOne({ phoneNumber: sanitized });
        if (existing && String(existing._id) !== String(doc._id)) {
          return respond.error(
            res,
            409,
            "phone_exists",
            "Phone number already in use",
          );
        }
      }

      doc.phoneNumber = sanitized;
      await doc.save();

      // Create audit log
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      await createAuditLog(
        doc._id,
        "contact_update",
        "phoneNumber",
        oldPhoneNumber || "",
        sanitized || "",
        roleSlug,
        {
          ip,
          userAgent,
        },
      );

      const userSafe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
      };

      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error("PATCH /api/auth/profile/contact error:", err);
      return respond.error(
        res,
        500,
        "contact_update_failed",
        "Failed to update contact number",
      );
    }
  },
);

// GET /api/auth/profile/audit-history
// Get user's audit history
router.get("/profile/audit-history", requireJwt, async (req, res) => {
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

    const {
      limit = 50,
      skip = 0,
      eventType,
      startDate,
      endDate,
    } = req.query || {};

    const query = { userId: doc._id };
    if (eventType) {
      query.eventType = eventType;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    // Mask sensitive data
    const safeLogs = auditLogs.map((log) => ({
      id: String(log._id),
      eventType: log.eventType,
      fieldChanged: log.fieldChanged,
      oldValue: log.fieldChanged === "password" ? "[REDACTED]" : log.oldValue,
      newValue: log.fieldChanged === "password" ? "[REDACTED]" : log.newValue,
      role: log.role,
      createdAt: log.createdAt,
      verified: log.verified,
      txHash: log.txHash,
      blockNumber: log.blockNumber,
    }));

    const total = await AuditLog.countDocuments(query);

    return res.json({
      logs: safeLogs,
      total,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (err) {
    console.error("GET /api/auth/profile/audit-history error:", err);
    return respond.error(
      res,
      500,
      "audit_history_failed",
      "Failed to retrieve audit history",
    );
  }
});

// GET /api/auth/profile/verify-ipfs
// Verify if an IPFS document exists and is accessible
router.get("/profile/verify-ipfs", requireJwt, async (req, res) => {
  try {
    const { cid } = req.query;

    if (!cid || typeof cid !== "string" || cid.trim() === "") {
      return respond.error(res, 400, "cid_required", "IPFS CID is required");
    }

    const cleanCid = cid.trim();

    // Validate CID format (basic check for IPFS CIDs)
    const cidPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]+)$/;
    if (!cidPattern.test(cleanCid)) {
      return respond.error(res, 400, "invalid_cid", "Invalid IPFS CID format");
    }

    const apiUrl = process.env.IPFS_API_URL || "http://127.0.0.1:5001";
    const gatewayUrl =
      process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs/";
    const axios = require("axios");

    // Try to retrieve the file from IPFS using HTTP API
    let fileExists = false;
    let fileSize = null;
    let isPinned = false;
    let error = null;
    let fileType = null;

    try {
      // Method 1: Try to stat the file (check if it exists)
      try {
        const statResponse = await axios.post(
          `${apiUrl}/api/v0/files/stat`,
          null,
          {
            params: { arg: `/ipfs/${cleanCid}`, format: "json" },
            timeout: 5000,
          },
        );
        if (statResponse.data && statResponse.data.Size) {
          fileExists = true;
          fileSize = parseInt(statResponse.data.Size) || null;
        }
      } catch (statError) {
        // Stat failed, try cat instead
        try {
          const catResponse = await axios.post(`${apiUrl}/api/v0/cat`, null, {
            params: { arg: cleanCid },
            responseType: "arraybuffer",
            timeout: 10000,
            maxContentLength: 50 * 1024 * 1024, // 50MB max
          });
          fileExists = true;
          fileSize = catResponse.data.byteLength || null;

          // Try to determine file type from first bytes
          const buffer = Buffer.from(catResponse.data.slice(0, 10));
          const header = buffer.toString("hex");
          if (header.startsWith("ffd8ff")) fileType = "image/jpeg";
          else if (header.startsWith("89504e47")) fileType = "image/png";
          else if (header.startsWith("25504446")) fileType = "application/pdf";
          else if (buffer.toString("utf8", 0, 1) === "{")
            fileType = "application/json";
        } catch (catError) {
          fileExists = false;
          error =
            catError.response?.data?.Message ||
            catError.message ||
            "File not found in IPFS";
        }
      }
    } catch (apiError) {
      fileExists = false;
      error =
        apiError.response?.data?.Message ||
        apiError.message ||
        "Failed to connect to IPFS";
    }

    // Check if file is pinned (only if file exists)
    if (fileExists) {
      try {
        const pinResponse = await axios.post(`${apiUrl}/api/v0/pin/ls`, null, {
          params: { arg: cleanCid, type: "all" },
          timeout: 5000,
        });
        if (pinResponse.data && pinResponse.data.Keys) {
          isPinned = Object.keys(pinResponse.data.Keys).length > 0;
        }
      } catch (pinError) {
        // Pin check failed, but file exists - not critical
        console.warn("Failed to check pin status", {
          cid: cleanCid,
          error: pinError.message,
        });
      }
    }

    const fullGatewayUrl = `${gatewayUrl.replace(/\/$/, "")}/${cleanCid}`;

    return res.json({
      exists: fileExists,
      accessible: fileExists,
      pinned: isPinned,
      cid: cleanCid,
      size: fileSize,
      fileType: fileType,
      gatewayUrl: fullGatewayUrl,
      error: error || null,
    });
  } catch (err) {
    console.error("GET /api/auth/profile/verify-ipfs error:", err);
    return respond.error(
      res,
      500,
      "verification_failed",
      "Failed to verify IPFS document",
    );
  }
});

// GET /api/auth/profile/approvals/pending
// Get pending approval requests for current user
router.get("/profile/approvals/pending", requireJwt, async (req, res) => {
  try {
    const doc = await User.findById(req._userId).populate("role");
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const AdminApproval = require("../../models/AdminApproval");

    // Find pending approvals for this user
    const pendingApprovals = await AdminApproval.find({
      userId: doc._id,
      status: "pending",
    })
      .populate("requestedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      approvals: pendingApprovals.map((approval) => ({
        _id: approval._id,
        approvalId: approval.approvalId,
        requestType: approval.requestType,
        status: approval.status,
        requestDetails: approval.requestDetails,
        createdAt: approval.createdAt,
        requestedBy: approval.requestedBy
          ? {
              firstName: approval.requestedBy.firstName,
              lastName: approval.requestedBy.lastName,
              email: approval.requestedBy.email,
            }
          : null,
        requiredApprovals: approval.requiredApprovals,
        currentApprovals: approval.approvals ? approval.approvals.length : 0,
      })),
    });
  } catch (err) {
    console.error("GET /api/auth/profile/approvals/pending error:", err);
    return respond.error(
      res,
      500,
      "fetch_pending_approvals_failed",
      "Failed to fetch pending approvals",
    );
  }
});

// GET /api/auth/profile/approvals/pending
// Get pending approval requests for current user
router.get("/profile/approvals/pending", requireJwt, async (req, res) => {
  try {
    const doc = await User.findById(req._userId).populate("role");
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const AdminApproval = require("../../models/AdminApproval");

    // Find pending approvals for this user
    const pendingApprovals = await AdminApproval.find({
      userId: doc._id,
      status: "pending",
    })
      .populate("requestedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      approvals: pendingApprovals.map((approval) => ({
        _id: approval._id,
        approvalId: approval.approvalId,
        requestType: approval.requestType,
        status: approval.status,
        requestDetails: approval.requestDetails,
        createdAt: approval.createdAt,
        requestedBy: approval.requestedBy
          ? {
              firstName: approval.requestedBy.firstName,
              lastName: approval.requestedBy.lastName,
              email: approval.requestedBy.email,
            }
          : null,
        requiredApprovals: approval.requiredApprovals,
        currentApprovals: approval.approvals ? approval.approvals.length : 0,
      })),
    });
  } catch (err) {
    console.error("GET /api/auth/profile/approvals/pending error:", err);
    return respond.error(
      res,
      500,
      "fetch_pending_approvals_failed",
      "Failed to fetch pending approvals",
    );
  }
});

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

    // Create audit log
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await createAuditLog(
      doc._id,
      "email_change_reverted",
      "email",
      emailChangeRequest.newEmail,
      revertedEmail,
      roleSlug,
      {
        ip,
        userAgent,
        emailChangeRequestId: String(emailChangeRequest._id),
      },
    );

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

// ============================================
// Admin Profile Edit Endpoints (with Approval Workflow)
// ============================================

// PATCH /api/auth/profile/contact (Admin only - no approval required)
// Update contact number for admin
const updateAdminContactSchema = Joi.object({
  phoneNumber: Joi.string().optional().allow(""),
});

router.patch(
  "/profile/contact",
  requireJwt,
  profileUpdateRateLimit(),
  validateBody(updateAdminContactSchema),
  async (req, res) => {
    try {
      const { phoneNumber } = req.body || {};
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

      const sanitized = sanitizePhoneNumber(phoneNumber || "");
      const oldPhoneNumber = doc.phoneNumber;

      if (sanitized === oldPhoneNumber) {
        return res.json({ updated: false, message: "No changes detected" });
      }

      // Check if phone number is already in use (if provided)
      if (sanitized) {
        const existing = await User.findOne({ phoneNumber: sanitized });
        if (existing && String(existing._id) !== String(doc._id)) {
          return respond.error(
            res,
            409,
            "phone_exists",
            "Phone number already in use",
          );
        }
      }

      doc.phoneNumber = sanitized;
      await doc.save();

      // Create audit log
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      await createAuditLog(
        doc._id,
        "contact_update",
        "phoneNumber",
        oldPhoneNumber || "",
        sanitized || "",
        roleSlug,
        {
          ip,
          userAgent,
          adminSelfUpdate: true,
        },
      );

      const userSafe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
      };

      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error("PATCH /api/auth/profile/contact error:", err);
      return respond.error(
        res,
        500,
        "contact_update_failed",
        "Failed to update contact number",
      );
    }
  },
);

// PATCH /api/auth/profile/personal-info (Admin only - requires 2 admin approvals)
// Update name and contact info for admin
const updateAdminPersonalInfoSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  phoneNumber: Joi.string().optional().allow(""),
});

router.patch(
  "/profile/personal-info",
  requireJwt,
  adminApprovalRateLimit(),
  validateBody(updateAdminPersonalInfoSchema),
  async (req, res) => {
    try {
      const { firstName, lastName, phoneNumber } = req.body || {};
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

      // Prepare changes
      const changes = {};
      const oldValues = {};

      if (firstName !== undefined && firstName !== doc.firstName) {
        oldValues.firstName = doc.firstName;
        changes.firstName = sanitizeName(firstName);
      }

      if (lastName !== undefined && lastName !== doc.lastName) {
        oldValues.lastName = doc.lastName;
        changes.lastName = sanitizeName(lastName);
      }

      if (phoneNumber !== undefined && phoneNumber !== doc.phoneNumber) {
        oldValues.phoneNumber = doc.phoneNumber;
        changes.phoneNumber = sanitizePhoneNumber(phoneNumber || "");
      }

      if (Object.keys(changes).length === 0) {
        return res.json({ updated: false, message: "No changes detected" });
      }

      // Check if phone number is already in use
      if (changes.phoneNumber) {
        const existing = await User.findOne({
          phoneNumber: changes.phoneNumber,
        });
        if (existing && String(existing._id) !== String(doc._id)) {
          return respond.error(
            res,
            409,
            "phone_exists",
            "Phone number already in use",
          );
        }
      }

      // Create approval request
      const approvalId = AdminApproval.generateApprovalId();
      const approval = await AdminApproval.create({
        approvalId,
        requestType: "personal_info_change",
        userId: doc._id,
        requestedBy: doc._id,
        requestDetails: {
          oldValues,
          newValues: changes,
          fields: Object.keys(changes),
        },
        status: "pending",
        requiredApprovals: 2,
        metadata: {
          ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
        },
      });

      // Create audit log for approval request
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      // Use first field name (fieldChanged enum doesn't accept comma-separated values)
      const changedFields = Object.keys(changes);
      const fieldChanged = changedFields[0] || undefined;
      await createAuditLog(
        doc._id,
        "admin_approval_request",
        fieldChanged,
        JSON.stringify(oldValues),
        JSON.stringify(changes),
        roleSlug,
        {
          ip,
          userAgent,
          approvalId,
          requestType: "personal_info_change",
        },
      );

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
      console.error("PATCH /api/auth/profile/personal-info error:", err);
      return respond.error(
        res,
        500,
        "personal_info_update_failed",
        "Failed to create approval request",
      );
    }
  },
);

// PATCH /api/auth/profile/email (Admin only - requires OTP/MFA + 2 admin approvals)
// Change email for admin
const updateAdminEmailSchema = Joi.object({
  newEmail: Joi.string().email().required(),
  verificationCode: Joi.string().optional(),
  mfaCode: Joi.string().optional(),
});

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
      await createAuditLog(
        doc._id,
        "admin_approval_request",
        "email",
        oldEmail,
        sanitizedEmail,
        roleSlug,
        {
          ip,
          userAgent,
          approvalId,
          requestType: "email_change",
        },
      );

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

// PATCH /api/auth/profile/password (Admin only - requires OTP/MFA + 2 admin approvals)
// Change password for admin
const updateAdminPasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(200).optional(),
  newPassword: Joi.string().min(6).max(200).required(),
  verificationCode: Joi.string().optional(),
  mfaCode: Joi.string().optional(),
});

router.patch(
  "/profile/password",
  requireJwt,
  passwordChangeRateLimit(),
  validateBody(updateAdminPasswordSchema),
  requireFieldPermission("password"),
  async (req, res) => {
    try {
      const { currentPassword, newPassword, verificationCode, mfaCode } =
        req.body || {};
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

      // Verify current password if provided (alternative to OTP/MFA)
      let verificationPassed = false;
      if (currentPassword) {
        const ok = await bcrypt.compare(currentPassword, doc.passwordHash);
        if (ok) {
          verificationPassed = true;
        }
      }

      // Check OTP/MFA verification
      if (!verificationPassed) {
        const purpose = "password_change";
        if (verificationCode) {
          const verifyResult = await verifyCode(
            doc._id,
            verificationCode,
            "otp",
            purpose,
          );
          if (verifyResult.verified) {
            verificationPassed = true;
          }
        } else if (mfaCode) {
          const verifyResult = await verifyCode(
            doc._id,
            mfaCode,
            "mfa",
            purpose,
          );
          if (verifyResult.verified) {
            verificationPassed = true;
          }
        }

        if (!verificationPassed) {
          const status = await checkVerificationStatus(doc._id, purpose);
          if (!status.pending) {
            return respond.error(
              res,
              428,
              "verification_required",
              "Verification required. Provide current password, verification code, or MFA code.",
            );
          }
          return respond.error(
            res,
            428,
            "verification_required",
            "Please provide current password, verification code, or MFA code",
          );
        }
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return respond.error(
          res,
          400,
          "weak_password",
          "Password does not meet requirements",
          passwordValidation.errors,
        );
      }

      // Check password history
      const historyCheck = await checkPasswordHistory(
        newPassword,
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

      // Create approval request
      const approvalId = AdminApproval.generateApprovalId();
      const approval = await AdminApproval.create({
        approvalId,
        requestType: "password_change",
        userId: doc._id,
        requestedBy: doc._id,
        requestDetails: {
          // Don't store actual passwords, just indicate change requested
          passwordChangeRequested: true,
          passwordStrengthValid: true,
          passwordNotInHistory: true,
        },
        status: "pending",
        requiredApprovals: 2,
        metadata: {
          ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
          verificationCompleted: true,
          // Store password hash temporarily (will be cleared after approval)
          newPasswordHash: await bcrypt.hash(newPassword, 10),
        },
      });

      // Clear verification request
      clearVerificationRequest(doc._id, "password_change");

      // Create audit log for approval request
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      await createAuditLog(
        doc._id,
        "admin_approval_request",
        "password",
        "[REDACTED]",
        "[REDACTED]",
        roleSlug,
        {
          ip,
          userAgent,
          approvalId,
          requestType: "password_change",
        },
      );

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
      console.error("PATCH /api/auth/profile/password error:", err);
      return respond.error(
        res,
        500,
        "password_update_failed",
        "Failed to create approval request",
      );
    }
  },
);

// Helper function to apply approved changes
async function applyApprovedChange(approval) {
  try {
    const user = await User.findById(approval.userId).populate("role");
    if (!user) {
      console.error("User not found for approval:", approval.approvalId);
      return { success: false, error: "User not found" };
    }

    const roleSlug = user.role && user.role.slug ? user.role.slug : "user";

    switch (approval.requestType) {
      case "personal_info_change": {
        const { newValues } = approval.requestDetails;
        if (newValues.firstName) user.firstName = newValues.firstName;
        if (newValues.lastName) user.lastName = newValues.lastName;
        if (newValues.phoneNumber !== undefined)
          user.phoneNumber = newValues.phoneNumber;
        await user.save();

        // Create audit log
        const AuditLog = require("../../models/AuditLog");
        const changedFields = Object.keys(newValues);
        // Use first field for fieldChanged (enum constraint), full list in metadata
        const primaryField = changedFields[0] || "firstName";
        const hash = calculateAuditHash(
          user._id,
          "admin_approval_approved",
          primaryField,
          JSON.stringify(approval.requestDetails.oldValues),
          JSON.stringify(newValues),
          roleSlug,
          {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            allChangedFields: changedFields,
          },
        );
        await AuditLog.create({
          userId: user._id,
          eventType: "admin_approval_approved",
          fieldChanged: primaryField,
          oldValue: JSON.stringify(approval.requestDetails.oldValues),
          newValue: JSON.stringify(newValues),
          hash,
          role: roleSlug,
          metadata: {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            allChangedFields: changedFields,
          },
        });

        return { success: true };
      }

      case "email_change": {
        const { newEmail } = approval.requestDetails;
        const oldEmail = user.email;
        user.email = newEmail;
        user.isEmailVerified = false;
        user.mfaReEnrollmentRequired = true;
        user.mfaEnabled = false;
        user.mfaSecret = "";
        user.mfaMethod = "";
        await user.save();

        // Create audit log
        const AuditLog = require("../../models/AuditLog");
        await AuditLog.create({
          userId: user._id,
          eventType: "admin_approval_approved",
          fieldChanged: "email",
          oldValue: oldEmail,
          newValue: newEmail,
          role: roleSlug,
          metadata: {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            mfaReEnrollmentRequired: !!user.mfaReEnrollmentRequired,
          },
        });

        return { success: true };
      }

      case "password_change": {
        const { newPasswordHash } = approval.metadata;
        if (!newPasswordHash) {
          return {
            success: false,
            error: "Password hash not found in approval metadata",
          };
        }

        const oldHash = String(user.passwordHash);
        const hadMfaSecret = !!user.mfaSecret;
        const priorMfaMethod = String(user.mfaMethod || "");
        let mfaPlain = "";
        try {
          if (hadMfaSecret) mfaPlain = decryptWithHash(oldHash, user.mfaSecret);
        } catch (_) {
          mfaPlain = "";
        }
        const updatedHistory = addToPasswordHistory(
          oldHash,
          user.passwordHistory || [],
        );

        user.passwordHash = newPasswordHash;
        user.passwordChangedAt = new Date();
        user.passwordHistory = updatedHistory;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all sessions
        user.mfaReEnrollmentRequired = false;
        user.mfaDisablePending = false;
        user.mfaDisableRequestedAt = null;
        user.mfaDisableScheduledFor = null;
        user.tokenFprint = "";

        if (hadMfaSecret) {
          if (!mfaPlain) {
            user.mfaReEnrollmentRequired = true;
            user.mfaEnabled = false;
            user.mfaSecret = "";
            user.mfaMethod = "";
          } else {
            try {
              user.mfaSecret = encryptWithHash(user.passwordHash, mfaPlain);
              user.mfaEnabled = true;
              user.mfaMethod = priorMfaMethod || "authenticator";
            } catch (_) {
              user.mfaReEnrollmentRequired = true;
              user.mfaEnabled = false;
              user.mfaSecret = "";
              user.mfaMethod = "";
            }
          }
        }
        await user.save();

        // Clear password hash from approval metadata (security)
        approval.metadata.newPasswordHash = undefined;
        await approval.save();

        // Create audit log
        const AuditLog = require("../../models/AuditLog");
        await AuditLog.create({
          userId: user._id,
          eventType: "admin_approval_approved",
          fieldChanged: "password",
          oldValue: "[REDACTED]",
          newValue: "[REDACTED]",
          role: roleSlug,
          metadata: {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            tokenVersion: user.tokenVersion,
            mfaReEnrollmentRequired: true,
          },
        });

        return { success: true };
      }

      case "maintenance_mode": {
        const { action, message, expectedResumeAt } =
          approval.requestDetails || {};
        const approvedBy = approval.approvals.map((a) => String(a.adminId));
        const now = new Date();

        if (action === "enable") {
          await MaintenanceWindow.updateMany(
            { isActive: true },
            { isActive: false, status: "ended", deactivatedAt: now },
          );
          await MaintenanceWindow.create({
            status: "active",
            isActive: true,
            message: message || "",
            expectedResumeAt: expectedResumeAt
              ? new Date(expectedResumeAt)
              : null,
            requestedBy: approval.requestedBy,
            approvedBy,
            activatedAt: now,
            metadata: { approvalId: approval.approvalId },
          });
        } else if (action === "disable") {
          await MaintenanceWindow.findOneAndUpdate(
            { isActive: true },
            { isActive: false, status: "ended", deactivatedAt: now },
            { sort: { createdAt: -1 } },
          );
        }

        await createAuditLog(
          approval.requestedBy,
          "maintenance_mode",
          "maintenance",
          "",
          action,
          "admin",
          {
            approvalId: approval.approvalId,
            message: message || "",
            expectedResumeAt: expectedResumeAt || null,
            approvedBy,
          },
        );

        return { success: true };
      }

      default:
        return { success: false, error: "Unknown request type" };
    }
  } catch (error) {
    console.error("Error applying approved change:", error);
    return { success: false, error: error.message };
  }
}

module.exports = router;

// Export helper function for use in approval route (after router export)
module.exports.applyApprovedChange = applyApprovedChange;
