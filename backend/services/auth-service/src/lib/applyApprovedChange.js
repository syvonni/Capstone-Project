const User = require("../models/User");
const MaintenanceWindow = require("../models/MaintenanceWindow");
const { addToPasswordHistory } = require("./passwordHistory");
const { decryptWithHash, encryptWithHash } = require("./secretCipher");
const { logAuditEvent } = require("./auditClient");
const logger = require("./logger");

/**
 * Apply approved admin change to user account
 * This function is used by admin-service to apply approved changes
 */
async function applyApprovedChange(approval) {
  try {
    const user = await User.findById(approval.userId).populate("role");
    if (!user) {
      logger.error("User not found for approval:", {
        approvalId: approval.approvalId,
      });
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
        const changedFields = Object.keys(newValues);
        // Use first field for fieldChanged (enum constraint), full list in metadata
        const primaryField = changedFields[0] || "firstName";
        await logAuditEvent(
          user._id,
          "admin_approval_approved",
          "User",
          user._id,
          {
            role: roleSlug,
            fieldChanged: primaryField,
            oldValue: JSON.stringify(approval.requestDetails.oldValues),
            newValue: JSON.stringify(newValues),
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            allChangedFields: changedFields,
          },
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
        await logAuditEvent(
          user._id,
          "admin_approval_approved",
          "User",
          user._id,
          {
            role: roleSlug,
            fieldChanged: "email",
            oldValue: oldEmail,
            newValue: newEmail,
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            mfaReEnrollmentRequired: true,
          },
        );

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
        await logAuditEvent(
          user._id,
          "admin_approval_approved",
          "User",
          user._id,
          {
            role: roleSlug,
            fieldChanged: "password",
            oldValue: "[REDACTED]",
            newValue: "[REDACTED]",
            approvalId: approval.approvalId,
            requestType: approval.requestType,
            approvedBy: approval.approvals.map((a) => String(a.adminId)),
            tokenVersion: user.tokenVersion,
            mfaReEnrollmentRequired: !!user.mfaReEnrollmentRequired,
          },
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

        await logAuditEvent(
          approval.requestedBy,
          "maintenance_mode",
          "MaintenanceWindow",
          approval.approvalId,
          {
            role: "admin",
            fieldChanged: "maintenance",
            oldValue: "",
            newValue: action,
            approvalId: approval.approvalId,
            message: message || "",
            expectedResumeAt: expectedResumeAt || null,
            scheduledStartAt: hasValidScheduledDate ? scheduledDate : null,
            approvedBy,
          },
        );

        return { success: true };
      }

      default:
        return { success: false, error: "Unknown request type" };
    }
  } catch (error) {
    logger.error("Error applying approved change:", {
      error: error.message,
      approvalId: approval.approvalId,
    });
    return { success: false, error: error.message };
  }
}

module.exports = applyApprovedChange;
