const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const respond = require("../middleware/respond");
const AdminApproval = require("../models/AdminApproval");
const User = require("../models/User"); // Shared model - all services access same DB
const Announcement = require("../models/Announcement");
const {
  applyApprovedChange,
  logToBlockchain,
} = require("../lib/interServiceClient");
const {
  sendApprovalNotification,
  createInAppNotificationsForAdmins,
  createInAppNotification,
} = require("../lib/notificationService");
const { logAuditEvent } = require("../lib/auditClient");
const logger = require("../lib/logger");

const router = express.Router();

// Validation schemas
const createApprovalRequestSchema = Joi.object({
  requestType: Joi.string()
    .valid(
      "email_change",
      "password_change",
      "personal_info_change",
      "account_status_change",
      "role_change",
      "maintenance_mode",
      "other",
    )
    .required(),
  userId: Joi.string().required(),
  requestDetails: Joi.object().optional(),
  requestedChanges: Joi.object().optional(),
}).or("requestDetails", "requestedChanges");

const approveRequestSchema = Joi.object({
  approved: Joi.boolean().optional().default(true),
  comment: Joi.string().when("approved", {
    is: false,
    then: Joi.required().messages({
      "any.required": "Comment is required when rejecting",
    }),
    otherwise: Joi.string().allow("").optional(),
  }),
});

async function reconcilePendingMaintenanceApprovals() {
  const pendingMaintenance = await AdminApproval.find({
    requestType: "maintenance_mode",
    status: "pending",
  });

  for (const approval of pendingMaintenance) {
    const approvedCount = approval.approvals.filter(
      (a) => a.approved === true,
    ).length;
    const rejectedCount = approval.approvals.filter(
      (a) => a.approved === false,
    ).length;
    const voteCount = approval.approvals.length;

    // Maintenance-specific veto: single rejection = rejected
    let nextStatus;
    if (rejectedCount > 0) {
      nextStatus = "rejected";
    } else if (approvedCount >= approval.requiredApprovals) {
      nextStatus = "approved";
    } else {
      continue; // Still pending
    }

    if (approval.status === nextStatus) continue;

    approval.status = nextStatus;
    await approval.save();

    if (nextStatus === "approved") {
      try {
        const applyResult = await applyApprovedChange(approval);
        if (!applyResult.success) {
          logger.error(
            "Failed to apply reconciled approved maintenance change",
            {
              approvalId: approval.approvalId,
              error: applyResult.error,
            },
          );
        } else {
          approval.executedAt = new Date();
          await approval.save();
        }
      } catch (err) {
        logger.error("Error applying reconciled approved maintenance change", {
          approvalId: approval.approvalId,
          error: err.message,
        });
      }
    }
  }
}

