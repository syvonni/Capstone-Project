const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const respond = require("../middleware/respond");
const { requireJwt } = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const { decryptWithHash, encryptWithHash } = require("../lib/secretCipher");
const { logAuditEvent } = require("../lib/auditClient");
const { validatePasswordStrength } = require("../lib/passwordValidator");

const router = express.Router();

function displayPhoneNumber(value) {
  const s = typeof value === "string" ? value : "";
  if (s.startsWith("__unset__")) return "";
  return s;
}

const firstLoginChangeCredentialsSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(200).optional(),
  newPassword: Joi.string().min(6).max(200).required(),
  newUsername: Joi.string().min(3).max(50).required(),
});

// POST /api/auth/first-login/change-credentials
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
      // Update accountStatus based on role and completion state
      if (doc.isStaff) {
        // Staff: active only when both password and MFA are set up
        doc.accountStatus =
          !doc.mustChangeCredentials && !doc.mustSetupMfa
            ? "active"
            : "pending_setup";
      } else {
        // Business owners: active after password change
        doc.accountStatus = "active";
      }
      await doc.save();

      logAuditEvent(
        req._userId,
        "first_login_credentials_changed",
        "User",
        req._userId,
        {
          role: req._role || "staff",
          fieldChanged: "password",
          oldValue: "",
          newValue: "changed",
        },
      ).catch(() => {});

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

module.exports = router;
