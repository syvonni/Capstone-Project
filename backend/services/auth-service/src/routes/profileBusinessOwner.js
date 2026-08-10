const express = require("express");
const User = require("../models/User");
const AdminApproval = require("../models/AdminApproval");
const respond = require("../middleware/respond");
const { requireJwt } = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const {
  sanitizeName,
  sanitizePhoneNumber,
  containsSqlInjection,
  containsXss,
} = require("../lib/sanitizer");
const { logAuditEvent } = require("../lib/auditClient");
const { isBusinessOwnerRole, isAdminRole } = require("../lib/roleHelpers");
const {
  profileUpdateRateLimit,
  verificationRateLimit,
} = require("../middleware/rateLimit");
const {
  requestVerification,
  verifyCode,
  checkVerificationStatus,
  clearVerificationRequest,
} = require("../lib/verificationService");
const { checkFieldPermission } = require("../middleware/fieldPermissions");
const { auditClient } = require("../../../../shared/lib/httpClient");

const router = express.Router();

function displayPhoneNumber(value) {
  const s = typeof value === "string" ? value : "";
  if (s.startsWith("__unset__")) return "";
  return s;
}

const requestVerificationSchema = Joi.object({
  field: Joi.string().required(),
  method: Joi.string().valid("otp", "mfa").default("otp"),
});

// POST /api/auth/verification/request
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
      const { requestVerification } = require("../lib/verificationService");
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

// POST /api/auth/profile/verification/request
// Request verification code for a field change
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

const sanitizeString = (value, helpers) => {
  if (!value) return value;
  if (containsSqlInjection(value)) return helpers.error("string.sqlInjection");
  if (containsXss(value)) return helpers.error("string.xss");
  return value;
};

