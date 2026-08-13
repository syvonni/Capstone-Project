const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const respond = require("../middleware/respond");
const { requireJwt, requireRole } = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const {
  sanitizeName,
  sanitizePhoneNumber,
  containsSqlInjection,
  containsXss,
} = require("../lib/sanitizer");
const { logAuditEvent } = require("../lib/auditClient");
const { isBusinessOwnerRole } = require("../lib/roleHelpers");

const router = express.Router();

const sanitizeString = (value, helpers) => {
  if (!value) return value;
  if (containsSqlInjection(value)) return helpers.error("string.sqlInjection");
  if (containsXss(value)) return helpers.error("string.xss");
  return value;
};

const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).allow("", null),
  barangay: Joi.string().trim().max(100).allow("", null),
  city: Joi.string().trim().max(100).allow("", null),
  province: Joi.string().trim().max(100).allow("", null),
  zipCode: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .allow("", null),
}).default({});

const updateOwnerSchema = Joi.object({
  // Basic info
  firstName: Joi.string().min(1).max(100).custom(sanitizeString).optional(),
  lastName: Joi.string().min(1).max(100).custom(sanitizeString).optional(),
  middleName: Joi.string()
    .max(100)
    .allow("", null)
    .custom(sanitizeString)
    .optional(),
  suffix: Joi.string()
    .max(20)
    .allow("", null)
    .custom(sanitizeString)
    .optional(),
  sex: Joi.string().valid("male", "female").allow("", null).optional(),
  dateOfBirth: Joi.date().allow(null).optional(),
  phoneNumber: Joi.string().max(15).allow("", null).optional(),
  // PIS fields
  address: addressSchema.optional(),
  maritalStatus: Joi.string()
    .valid(
      "single",
      "married",
      "widowed",
      "divorced",
      "separated",
      "legally_separated",
      "annulled",
      "void",
    )
    .allow("", null)
    .optional(),
  placeOfBirth: Joi.string()
    .trim()
    .max(200)
    .allow("", null)
    .custom(sanitizeString)
    .optional(),
  nationality: Joi.string()
    .trim()
    .max(50)
    .allow("", null)
    .custom(sanitizeString)
    .optional(),
  fatherName: Joi.string()
    .trim()
    .max(100)
    .allow("", null)
    .custom(sanitizeString)
    .optional(),
  motherName: Joi.string()
    .trim()
    .max(100)
    .allow("", null)
    .custom(sanitizeString)
    .optional(),
  distinctiveMark: Joi.string()
    .trim()
    .max(200)
    .allow("", null)
    .custom(sanitizeString)
    .optional(),
  highestEducationalAttainment: Joi.string()
    .valid(
      "elementary",
      "high_school",
      "vocational",
      "college",
      "college_undergraduate",
      "college_graduate",
      "postgraduate",
      "others",
    )
    .allow("", null)
    .optional(),
  // Reason for audit
  reason: Joi.string().trim().min(3).max(500).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided",
    "string.sqlInjection": "Invalid input: SQL injection attempt detected",
    "string.xss": "Invalid input: XSS attempt detected",
  });

