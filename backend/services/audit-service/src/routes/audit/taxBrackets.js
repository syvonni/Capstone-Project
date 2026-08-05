const express = require("express");
const AuditLog = require("../../models/AuditLog");
const {
  requireJwt,
  requireRole,
} = require("../../middleware/auth");

const router = express.Router();

// GET /api/audit/tax-bracket/:taxBracketId - Get audit logs for a specific tax bracket
router.get(
  "/tax-bracket/:taxBracketId",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { taxBracketId } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      // Tax bracket-specific event types only
      const taxBracketEventTypes = [
        "tax_bracket_created",
        "tax_bracket_updated",
        "tax_bracket_deleted",
      ];

      // Find audit logs for this tax bracket, filtered to tax-bracket-specific events
      const filter = {
        $and: [
          {
            $or: [
              { "metadata.taxBracketId": taxBracketId },
              { "metadata.entityId": taxBracketId },
              { entityId: taxBracketId },
            ],
          },
          {
            eventType: { $in: taxBracketEventTypes },
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

      return res.json({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("GET /api/audit/tax-bracket/:taxBracketId error:", error);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to fetch audit logs",
        },
      });
    }
  },
);

module.exports = router;
