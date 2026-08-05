const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const respond = require("../middleware/respond");
const AdminApproval = require("../models/AdminApproval");
const MaintenanceWindow = require("../models/MaintenanceWindow");
const Announcement = require("../models/Announcement");
const { logAuditEvent } = require("../lib/auditClient");
const logger = require("../lib/logger");

const router = express.Router();

const OVERLAP_STATUSES = ["pending", "approved"];
const REQUEST_EXPIRY_HOURS = 48;

function parseDateSafe(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRequestWindow(approval) {
  const details = approval?.requestDetails || {};
  if (details.action !== "enable") return null;
  const end = parseDateSafe(details.expectedResumeAt);
  if (!end) return null;
  const start =
    parseDateSafe(details.scheduledStartAt) ||
    parseDateSafe(approval.createdAt);
  if (!start) return null;
  if (end <= start) return null;
  return { start, end };
}

function windowsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function findOverlappingMaintenanceApprovals(
  startAt,
  endAt,
  excludeApprovalId = null,
  isNewRequestStartNow = false,
) {
  // Query all maintenance_mode approvals with correct statuses
  // Note: Can't filter on encrypted 'requestDetails.action' in MongoDB query
  // because field-level encryption makes value-based queries impossible
  const approvals = await AdminApproval.find({
    requestType: "maintenance_mode",
    status: { $in: OVERLAP_STATUSES },
  })
    .sort({ createdAt: -1 })
    .lean();

  const now = new Date();
  const filtered = approvals.filter((approval) => {
    if (excludeApprovalId && approval.approvalId === excludeApprovalId)
      return false;

    const window = getRequestWindow(approval);
    if (!window) return false;

    // For "Start now" requests (no scheduledStartAt), check if the existing maintenance
    // hasn't ended yet (expectedResumeAt > now). This is more aggressive than exact
    // time window matching and prevents multiple "Start now" requests.
    const isExistingStartNow = !approval.requestDetails?.scheduledStartAt;

    if (isNewRequestStartNow && isExistingStartNow) {
      // Both are "Start now" requests - check if existing hasn't ended
      return window.end > now;
    }

    return windowsOverlap(startAt, endAt, window.start, window.end);
  });
  return filtered;
}

async function ensureActiveMaintenanceFromApprovals() {
  const latestApproved = await AdminApproval.findOne({
    requestType: "maintenance_mode",
    status: "approved",
  })
    .sort({ updatedAt: -1 })
    .lean();
  const latestAction = latestApproved?.requestDetails?.action;

  if (latestAction === "disable") {
    await MaintenanceWindow.updateMany(
      {
        $or: [{ isActive: true }, { status: "pending" }],
      },
      { isActive: false, status: "ended", deactivatedAt: new Date() },
    );

    // Remove maintenance announcement when maintenance is disabled
    const approvalId = latestApproved.approvalId;
    if (approvalId) {
      await Announcement.findOneAndUpdate(
        { "metadata.maintenanceApprovalId": approvalId },
        { isActive: false },
      ).catch((err) =>
        logger.warn("Failed to deactivate maintenance announcement", { err }),
      );
    }

    return null;
  }

  const active = await MaintenanceWindow.findOne({ isActive: true }).sort({
    createdAt: -1,
  });
  if (active) return active;

  const pending = await MaintenanceWindow.findOne({ status: "pending" }).sort({
    createdAt: -1,
  });
  if (pending) {
    const pendingScheduledStart = pending?.metadata?.scheduledStartAt
      ? new Date(pending.metadata.scheduledStartAt)
      : null;
    const hasPendingSchedule = !!(
      pendingScheduledStart && !Number.isNaN(pendingScheduledStart.getTime())
    );
    const shouldActivatePending =
      !hasPendingSchedule || pendingScheduledStart <= new Date();
    if (shouldActivatePending) {
      pending.status = "active";
      pending.isActive = true;
      pending.activatedAt = pending.activatedAt || new Date();
      await pending.save();

      // Update announcement to urgent when maintenance becomes active
      const approvalId = pending.metadata?.approvalId;
      if (approvalId) {
        await Announcement.findOneAndUpdate(
          { "metadata.maintenanceApprovalId": approvalId },
          {
            priority: "urgent",
            body: `Maintenance now in effect. ${pending.message || "System maintenance in progress."}`,
          },
        ).catch((err) =>
          logger.warn("Failed to update maintenance announcement to urgent", {
            err,
          }),
        );
      }

      return pending;
    }
  }

  if (!latestApproved) return null;

  const { action, message, expectedResumeAt, scheduledStartAt } =
    latestApproved.requestDetails || {};

  if (action !== "enable") return null;

  const existing = await MaintenanceWindow.findOne({
    "metadata.approvalId": latestApproved.approvalId,
  })
    .sort({ createdAt: -1 })
    .lean();
  if (existing) {
    return existing.isActive ? existing : null;
  }

  const now = new Date();
  const scheduledDate = scheduledStartAt ? new Date(scheduledStartAt) : null;
  const hasValidSchedule = !!(
    scheduledDate && !Number.isNaN(scheduledDate.getTime())
  );
  const shouldActivateNow = !hasValidSchedule || scheduledDate <= now;

  const approvedBy = (latestApproved.approvals || [])
    .map((a) => a.adminId)
    .filter(Boolean);
  const created = await MaintenanceWindow.create({
    status: shouldActivateNow ? "active" : "pending",
    isActive: shouldActivateNow,
    message: message || "",
    expectedResumeAt: expectedResumeAt ? new Date(expectedResumeAt) : null,
    requestedBy: latestApproved.requestedBy,
    approvedBy,
    activatedAt: shouldActivateNow ? now : null,
    metadata: {
      approvalId: latestApproved.approvalId,
      recovered: true,
      scheduledStartAt: hasValidSchedule ? scheduledDate : null,
    },
  });

  return shouldActivateNow ? created : null;
}

const requestSchema = Joi.object({
  action: Joi.string().valid("enable", "disable").required(),
  reason: Joi.string().max(100).allow("", null).optional(),
  message: Joi.string().max(500).allow("", null).optional(),
  expectedResumeAt: Joi.date().allow(null).optional(),
  scheduledStartAt: Joi.date().allow(null).optional(),
});

const slotSchema = Joi.object({
  start: Joi.date().required(),
  end: Joi.date().required(),
});

// GET /api/admin/maintenance/conflicts?start=...&end=... - list overlapping maintenance requests
router.get(
  "/conflicts",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { error, value } = slotSchema.validate(req.query || {});
      if (error) {
        return respond.error(
          res,
          400,
          "validation_error",
          "Valid start and end date query params are required",
        );
      }

      const startAt = new Date(value.start);
      const endAt = new Date(value.end);
      if (endAt <= startAt) {
        return respond.error(
          res,
          400,
          "validation_error",
          "End time must be after start time",
        );
      }

      const overlaps = await findOverlappingMaintenanceApprovals(
        startAt,
        endAt,
      );

      return res.json({
        success: true,
        conflicts: overlaps.map((approval) => {
          const window = getRequestWindow(approval);
          return {
            approvalId: approval.approvalId,
            status: approval.status,
            reason: approval.requestDetails?.reason || "",
            startAt: window?.start || null,
            endAt: window?.end || null,
            scheduledStartAt: approval.requestDetails?.scheduledStartAt || null,
            expectedResumeAt: approval.requestDetails?.expectedResumeAt || null,
          };
        }),
      });
    } catch (err) {
      console.error("GET /api/admin/maintenance/conflicts error:", err);
      return respond.error(
        res,
        500,
        "maintenance_conflicts_failed",
        "Failed to load maintenance conflicts",
      );
    }
  },
);