// POST /api/admin/approvals - Create an approval request
router.post(
  "/approvals",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      // Manual validation to support both requestDetails and requestedChanges
      const { requestType, userId, requestDetails, requestedChanges } =
        req.body || {};
      const requestedBy = req._userId;

      // Validate required fields
      if (!requestType || !userId) {
        return respond.error(
          res,
          400,
          "validation_error",
          "requestType and userId are required",
        );
      }

      const validRequestTypes = [
        "email_change",
        "password_change",
        "personal_info_change",
        "account_status_change",
        "role_change",
        "maintenance_mode",
        "other",
      ];
      if (!validRequestTypes.includes(requestType)) {
        return respond.error(
          res,
          400,
          "validation_error",
          `requestType must be one of: ${validRequestTypes.join(", ")}`,
        );
      }

      // Support both requestDetails and requestedChanges for backward compatibility
      const details =
        requestDetails ||
        (requestedChanges
          ? { newValues: requestedChanges, oldValues: {} }
          : {});

      if (!details || Object.keys(details).length === 0) {
        return respond.error(
          res,
          400,
          "validation_error",
          "requestDetails or requestedChanges is required",
        );
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      // Check if admin is trying to approve their own change
      if (String(userId) === String(requestedBy)) {
        return respond.error(
          res,
          400,
          "self_approval_not_allowed",
          "Admins cannot request approval for their own changes",
        );
      }

      // Overlap check for maintenance_mode requests
      if (requestType === "maintenance_mode" && details.action === "enable") {
        console.log("[Approvals Endpoint] Maintenance overlap check triggered");
        const { parseDateSafe } = require("../lib/dateHelpers");
        const {
          findOverlappingMaintenanceApprovals,
        } = require("./maintenance");

        const scheduledStartAt = details.scheduledStartAt;
        const expectedResumeAt = details.expectedResumeAt;
        const startAt = parseDateSafe(scheduledStartAt) || new Date();
        const endAt = parseDateSafe(expectedResumeAt);
        const isNewRequestStartNow = !scheduledStartAt;
        console.log("[Approvals Endpoint] Overlap check params:", {
          scheduledStartAt,
          expectedResumeAt,
          startAt: startAt.toISOString(),
          endAt: endAt?.toISOString(),
          isNewRequestStartNow,
        });

        if (!endAt || endAt <= startAt) {
          return respond.error(
            res,
            400,
            "invalid_schedule",
            "End time must be after start time",
          );
        }

        const overlaps = await findOverlappingMaintenanceApprovals(
          startAt,
          endAt,
          null,
          isNewRequestStartNow,
        );
        console.log("[Approvals Endpoint] Found overlaps:", overlaps.length);
        if (overlaps.length > 0) {
          return respond.error(
            res,
            409,
            "maintenance_schedule_conflict",
            "Selected schedule overlaps with an existing pending or approved maintenance request. Please pick another time slot.",
          );
        }
      }

      // Generate unique approval ID
      const approvalId = AdminApproval.generateApprovalId();

      // Create approval request
      const approval = await AdminApproval.create({
        approvalId,
        requestType,
        userId,
        requestedBy,
        requestDetails: details,
        status: "pending",
        requiredApprovals: 2,
      });

      // Notify other admins (in-app) so they can approve
      const targetUser = await User.findById(userId)
        .select("firstName lastName email")
        .lean();
      const targetName = targetUser
        ? `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
          targetUser.email
        : "User";
      createInAppNotificationsForAdmins(
        "approval_request_pending",
        "New approval request",
        `${requestType.replace(/_/g, " ")} for ${targetName} (${approvalId}). Action required.`,
        "approval",
        approvalId,
        { requestType, userId: String(userId) },
        requestedBy,
      ).catch((err) =>
        console.error("Failed to create approval-pending notifications:", err),
      );

      const requesterRole = req._userRole || "admin";
      logAuditEvent(
        "admin_approval_request",
        requestedBy,
        "AdminApproval",
        String(approval._id),
        {
          role: requesterRole,
          fieldChanged: "approval_request",
          oldValue: "",
          newValue: approvalId,
          approvalId,
          requestType,
          targetUserId: String(userId),
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        logger.warn("Failed to log audit event for approval request", { err }),
      );

      return res.status(201).json({
        success: true,
        approval: {
          _id: approval._id,
          approvalId: approval.approvalId,
          requestType: approval.requestType,
          userId: approval.userId,
          status: approval.status,
          createdAt: approval.createdAt,
        },
      });
    } catch (err) {
      console.error("POST /api/admin/approvals error:", err);
      return respond.error(
        res,
        500,
        "approval_request_failed",
        "Failed to create approval request",
      );
    }
  },
);

// POST /api/admin/approvals/:approvalId/approve - Approve or reject a request
router.post(
  "/approvals/:approvalId/approve",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(approveRequestSchema),
  async (req, res) => {
    try {
      const { approvalId } = req.params;
      const { approved, comment } = req.body;
      const approverId = req._userId;

      // Find approval request
      const approval = await AdminApproval.findOne({ approvalId });
      if (!approval) {
        return respond.error(
          res,
          404,
          "approval_not_found",
          "Approval request not found",
        );
      }

      // Check if already completed
      if (approval.status !== "pending") {
        return respond.error(
          res,
          400,
          "approval_already_processed",
          `Approval request already ${approval.status}`,
        );
      }

      // Check if admin is trying to approve a change to their own account (forbidden)
      // Allow approving someone else's request even if they submitted it (to keep E2E test simple)
      if (String(approval.userId) === String(approverId)) {
        return respond.error(
          res,
          400,
          "self_approval_not_allowed",
          "Admins cannot approve their own requests",
        );
      }

      // Check if admin has already voted
      if (approval.hasAdminVoted(approverId)) {
        return respond.error(
          res,
          400,
          "already_voted",
          "You have already voted on this request",
        );
      }

      // Get approver info
      const approver = await User.findById(approverId).populate("role").lean();
      const approverRole =
        approver && approver.role && approver.role.slug
          ? approver.role.slug
          : "admin";

      // Add approval/rejection
      approval.approvals.push({
        adminId: approverId,
        approved,
        comment: comment || "",
        timestamp: new Date(),
      });

      // Finalize decision after each vote.
      // Rule: 2 approvals => approved. If vote count reaches requiredApprovals with mixed votes => rejected.
      // For maintenance_mode: single rejection immediately rejects (veto system).
      let wasJustApproved = false;
      const approvedCount = approval.approvals.filter(
        (a) => a.approved === true,
      ).length;
      const rejectedCount = approval.approvals.filter(
        (a) => a.approved === false,
      ).length;
      const voteCount = approval.approvals.length;
      const hasMixedVotes = approvedCount > 0 && rejectedCount > 0;

      // Maintenance-specific veto: single rejection = rejected
      if (
        approval.requestType === "maintenance_mode" &&
        !approved &&
        approval.status === "pending"
      ) {
        approval.status = "rejected";
      } else if (
        approvedCount >= approval.requiredApprovals &&
        approval.status === "pending"
      ) {
        approval.status = "approved";
        wasJustApproved = true;
      } else if (rejectedCount >= approval.requiredApprovals) {
        approval.status = "rejected";
      } else if (voteCount >= approval.requiredApprovals && hasMixedVotes) {
        approval.status = "rejected";
      }

      await approval.save();

      logAuditEvent(
        "admin_approval",
        approverId,
        "AdminApproval",
        String(approval._id),
        {
          role: approverRole,
          fieldChanged: "approval_vote",
          oldValue: "pending",
          newValue: approved ? "approved" : "rejected",
          approvalId: approval.approvalId,
          approved,
          requestType: approval.requestType,
          targetUserId: String(approval.userId),
          comment: comment || "",
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        logger.warn("Failed to log audit event for approval vote", { err }),
      );

      // Apply changes if just approved
      if (wasJustApproved) {
        try {
          const applyResult = await applyApprovedChange(approval);
          if (!applyResult.success) {
            logger.error("Failed to apply approved change", {
              error: applyResult.error,
              approvalId,
            });
            // Don't fail the approval, but log the error
          } else {
            approval.executedAt = new Date();
            await approval.save();
            // Send email and in-app notification to requesting admin (non-blocking)
            const approver = await User.findById(approverId).lean();
            const approverName = approver
              ? `${approver.firstName} ${approver.lastName}`
              : "Admin";
            sendApprovalNotification(
              approval.requestedBy,
              approval.approvalId,
              "approved",
              {
                requestType: approval.requestType,
                comment: comment || "",
                approverName,
              },
            ).catch((err) => {
              console.error("Failed to send approval notification:", err);
            });
            createInAppNotification(
              approval.requestedBy,
              "approval_resolved",
              "Approval request approved",
              `Your ${approval.requestType.replace(/_/g, " ")} request (${approval.approvalId}) was approved by ${approverName}.`,
              "approval",
              approval.approvalId,
              { status: "approved", approverName },
            ).catch((err) =>
              console.error(
                "Failed to create approval-resolved in-app notification:",
                err,
              ),
            );

            // Create announcement for approved maintenance
            if (
              approval.requestType === "maintenance_mode" &&
              approval.requestDetails?.action === "enable"
            ) {
              const scheduledStartAt = approval.requestDetails?.scheduledStartAt
                ? new Date(approval.requestDetails.scheduledStartAt)
                : null;
              const expectedResumeAt = approval.requestDetails?.expectedResumeAt
                ? new Date(approval.requestDetails.expectedResumeAt)
                : null;
              const reason =
                approval.requestDetails?.reason || "System maintenance";
              const message = approval.requestDetails?.message || reason;
              const now = new Date();
              const isUpcoming = scheduledStartAt && scheduledStartAt > now;

              if (scheduledStartAt && expectedResumeAt) {
                const startDate = scheduledStartAt.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
                const startTime = scheduledStartAt.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const endTime = expectedResumeAt.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const announcement = await Announcement.create({
                  title: isUpcoming
                    ? "Upcoming Maintenance"
                    : "Scheduled Maintenance",
                  body: message,
                  priority: "high",
                  status: "published",
                  isActive: true,
                  expiresAt: expectedResumeAt,
                  createdBy: approverId,
                  metadata: {
                    maintenanceApprovalId: approval.approvalId,
                    scheduledStartAt: scheduledStartAt,
                    expectedResumeAt: expectedResumeAt,
                  },
                }).catch((err) =>
                  logger.warn("Failed to create maintenance announcement", {
                    err,
                  }),
                );
              }
            }

            if (
              approval.requestType === "maintenance_mode" &&
              approval.requestDetails?.action === "disable" &&
              approval.requestDetails?.cancelTargetApprovalId
            ) {
              await AdminApproval.updateOne(
                {
                  approvalId: approval.requestDetails.cancelTargetApprovalId,
                  requestType: "maintenance_mode",
                  status: "approved",
                },
                {
                  $set: {
                    status: "cancelled",
                    "metadata.cancelledByApprovalId": approval.approvalId,
                    "metadata.cancelledAt": new Date(),
                  },
                },
              );
            }
          }
        } catch (applyError) {
          console.error("Error applying approved change:", applyError);
        }
      }

      // Send notification if rejected
      if (approval.status === "rejected") {
        const approver = await User.findById(approverId).lean();
        const approverName = approver
          ? `${approver.firstName} ${approver.lastName}`
          : "Admin";
        sendApprovalNotification(
          approval.requestedBy,
          approval.approvalId,
          "rejected",
          {
            requestType: approval.requestType,
            comment: comment || "",
            approverName,
          },
        ).catch((err) => {
          console.error("Failed to send rejection notification:", err);
        });
        createInAppNotification(
          approval.requestedBy,
          "approval_resolved",
          "Approval request rejected",
          `Your ${approval.requestType.replace(/_/g, " ")} request (${approval.approvalId}) was rejected by ${approverName}.`,
          "approval",
          approval.approvalId,
          { status: "rejected", approverName },
        ).catch((err) =>
          console.error(
            "Failed to create approval-rejected in-app notification:",
            err,
          ),
        );
      }

      // Log to blockchain if approved or rejected (on-chain storage for critical events)
      if (approval.status === "approved" || approval.status === "rejected") {
        const details = {
          approvalId: approval.approvalId,
          requestType: approval.requestType,
          userId: String(approval.userId),
          requestedBy: String(approval.requestedBy),
          approvals: approval.approvals.map((a) => ({
            adminId: String(a.adminId),
            approved: a.approved,
            comment: a.comment,
            timestamp: a.timestamp,
          })),
          finalStatus: approval.status,
        };

        // Log to blockchain via Audit Service (non-blocking)
        logToBlockchain("logAdminApproval", {
          approvalId: approval.approvalId,
          requestType: approval.requestType,
          userId: String(approval.userId),
          approverId: String(approverId),
          approved,
          details: JSON.stringify(details),
        }).catch((err) => {
          logger.warn("Failed to log to blockchain via Audit Service", {
            error: err,
          });
        });

        // Also log critical event for admin approvals
        logToBlockchain("logCriticalEvent", {
          eventType: `admin_approval_${approval.status}`,
          userId: String(approval.userId),
          details: JSON.stringify(details),
        }).catch((err) => {
          logger.warn("Failed to log critical event via Audit Service", {
            error: err,
          });
        });
      }

      return res.json({
        success: true,
        approval: {
          approvalId: approval.approvalId,
          status: approval.status,
          approvals: approval.approvals,
          completed: approval.status !== "pending",
        },
      });
    } catch (err) {
      console.error(
        "POST /api/admin/approvals/:approvalId/approve error:",
        err,
      );
      return respond.error(
        res,
        500,
        "approval_failed",
        "Failed to process approval",
      );
    }
  },
);

// DELETE /api/admin/approvals/:approvalId/approve - Remove admin's vote (undo)
router.delete(
  "/approvals/:approvalId/approve",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { approvalId } = req.params;
      const approverId = req._userId;

      const approval = await AdminApproval.findOne({ approvalId });
      if (!approval) {
        return respond.error(
          res,
          404,
          "approval_not_found",
          "Approval request not found",
        );
      }

      // Block undo for executed requests
      if (approval.executedAt) {
        return respond.error(
          res,
          400,
          "already_executed",
          "Cannot undo: this request has already been executed",
        );
      }

      // Check if admin has voted
      const voteIndex = approval.approvals.findIndex(
        (a) => String(a.adminId) === String(approverId),
      );
      if (voteIndex === -1) {
        return respond.error(
          res,
          400,
          "no_vote_found",
          "You have not voted on this request",
        );
      }

      // Check for overlapping maintenance if undoing a vote on maintenance
      if (approval.requestType === "maintenance_mode") {
        const details = approval.requestDetails;
        const startAt = details?.scheduledStartAt
          ? new Date(details.scheduledStartAt)
          : null;
        const endAt = details?.expectedResumeAt
          ? new Date(details.expectedResumeAt)
          : null;

        if (startAt && endAt) {
          const overlapping = await AdminApproval.findOne({
            approvalId: { $ne: approvalId },
            requestType: "maintenance_mode",
            status: { $in: ["approved", "pending"] },
            "requestDetails.scheduledStartAt": { $lt: endAt },
            "requestDetails.expectedResumeAt": { $gt: startAt },
          });

          if (overlapping) {
            return respond.error(
              res,
              400,
              "overlapping_maintenance",
              "Cannot undo: overlapping maintenance exists",
            );
          }
        }
      }

      // Remove the vote
      approval.approvals.splice(voteIndex, 1);

      // Reconcile status after removing vote
      const approvedCount = approval.approvals.filter(
        (a) => a.approved === true,
      ).length;
      const rejectedCount = approval.approvals.filter(
        (a) => a.approved === false,
      ).length;
      const voteCount = approval.approvals.length;

      // If no votes left, reset to pending
      if (voteCount === 0) {
        approval.status = "pending";
      } else if (approvedCount >= approval.requiredApprovals) {
        approval.status = "approved";
      } else if (rejectedCount >= approval.requiredApprovals) {
        approval.status = "rejected";
      } else {
        approval.status = "pending";
      }

      await approval.save();

      logAuditEvent(
        "undo_vote",
        approverId,
        "AdminApproval",
        String(approval._id),
        {
          role: approverRole || "admin",
          targetType: "approval",
          approverId,
          requestType: approval.requestType,
          newStatus: approval.status,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        logger.warn("Failed to log audit event for undo vote", { err }),
      );

      return res.json({
        success: true,
        approval: {
          approvalId: approval.approvalId,
          status: approval.status,
          approvals: approval.approvals,
          completed: approval.status !== "pending",
        },
      });
    } catch (err) {
      console.error(
        "DELETE /api/admin/approvals/:approvalId/approve error:",
        err,
      );
      return respond.error(res, 500, "undo_failed", "Failed to undo vote");
    }
  },
);

// GET /api/admin/approvals - Get all approval requests
router.get(
  "/approvals",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { status, userId, requestType } = req.query;

      // Keep maintenance approvals consistent with 2-admin voting rules.
      // This prevents old split-vote records from remaining stuck in pending.
      if (!requestType || requestType === "maintenance_mode") {
        await reconcilePendingMaintenanceApprovals();
      }

      const query = {};
      if (status) query.status = status;
      if (userId) query.userId = userId;
      if (requestType) query.requestType = requestType;

      const approvals = await AdminApproval.find(query)
        .populate("userId", "firstName lastName email")
        .populate("requestedBy", "firstName lastName email")
        .populate("approvals.adminId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        approvals,
      });
    } catch (err) {
      console.error("GET /api/admin/approvals error:", err);
      return respond.error(
        res,
        500,
        "fetch_approvals_failed",
        "Failed to fetch approval requests",
      );
    }
  },
);

// GET /api/admin/approvals/:approvalId - Get specific approval request
router.get(
  "/approvals/:approvalId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { approvalId } = req.params;

      const approval = await AdminApproval.findOne({ approvalId })
        .populate("userId", "firstName lastName email")
        .populate("requestedBy", "firstName lastName email")
        .populate("approvals.adminId", "firstName lastName email")
        .lean();

      if (!approval) {
        return respond.error(
          res,
          404,
          "approval_not_found",
          "Approval request not found",
        );
      }

      return res.json({
        success: true,
        approval,
      });
    } catch (err) {
      console.error("GET /api/admin/approvals/:approvalId error:", err);
      return respond.error(
        res,
        500,
        "fetch_approval_failed",
        "Failed to fetch approval request",
      );
    }
  },
);

module.exports = router;
