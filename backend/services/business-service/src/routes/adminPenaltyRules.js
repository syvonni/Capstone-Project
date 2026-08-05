const express = require("express");
const PenaltyRule = require("../models/PenaltyRule");
const User = require("../models/User");
const axios = require("axios");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { getUserInfo } = require("../../../../shared/lib/getUserInfo");
const PenaltyRuleAuditHelper = require("../lib/auditHelpers/penaltyRuleAuditHelper");

const router = express.Router();

// GET /api/business/admin/penalty-rules — list all penalty rules (excluding drafts)
router.get("/", requireJwt, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const penaltyRules = await PenaltyRule.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ data: penaltyRules });
  } catch (err) {
    console.error("GET /admin/penalty-rules error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch penalty rules",
      },
    });
  }
});

// GET /api/business/admin/penalty-rules/:id — get single penalty rule (or draft)
router.get("/:id", requireJwt, async (req, res) => {
  try {
    const penaltyRule = await PenaltyRule.findById(req.params.id).lean();
    if (!penaltyRule) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Penalty rule not found",
        },
      });
    }
    return res.json({ data: penaltyRule });
  } catch (err) {
    console.error("GET /admin/penalty-rules/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch penalty rule",
      },
    });
  }
});

// GET /api/business/admin/penalty-rules/:id/audit — get audit history for a penalty rule
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const penaltyRule = await PenaltyRule.findById(id);
      if (!penaltyRule) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Penalty rule not found",
          },
        });
      }

      // Query audit-service for logs using specific endpoint
      const auditServiceUrl =
        process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
      const headers = { "Content-Type": "application/json" };
      if (process.env.AUDIT_SERVICE_API_KEY)
        headers["X-API-Key"] = process.env.AUDIT_SERVICE_API_KEY;

      const params = {
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const response = await axios.get(`${auditServiceUrl}/api/audit/penalty-rule/${id}`, {
        headers,
        params,
      });

      const logs = response.data.logs || [];
      const pagination = response.data.pagination || {};

      return res.json({
        success: true,
        logs,
        pagination,
      });
    } catch (err) {
      console.error("GET /admin/penalty-rules/:id/audit error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to fetch audit history",
        },
      });
    }
  },
);


// POST /api/business/admin/penalty-rules — create penalty rule
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { name, description, amount, category } = req.body;

      if (!name || !description || amount == null) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "name, description, and amount are required",
          },
        });
      }

      const penaltyRule = await PenaltyRule.create({
        name: String(name).trim(),
        description: String(description).trim(),
        amount: Number(amount),
        category: category || "other",
        isActive: true,
        version: 1,
        effectiveDate: new Date(),
      });

      const userInfo = await getUserInfo(req._userId);

      PenaltyRuleAuditHelper.logCreated(req, req._userId, userInfo, penaltyRule, "admin")
        .catch((err) => console.error("Failed to log audit event for penalty rule create", err));

      return res.status(201).json({ data: penaltyRule });
    } catch (err) {
      console.error("POST /admin/penalty-rules error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to create penalty rule",
        },
      });
    }
  },
);

// PUT /api/business/admin/penalty-rules/:id — update penalty rule (creates new version)
router.put("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, amount, category, isActive } = req.body;

    const penaltyRule = await PenaltyRule.findById(id);
    if (!penaltyRule) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Penalty rule not found",
        },
      });
    }

    const oldValues = {
      name: penaltyRule.name,
      description: penaltyRule.description,
      amount: penaltyRule.amount,
      category: penaltyRule.category,
      isActive: penaltyRule.isActive,
      version: penaltyRule.version,
    };

    // Track changes
    const changes = {};
    if (name !== undefined && name !== penaltyRule.name) {
      penaltyRule.name = String(name).trim();
      changes.name = { from: oldValues.name, to: penaltyRule.name };
    }
    if (description !== undefined && description !== penaltyRule.description) {
      penaltyRule.description = String(description).trim();
      changes.description = {
        from: oldValues.description,
        to: penaltyRule.description,
      };
    }
    if (amount !== undefined && amount !== penaltyRule.amount) {
      penaltyRule.amount = Number(amount);
      changes.amount = { from: oldValues.amount, to: penaltyRule.amount };
    }
    if (category !== undefined && category !== penaltyRule.category) {
      penaltyRule.category = category;
      changes.category = { from: oldValues.category, to: penaltyRule.category };
    }
    if (isActive !== undefined && isActive !== penaltyRule.isActive) {
      penaltyRule.isActive = isActive;
      changes.isActive = { from: oldValues.isActive, to: penaltyRule.isActive };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      penaltyRule.version += 1;
      penaltyRule.effectiveDate = new Date();
    }

    await penaltyRule.save();

    const userInfo = await getUserInfo(req._userId);

    // Create old penalty rule object for comparison
    const oldPenaltyRule = new PenaltyRule(oldValues);
    oldPenaltyRule._id = penaltyRule._id;

    PenaltyRuleAuditHelper.logUpdated(req, req._userId, userInfo, oldPenaltyRule, penaltyRule, "admin")
      .catch((err) => console.error("Failed to log audit event for penalty rule update", err));

    return res.json({ data: penaltyRule });
  } catch (err) {
    console.error("PUT /admin/penalty-rules/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to update penalty rule",
      },
    });
  }
});

// DELETE /api/business/admin/penalty-rules/:id — soft-disable penalty rule
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const penaltyRule = await PenaltyRule.findById(req.params.id);
      if (!penaltyRule) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Penalty rule not found",
          },
        });
      }

      const penaltyRuleId = String(penaltyRule._id);
      const oldValues = {
        name: penaltyRule.name,
        isActive: penaltyRule.isActive,
      };

      // Soft-disable instead of hard delete
      penaltyRule.isActive = false;
      penaltyRule.version += 1;
      penaltyRule.effectiveDate = new Date();
      await penaltyRule.save();

      const userInfo = await getUserInfo(req._userId);

      // Create old penalty rule object for snapshot
      const oldPenaltyRule = new PenaltyRule(oldValues);
      oldPenaltyRule._id = penaltyRule._id;
      oldPenaltyRule.description = penaltyRule.description;
      oldPenaltyRule.amount = penaltyRule.amount;
      oldPenaltyRule.category = penaltyRule.category;

      PenaltyRuleAuditHelper.logDisabled(req, req._userId, userInfo, oldPenaltyRule, "admin")
        .catch((err) => console.error("Failed to log audit event for penalty rule disable", err));

      return res.json({ data: { disabled: true } });
    } catch (err) {
      console.error("DELETE /admin/penalty-rules/:id error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to disable penalty rule",
        },
      });
    }
  },
);

module.exports = router;
