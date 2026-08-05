const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const respond = require("../../middleware/respond");
const logger = require("../../lib/logger");
const AuditLog = require("../../models/AuditLog");
const router = express.Router();

// GET /api/audit/application/:applicationId - Get audit logs for a specific application
router.get(
  "/application/:applicationId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Application-specific event types only
      const applicationEventTypes = [
        "application_submitted",
        "application_rejected",
        "application_returned",
        "review_completed",
        "decision_revoked",
        "application_claimed",
        "application_released",
        "application_transferred",
        "walkin_application_created",
        "appeal_submitted",
        "appeal_resolved",
        "appeal_rejected",
        "edit_request_submitted",
        "edit_request_applied",
        "field_reviewed",
        "field_decisions_updated",
        "pending_action_created",
        "pending_action_cancelled",
      ];

      // Find audit logs for this application, filtered to application-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.applicationId": applicationId },
              { "metadata.entityId": applicationId },
              { "metadata.businessId": applicationId },
              { entityId: applicationId },
            ],
          },
          {
            eventType: { $in: applicationEventTypes },
          },
        ],
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      return respond.success(res, 200, {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      logger.error("GET /api/audit/application/:applicationId error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "audit_fetch_error",
        "Failed to fetch audit logs",
      );
    }
  },
);

// GET /api/audit/applications - Get all application audit events (admin view)
router.get(
  "/applications",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Application-specific event types only
      const applicationEventTypes = [
        "application_submitted",
        "application_rejected",
        "application_returned",
        "review_completed",
        "decision_revoked",
        "application_claimed",
        "application_released",
        "application_transferred",
        "walkin_application_created",
        "appeal_submitted",
        "appeal_resolved",
        "appeal_rejected",
        "edit_request_submitted",
        "edit_request_applied",
        "field_reviewed",
        "field_decisions_updated",
        "pending_action_created",
        "pending_action_cancelled",
      ];

      const filter = {
        eventType: { $in: applicationEventTypes },
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      return respond.success(res, 200, {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      logger.error("GET /api/audit/applications error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "audit_fetch_error",
        "Failed to fetch audit logs",
      );
    }
  },
);

// GET /api/audit/business/:businessId - Get audit logs for a specific business
router.get(
  "/business/:businessId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Application-specific event types only
      const applicationEventTypes = [
        "application_submitted",
        "application_rejected",
        "application_returned",
        "review_completed",
        "decision_revoked",
        "application_claimed",
        "application_released",
        "application_transferred",
        "walkin_application_created",
        "appeal_submitted",
        "appeal_resolved",
        "appeal_rejected",
        "edit_request_submitted",
        "edit_request_applied",
        "field_reviewed",
        "field_decisions_updated",
        "pending_action_created",
        "pending_action_cancelled",
      ];

      // Find audit logs for this business, filtered to application-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.businessId": businessId },
              { "metadata.entityId": businessId },
              { entityId: businessId },
            ],
          },
          {
            eventType: { $in: applicationEventTypes },
          },
        ],
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      return respond.success(res, 200, {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      logger.error("GET /api/audit/business/:businessId error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "audit_fetch_error",
        "Failed to fetch audit logs",
      );
    }
  },
);

module.exports = router;
