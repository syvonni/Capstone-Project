const express = require("express");
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");
const logger = require("../lib/logger");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

// GET /api/audit/business-owner/:ownerId - Get audit logs for a specific business owner
router.get(
  "/business-owner/:ownerId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { ownerId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {
        $or: [
          { "metadata.ownerId": ownerId },
          { "metadata.entityId": ownerId },
          { userId: ownerId },
        ],
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      return respond.success(res, 200, {
        logs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      });
    } catch (err) {
      logger.error("GET /api/audit/business-owner/:ownerId error", {
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
