const express = require("express");
const TaxBracket = require("../models/TaxBracket");
const Lob = require("../models/Lob");
const User = require("../models/User");
const axios = require("axios");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { getUserInfo } = require("../../../../shared/lib/getUserInfo");
const TaxBracketAuditHelper = require("../lib/auditHelpers/taxBracketAuditHelper");

const router = express.Router();

// GET /api/business/admin/tax-brackets — list all tax brackets
router.get("/", requireJwt, async (req, res) => {
  try {
    const { taxBasis, isActive, lobId } = req.query;
    const filter = {};
    if (taxBasis) filter.taxBasis = taxBasis;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (lobId) filter.lobId = lobId;

    const brackets = await TaxBracket.find(filter).sort({ taxBasis: 1, minValue: 1 }).lean();
    return res.json({ data: brackets });
  } catch (err) {
    console.error("GET /admin/tax-brackets error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch tax brackets",
      },
    });
  }
});

// GET /api/business/admin/tax-brackets/:id — get single tax bracket
router.get("/:id", requireJwt, async (req, res) => {
  try {
    const bracket = await TaxBracket.findById(req.params.id).lean();
    if (!bracket) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Tax bracket not found",
        },
      });
    }
    return res.json({ data: bracket });
  } catch (err) {
    console.error("GET /admin/tax-brackets/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch tax bracket",
      },
    });
  }
});

// GET /api/business/admin/tax-brackets/:id/audit — get audit history for a tax bracket
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const bracket = await TaxBracket.findById(id);
      if (!bracket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Tax bracket not found",
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

      const response = await axios.get(`${auditServiceUrl}/api/audit/tax-bracket/${id}`, {
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
      console.error("GET /admin/tax-brackets/:id/audit error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to fetch audit history",
        },
      });
    }
  },
);

// POST /api/business/admin/tax-brackets — create tax bracket
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { lobId, taxBasis, name, minValue, maxValue, fixedAmount, excessRate, excessRateType, paymentFrequency, notes } = req.body;

      if (!lobId || !taxBasis || !name || minValue == null) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "lobId, taxBasis, name, and minValue are required",
          },
        });
      }

      if (excessRate && !excessRateType) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "excessRateType is required when excessRate is provided",
          },
        });
      }

      // Validate that the LOB exists
      const lob = await Lob.findById(lobId);
      if (!lob) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Line of Business not found",
          },
        });
      }

      const bracket = await TaxBracket.create({
        lobId,
        taxBasis,
        name: String(name).trim(),
        minValue: Number(minValue),
        maxValue: maxValue ? Number(maxValue) : null,
        fixedAmount: fixedAmount ? Number(fixedAmount) : null,
        excessRate: excessRate ? Number(excessRate) : null,
        excessRateType: excessRateType || null,
        paymentFrequency: paymentFrequency || 'annual',
        notes: notes ? String(notes).trim() : '',
        isActive: true,
        version: 1,
      });

      const userInfo = await getUserInfo(req._userId);

      TaxBracketAuditHelper.logCreated(req, req._userId, userInfo, bracket, "admin")
        .catch((err) => console.error("Failed to log audit event for tax bracket create", err));

      return res.status(201).json({ data: bracket });
    } catch (err) {
      console.error("POST /admin/tax-brackets error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to create tax bracket",
        },
      });
    }
  },
);

