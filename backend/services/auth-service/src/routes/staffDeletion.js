const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const RecoveryRequest = require("../models/RecoveryRequest");
const { generateToken } = require("../lib/codes");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const { requireJwt, requireRole } = require("../middleware/auth");
const { isWithinOfficeHours } = require("../lib/officeHoursValidator");
const { trackIP, isUnusualIP } = require("../lib/ipTracker");
const { logAuditEvent } = require("../lib/auditClient");
const { isStaffRole } = require("../lib/roleHelpers");
const { checkLockout } = require("../lib/accountLockout");
const securityMonitor = require("../middleware/securityMonitor");
const {
  sendAdminAlert,
  createInAppNotificationsForAdmins,
} = require("../lib/notificationService");

const router = express.Router();

const staffDeletionRequestSchema = Joi.object({
  legalAcknowledgment: Joi.boolean().valid(true).required().messages({
    "any.only": "You must acknowledge that this request cannot be undone",
  }),
  reason: Joi.string().max(500).optional(),
});

// POST /api/auth/staff/request-deletion
// Staff requests account deactivation (requires admin approval)
router.post(
  "/staff/request-deletion",
  requireJwt,
  validateBody(staffDeletionRequestSchema),
  async (req, res) => {
    try {
      const userId = req._userId;
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const { legalAcknowledgment, reason } = req.body || {};

      if (!legalAcknowledgment) {
        return respond.error(
          res,
          400,
          "legal_acknowledgment_required",
          "You must acknowledge that this request cannot be undone",
        );
      }

      const user = await User.findById(userId).populate("role");
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");

      // Verify user is staff
      const roleSlug = user.role?.slug || "";
      if (!isStaffRole(roleSlug)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "Only staff users can request deletion",
        );
      }

      // Check account lockout
      const lockoutCheck = await checkLockout(user._id);
      if (lockoutCheck.locked) {
        return respond.error(
          res,
          423,
          "account_locked",
          `Account is temporarily locked. Try again in ${lockoutCheck.remainingMinutes} minutes.`,
        );
      }

      // Check if there's already a pending deletion request
      // We'll use RecoveryRequest model structure but create a new model if needed
      // For now, let's check if user already has deletionPending
      if (user.deletionPending) {
        return respond.error(
          res,
          409,
          "request_exists",
          "You already have a pending deletion request",
        );
      }

      // Check office hours (flag if outside)
      const officeHoursCheck = await isWithinOfficeHours(user.office || "");
      const requestedOutsideOfficeHours = !officeHoursCheck.isWithinHours;

      // Check for unusual IP
      const ipCheck = await isUnusualIP(user._id, ipAddress);
      const suspiciousActivity = ipCheck.isUnusual;

      // Track IP
      await trackIP(user._id, ipAddress);

      // Detect suspicious patterns
      if (suspiciousActivity) {
        securityMonitor.detectSuspiciousActivity(req);
      }

      // Create deletion request (we'll use a simple flag for now, or create StaffDeletionRequest model)
      // For now, mark as pending deletion
      user.deletionPending = true;
      user.deletionRequestedAt = new Date();
      // Note: Staff deletion requires admin approval, so we don't set deletionScheduledFor yet
      await user.save();

      // Log to audit trail
      await logAuditEvent(
        user._id,
        "account_deletion_requested",
        "User",
        user._id,
        {
          role: roleSlug,
          fieldChanged: "account",
          oldValue: "",
          newValue: "staff_deletion_requested",
          ip: ipAddress,
          userAgent,
          office: user.office || "",
          reason: reason || "",
          requestedOutsideOfficeHours,
          suspiciousActivityDetected: suspiciousActivity,
        },
      );

      // In-app notification for all admins
      const staffName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
      createInAppNotificationsForAdmins(
        "deletion_request_pending",
        "Staff deletion request pending",
        `Staff ${staffName} requested account deletion. Review the request.`,
        "system",
        String(user._id),
        { userId: String(user._id), office: user.office || "", role: roleSlug },
      ).catch((err) =>
        console.error(
          "Failed to create deletion-request in-app notifications:",
          err,
        ),
      );

      // Security: alert admins when request is from unusual IP (important only)
      if (suspiciousActivity) {
        sendAdminAlert("deletion_from_unusual_ip", {
          userId: String(user._id),
          userEmail: user.email,
          ipAddress,
          userAgent,
          message:
            "Staff deletion request from unusual IP; verify identity before approving.",
        }).catch((err) =>
          console.error("Failed to send admin security alert:", err),
        );
        createInAppNotificationsForAdmins(
          "security_alert",
          "Security: deletion request from unusual IP",
          `Deletion request from ${user.email} from an unusual IP. Verify identity before approving.`,
          "system",
          String(user._id),
          { userId: String(user._id), ipAddress },
        ).catch((err) =>
          console.error("Failed to create security in-app notifications:", err),
        );
      }

      return res.json({
        success: true,
        message:
          "Deletion request submitted. An admin will review your request.",
        warning: suspiciousActivity
          ? "Unusual activity detected. Admin will verify your identity."
          : undefined,
      });
    } catch (err) {
      console.error("POST /api/auth/staff/request-deletion error:", err);
      return respond.error(
        res,
        500,
        "deletion_request_failed",
        "Failed to submit deletion request",
      );
    }
  },
);

