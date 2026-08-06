const express = require("express");
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");
const logger = require("../lib/logger");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

// GET /api/audit/help-request/:requestId - Get audit logs for a specific help request
router.get(
  "/help-request/:requestId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {
        $or: [
          { "metadata.requestId": requestId },
          { "metadata.entityId": requestId },
        ],
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate("userId", "firstName lastName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      return respond.success(res, 200, {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      });
    } catch (err) {
      logger.error("GET /api/audit/help-request/:requestId error", {
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
