const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const AdminDeletionRequest = require("../models/AdminDeletionRequest");
const { generateToken } = require("../lib/codes");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const { requireJwt, requireRole } = require("../middleware/auth");
const { checkHighPrivilegeTasks } = require("../lib/highPrivilegeTaskChecker");
const { trackIP, isUnusualIP } = require("../lib/ipTracker");
const { logAuditEvent } = require("../lib/auditClient");
const { isAdminRole } = require("../lib/roleHelpers");
const { checkLockout } = require("../lib/accountLockout");
const { verifyCode } = require("../lib/verificationService");
const securityMonitor = require("../middleware/securityMonitor");
const {
  sendAdminAlert,
  createInAppNotificationsForAdmins,
} = require("../lib/notificationService");

const router = express.Router();

const adminDeletionRequestSchema = Joi.object({
  legalAcknowledgment: Joi.boolean().valid(true).required().messages({
    "any.only": "You must acknowledge that this action is irreversible",
  }),
  mfaCode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

const approveAdminDeletionSchema = Joi.object({
  deletionRequestId: Joi.string().required(),
  approve: Joi.boolean().required(),
  reason: Joi.string().max(500).when("approve", {
    is: false,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  mfaCode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

// POST /api/auth/admin/request-deletion
// Admin requests own account deletion (requires another admin's approval)
router.post(
  "/admin/request-deletion",
  requireJwt,
  requireRole(["admin"]),
  validateBody(adminDeletionRequestSchema),
  async (req, res) => {
    try {
      const requestingAdminId = req._userId;
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const { legalAcknowledgment, mfaCode } = req.body || {};

      if (!legalAcknowledgment) {
        return respond.error(
          res,
          400,
          "legal_acknowledgment_required",
          "You must acknowledge that this action is irreversible",
        );
      }

      const requestingAdmin =
        await User.findById(requestingAdminId).populate("role");
      if (!requestingAdmin)
        return respond.error(res, 404, "user_not_found", "User not found");

      // Verify MFA
      const mfaVerification = await verifyCode(
        requestingAdminId,
        mfaCode,
        "mfa",
        "admin_deletion_request",
      );
      if (!mfaVerification.verified) {
        return respond.error(res, 401, "invalid_mfa", "Invalid MFA code");
      }

      // Check account lockout
      const lockoutCheck = await checkLockout(requestingAdminId);
      if (lockoutCheck.locked) {
        return respond.error(
          res,
          423,
          "account_locked",
          `Account is temporarily locked. Try again in ${lockoutCheck.remainingMinutes} minutes.`,
        );
      }

      // Check for unusual IP
      const ipCheck = await isUnusualIP(requestingAdminId, ipAddress);
      const suspiciousActivity = ipCheck.isUnusual;

      // Track IP
      await trackIP(requestingAdminId, ipAddress);

      // Check for high-privilege tasks
      const taskCheck = await checkHighPrivilegeTasks(requestingAdminId);

      // Detect suspicious patterns
      if (suspiciousActivity) {
        securityMonitor.detectSuspiciousActivity(req);
      }

      // Check if there's already a pending deletion request
      const existingRequest = await AdminDeletionRequest.findOne({
        requestingAdminId: requestingAdminId,
        status: "pending",
      }).lean();

      if (existingRequest) {
        return respond.error(
          res,
          409,
          "request_exists",
          "You already have a pending deletion request",
        );
      }

      // Create deletion request
      const deletionRequest = await AdminDeletionRequest.create({
        requestingAdminId: requestingAdminId,
        status: "pending",
        mfaVerifiedAt: new Date(),
        highPrivilegeTasksChecked: true,
        highPrivilegeTasksFound: taskCheck.hasTasks,
        highPrivilegeTasksDetails: taskCheck.details,
        metadata: {
          ipAddress,
          userAgent,
          requestingAdminEmail: requestingAdmin.email,
          suspiciousActivityDetected: suspiciousActivity,
        },
      });

      // Log to audit trail
      await logAuditEvent(
        requestingAdminId,
        "admin_deletion_requested",
        "User",
        requestingAdminId,
        {
          role: "admin",
          fieldChanged: "account",
          oldValue: "",
          newValue: "admin_deletion_requested",
          ip: ipAddress,
          userAgent,
          deletionRequestId: String(deletionRequest._id),
          highPrivilegeTasksFound: taskCheck.hasTasks,
          suspiciousActivityDetected: suspiciousActivity,
        },
      );

      // In-app notification for other admins (exclude requesting admin)
      const adminName =
        [requestingAdmin.firstName, requestingAdmin.lastName]
          .filter(Boolean)
          .join(" ") || requestingAdmin.email;
      createInAppNotificationsForAdmins(
        "deletion_request_pending",
        "Admin deletion request pending",
        `Admin ${adminName} (${requestingAdmin.email}) requested account deletion. Another admin must approve.`,
        "system",
        String(deletionRequest._id),
        { requestingAdminId: String(requestingAdminId) },
        requestingAdminId,
      ).catch((err) =>
        console.error(
          "Failed to create admin-deletion in-app notifications:",
          err,
        ),
      );

      // High sensitivity: email other admins when admin requests own deletion
      sendAdminAlert("admin_deletion_requested", {
        deletionRequestId: String(deletionRequest._id),
        requestingAdminEmail: requestingAdmin.email,
        ipAddress,
        message:
          "An admin has requested account deletion. Another admin must approve.",
      }).catch((err) =>
        console.error("Failed to send admin deletion alert:", err),
      );

      // Security: alert when request is from unusual IP
      if (suspiciousActivity) {
        sendAdminAlert("admin_deletion_from_unusual_ip", {
          deletionRequestId: String(deletionRequest._id),
          requestingAdminEmail: requestingAdmin.email,
          ipAddress,
          userAgent,
          message:
            "Admin deletion request from unusual IP; verify identity before approving.",
        }).catch((err) =>
          console.error("Failed to send admin security alert:", err),
        );
        createInAppNotificationsForAdmins(
          "security_alert",
          "Security: admin deletion request from unusual IP",
          `Admin ${requestingAdmin.email} requested deletion from an unusual IP. Verify identity before approving.`,
          "system",
          String(deletionRequest._id),
          { requestingAdminId: String(requestingAdminId), ipAddress },
          requestingAdminId,
        ).catch((err) =>
          console.error("Failed to create security in-app notifications:", err),
        );
      }

      return res.json({
        success: true,
        deletionRequestId: String(deletionRequest._id),
        message:
          "Deletion request submitted. Another admin must approve this request.",
        highPrivilegeTasksFound: taskCheck.hasTasks,
        highPrivilegeTasksDetails: taskCheck.details,
        warning: suspiciousActivity ? "Unusual activity detected." : undefined,
      });
    } catch (err) {
      console.error("POST /api/auth/admin/request-deletion error:", err);
      return respond.error(
        res,
        500,
        "deletion_request_failed",
        "Failed to submit deletion request",
      );
    }
  },
);

// GET /api/auth/admin/pending-deletions
// View pending admin deletion requests
router.get(
  "/admin/pending-deletions",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const requests = await AdminDeletionRequest.find({ status: "pending" })
        .populate("requestingAdminId", "email firstName lastName")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        requests: requests.map((req) => ({
          id: String(req._id),
          requestingAdminId: String(req.requestingAdminId._id),
          requestingAdminEmail: req.requestingAdminId.email,
          requestingAdminName: `${req.requestingAdminId.firstName} ${req.requestingAdminId.lastName}`,
          status: req.status,
          requestedAt: req.createdAt,
          mfaVerifiedAt: req.mfaVerifiedAt,
          highPrivilegeTasksFound: req.highPrivilegeTasksFound,
          highPrivilegeTasksDetails: req.highPrivilegeTasksDetails,
          metadata: req.metadata,
        })),
      });
    } catch (err) {
      console.error("GET /api/auth/admin/pending-deletions error:", err);
      return respond.error(
        res,
        500,
        "fetch_failed",
        "Failed to fetch pending deletions",
      );
    }
  },
);

// POST /api/auth/admin/approve-admin-deletion
// Approve or deny admin deletion request
router.post(
  "/admin/approve-admin-deletion",
  requireJwt,
  requireRole(["admin"]),
  validateBody(approveAdminDeletionSchema),
  async (req, res) => {
    try {
      const approvingAdminId = req._userId;
      const { deletionRequestId, approve, reason, mfaCode } = req.body || {};
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Verify approving admin's MFA
      const approvingAdmin = await User.findById(approvingAdminId);
      if (!approvingAdmin)
        return respond.error(
          res,
          404,
          "admin_not_found",
          "Approving admin not found",
        );

      const mfaVerification = await verifyCode(
        approvingAdminId,
        mfaCode,
        "mfa",
        "admin_deletion_approval",
      );
      if (!mfaVerification.verified) {
        return respond.error(res, 401, "invalid_mfa", "Invalid MFA code");
      }

      // Find deletion request
      const deletionRequest =
        await AdminDeletionRequest.findById(deletionRequestId).populate(
          "requestingAdminId",
        );

      if (!deletionRequest) {
        return respond.error(
          res,
          404,
          "request_not_found",
          "Deletion request not found",
        );
      }

      if (deletionRequest.status !== "pending") {
        return respond.error(
          res,
          400,
          "invalid_status",
          "Deletion request is not pending",
        );
      }

      // Cannot approve own deletion
      if (
        String(deletionRequest.requestingAdminId._id) ===
        String(approvingAdminId)
      ) {
        return respond.error(
          res,
          400,
          "cannot_approve_own",
          "Cannot approve your own deletion request",
        );
      }

      const requestingAdmin = deletionRequest.requestingAdminId;

      if (approve) {
        // Approve deletion
        deletionRequest.status = "approved";
        deletionRequest.approvingAdminId = approvingAdminId;
        deletionRequest.approvalMfaVerifiedAt = new Date();
        deletionRequest.approvedAt = new Date();
        await deletionRequest.save();

        // Deactivate admin account
        requestingAdmin.isActive = false;
        requestingAdmin.deletionPending = true;
        requestingAdmin.deletionRequestedAt = new Date();
        requestingAdmin.deletionScheduledFor = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ); // 30 days
        requestingAdmin.tokenVersion = (requestingAdmin.tokenVersion || 0) + 1; // Invalidate all sessions
        await requestingAdmin.save();

        // Log to audit trail
        await logAuditEvent(
          requestingAdmin._id,
          "admin_deletion_approved",
          "User",
          requestingAdmin._id,
          {
            role: "admin",
            fieldChanged: "account",
            oldValue: "",
            newValue: "admin_deletion_approved",
            ip: ipAddress,
            userAgent,
            approvingAdminId: String(approvingAdminId),
            deletionRequestId: String(deletionRequest._id),
          },
        );

        return res.json({
          success: true,
          message: "Admin deletion approved. Account has been deactivated.",
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

        deletionRequest.status = "denied";
        deletionRequest.approvingAdminId = approvingAdminId;
        deletionRequest.approvalMfaVerifiedAt = new Date();
        deletionRequest.denialReason = reason;
        deletionRequest.deniedAt = new Date();
        await deletionRequest.save();

        // Log to audit trail
        await logAuditEvent(
          requestingAdmin._id,
          "admin_deletion_denied",
          "User",
          requestingAdmin._id,
          {
            role: "admin",
            fieldChanged: "account",
            oldValue: "",
            newValue: "admin_deletion_denied",
            ip: ipAddress,
            userAgent,
            approvingAdminId: String(approvingAdminId),
            deletionRequestId: String(deletionRequest._id),
            reason,
          },
        );

        return res.json({
          success: true,
          message: "Admin deletion request denied.",
        });
      }
    } catch (err) {
      console.error("POST /api/auth/admin/approve-admin-deletion error:", err);
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
