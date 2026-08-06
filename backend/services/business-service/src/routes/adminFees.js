const express = require("express");
const mongoose = require("mongoose");
const Fee = require("../models/Fee");
const Variable = require("../models/Variable");
const User = require("../models/User");
const axios = require("axios");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { getUserInfo } = require("../../../../shared/lib/getUserInfo");
const FeeAuditHelper = require("../lib/auditHelpers/feeAuditHelper");

const router = express.Router();

// Internal service-to-service authentication (shared secret)
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-service-secret';

const requireInternalAuth = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey === INTERNAL_API_KEY) {
    next();
  } else {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid or missing internal API key" },
    });
  }
};

// POST /api/business/admin/fees/internal - Internal endpoint for service-to-service fee creation
// This bypasses user auth and step-up requirements, using a shared secret instead
router.post("/internal", requireInternalAuth, async (req, res) => {
  try {
    const { name, notes, amount, category, isActive } = req.body;

    if (!name || amount == null) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "name and amount are required",
        },
      });
    }

    const fee = await Fee.create({
      name: String(name).trim(),
      notes: notes ? String(notes).trim() : '',
      amount: Number(amount),
      category: category || 'general_application',
      isActive: isActive !== undefined ? isActive : true,
      version: 1,
    });

    // Internal service audit - use direct logAuditEvent since no user context
    logAuditEvent("fee_created", "internal-service", "fee", String(fee._id), {
      role: "internal",
      fieldChanged: "fee",
      oldValue: "",
      newValue: JSON.stringify(fee),
      feeId: String(fee._id),
      name: fee.name,
      notes: fee.notes,
      amount: fee.amount,
      category: fee.category,
      isActive: fee.isActive,
      version: fee.version,
      source: "internal-service",
    }).catch((err) =>
      console.error("Failed to log audit event for internal fee create", err),
    );

    return res.status(201).json({ data: fee });
  } catch (err) {
    console.error("POST /admin/fees/internal error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to create fee",
      },
    });
  }
});

// GET /api/business/admin/fees — list all fees (excluding drafts)
router.get("/", requireJwt, async (req, res) => {
  try {
    const { isActive, category } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (category) filter.category = category;

    const fees = await Fee.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ data: fees });
  } catch (err) {
    console.error("GET /admin/fees error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch fees",
      },
    });
  }
});

// GET /api/business/admin/fees/:id — get single fee (or draft)
router.get("/:id", requireJwt, async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id).lean();
    if (!fee) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Fee not found",
        },
      });
    }
    return res.json({ data: fee });
  } catch (err) {
    console.error("GET /admin/fees/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch fee",
      },
    });
  }
});

// GET /api/business/admin/fees/:id/audit — get audit history for a fee
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const fee = await Fee.findById(id);
      if (!fee) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Fee not found",
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

      const response = await axios.get(`${auditServiceUrl}/api/audit/fee/${id}`, {
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
      console.error("GET /admin/fees/:id/audit error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to fetch audit history",
        },
      });
    }
  },
);

// POST /api/business/admin/fees — create fee
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { name, notes, amount, category, isActive } = req.body;

      if (!name || amount == null) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "name and amount are required",
          },
        });
      }

      const fee = await Fee.create({
        name: String(name).trim(),
        notes: notes ? String(notes).trim() : '',
        amount: Number(amount),
        category: category || 'general_application',
        isActive: isActive !== undefined ? isActive : true,
        version: 1,
      });

      const userInfo = await getUserInfo(req._userId);

      FeeAuditHelper.logCreated(req, req._userId, userInfo, fee, "admin")
        .catch((err) => console.error("Failed to log audit event for fee create", err));

      return res.status(201).json({ data: fee });
    } catch (err) {
      console.error("POST /admin/fees error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to create fee",
        },
      });
    }
  },
);

