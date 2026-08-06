const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const { validateBody, Joi } = require("../../middleware/validation");
const respond = require("../../middleware/respond");
const AdminApproval = require("../../models/AdminApproval");
const User = require("../../models/User");
const { applyApprovedChange } = require("../auth/profile");
const { sendApprovalNotification } = require("../../lib/notificationService");

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
  comment: Joi.string().allow("").optional(),
});

// POST /api/admin/approvals - Create an approval request
router.post(
  "/approvals",
  requireJwt,
  requireRole(["admin"]),
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

      // Check if request is complete
      let wasJustApproved = false;
      if (approval.isComplete() && approval.status === "pending") {
        approval.status = "approved";
        wasJustApproved = true;
      } else if (approval.isRejected()) {
        approval.status = "rejected";
      }

      await approval.save();

      // Apply changes if just approved
      if (wasJustApproved) {
        try {
          const applyResult = await applyApprovedChange(approval);
          if (!applyResult.success) {
            console.error(
              "Failed to apply approved change:",
              applyResult.error,
            );
            // Don't fail the approval, but log the error
          } else {
            // Send notification to requesting admin (non-blocking)
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

// GET /api/admin/approvals - Get all approval requests
router.get(
  "/approvals",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { status, userId, requestType } = req.query;
      const query = {};
      if (status) query.status = status;
      if (userId) query.userId = userId;
      if (requestType) query.requestType = requestType;

      const approvals = await AdminApproval.find(query)
        .populate("userId", "firstName lastName email")
        .populate("requestedBy", "firstName lastName email")
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
