const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const respond = require("../middleware/respond");
const { requireJwt } = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const { decryptWithHash, encryptWithHash } = require("../lib/secretCipher");
const { sanitizeString } = require("../lib/sanitizer");
const { logAuditEvent } = require("../lib/auditClient");
const inAppNotificationService = require("../services/notificationService");
const { isStaffRole } = require("../lib/roleHelpers");
const { isPasswordExpiredByPolicy } = require("../lib/passwordExpiry");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

function displayPhoneNumber(value) {
  const s = typeof value === "string" ? value : "";
  if (s.startsWith("__unset__")) return "";
  return s;
}

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  phoneNumber: Joi.string().optional(),
  role: Joi.any().forbidden().messages({
    "any.unknown": "Role cannot be changed through this endpoint",
  }), // Explicitly forbid role changes
});

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
    const passwordExpiredByPolicy = isPasswordExpiredByPolicy(
      doc.passwordChangedAt,
    );
    const userSafe = {
      id: String(doc._id),
      role: roleSlug,
      firstName: doc.firstName,
      lastName: doc.lastName,
      middleName: doc.middleName || "",
      suffix: doc.suffix || "",
      sex: doc.sex || "",
      dateOfBirth: doc.dateOfBirth || null,
      email: doc.email,
      phoneNumber: displayPhoneNumber(doc.phoneNumber),
      username: doc.username || "",
      office: doc.office || "",
      isActive: doc.isActive !== false,
      isStaff: !!doc.isStaff,
      mustChangeCredentials: !!doc.mustChangeCredentials,
      mustSetupMfa: !!doc.mustSetupMfa,
      isEmailVerified: !!doc.isEmailVerified,
      mfaEnabled: !!doc.mfaEnabled,
      mfaReEnrollmentRequired: !!doc.mfaReEnrollmentRequired,
      mfaMethod: doc.mfaMethod || "",
      termsAccepted: doc.termsAccepted,
      welcomeCompleted: !!doc.welcomeCompleted,
      createdAt: doc.createdAt,
      deletionPending: !!doc.deletionPending,
      deletionRequestedAt: doc.deletionRequestedAt,
      deletionScheduledFor: doc.deletionScheduledFor,
      // PIS (Personal Information Sheet) fields for business owners / profile edit
      address: doc.address || {
        street: "",
        barangay: "",
        city: "",
        province: "",
        zipCode: "",
      },
      maritalStatus: doc.maritalStatus || "",
      placeOfBirth: doc.placeOfBirth || "",
      nationality: doc.nationality || "",
      fatherName: doc.fatherName || "",
      motherName: doc.motherName || "",
      distinctiveMark: doc.distinctiveMark || "",
      highestEducationalAttainment: doc.highestEducationalAttainment || "",
      ...(passwordExpiredByPolicy && doc.mustChangeCredentials
        ? { passwordExpired: true }
        : {}),
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
    const passwordExpiredByPolicy = isPasswordExpiredByPolicy(
      doc.passwordChangedAt,
    );
    const userSafe = {
      id: String(doc._id),
      role: roleSlug,
      firstName: doc.firstName,
      lastName: doc.lastName,
      middleName: doc.middleName || "",
      suffix: doc.suffix || "",
      sex: doc.sex || "",
      dateOfBirth: doc.dateOfBirth || null,
      email: doc.email,
      phoneNumber: displayPhoneNumber(doc.phoneNumber),
      username: doc.username || "",
      office: doc.office || "",
      isActive: doc.isActive !== false,
      isStaff: !!doc.isStaff,
      mustChangeCredentials: !!doc.mustChangeCredentials,
      mustSetupMfa: !!doc.mustSetupMfa,
      isEmailVerified: !!doc.isEmailVerified,
      mfaEnabled: !!doc.mfaEnabled,
      mfaReEnrollmentRequired: !!doc.mfaReEnrollmentRequired,
      mfaMethod: doc.mfaMethod || "",
      termsAccepted: doc.termsAccepted,
      welcomeCompleted: !!doc.welcomeCompleted,
      ...(passwordExpiredByPolicy && doc.mustChangeCredentials
        ? { passwordExpired: true }
        : {}),
      createdAt: doc.createdAt,
      deletionPending: !!doc.deletionPending,
      deletionRequestedAt: doc.deletionRequestedAt,
      deletionScheduledFor: doc.deletionScheduledFor,
      // PIS (Personal Information Sheet) fields
      address: doc.address || {
        street: "",
        barangay: "",
        city: "",
        province: "",
        zipCode: "",
      },
      maritalStatus: doc.maritalStatus || "",
      placeOfBirth: doc.placeOfBirth || "",
      nationality: doc.nationality || "",
      fatherName: doc.fatherName || "",
      motherName: doc.motherName || "",
      distinctiveMark: doc.distinctiveMark || "",
      highestEducationalAttainment: doc.highestEducationalAttainment || "",
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
    console.error("GET /api/auth/me error:", err);
    return respond.error(
      res,
      500,
      "profile_load_failed",
      "Failed to load profile",
    );
  }
});

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
        const { isRestrictedFieldForStaff } = require("../lib/roleHelpers");
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
        await logAuditEvent(
          field === "firstName" || field === "lastName"
            ? "name_update"
            : "contact_update",
          doc._id,
          "User",
          doc._id,
          {
            role: roleSlug,
            fieldChanged: field,
            oldValue: oldValues[field] || "",
            newValue: newValues[field] || "",
            ip,
            userAgent,
            allChanges: changes,
          },
        );
      }

      inAppNotificationService
        .createNotification(
          doc._id,
          "auth_profile_updated",
          "Profile updated",
          "Your profile has been saved successfully.",
        )
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );

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