// POST /api/admin/maintenance/request - create a maintenance request (requires approval)
router.post(
  "/request",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(requestSchema),
  async (req, res) => {
    try {
      const { action, reason, message, expectedResumeAt, scheduledStartAt } =
        req.body || {};
      const requestedBy = req._userId;

      if (action === "enable") {
        const startAt = parseDateSafe(scheduledStartAt) || new Date();
        const endAt = parseDateSafe(expectedResumeAt);
        const isNewRequestStartNow = !scheduledStartAt;
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
        if (overlaps.length > 0) {
          return respond.error(
            res,
            409,
            "maintenance_schedule_conflict",
            "Selected schedule overlaps with an existing pending or approved maintenance request. Please pick another time slot.",
          );
        }
      }

      const approvalId = AdminApproval.generateApprovalId();
      const approval = await AdminApproval.create({
        approvalId,
        requestType: "maintenance_mode",
        userId: requestedBy,
        requestedBy,
        requestDetails: {
          action,
          reason: reason || "",
          message: message || "",
          expectedResumeAt: expectedResumeAt
            ? new Date(expectedResumeAt)
            : null,
          scheduledStartAt: scheduledStartAt
            ? new Date(scheduledStartAt)
            : null,
        },
        status: "pending",
        requiredApprovals: 2,
      });

      logAuditEvent(
        "maintenance_mode",
        requestedBy,
        "MaintenanceWindow",
        String(approval._id),
        {
          role: "admin",
          fieldChanged: "maintenance_request",
          oldValue: "",
          newValue: action,
          approvalId: approval.approvalId,
          action,
          reason: reason || "",
          message: message || "",
          expectedResumeAt: expectedResumeAt
            ? new Date(expectedResumeAt).toISOString()
            : null,
          scheduledStartAt: scheduledStartAt
            ? new Date(scheduledStartAt).toISOString()
            : null,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error("Failed to log audit event for maintenance request", err),
      );

      return res.status(201).json({
        success: true,
        approval: {
          approvalId: approval.approvalId,
          status: approval.status,
          requestType: approval.requestType,
          requestDetails: approval.requestDetails,
        },
      });
    } catch (err) {
      console.error("POST /api/admin/maintenance/request error:", err);
      return respond.error(
        res,
        500,
        "maintenance_request_failed",
        "Failed to create maintenance request",
      );
    }
  },
);

// POST /api/admin/maintenance/:approvalId/cancel - request cancellation of approved future maintenance
router.post(
  "/:approvalId/cancel",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { approvalId } = req.params;
      const requestedBy = req._userId;

      const targetApproval = await AdminApproval.findOne({
        approvalId,
        requestType: "maintenance_mode",
        status: "approved",
        "requestDetails.action": "enable",
      });

      if (!targetApproval) {
        return respond.error(
          res,
          404,
          "maintenance_request_not_found",
          "Approved maintenance request not found",
        );
      }

      const scheduledStartAt = parseDateSafe(
        targetApproval.requestDetails?.scheduledStartAt,
      );
      if (!scheduledStartAt || scheduledStartAt <= new Date()) {
        return respond.error(
          res,
          400,
          "maintenance_not_upcoming",
          "Only upcoming approved maintenance can be cancelled",
        );
      }

      const existingCancellation = await AdminApproval.findOne({
        requestType: "maintenance_mode",
        status: "pending",
        "requestDetails.action": "disable",
        "requestDetails.cancelTargetApprovalId": approvalId,
      }).lean();

      if (existingCancellation) {
        return respond.error(
          res,
          409,
          "cancellation_already_requested",
          "A cancellation request is already pending for this maintenance schedule",
        );
      }

      const cancellationApproval = await AdminApproval.create({
        approvalId: AdminApproval.generateApprovalId(),
        requestType: "maintenance_mode",
        userId: requestedBy,
        requestedBy,
        requestDetails: {
          action: "disable",
          reason: `Cancellation request for ${approvalId}`,
          message: "Cancel an upcoming approved maintenance schedule.",
          cancelTargetApprovalId: approvalId,
          cancelScheduledStartAt: scheduledStartAt,
        },
        status: "pending",
        requiredApprovals: 2,
      });

      logAuditEvent(
        "maintenance_cancel_request",
        requestedBy,
        "MaintenanceWindow",
        String(cancellationApproval._id),
        {
          role: "admin",
          fieldChanged: "maintenance_request",
          oldValue: approvalId,
          newValue: cancellationApproval.approvalId,
          approvalId: cancellationApproval.approvalId,
          cancelTargetApprovalId: approvalId,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for maintenance cancellation request",
          err,
        ),
      );

      return res.status(201).json({
        success: true,
        approval: {
          approvalId: cancellationApproval.approvalId,
          status: cancellationApproval.status,
          requestType: cancellationApproval.requestType,
          requestDetails: cancellationApproval.requestDetails,
        },
      });
    } catch (err) {
      console.error(
        "POST /api/admin/maintenance/:approvalId/cancel error:",
        err,
      );
      return respond.error(
        res,
        500,
        "maintenance_cancel_request_failed",
        "Failed to request maintenance cancellation",
      );
    }
  },
);