// PATCH /api/auth/profile/name
// Update name, middle name, suffix, sex, and date of birth (no verification required, but system verified)
const updateNameSchema = Joi.object({
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
      const { firstName, lastName, middleName, suffix, sex, dateOfBirth } =
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

      const checkSanitize = (value, fieldName) => {
        if (value === undefined) return undefined;
        const str = String(value ?? "").trim();
        if (containsSqlInjection(str) || containsXss(str)) return null;
        return fieldName === "firstName" || fieldName === "lastName"
          ? sanitizeName(str)
          : str;
      };

      if (firstName !== undefined) {
        const sanitized = checkSanitize(firstName, "firstName");
        if (sanitized === null) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: SQL injection or XSS attempt detected",
          );
        }
        if (sanitized !== doc.firstName) {
          oldValues.firstName = doc.firstName;
          doc.firstName = sanitized;
          changes.push("firstName");
        }
      }
      if (lastName !== undefined) {
        const sanitized = checkSanitize(lastName, "lastName");
        if (sanitized === null) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: SQL injection or XSS attempt detected",
          );
        }
        if (sanitized !== doc.lastName) {
          oldValues.lastName = doc.lastName;
          doc.lastName = sanitized;
          changes.push("lastName");
        }
      }
      if (middleName !== undefined) {
        const sanitized = checkSanitize(middleName, "middleName");
        if (sanitized === null) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: SQL injection or XSS attempt detected",
          );
        }
        const val = (sanitized ?? "").toString().trim();
        if (val !== (doc.middleName || "")) {
          oldValues.middleName = doc.middleName;
          doc.middleName = val;
          changes.push("middleName");
        }
      }
      if (suffix !== undefined) {
        const sanitized = checkSanitize(suffix, "suffix");
        if (sanitized === null) {
          return respond.error(
            res,
            400,
            "validation_error",
            "Invalid input: SQL injection or XSS attempt detected",
          );
        }
        const valS = (sanitized ?? "").toString().trim();
        if (valS !== (doc.suffix || "")) {
          oldValues.suffix = doc.suffix;
          doc.suffix = valS;
          changes.push("suffix");
        }
      }
      if (sex !== undefined) {
        const val = sex === null || sex === "" ? "" : sex;
        if (val !== (doc.sex || "")) {
          oldValues.sex = doc.sex;
          doc.sex = val;
          changes.push("sex");
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

      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const primaryField = changes[0] || "firstName";
      await logAuditEvent(doc._id, "name_update", "User", doc._id, {
        role: roleSlug,
        fieldChanged: primaryField,
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(
          changes.reduce((acc, field) => {
            acc[field] = doc[field];
            return acc;
          }, {}),
        ),
        ip,
        userAgent,
        allChanges: changes,
      });

      const userSafe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        middleName: doc.middleName,
        suffix: doc.suffix,
        email: doc.email,
        sex: doc.sex,
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
      await logAuditEvent(doc._id, "contact_update", "User", doc._id, {
        role: roleSlug,
        fieldChanged: "phoneNumber",
        oldValue: oldPhoneNumber || "",
        newValue: sanitized || "",
        ip,
        userAgent,
      });

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

// PATCH /api/auth/profile/pis
// Update PIS (Personal Information Sheet): address, marital status, place of birth, nationality, education, family names, etc.
const pisAddressSchema = Joi.object({
  street: Joi.string().trim().max(200).allow("", null),
  barangay: Joi.string().trim().max(100).allow("", null),
  city: Joi.string().trim().max(100).allow("", null),
  province: Joi.string().trim().max(100).allow("", null),
  zipCode: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .allow("", null),
}).default({});

const updatePisSchema = Joi.object({
  address: pisAddressSchema,
  maritalStatus: Joi.string()
    .valid("single", "married", "widowed", "divorced", "separated")
    .allow("", null),
  placeOfBirth: Joi.string()
    .trim()
    .max(200)
    .allow("", null)
    .custom(sanitizeString),
  nationality: Joi.string()
    .trim()
    .max(50)
    .allow("", null)
    .custom(sanitizeString),
  fatherName: Joi.string()
    .trim()
    .max(100)
    .allow("", null)
    .custom(sanitizeString),
  motherName: Joi.string()
    .trim()
    .max(100)
    .allow("", null)
    .custom(sanitizeString),
  distinctiveMark: Joi.string()
    .trim()
    .max(200)
    .allow("", null)
    .custom(sanitizeString),
  highestEducationalAttainment: Joi.string()
    .valid("elementary", "high_school", "vocational", "college", "postgraduate")
    .allow("", null),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided",
    "string.sqlInjection": "Invalid input: SQL injection attempt detected",
    "string.xss": "Invalid input: XSS attempt detected",
  });

router.patch(
  "/profile/pis",
  requireJwt,
  profileUpdateRateLimit(),
  validateBody(updatePisSchema),
  async (req, res) => {
    try {
      const body = req.body || {};
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
      if (body.address !== undefined && typeof body.address === "object") {
        doc.address = {
          street: (body.address.street ?? doc.address?.street ?? "")
            .toString()
            .trim(),
          barangay: (body.address.barangay ?? doc.address?.barangay ?? "")
            .toString()
            .trim(),
          city: (body.address.city ?? doc.address?.city ?? "")
            .toString()
            .trim(),
          province: (body.address.province ?? doc.address?.province ?? "")
            .toString()
            .trim(),
          zipCode: (body.address.zipCode ?? doc.address?.zipCode ?? "")
            .toString()
            .trim(),
        };
        changes.push("address");
      }
      if (body.maritalStatus !== undefined) {
        const val =
          body.maritalStatus === null || body.maritalStatus === ""
            ? ""
            : body.maritalStatus;
        if (val !== (doc.maritalStatus || "")) {
          doc.maritalStatus = val;
          changes.push("maritalStatus");
        }
      }
      if (body.placeOfBirth !== undefined) {
        const val = (body.placeOfBirth ?? "").toString().trim();
        if (val !== (doc.placeOfBirth || "")) {
          doc.placeOfBirth = val;
          changes.push("placeOfBirth");
        }
      }
      if (body.nationality !== undefined) {
        const val = (body.nationality ?? "").toString().trim();
        if (val !== (doc.nationality || "")) {
          doc.nationality = val;
          changes.push("nationality");
        }
      }
      if (body.fatherName !== undefined) {
        const val = (body.fatherName ?? "").toString().trim();
        if (val !== (doc.fatherName || "")) {
          doc.fatherName = val;
          changes.push("fatherName");
        }
      }
      if (body.motherName !== undefined) {
        const val = (body.motherName ?? "").toString().trim();
        if (val !== (doc.motherName || "")) {
          doc.motherName = val;
          changes.push("motherName");
        }
      }
      if (body.distinctiveMark !== undefined) {
        const val = (body.distinctiveMark ?? "").toString().trim();
        if (val !== (doc.distinctiveMark || "")) {
          doc.distinctiveMark = val;
          changes.push("distinctiveMark");
        }
      }
      if (body.highestEducationalAttainment !== undefined) {
        const val =
          body.highestEducationalAttainment === null ||
          body.highestEducationalAttainment === ""
            ? ""
            : body.highestEducationalAttainment;
        if (val !== (doc.highestEducationalAttainment || "")) {
          doc.highestEducationalAttainment = val;
          changes.push("highestEducationalAttainment");
        }
      }

      if (changes.length === 0) {
        return res.json({ updated: false, message: "No changes detected" });
      }

      const hasPis = !!(
        doc.address?.street &&
        doc.address?.barangay &&
        doc.address?.city &&
        doc.address?.province &&
        doc.address?.zipCode &&
        doc.maritalStatus &&
        doc.dateOfBirth &&
        doc.placeOfBirth &&
        doc.nationality &&
        doc.fatherName &&
        doc.motherName &&
        doc.highestEducationalAttainment
      );
      if (hasPis) doc.pisCompleted = true;

      await doc.save();

      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      await logAuditEvent(doc._id, "pis_update", "User", doc._id, {
        role: roleSlug,
        fieldChanged: changes[0] || "address",
        oldValue: JSON.stringify({}),
        newValue: JSON.stringify(changes),
        ip,
        userAgent,
        allChanges: changes,
      });

      const userSafe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        address: doc.address,
        maritalStatus: doc.maritalStatus,
        placeOfBirth: doc.placeOfBirth,
        nationality: doc.nationality,
        fatherName: doc.fatherName,
        motherName: doc.motherName,
        distinctiveMark: doc.distinctiveMark,
        highestEducationalAttainment: doc.highestEducationalAttainment,
      };

      return res.json({ updated: true, user: userSafe });
    } catch (err) {
      console.error("PATCH /api/auth/profile/pis error:", err);
      return respond.error(
        res,
        500,
        "pis_update_failed",
        "Failed to update personal information",
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
    if (!isBusinessOwnerRole(roleSlug) && !isAdminRole(roleSlug)) {
      return respond.error(
        res,
        403,
        "forbidden",
        "This endpoint is only available for business owners and admins",
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

    // Query audit-service for logs
    const params = {
      userId: req._userId,
      limit: Number(limit),
      skip: Number(skip),
    };
    if (eventType) params.eventType = eventType;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await auditClient.get(`/api/audit/history`, {
      params,
    });

    const auditLogs = response.logs || [];

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

    return res.json({
      logs: safeLogs,
      total: response.data.total || 0,
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

module.exports = router;