// PATCH /api/auth/welcome-complete - mark welcome inline as completed
router.patch(
  "/welcome-complete",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const doc = await User.findById(req._userId);
      if (!doc) {
        return respond.error(res, 404, "not_found", "User not found");
      }

      doc.welcomeCompleted = true;
      await doc.save();

      // Return updated user object
      const updatedDoc = await User.findById(doc._id).populate("role").lean();
      const roleSlug =
        updatedDoc.role && updatedDoc.role.slug ? updatedDoc.role.slug : "user";
      const passwordExpiredByPolicy = isPasswordExpiredByPolicy(
        updatedDoc.passwordChangedAt,
      );

      const userSafe = {
        id: String(updatedDoc._id),
        role: roleSlug,
        firstName: updatedDoc.firstName,
        lastName: updatedDoc.lastName,
        middleName: updatedDoc.middleName || "",
        suffix: updatedDoc.suffix || "",
        sex: updatedDoc.sex || "",
        dateOfBirth: updatedDoc.dateOfBirth || null,
        email: updatedDoc.email,
        phoneNumber: displayPhoneNumber(updatedDoc.phoneNumber),
        username: updatedDoc.username || "",
        office: updatedDoc.office || "",
        isActive: updatedDoc.isActive !== false,
        isStaff: !!updatedDoc.isStaff,
        mustChangeCredentials: !!updatedDoc.mustChangeCredentials,
        mustSetupMfa: !!updatedDoc.mustSetupMfa,
        isEmailVerified: !!updatedDoc.isEmailVerified,
        mfaEnabled: !!updatedDoc.mfaEnabled,
        mfaReEnrollmentRequired: !!updatedDoc.mfaReEnrollmentRequired,
        mfaMethod: updatedDoc.mfaMethod || "",
        termsAccepted: updatedDoc.termsAccepted,
        welcomeCompleted: !!updatedDoc.welcomeCompleted,
        ...(passwordExpiredByPolicy && updatedDoc.mustChangeCredentials
          ? { passwordExpired: true }
          : {}),
        createdAt: updatedDoc.createdAt,
        deletionPending: !!updatedDoc.deletionPending,
        deletionRequestedAt: updatedDoc.deletionRequestedAt,
        deletionScheduledFor: updatedDoc.deletionScheduledFor,
        // PIS (Personal Information Sheet) fields
        address: updatedDoc.address || {
          street: "",
          barangay: "",
          city: "",
          province: "",
          zipCode: "",
        },
        maritalStatus: updatedDoc.maritalStatus || "",
        placeOfBirth: updatedDoc.placeOfBirth || "",
        nationality: updatedDoc.nationality || "",
        fatherName: updatedDoc.fatherName || "",
        motherName: updatedDoc.motherName || "",
        distinctiveMark: updatedDoc.distinctiveMark || "",
        highestEducationalAttainment:
          updatedDoc.highestEducationalAttainment || "",
      };

      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error("PATCH /api/auth/welcome-complete error:", err);
      return respond.error(
        res,
        500,
        "welcome_complete_failed",
        "Failed to mark welcome as completed",
      );
    }
  },
);

module.exports = router;
