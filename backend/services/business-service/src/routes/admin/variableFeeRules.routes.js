const express = require("express");
const VariableFeeRule = require("../../models/VariableFeeRule");
const Lob = require("../../models/Lob");
const User = require("../../models/User");
const axios = require("axios");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const { logAuditEvent } = require("../../lib/auditClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const VariableFeeRuleAuditHelper = require("../../lib/auditHelpers/variableFeeRuleAuditHelper");

const router = express.Router();

// GET /api/business/admin/variable-fee-rules — list all variable fee rules
router.get("/", requireJwt, async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const rules = await VariableFeeRule.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ data: rules });
  } catch (err) {
    console.error("GET /admin/variable-fee-rules error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch variable fee rules",
      },
    });
  }
});

// GET /api/business/admin/variable-fee-rules/:id/lobs — get LOBs that use this variable fee rule
router.get("/:id/lobs", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    // Find LOBs that have this variable fee rule in their variableFeeRules array
    const lobs = await Lob.find({
      variableFeeRules: id,
      isActive: true
    })
      .select('code name category lineOfBusiness')
      .lean();

    return res.json({ data: lobs });
  } catch (err) {
    console.error("GET /admin/variable-fee-rules/:id/lobs error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch LOBs for variable fee rule",
      },
    });
  }
});

// GET /api/business/admin/variable-fee-rules/:id — get single variable fee rule
router.get("/:id", requireJwt, async (req, res) => {
  try {
    const rule = await VariableFeeRule.findById(req.params.id).lean();
    if (!rule) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Variable fee rule not found",
        },
      });
    }
    return res.json({ data: rule });
  } catch (err) {
    console.error("GET /admin/variable-fee-rules/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch variable fee rule",
      },
    });
  }
});

// GET /api/business/admin/variable-fee-rules/:id/audit — get audit history for a variable fee rule
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const rule = await VariableFeeRule.findById(id);
      if (!rule) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Variable fee rule not found",
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

      const response = await axios.get(`${auditServiceUrl}/api/audit/variable-fee-rule/${id}`, {
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
      console.error("GET /admin/variable-fee-rules/:id/audit error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to fetch audit history",
        },
      });
    }
  },
);

// POST /api/business/admin/variable-fee-rules — create variable fee rule
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { name, notes, question, calculationMethod, customCalculationMethod, baseRate, unit, brackets, classifications } = req.body;

      if (!name || !question || !calculationMethod || !unit) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "name, question, calculationMethod, and unit are required",
          },
        });
      }

      if (calculationMethod === 'custom' && !customCalculationMethod) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "customCalculationMethod is required when calculationMethod is 'custom'",
          },
        });
      }

      if (calculationMethod === 'bracketed' && (!brackets || brackets.length === 0)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "brackets are required when calculationMethod is 'bracketed'",
          },
        });
      }

      if (calculationMethod === 'classification' && (!classifications || classifications.length === 0)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "classifications are required when calculationMethod is 'classification'",
          },
        });
      }

      if (calculationMethod === 'classification' && baseRate != null) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "baseRate should be null when calculationMethod is 'classification'",
          },
        });
      }

      if (calculationMethod !== 'bracketed' && calculationMethod !== 'classification' && baseRate == null) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "baseRate is required for this calculationMethod",
          },
        });
      }

      const rule = await VariableFeeRule.create({
        name: String(name).trim(),
        notes: notes ? String(notes).trim() : '',
        question: String(question).trim(),
        calculationMethod,
        customCalculationMethod: calculationMethod === 'custom' ? String(customCalculationMethod).trim() : null,
        baseRate: calculationMethod === 'classification' ? null : (baseRate != null ? Number(baseRate) : null),
        unit: String(unit).trim(),
        brackets: calculationMethod === 'bracketed' ? (brackets || []) : [],
        classifications: calculationMethod === 'classification' ? (classifications || []) : [],
        isActive: true,
        version: 1,
      });

      const userInfo = await getUserInfo(req._userId);

      VariableFeeRuleAuditHelper.logCreated(req, req._userId, userInfo, rule, "admin")
        .catch((err) => console.error("Failed to log audit event for variable fee rule create", err));

      return res.status(201).json({ data: rule });
    } catch (err) {
      console.error("POST /admin/variable-fee-rules error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to create variable fee rule",
        },
      });
    }
  },
);