// PUT /api/business/admin/tax-brackets/:id — update tax bracket (creates new version)
router.put("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { lobId, taxBasis, name, minValue, maxValue, fixedAmount, excessRate, excessRateType, paymentFrequency, notes, isActive } = req.body;

    const bracket = await TaxBracket.findById(id);
    if (!bracket) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Tax bracket not found",
        },
      });
    }

    const oldValues = {
      lobId: bracket.lobId,
      taxBasis: bracket.taxBasis,
      name: bracket.name,
      minValue: bracket.minValue,
      maxValue: bracket.maxValue,
      fixedAmount: bracket.fixedAmount,
      excessRate: bracket.excessRate,
      excessRateType: bracket.excessRateType,
      paymentFrequency: bracket.paymentFrequency,
      notes: bracket.notes,
      isActive: bracket.isActive,
      version: bracket.version,
    };

    // Track changes
    const changes = {};
    if (lobId !== undefined && lobId !== bracket.lobId) {
      // Validate that the new LOB exists
      const lob = await Lob.findById(lobId);
      if (!lob) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Line of Business not found",
          },
        });
      }

      bracket.lobId = lobId;
      changes.lobId = { from: oldValues.lobId, to: lobId };
    }
    if (taxBasis !== undefined && taxBasis !== bracket.taxBasis) {
      bracket.taxBasis = taxBasis;
      changes.taxBasis = { from: oldValues.taxBasis, to: bracket.taxBasis };
    }
    if (name !== undefined && name !== bracket.name) {
      bracket.name = String(name).trim();
      changes.name = { from: oldValues.name, to: bracket.name };
    }
    if (minValue !== undefined && minValue !== bracket.minValue) {
      bracket.minValue = Number(minValue);
      changes.minValue = { from: oldValues.minValue, to: bracket.minValue };
    }
    if (maxValue !== undefined && maxValue !== bracket.maxValue) {
      bracket.maxValue = maxValue ? Number(maxValue) : null;
      changes.maxValue = { from: oldValues.maxValue, to: bracket.maxValue };
    }
    if (fixedAmount !== undefined && fixedAmount !== bracket.fixedAmount) {
      bracket.fixedAmount = fixedAmount ? Number(fixedAmount) : null;
      changes.fixedAmount = { from: oldValues.fixedAmount, to: bracket.fixedAmount };
    }
    if (excessRate !== undefined && excessRate !== bracket.excessRate) {
      bracket.excessRate = excessRate ? Number(excessRate) : null;
      changes.excessRate = { from: oldValues.excessRate, to: bracket.excessRate };
    }
    if (excessRateType !== undefined && excessRateType !== bracket.excessRateType) {
      bracket.excessRateType = excessRateType;
      changes.excessRateType = { from: oldValues.excessRateType, to: bracket.excessRateType };
    }
    if (paymentFrequency !== undefined && paymentFrequency !== bracket.paymentFrequency) {
      bracket.paymentFrequency = paymentFrequency;
      changes.paymentFrequency = { from: oldValues.paymentFrequency, to: bracket.paymentFrequency };
    }
    if (notes !== undefined && notes !== bracket.notes) {
      bracket.notes = String(notes).trim();
      changes.notes = { from: oldValues.notes, to: bracket.notes };
    }
    if (isActive !== undefined && isActive !== bracket.isActive) {
      bracket.isActive = isActive;
      changes.isActive = { from: oldValues.isActive, to: bracket.isActive };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      bracket.version += 1;
    }

    await bracket.save();

    const userInfo = await getUserInfo(req._userId);

    // Create old bracket object for comparison
    const oldBracket = new TaxBracket(oldValues);
    oldBracket._id = bracket._id;

    TaxBracketAuditHelper.logUpdated(req, req._userId, userInfo, oldBracket, bracket, "admin")
      .catch((err) => console.error("Failed to log audit event for tax bracket update", err));

    return res.json({ data: bracket });
  } catch (err) {
    console.error("PUT /admin/tax-brackets/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to update tax bracket",
      },
    });
  }
});

// DELETE /api/business/admin/tax-brackets/:id — soft-disable tax bracket
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const bracket = await TaxBracket.findById(req.params.id);
      if (!bracket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Tax bracket not found",
          },
        });
      }

      const bracketId = String(bracket._id);
      const oldValues = {
        name: bracket.name,
        isActive: bracket.isActive,
      };

      // Soft-disable instead of hard delete
      bracket.isActive = false;
      bracket.version += 1;
      await bracket.save();

      const userInfo = await getUserInfo(req._userId);

      // Create old bracket object for snapshot
      const oldBracket = new TaxBracket(oldValues);
      oldBracket._id = bracket._id;
      oldBracket.taxBasis = bracket.taxBasis;

      TaxBracketAuditHelper.logDeleted(req, req._userId, userInfo, oldBracket, "admin")
        .catch((err) => console.error("Failed to log audit event for tax bracket delete", err));

      return res.json({ data: { disabled: true } });
    } catch (err) {
      console.error("DELETE /admin/tax-brackets/:id error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to disable tax bracket",
        },
      });
    }
  },
);

module.exports = router;
