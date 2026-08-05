const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const respond = require("../../middleware/respond");
const logger = require("../../lib/logger");
const AuditLog = require("../../models/AuditLog");
const router = express.Router();

// GET /api/audit/fee/:feeId - Get audit logs for a specific fee
router.get(
  "/fee/:feeId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { feeId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Fee-specific event types only
      const feeEventTypes = [
        "fee_created",
        "fee_updated",
        "fee_disabled",
      ];

      // Find audit logs for this fee, filtered to fee-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.feeId": feeId },
              { "metadata.entityId": feeId },
              { entityId: feeId },
            ],
          },
          {
            eventType: { $in: feeEventTypes },
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
      logger.error("GET /api/audit/fee/:feeId error", {
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

// GET /api/audit/penalty-rule/:penaltyRuleId - Get audit logs for a specific penalty rule
router.get(
  "/penalty-rule/:penaltyRuleId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { penaltyRuleId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Penalty rule-specific event types only
      const penaltyRuleEventTypes = [
        "penalty_rule_created",
        "penalty_rule_updated",
        "penalty_rule_published",
        "penalty_rule_disabled",
      ];

      // Find audit logs for this penalty rule, filtered to penalty-rule-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.penaltyRuleId": penaltyRuleId },
              { "metadata.entityId": penaltyRuleId },
              { entityId: penaltyRuleId },
            ],
          },
          {
            eventType: { $in: penaltyRuleEventTypes },
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
      logger.error("GET /api/audit/penalty-rule/:penaltyRuleId error", {
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

// GET /api/audit/variable-fee-rule/:variableFeeRuleId - Get audit logs for a specific variable fee rule
router.get(
  "/variable-fee-rule/:variableFeeRuleId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { variableFeeRuleId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Variable fee rule-specific event types only
      const variableFeeRuleEventTypes = [
        "variable_fee_rule_created",
        "variable_fee_rule_updated",
        "variable_fee_rule_disabled",
      ];

      // Find audit logs for this variable fee rule, filtered to variable-fee-rule-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.variableFeeRuleId": variableFeeRuleId },
              { "metadata.entityId": variableFeeRuleId },
              { entityId: variableFeeRuleId },
            ],
          },
          {
            eventType: { $in: variableFeeRuleEventTypes },
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
      logger.error("GET /api/audit/variable-fee-rule/:variableFeeRuleId error", {
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

// GET /api/audit/post-requirement/:postRequirementId - Get audit logs for a specific post-requirement
router.get(
  "/post-requirement/:postRequirementId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { postRequirementId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Post-requirement-specific event types only
      const postRequirementEventTypes = [
        "post_requirement_created",
        "post_requirement_updated",
        "post_requirement_disabled",
      ];

      // Find audit logs for this post-requirement, filtered to post-requirement-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.postRequirementId": postRequirementId },
              { "metadata.entityId": postRequirementId },
              { entityId: postRequirementId },
            ],
          },
          {
            eventType: { $in: postRequirementEventTypes },
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
      logger.error("GET /api/audit/post-requirement/:postRequirementId error", {
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