// GET /api/auth/lgu-officer/users/:userId - Get business owner details
router.get(
  "/lgu-officer/users/:userId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return respond.error(res, 400, "invalid_user_id", "Invalid user ID");
      }

      const user = await User.findById(userId).populate("role").lean();
      if (!user) {
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      const roleSlug = user.role?.slug || "";
      if (!isBusinessOwnerRole(roleSlug)) {
        return respond.error(
          res,
          400,
          "not_business_owner",
          "User is not a business owner",
        );
      }

      return res.json({
        success: true,
        user: {
          id: String(user._id),
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          middleName: user.middleName || "",
          suffix: user.suffix || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || "",
          sex: user.sex || "",
          dateOfBirth: user.dateOfBirth || null,
          address: user.address || {},
          maritalStatus: user.maritalStatus || "",
          placeOfBirth: user.placeOfBirth || "",
          nationality: user.nationality || "",
          fatherName: user.fatherName || "",
          motherName: user.motherName || "",
          distinctiveMark: user.distinctiveMark || "",
          highestEducationalAttainment: user.highestEducationalAttainment || "",
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      console.error("GET /api/auth/lgu-officer/users/:userId error:", err);
      return respond.error(
        res,
        500,
        "user_fetch_failed",
        "Failed to fetch user",
      );
    }
  },
);

// PATCH /api/auth/lgu-officer/users/:userId - Update business owner details
router.patch(
  "/lgu-officer/users/:userId",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  validateBody(updateOwnerSchema),
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return respond.error(res, 400, "invalid_user_id", "Invalid user ID");
      }

      const user = await User.findById(userId).populate("role");
      if (!user) {
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      const roleSlug = user.role?.slug || "";
      if (!isBusinessOwnerRole(roleSlug)) {
        return respond.error(
          res,
          400,
          "not_business_owner",
          "User is not a business owner",
        );
      }

      const body = req.body || {};
      const changes = [];
      const oldValues = {};
      const newValues = {};

      // Helper to sanitize and check
      const checkSanitize = (value, fieldName) => {
        if (value === undefined) return undefined;
        const str = String(value ?? "").trim();
        if (containsSqlInjection(str) || containsXss(str)) return null;
        return fieldName === "firstName" || fieldName === "lastName"
          ? sanitizeName(str)
          : str;
      };

      // Basic info fields
      if (body.firstName !== undefined) {
        const sanitized = checkSanitize(body.firstName, "firstName");
        if (sanitized === null) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input detected",
          );
        }
        if (sanitized !== user.firstName) {
          oldValues.firstName = user.firstName;
          newValues.firstName = sanitized;
          user.firstName = sanitized;
          changes.push("firstName");
        }
      }

      if (body.lastName !== undefined) {
        const sanitized = checkSanitize(body.lastName, "lastName");
        if (sanitized === null) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input detected",
          );
        }
        if (sanitized !== user.lastName) {
          oldValues.lastName = user.lastName;
          newValues.lastName = sanitized;
          user.lastName = sanitized;
          changes.push("lastName");
        }
      }

      if (body.middleName !== undefined) {
        const val = (body.middleName ?? "").toString().trim();
        if (val !== (user.middleName || "")) {
          oldValues.middleName = user.middleName;
          newValues.middleName = val;
          user.middleName = val;
          changes.push("middleName");
        }
      }

      if (body.suffix !== undefined) {
        const val = (body.suffix ?? "").toString().trim();
        if (val !== (user.suffix || "")) {
          oldValues.suffix = user.suffix;
          newValues.suffix = val;
          user.suffix = val;
          changes.push("suffix");
        }
      }

      if (body.sex !== undefined) {
        const val = body.sex === null || body.sex === "" ? "" : body.sex;
        if (val !== (user.sex || "")) {
          oldValues.sex = user.sex;
          newValues.sex = val;
          user.sex = val;
          changes.push("sex");
        }
      }

      if (body.dateOfBirth !== undefined) {
        const dob = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
        const currentDob = user.dateOfBirth ? user.dateOfBirth.getTime() : null;
        const newDob = dob ? dob.getTime() : null;
        if (newDob !== currentDob) {
          oldValues.dateOfBirth = user.dateOfBirth;
          newValues.dateOfBirth = dob;
          user.dateOfBirth = dob;
          changes.push("dateOfBirth");
        }
      }

      if (body.phoneNumber !== undefined) {
        const sanitized = sanitizePhoneNumber(body.phoneNumber || "");
        if (sanitized !== (user.phoneNumber || "")) {
          oldValues.phoneNumber = user.phoneNumber;
          newValues.phoneNumber = sanitized;
          user.phoneNumber = sanitized;
          changes.push("phoneNumber");
        }
      }

      // PIS fields
      if (body.address !== undefined && typeof body.address === "object") {
        const newAddress = {
          street: (body.address.street ?? user.address?.street ?? "")
            .toString()
            .trim(),
          barangay: (body.address.barangay ?? user.address?.barangay ?? "")
            .toString()
            .trim(),
          city: (body.address.city ?? user.address?.city ?? "")
            .toString()
            .trim(),
          province: (body.address.province ?? user.address?.province ?? "")
            .toString()
            .trim(),
          zipCode: (body.address.zipCode ?? user.address?.zipCode ?? "")
            .toString()
            .trim(),
        };
        const oldAddress = user.address || {};
        const addressChanged = [
          "street",
          "barangay",
          "city",
          "province",
          "zipCode",
        ].some((k) => newAddress[k] !== (oldAddress[k] || ""));
        if (addressChanged) {
          oldValues.address = oldAddress;
          newValues.address = newAddress;
          user.address = newAddress;
          changes.push("address");
        }
      }

      if (body.maritalStatus !== undefined) {
        const val =
          body.maritalStatus === null || body.maritalStatus === ""
            ? ""
            : body.maritalStatus;
        if (val !== (user.maritalStatus || "")) {
          oldValues.maritalStatus = user.maritalStatus;
          newValues.maritalStatus = val;
          user.maritalStatus = val;
          changes.push("maritalStatus");
        }
      }

      if (body.placeOfBirth !== undefined) {
        const val = (body.placeOfBirth ?? "").toString().trim();
        if (val !== (user.placeOfBirth || "")) {
          oldValues.placeOfBirth = user.placeOfBirth;
          newValues.placeOfBirth = val;
          user.placeOfBirth = val;
          changes.push("placeOfBirth");
        }
      }

      if (body.nationality !== undefined) {
        const val = (body.nationality ?? "").toString().trim();
        if (val !== (user.nationality || "")) {
          oldValues.nationality = user.nationality;
          newValues.nationality = val;
          user.nationality = val;
          changes.push("nationality");
        }
      }

      if (body.fatherName !== undefined) {
        const val = (body.fatherName ?? "").toString().trim();
        if (val !== (user.fatherName || "")) {
          oldValues.fatherName = user.fatherName;
          newValues.fatherName = val;
          user.fatherName = val;
          changes.push("fatherName");
        }
      }

      if (body.motherName !== undefined) {
        const val = (body.motherName ?? "").toString().trim();
        if (val !== (user.motherName || "")) {
          oldValues.motherName = user.motherName;
          newValues.motherName = val;
          user.motherName = val;
          changes.push("motherName");
        }
      }

      if (body.distinctiveMark !== undefined) {
        const val = (body.distinctiveMark ?? "").toString().trim();
        if (val !== (user.distinctiveMark || "")) {
          oldValues.distinctiveMark = user.distinctiveMark;
          newValues.distinctiveMark = val;
          user.distinctiveMark = val;
          changes.push("distinctiveMark");
        }
      }

      if (body.highestEducationalAttainment !== undefined) {
        const val =
          body.highestEducationalAttainment === null ||
          body.highestEducationalAttainment === ""
            ? ""
            : body.highestEducationalAttainment;
        if (val !== (user.highestEducationalAttainment || "")) {
          oldValues.highestEducationalAttainment =
            user.highestEducationalAttainment;
          newValues.highestEducationalAttainment = val;
          user.highestEducationalAttainment = val;
          changes.push("highestEducationalAttainment");
        }
      }

      if (changes.length === 0) {
        return res.json({
          success: true,
          updated: false,
          message: "No changes detected",
        });
      }

      await user.save();

      // Create audit log
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const reason = body.reason || "LGU officer profile update";

      await logAuditEvent(
        "profile_update_by_officer",
        user._id,
        "User",
        user._id,
        {
          role: req._userRole || "lgu_officer",
          fieldChanged: changes[0] || "profile",
          oldValue: JSON.stringify(oldValues),
          newValue: JSON.stringify(newValues),
          ip,
          userAgent,
          updatedBy: officerId,
          reason,
          allChanges: changes,
        },
      );

      return res.json({
        success: true,
        updated: true,
        changes,
        user: {
          id: String(user._id),
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          middleName: user.middleName || "",
          suffix: user.suffix || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || "",
          sex: user.sex || "",
          dateOfBirth: user.dateOfBirth || null,
          address: user.address || {},
          maritalStatus: user.maritalStatus || "",
          placeOfBirth: user.placeOfBirth || "",
          nationality: user.nationality || "",
          fatherName: user.fatherName || "",
          motherName: user.motherName || "",
          distinctiveMark: user.distinctiveMark || "",
          highestEducationalAttainment: user.highestEducationalAttainment || "",
        },
      });
    } catch (err) {
      console.error("PATCH /api/auth/lgu-officer/users/:userId error:", err);
      return respond.error(
        res,
        500,
        "user_update_failed",
        "Failed to update user",
      );
    }
  },
);

module.exports = router;