// GET /api/admin/maintenance/current - admin view of current window
router.get(
  "/current",
  requireJwt,
  requireRole(["admin"]),
  async (_req, res) => {
    try {
      const active = await ensureActiveMaintenanceFromApprovals();
      return res.json({
        success: true,
        maintenance: active || null,
      });
    } catch (err) {
      console.error("GET /api/admin/maintenance/current error:", err);
      return respond.error(
        res,
        500,
        "maintenance_status_failed",
        "Failed to load maintenance status",
      );
    }
  },
);

// GET /api/maintenance/status - Public status endpoint (no auth required)
router.get("/status", async (_req, res) => {
  try {
    const active = await ensureActiveMaintenanceFromApprovals();
    if (active) {
      return res.json({
        active: true,
        message: active.message || "",
        expectedResumeAt: active.expectedResumeAt,
        activatedAt: active.activatedAt,
      });
    }

    const pending = await MaintenanceWindow.findOne({ status: "pending" })
      .sort({ createdAt: -1 })
      .lean();
    const scheduledStartAt = pending?.metadata?.scheduledStartAt || null;
    if (pending && scheduledStartAt) {
      return res.json({
        active: false,
        scheduled: true,
        message: pending.message || "",
        expectedResumeAt: pending.expectedResumeAt,
        scheduledStartAt,
      });
    }

    return res.json({ active: false });
  } catch (err) {
    console.error("GET /api/maintenance/status error:", err);
    return res.status(500).json({ active: false, error: "status_unavailable" });
  }
});

module.exports = router;