// PUT /api/business/admin/fees/:id — update fee (creates new version)
router.put("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, notes, amount, isActive } = req.body;

    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Fee not found",
        },
      });
    }

    // Migrate legacy category values
    if (fee.category === 'general_application') {
      fee.category = 'global';
    }

    const oldValues = {
      name: fee.name,
      notes: fee.notes,
      amount: fee.amount,
      isActive: fee.isActive,
      version: fee.version,
    };

    // Track changes
    const changes = {};
    if (name !== undefined && name !== fee.name) {
      fee.name = String(name).trim();
      changes.name = { from: oldValues.name, to: fee.name };
    }
    if (notes !== undefined && notes !== fee.notes) {
      fee.notes = String(notes).trim();
      changes.notes = {
        from: oldValues.notes,
        to: fee.notes,
      };
    }
    if (amount !== undefined && amount !== fee.amount) {
      fee.amount = Number(amount);
      changes.amount = { from: oldValues.amount, to: fee.amount };
    }
    if (isActive !== undefined && isActive !== fee.isActive) {
      fee.isActive = isActive;
      changes.isActive = { from: oldValues.isActive, to: isActive };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      fee.version += 1;
    }

    await fee.save();

    const userInfo = await getUserInfo(req._userId);

    // Create old fee object for comparison
    const oldFee = new Fee(oldValues);
    oldFee._id = fee._id;

    FeeAuditHelper.logUpdated(req, req._userId, userInfo, oldFee, fee, "admin")
      .catch((err) => console.error("Failed to log audit event for fee update", err));

    return res.json({ data: fee });
  } catch (err) {
    console.error("PUT /admin/fees/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to update fee",
      },
    });
  }
});

// DELETE /api/business/admin/fees/:id — soft-disable fee
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const fee = await Fee.findById(req.params.id);
      if (!fee) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Fee not found",
          },
        });
      }

      const feeId = String(fee._id);
      const oldValues = {
        name: fee.name,
        isActive: fee.isActive,
      };

      // Soft-disable instead of hard delete
      fee.isActive = false;
      fee.version += 1;
      await fee.save();

      const userInfo = await getUserInfo(req._userId);

      // Create old fee object for snapshot
      const oldFee = new Fee(oldValues);
      oldFee._id = fee._id;
      oldFee.notes = fee.notes;
      oldFee.amount = fee.amount;

      FeeAuditHelper.logDisabled(req, req._userId, userInfo, oldFee, "admin")
        .catch((err) => console.error("Failed to log audit event for fee disable", err));

      return res.json({ data: { disabled: true } });
    } catch (err) {
      console.error("DELETE /admin/fees/:id error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to disable fee",
        },
      });
    }
  },
);

// PUT /api/business/admin/fees/variables/:id - update variable calculation fields only
router.put(
  "/variables/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        calculationMethod,
        brackets,
        classifications,
        baseRate,
        unit,
        fixedAmount,
        customCalculationMethod
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid variable ID" },
        });
      }

      const variable = await Variable.findById(id);
      if (!variable) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Variable not found" },
        });
      }

      // Store old values for audit logging
      const oldValues = {
        calculationMethod: variable.calculationMethod,
        brackets: variable.brackets,
        classifications: variable.classifications,
        baseRate: variable.baseRate,
        unit: variable.unit,
        fixedAmount: variable.fixedAmount,
        customCalculationMethod: variable.customCalculationMethod,
      };

      // Only update calculation fields (not definition fields)
      const updates = {
        ...(calculationMethod && { calculationMethod }),
        ...(brackets !== undefined && { brackets }),
        ...(classifications !== undefined && { classifications }),
        ...(baseRate !== undefined && { baseRate }),
        ...(unit && { unit }),
        ...(fixedAmount !== undefined && { fixedAmount }),
        ...(customCalculationMethod !== undefined && { customCalculationMethod }),
        updatedBy: req._userId,
      };

      const updated = await Variable.findByIdAndUpdate(id, updates, {
        new: true,
      });

      const updatedValues = {
        calculationMethod: updated.calculationMethod,
        brackets: updated.brackets,
        classifications: updated.classifications,
        baseRate: updated.baseRate,
        unit: updated.unit,
        fixedAmount: updated.fixedAmount,
        customCalculationMethod: updated.customCalculationMethod,
      };

      const changes = Object.keys(updates).filter(key => key !== 'updatedBy');

      const userInfo = await getUserInfo(req._userId);
      
      // Use VariableAuditHelper for variable calculation updates
      const VariableAuditHelper = require("../lib/auditHelpers/variableAuditHelper");
      VariableAuditHelper.logCalculationUpdated(
        req,
        req._userId,
        userInfo,
        variable,
        JSON.stringify(oldValues),
        JSON.stringify(updatedValues),
        "admin"
      ).catch((err) => console.error("Failed to log audit event for variable calculation update", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("PUT /fees/variables/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to update variable calculation" },
      });
    }
  },
);

// GET /api/business/admin/fees/by-category/:category - Get fees by category
router.get("/by-category/:category", requireJwt, async (req, res) => {
  try {
    const { category } = req.params;
    const { isActive } = req.query;
    const filter = { category };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const fees = await Fee.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ data: fees });
  } catch (err) {
    console.error("GET /fees/by-category error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch fees by category" },
    });
  }
});

module.exports = router;