// GET /api/auth/staff/deletion-status
// Staff checks status of their deletion request
router.get("/staff/deletion-status", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const user = await User.findById(userId)
      .select("deletionPending deletionRequestedAt deletionScheduledFor")
      .lean();

    if (!user)
      return respond.error(res, 404, "user_not_found", "User not found");

    return res.json({
      deletionPending: !!user.deletionPending,
      deletionRequestedAt: user.deletionRequestedAt,
      deletionScheduledFor: user.deletionScheduledFor,
    });
  } catch (err) {
    console.error("GET /api/auth/staff/deletion-status error:", err);
    return respond.error(
      res,
      500,
      "fetch_failed",
      "Failed to fetch deletion status",
    );
  }
});

// GET /api/auth/admin/staff-deletion-requests
// Admin views pending staff deletion requests
router.get(
  "/admin/staff-deletion-requests",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { office, status = "pending" } = req.query || {};

      const query = { deletionPending: true };
      if (office) query.office = office;

      const users = await User.find(query)
        .populate("role")
        .select(
          "email firstName lastName office role deletionRequestedAt deletionScheduledFor",
        )
        .sort({ deletionRequestedAt: -1 })
        .lean();

      return res.json({
        requests: users.map((user) => ({
          userId: String(user._id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          office: user.office || "",
          role: user.role?.slug || "",
          deletionRequestedAt: user.deletionRequestedAt,
          deletionScheduledFor: user.deletionScheduledFor,
        })),
      });
    } catch (err) {
      console.error("GET /api/auth/admin/staff-deletion-requests error:", err);
      return respond.error(
        res,
        500,
        "fetch_failed",
        "Failed to fetch staff deletion requests",
      );
    }
  },
);

// POST /api/auth/admin/approve-staff-deletion
// Admin approves staff deletion request
const approveStaffDeletionSchema = Joi.object({
  userId: Joi.string().required(),
  approve: Joi.boolean().required(),
  reason: Joi.string().max(500).when("approve", {
    is: false,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});
router.post(
  "/admin/approve-staff-deletion",
  requireJwt,
  requireRole(["admin"]),
  validateBody(approveStaffDeletionSchema),
  async (req, res) => {
    try {
      const adminId = req._userId;
      const { userId, approve, reason } = req.body || {};
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const staffUser = await User.findById(userId).populate("role");
      if (!staffUser) {
        return respond.error(
          res,
          404,
          "user_not_found",
          "Staff user not found",
        );
      }

      // Verify user is staff
      const roleSlug = staffUser.role?.slug || "";
      if (!isStaffRole(roleSlug)) {
        return respond.error(
          res,
          400,
          "not_staff",
          "User is not a staff member",
        );
      }

      if (!staffUser.deletionPending) {
        return respond.error(
          res,
          400,
          "no_request",
          "No deletion request pending for this user",
        );
      }

      if (approve) {
        // Approve deletion - schedule for 30 days
        const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        staffUser.deletionScheduledFor = scheduledFor;
        staffUser.isActive = false;
        staffUser.tokenVersion = (staffUser.tokenVersion || 0) + 1; // Invalidate all sessions
        await staffUser.save();

        // Log to audit trail
        await logAuditEvent(
          staffUser._id,
          "account_deletion_approved",
          "User",
          staffUser._id,
          {
            role: roleSlug,
            fieldChanged: "account",
            oldValue: "",
            newValue: "staff_deletion_approved",
            ip: ipAddress,
            userAgent,
            approvedBy: String(adminId),
            scheduledFor: scheduledFor.toISOString(),
          },
        );

        return res.json({
          success: true,
          message:
            "Staff deletion approved. Account will be deleted in 30 days.",
          scheduledFor: scheduledFor.toISOString(),
        });
      } else {
        // Deny deletion
        if (!reason) {
          return respond.error(
            res,
            400,
            "reason_required",
            "Reason is required when denying deletion",
          );
        }

        staffUser.deletionPending = false;
        staffUser.deletionRequestedAt = null;
        await staffUser.save();

        // Log to audit trail
        await logAuditEvent(
          staffUser._id,
          "account_deletion_denied",
          "User",
          staffUser._id,
          {
            role: roleSlug,
            fieldChanged: "account",
            oldValue: "deletion_requested",
            newValue: "deletion_denied",
            ip: ipAddress,
            userAgent,
            deniedBy: String(adminId),
            reason,
          },
        );

        return res.json({
          success: true,
          message: "Staff deletion request denied.",
        });
      }
    } catch (err) {
      console.error("POST /api/auth/admin/approve-staff-deletion error:", err);
      return respond.error(
        res,
        500,
        "approval_failed",
        "Failed to process deletion approval",
      );
    }
  },
);

module.exports = router;
