const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const respond = require("../../middleware/respond");
const logger = require("../../lib/logger");
const AuditLog = require("../../models/AuditLog");
const router = express.Router();

// GET /api/audit/requirement/:requirementId - Get audit logs for a specific requirement
router.get(
  "/requirement/:requirementId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { requirementId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Requirement-specific event types only
      const requirementEventTypes = [
        "requirement_created",
        "requirement_updated",
        "requirement_published",
        "requirement_disabled",
      ];

      // Find audit logs for this requirement, filtered to requirement-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.requirementId": requirementId },
              { "metadata.entityId": requirementId },
              { entityId: requirementId },
            ],
          },
          {
            eventType: { $in: requirementEventTypes },
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
      logger.error("GET /api/audit/requirement/:requirementId error", {
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

// GET /api/audit/requirement-group/:requirementGroupId - Get audit logs for a specific requirement group
router.get(
  "/requirement-group/:requirementGroupId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { requirementGroupId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Requirement group-specific event types only
      const requirementGroupEventTypes = [
        "requirement_group_created",
        "requirement_group_updated",
        "requirement_group_published",
        "requirement_group_disabled",
      ];

      // Find audit logs for this requirement group, filtered to requirement-group-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.requirementGroupId": requirementGroupId },
              { "metadata.entityId": requirementGroupId },
              { entityId: requirementGroupId },
            ],
          },
          {
            eventType: { $in: requirementGroupEventTypes },
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
      logger.error("GET /api/audit/requirement-group/:requirementGroupId error", {
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