// PUT /api/business/admin/variable-fee-rules/:id — update variable fee rule (creates new version)
router.put("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, notes, question, calculationMethod, customCalculationMethod, baseRate, unit, brackets, classifications, isActive } = req.body;

    const rule = await VariableFeeRule.findById(id);
    if (!rule) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Variable fee rule not found",
        },
      });
    }

    const oldValues = {
      name: rule.name,
      notes: rule.notes,
      question: rule.question,
      calculationMethod: rule.calculationMethod,
      customCalculationMethod: rule.customCalculationMethod,
      baseRate: rule.baseRate,
      unit: rule.unit,
      brackets: rule.brackets,
      classifications: rule.classifications,
      isActive: rule.isActive,
      version: rule.version,
    };

    // Track changes
    const changes = {};
    if (name !== undefined && name !== rule.name) {
      rule.name = String(name).trim();
      changes.name = { from: oldValues.name, to: rule.name };
    }
    if (notes !== undefined && notes !== rule.notes) {
      rule.notes = String(notes).trim();
      changes.notes = {
        from: oldValues.notes,
        to: rule.notes,
      };
    }
    if (question !== undefined && question !== rule.question) {
      rule.question = String(question).trim();
      changes.question = { from: oldValues.question, to: rule.question };
    }
    if (calculationMethod !== undefined && calculationMethod !== rule.calculationMethod) {
      rule.calculationMethod = calculationMethod;
      changes.calculationMethod = { from: oldValues.calculationMethod, to: rule.calculationMethod };
    }
    if (customCalculationMethod !== undefined && customCalculationMethod !== rule.customCalculationMethod) {
      rule.customCalculationMethod = String(customCalculationMethod).trim();
      changes.customCalculationMethod = { from: oldValues.customCalculationMethod, to: rule.customCalculationMethod };
    }
    if (baseRate !== undefined && baseRate !== rule.baseRate) {
      rule.baseRate = Number(baseRate);
      changes.baseRate = { from: oldValues.baseRate, to: rule.baseRate };
    }
    if (unit !== undefined && unit !== rule.unit) {
      rule.unit = String(unit).trim();
      changes.unit = { from: oldValues.unit, to: rule.unit };
    }
    if (brackets !== undefined && JSON.stringify(brackets) !== JSON.stringify(rule.brackets)) {
      rule.brackets = brackets || [];
      changes.brackets = { from: oldValues.brackets, to: rule.brackets };
    }
    if (classifications !== undefined && JSON.stringify(classifications) !== JSON.stringify(rule.classifications)) {
      rule.classifications = classifications || [];
      changes.classifications = { from: oldValues.classifications, to: rule.classifications };
    }
    if (isActive !== undefined && isActive !== rule.isActive) {
      rule.isActive = isActive;
      changes.isActive = { from: oldValues.isActive, to: rule.isActive };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      rule.version += 1;
    }

    await rule.save();

    const userInfo = await getUserInfo(req._userId);

    // Create old rule object for comparison
    const oldRule = new VariableFeeRule(oldValues);
    oldRule._id = rule._id;

    VariableFeeRuleAuditHelper.logUpdated(req, req._userId, userInfo, oldRule, rule, "admin")
      .catch((err) => console.error("Failed to log audit event for variable fee rule update", err));

    return res.json({ data: rule });
  } catch (err) {
    console.error("PUT /admin/variable-fee-rules/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to update variable fee rule",
      },
    });
  }
});

// DELETE /api/business/admin/variable-fee-rules/:id — soft-disable variable fee rule
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const rule = await VariableFeeRule.findById(req.params.id);
      if (!rule) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Variable fee rule not found",
          },
        });
      }

      const ruleId = String(rule._id);
      const oldValues = {
        name: rule.name,
        isActive: rule.isActive,
      };

      // Soft-disable instead of hard delete
      rule.isActive = false;
      rule.version += 1;
      await rule.save();

      const userInfo = await getUserInfo(req._userId);

      // Create old rule object for snapshot
      const oldRule = new VariableFeeRule(oldValues);
      oldRule._id = rule._id;
      oldRule.notes = rule.notes;
      oldRule.question = rule.question;
      oldRule.calculationMethod = rule.calculationMethod;

      VariableFeeRuleAuditHelper.logDisabled(req, req._userId, userInfo, oldRule, "admin")
        .catch((err) => console.error("Failed to log audit event for variable fee rule disable", err));

      return res.json({ data: { disabled: true } });
    } catch (err) {
      console.error("DELETE /admin/variable-fee-rules/:id error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to disable variable fee rule",
        },
      });
    }
  },
);

module.exports = router;
