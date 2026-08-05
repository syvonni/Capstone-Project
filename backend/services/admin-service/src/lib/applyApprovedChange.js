/**
 * Apply Approved Change
 * Handles applying approved admin changes to user accounts
 * This function is used by Admin Service when approvals are completed
 */

const User = require("../models/User");
const MaintenanceWindow = require("../models/MaintenanceWindow");
// FormDefinition has been removed - this import is no longer needed
// bcrypt and passwordHistory are lazy-required inside the cases that need them
// so maintenance_mode approval works even if bcryptjs is not installed
const { logToBlockchain } = require("./interServiceClient");
const { logAuditEvent } = require("./auditClient");
const logger = require("./logger");

/**
 * Calculate hash for audit log (same as in auth service)
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
  const crypto = require("crypto");
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

/**
 * Create audit log (calls Audit Service via inter-service communication)
 */
async function createAuditLog(
  userId,
  eventType,
  fieldChanged,
  oldValue,
  newValue,
  role,
  metadata = {},
  entityType = "AdminApproval",
  entityId = null,
) {
  try {
    // Use centralized audit-service
    await logAuditEvent(eventType, userId, entityType, entityId || userId, {
      fieldChanged,
      oldValue: oldValue || "",
      newValue: newValue || "",
      role,
      ...metadata,
      ip: metadata.ip || "unknown",
      userAgent: metadata.userAgent || "unknown",
    });

    return { success: true };
  } catch (error) {
    logger.error("Error creating audit log", { error });
    return { success: false, error: error.message };
  }
}

/**
 * Apply approved change to user account
 */
