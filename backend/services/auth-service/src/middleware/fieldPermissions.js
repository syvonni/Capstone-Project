const respond = require("./respond");
const {
  isStaffRole,
  isRestrictedFieldForStaff,
  isAdminRole,
  isBusinessOwnerRole,
} = require("../lib/roleHelpers");
const { logAuditEvent } = require("../lib/auditClient");

/**
 * Field Permission Matrix
 * Defines what fields each role can edit and what verification/approval is required
 */
const FIELD_PERMISSIONS = {
  business_owner: {
    email: {
      requiresVerification: true,
      requiresMfaReEnrollment: true,
      rateLimited: true,
    },
    password: {
      requiresVerification: true,
      requiresMfaReEnrollment: true,
      invalidatesSessions: true,
      rateLimited: true,
    },
    firstName: {
      requiresVerification: false,
    },
    lastName: {
      requiresVerification: false,
    },
    phoneNumber: {
      requiresVerification: false,
      rateLimited: true,
    },
    idType: {
      requiresVerification: true,
      rateLimited: true,
    },
    idNumber: {
      requiresVerification: true,
      rateLimited: true,
    },
    termsAccepted: {
      canUncheck: false,
    },
  },
  // Staff roles: lgu_officer, inspector
  // All staff roles share the same restrictions currently
  staff: {
    // Restricted fields (applies to all staff roles):
    // - password: admin-managed only
    // - role: admin-managed only
    // - office: admin-managed only
    // - department: admin-managed only
    firstName: {
      requiresVerification: false,
    },
    lastName: {
      requiresVerification: false,
    },
    phoneNumber: {
      requiresVerification: false,
      rateLimited: true,
    },
  },
  admin: {
    contact: {
      requiresApproval: false,
      rateLimited: true,
    },
    personalInfo: {
      requiresApproval: true,
      requiredApprovals: 2,
      rateLimited: true,
    },
    email: {
      requiresVerification: true,
      requiresApproval: true,
      requiredApprovals: 2,
      rateLimited: true,
    },
    password: {
      requiresVerification: true,
      requiresApproval: true,
      requiredApprovals: 2,
      rateLimited: true,
    },
  },
};

/**
 * Check if a field can be edited by a role
 * @param {string} roleSlug - User's role slug
 * @param {string} field - Field name to check
 * @returns {object|null} - Permission object or null if not allowed
 */
function checkFieldPermission(roleSlug, field) {
  if (!roleSlug || !field) {
    return null;
  }

  const role = roleSlug.toLowerCase();

  // Check staff restrictions
  if (isStaffRole(role)) {
    if (isRestrictedFieldForStaff(field)) {
      return null; // Restricted for staff
    }
    return FIELD_PERMISSIONS.staff[field] || null;
  }

  // Check business owner permissions
  if (isBusinessOwnerRole(role)) {
    return FIELD_PERMISSIONS.business_owner[field] || null;
  }

  // Check admin permissions
  if (isAdminRole(role)) {
    // Admin permissions are grouped (contact, personalInfo, email, password)
    if (field === "phoneNumber") {
      return FIELD_PERMISSIONS.admin.contact;
    }
    if (["firstName", "lastName"].includes(field)) {
      return FIELD_PERMISSIONS.admin.personalInfo;
    }
    if (field === "email") {
      return FIELD_PERMISSIONS.admin.email;
    }
    if (field === "password") {
      return FIELD_PERMISSIONS.admin.password;
    }
    return null;
  }

  return null;
}

/**
 * Middleware to check if a field can be edited
 * @param {string} field - Field name to check
 * @returns {Function} - Express middleware
 */
function requireFieldPermission(field) {
  return (req, res, next) => {
    const roleSlug = req._userRole;

    if (!roleSlug) {
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: missing role information",
      );
    }

    // Check staff restrictions
    if (isStaffRole(roleSlug)) {
      if (isRestrictedFieldForStaff(field)) {
        // Log restricted field attempt
        const AdminApproval = require("../models/AdminApproval");

        // Create audit log for restricted field attempt (async, don't wait)
        try {
          logAuditEvent(
            req._userId,
            "restricted_field_attempt",
            "SecurityEvent",
            req._userId,
            {
              role: roleSlug,
              fieldChanged: "field",
              oldValue: null,
              newValue: null,
              field,
              ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
              userAgent: req.headers["user-agent"] || "unknown",
            },
          ).catch((err) => {
            console.error("Failed to log restricted field attempt:", err);
          });
        } catch (err) {
          console.error(
            "Failed to create audit log for restricted field attempt:",
            err,
          );
        }

        return respond.error(
          res,
          403,
          "field_restricted",
          `Field '${field}' cannot be edited by staff users. This action has been logged.`,
        );
      }
    }

    const permission = checkFieldPermission(roleSlug, field);
    if (!permission) {
      return respond.error(
        res,
        403,
        "field_not_allowed",
        `Field '${field}' cannot be edited by your role`,
      );
    }

    // Attach permission info to request for use in route handler
    req._fieldPermission = permission;
    req._fieldName = field;

    next();
  };
}

/**
 * Middleware to require verification before allowing field edit
 * @returns {Function} - Express middleware
 */
function requireVerification() {
  return async (req, res, next) => {
    const permission = req._fieldPermission;
    if (!permission || !permission.requiresVerification) {
      return next(); // No verification required
    }

    // Check if verification has been completed
    const {
      verifyCode: verifyCodeService,
      checkVerificationStatus,
    } = require("../lib/verificationService");
    const purpose = `${req._fieldName}_change`;

    // Check if code was provided in request
    const { verificationCode } = req.body || {};
    if (verificationCode) {
      // Verify the code
      const verifyResult = await verifyCodeService(
        req._userId,
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
      // Verification successful, continue
      return next();
    }

    // Check if MFA code was provided
    const { mfaCode } = req.body || {};
    if (mfaCode && permission.requiresVerification) {
      const verifyResult = await verifyCodeService(
        req._userId,
        mfaCode,
        "mfa",
        purpose,
      );
      if (!verifyResult.verified) {
        return respond.error(
          res,
          401,
          "verification_failed",
          verifyResult.error || "Invalid MFA code",
        );
      }
      return next();
    }

    // No verification code provided - check if verification is pending
    const status = await checkVerificationStatus(req._userId, purpose);
    if (status.pending) {
      return respond.error(
        res,
        428,
        "verification_required",
        "Verification required. Please provide verification code or request a new one.",
        { expiresAt: status.expiresAt, method: status.method },
      );
    }

    // No verification requested yet
    return respond.error(
      res,
      428,
      "verification_required",
      "Verification required before making this change. Please request verification first.",
    );
  };
}

module.exports = {
  checkFieldPermission,
  requireFieldPermission,
  requireVerification,
  FIELD_PERMISSIONS,
};
