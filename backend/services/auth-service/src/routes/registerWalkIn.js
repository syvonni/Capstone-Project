const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const Role = require("../models/Role");
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");
const { logAuditEvent } = require("../lib/auditClient");
const { sanitizeName } = require("../lib/sanitizer");

const router = express.Router();

/**
 * POST /api/auth/register-walk-in
 * Officer creates a business_owner account on behalf of a walk-in customer.
 * Generates a temporary password.
 */
router.post(
  "/register-walk-in",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;

      if (!firstName || !lastName || !email) {
        return respond.error(
          res,
          400,
          "validation_error",
          "firstName, lastName, and email are required",
        );
      }

      // Check duplicate
      const existing = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existing) {
        return respond.error(
          res,
          409,
          "email_exists",
          "A user with this email already exists",
        );
      }

      // Get business_owner role
      const boRole = await Role.findOne({ slug: "business_owner" });
      if (!boRole) {
        return respond.error(
          res,
          500,
          "role_not_found",
          "business_owner role not found",
        );
      }

      // Generate temporary password
      const tempPassword = crypto.randomBytes(4).toString("hex") + "A1!"; // 11 chars, meets strength
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const user = await User.create({
        firstName: sanitizeName(firstName),
        lastName: sanitizeName(lastName),
        email: email.toLowerCase().trim(),
        phoneNumber: phone || "",
        password: hashedPassword,
        role: boRole._id,
        isVerified: true, // Walk-in verified in person
        mustChangeCredentials: true, // Force password change on first login
        termsAcceptedAt: new Date(),
      });

      logAuditEvent("walk_in_user_registered", req._userId, "User", user._id, {
        role: req._userRole,
        fieldChanged: "account",
        oldValue: "",
        newValue: "created",
        registeredUserId: user._id.toString(),
        email: user.email,
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
        tempPassword, // Officer gives this to the walk-in customer
      });
    } catch (err) {
      console.error("POST /api/auth/register-walk-in error:", err);
      return respond.error(
        res,
        500,
        "registration_failed",
        err.message || "Failed to register walk-in user",
      );
    }
  },
);

module.exports = router;