async function applyApprovedChange(approval) {
  try {
    const user = await User.findById(approval.userId).populate("role");
    if (!user) {
      logger.error("User not found for approval", {
        approvalId: approval.approvalId,
      });
      return { success: false, error: "User not found" };
    }

    const roleSlug = user.role && user.role.slug ? user.role.slug : "user";

    switch (approval.requestType) {
      case "personal_info_change": {
        const requestDetails = approval.requestDetails;
        if (!requestDetails) {
          logger.error("Missing requestDetails for personal_info_change", {
            approvalId: approval.approvalId,
          });
          return { success: false, error: "Invalid request details" };
        }
        const newValues =
          requestDetails.newValues || requestDetails.requestedChanges || {};
        if (typeof newValues !== "object") {
          logger.error("Invalid newValues for personal_info_change", {
            approvalId: approval.approvalId,
          });
          return { success: false, error: "Invalid request details" };
        }
        const update = {};
        if (newValues.firstName) update.firstName = newValues.firstName;
        if (newValues.lastName) update.lastName = newValues.lastName;
        if (newValues.phoneNumber !== undefined)
          update.phoneNumber = newValues.phoneNumber;
        if (Object.keys(update).length > 0) {
          const userId =
            approval.userId &&
            (typeof approval.userId === "object" && approval.userId._id
              ? approval.userId._id
              : approval.userId);
          const updateResult = await User.findByIdAndUpdate(
            userId,
            { $set: update },
            { new: true },
          );
          if (!updateResult) {
            logger.error("User update failed - user not found", {
              userId,
              update,
            });
            return { success: false, error: "User not found" };
          }
        }

        // Create audit log
        const changedFields = Object.keys(newValues);
        const primaryField = changedFields[0] || "firstName";
        const oldValues = requestDetails.oldValues || {};
        await createAuditLog(
          approval.userId,
          "admin_approval_approved",
          primaryField,
          JSON.stringify(oldValues),
          JSON.stringify(newValues),
          roleSlug,
          {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            allChangedFields: changedFields,
          },
          "User",
          approval.userId,
        );

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
        await createAuditLog(
          user._id,
          "admin_approval_approved",
          "email",
          oldEmail,
          newEmail,
          roleSlug,
          {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            mfaReEnrollmentRequired: true,
          },
          "User",
          user._id,
        );

        return { success: true };
      }

      case "password_change": {
        const bcrypt = require("bcryptjs");
        const { addToPasswordHistory } = require("./passwordHistory");
        const { newPasswordHash } = approval.metadata;
        if (!newPasswordHash) {
          return {
            success: false,
            error: "Password hash not found in approval metadata",
          };
        }

        const oldHash = String(user.passwordHash);
        const updatedHistory = addToPasswordHistory(
          oldHash,
          user.passwordHistory || [],
        );

        user.passwordHash = newPasswordHash;
        user.passwordChangedAt = new Date();
        user.passwordHistory = updatedHistory;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all sessions
        user.mfaReEnrollmentRequired = true;
        user.mfaEnabled = false;
        user.mfaSecret = "";
        user.fprintEnabled = false;
        user.mfaMethod = "";
        user.mfaDisablePending = false;
        user.mfaDisableRequestedAt = null;
        user.mfaDisableScheduledFor = null;
        user.tokenFprint = "";
        await user.save();

        // Clear password hash from approval metadata (security)
        approval.metadata.newPasswordHash = undefined;
        await approval.save();

        // Create audit log
        await createAuditLog(
          user._id,
          "admin_approval_approved",
          "password",
          "[REDACTED]",
          "[REDACTED]",
          roleSlug,
          {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            tokenVersion: user.tokenVersion,
            mfaReEnrollmentRequired: true,
          },
          "User",
          user._id,
        );

        return { success: true };
      }

      case "maintenance_mode": {
        const { action, message, expectedResumeAt, scheduledStartAt } =
          approval.requestDetails || {};
        const approvedBy = approval.approvals.map((a) => String(a.adminId));
        const now = new Date();
        const scheduledDate = scheduledStartAt
          ? new Date(scheduledStartAt)
          : null;
        const hasValidScheduledDate = !!(
          scheduledDate && !Number.isNaN(scheduledDate.getTime())
        );
        const shouldActivateNow =
          !hasValidScheduledDate || scheduledDate <= now;

        if (action === "enable") {
          if (shouldActivateNow) {
            await MaintenanceWindow.updateMany(
              { isActive: true },
              { isActive: false, status: "ended", deactivatedAt: now },
            );
          }
          await MaintenanceWindow.create({
            status: shouldActivateNow ? "active" : "pending",
            isActive: shouldActivateNow,
            message: message || "",
            expectedResumeAt: expectedResumeAt
              ? new Date(expectedResumeAt)
              : null,
            requestedBy: approval.requestedBy,
            approvedBy,
            activatedAt: shouldActivateNow ? now : null,
            metadata: {
              approvalId: approval.approvalId,
              scheduledStartAt: hasValidScheduledDate ? scheduledDate : null,
            },
          });
        } else if (action === "disable") {
          await MaintenanceWindow.updateMany(
            {
              $or: [{ isActive: true }, { status: "pending" }],
            },
            { isActive: false, status: "ended", deactivatedAt: now },
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
            scheduledStartAt: hasValidScheduledDate ? scheduledDate : null,
            approvedBy,
          },
          "MaintenanceWindow",
          approval._id,
        );

        return { success: true };
      }

      case "form_definition": {
        // FormDefinition has been removed - this case is obsolete
        return {
          success: false,
          error: "FormDefinition has been removed. Use permit_form approval type instead.",
        };
      }

      case "account_status_change": {
        const details = approval.requestDetails || {};
        const newValues = details.newValues || {};
        const oldValues = details.oldValues || {};
        const isActive =
          newValues.isActive === "true" || newValues.isActive === true;
        const wasActive = user.isActive !== false;

        if (isActive === wasActive) {
          return { success: true };
        }

        user.isActive = isActive;
        if (!isActive) {
          user.tokenVersion = (user.tokenVersion || 0) + 1;
        }
        await user.save();

        await createAuditLog(
          user._id,
          "admin_approval_approved",
          "account",
          String(wasActive),
          String(isActive),
          roleSlug,
          {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            reason: details.reason || "",
            targetIsAdmin: !!details.targetIsAdmin,
          },
          "User",
          user._id,
        );

        return { success: true };
      }

      case "password_reset": {
        const bcrypt = require("bcryptjs");
        const {
          addToPasswordHistory: addToPasswordHistoryReset,
        } = require("./passwordHistory");
        const crypto = require("crypto");
        const details = approval.requestDetails || {};

        const length = 14;
        const lowers = "abcdefghijklmnopqrstuvwxyz";
        const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const digits = "0123456789";
        const specials = "!@#$%^&*";
        const all = lowers + uppers + digits + specials;
        function pick(set) {
          return set[crypto.randomBytes(1)[0] % set.length];
        }
        const required = [
          pick(lowers),
          pick(uppers),
          pick(digits),
          pick(specials),
        ];
        const remaining = Array.from({ length: length - required.length }, () =>
          pick(all),
        );
        const raw = required.concat(remaining);
        for (let i = raw.length - 1; i > 0; i--) {
          const j = crypto.randomBytes(1)[0] % (i + 1);
          [raw[i], raw[j]] = [raw[j], raw[i]];
        }
        const tempPassword = raw.join("");

        const oldHash = String(user.passwordHash || "");
        const newHash = await bcrypt.hash(tempPassword, 10);
        const updatedHistory = addToPasswordHistoryReset(
          oldHash,
          user.passwordHistory || [],
        );

        user.passwordHash = newHash;
        user.passwordChangedAt = new Date();
        user.passwordHistory = updatedHistory;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.mustChangeCredentials = true;
        user.mustSetupMfa = true;
        user.mfaEnabled = false;
        user.mfaSecret = "";
        user.fprintEnabled = false;
        user.mfaMethod = "";
        user.mfaDisablePending = false;
        user.mfaDisableRequestedAt = null;
        user.mfaDisableScheduledFor = null;
        user.tokenFprint = "";
        await user.save();

        await createAuditLog(
          user._id,
          "admin_approval_approved",
          "password",
          "[REDACTED]",
          "[REDACTED]",
          roleSlug,
          {
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            reason: details.reason || "",
            targetIsAdmin: !!details.targetIsAdmin,
            mustChangeCredentials: true,
            mustSetupMfa: true,
          },
          "User",
          user._id,
        );

        return { success: true };
      }

      default:
        return { success: false, error: "Unknown request type" };
    }
  } catch (error) {
    logger.error("Error applying approved change", {
      error,
      approvalId: approval.approvalId,
    });
    return { success: false, error: error.message };
  }
}

module.exports = applyApprovedChange;
