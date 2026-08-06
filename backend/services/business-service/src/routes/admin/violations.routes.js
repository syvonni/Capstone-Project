const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Violation = require("../../models/Violation");
const Fee = require("../../models/Fee");
const InspectionItem = require("../../models/InspectionItem");
const User = require("../../models/User");
const { requireJwt, requireRole, requireAdminStepUp } = require("../../middleware/auth");
const { logAuditEvent } = require("../../lib/auditClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const ViolationAuditHelper = require("../../lib/auditHelpers/violationAuditHelper");

const router = express.Router();

// GET /api/business/admin/violations - list with filters
router.get("/", requireJwt, async (req, res) => {
  try {
    const { category, severity, isActive, feeId } = req.query;
    const filter = {};
    if (category) {
      filter.category = category;
    }
    if (severity) {
      filter.severity = severity;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    if (feeId) {
      filter.feeId = new mongoose.Types.ObjectId(feeId);
    }

    const violations = await Violation.find(filter)
      .populate('feeId')
      .sort({ name: 1 });

    return res.json({
      data: violations,
      total: violations.length,
    });
  } catch (err) {
    console.error("GET /violations error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch violations" },
    });
  }
});

// GET /api/business/admin/violations/:id - get single violation
router.get("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid violation ID" },
      });
    }

    const violation = await Violation.findById(id).populate('feeId');

    if (!violation) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Violation not found" },
      });
    }

    return res.json({ data: violation });
  } catch (err) {
    console.error("GET /violations/:id error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch violation" },
    });
  }
});

// POST /api/business/admin/violations - create violation
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const {
        name,
        description,
        notes,
        severity,
        legalBasis,
        correctiveAction,
        penaltyAmount
      } = req.body;

      if (!name) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Name is required",
          },
        });
      }

      const violationData = {
        name,
        description,
        notes,
        severity,
        legalBasis,
        correctiveAction,
        createdBy: req._userId,
        updatedBy: req._userId,
      };

      // Create penalty fee if penaltyAmount is provided
      if (penaltyAmount && penaltyAmount > 0) {
        const fee = await Fee.create({
          name: `Penalty for ${name}`,
          amount: penaltyAmount,
          category: 'penalty',
          isActive: true,
        });
        violationData.feeId = fee._id;
      }

      const violation = await Violation.create(violationData);

      const userInfo = await getUserInfo(req._userId);
      ViolationAuditHelper.logCreated(req, req._userId, userInfo, violation, "admin")
        .catch((err) => console.error("Failed to log audit event for violation create", err));

      return res.status(201).json({ data: violation });
    } catch (err) {
      console.error("POST /violations error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to create violation" },
      });
    }
  },
);

// PUT /api/business/admin/violations/:id - update violation
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        notes,
        severity,
        legalBasis,
        correctiveAction,
        isActive
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid violation ID" },
        });
      }

      const violation = await Violation.findById(id);
      if (!violation) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Violation not found" },
        });
      }


      // Store old values for audit logging
      const oldValues = {
        name: violation.name,
        description: violation.description,
        notes: violation.notes,
        severity: violation.severity,
        legalBasis: violation.legalBasis,
        correctiveAction: violation.correctiveAction,
        isActive: violation.isActive,
        feeId: violation.feeId,
      };

      // Only update definition fields
      const updates = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(notes !== undefined && { notes }),
        ...(severity && { severity }),
        ...(legalBasis !== undefined && { legalBasis }),
        ...(correctiveAction !== undefined && { correctiveAction }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: req._userId,
      };

      // Increment version if any definition field changed
      const definitionChanged = 
        (name && name !== violation.name) ||
        (description !== undefined && description !== violation.description) ||
        (notes !== undefined && notes !== violation.notes) ||
        (severity && severity !== violation.severity) ||
        (legalBasis !== undefined && JSON.stringify(legalBasis) !== JSON.stringify(violation.legalBasis)) ||
        (correctiveAction !== undefined && correctiveAction !== violation.correctiveAction) ||
        (isActive !== undefined && isActive !== violation.isActive);
      
      if (definitionChanged) {
        updates.version = violation.version + 1;
      }

      const updated = await Violation.findByIdAndUpdate(id, updates, {
        new: true,
      }).populate('feeId');

      // Disable the associated penalty fee if violation is being disabled
      if (isActive !== undefined && isActive === false && violation.isActive !== false) {
        if (violation.feeId) {
          const fee = await Fee.findById(violation.feeId);
          if (fee && fee.category === 'penalty' && fee.isActive) {
            await Fee.findByIdAndUpdate(violation.feeId, { isActive: false });
          }
        }
      }

      // Enable the associated penalty fee if violation is being enabled
      if (isActive !== undefined && isActive === true && violation.isActive !== true) {
        if (violation.feeId) {
          const fee = await Fee.findById(violation.feeId);
          if (fee && fee.category === 'penalty' && !fee.isActive) {
            await Fee.findByIdAndUpdate(violation.feeId, { isActive: true });
          }
        }
      }

      const updatedValues = {
        name: updated.name,
        description: updated.description,
        notes: updated.notes,
        severity: updated.severity,
        legalBasis: updated.legalBasis,
        correctiveAction: updated.correctiveAction,
        isActive: updated.isActive,
        feeId: updated.feeId,
      };

      const changes = Object.keys(updates).filter(key => key !== 'updatedBy' && key !== 'version');

      const userInfo = await getUserInfo(req._userId);

      // Create old violation object for comparison
      const oldViolation = new Violation(oldValues);
      oldViolation._id = violation._id;

      ViolationAuditHelper.logUpdated(req, req._userId, userInfo, oldViolation, updated, "admin")
        .catch((err) => console.error("Failed to log audit event for violation update", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("PUT /violations/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to update violation" },
      });
    }
  },
);

// DELETE /api/business/admin/violations/:id - soft delete
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid violation ID" },
        });
      }

      const violation = await Violation.findById(id);
      if (!violation) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Violation not found" },
        });
      }

      // Check if violation is referenced by any active inspection item
      const dependentInspectionItems = await InspectionItem.find({
        violationId: id,
        isActive: true
      });

      if (dependentInspectionItems.length > 0) {
        return res.status(400).json({
          error: {
            code: "DEPENDENCY_ERROR",
            message: "Cannot disable violation that is mapped to active inspection items",
            dependencies: dependentInspectionItems.map(item => ({ id: item._id, name: item.name })),
          },
        });
      }

      const oldValues = {
        isActive: violation.isActive,
        version: violation.version,
      };

      // Soft-disable
      const updates = {
        isActive: false,
        version: violation.version + 1,
        updatedBy: req._userId,
      };

      const updated = await Violation.findByIdAndUpdate(id, updates, {
        new: true,
      });

      // Disable the associated penalty fee if it exists
      if (violation.feeId) {
        const fee = await Fee.findById(violation.feeId);
        if (fee && fee.category === 'penalty' && fee.isActive) {
          await Fee.findByIdAndUpdate(violation.feeId, { isActive: false });
        }
      }

      const userInfo = await getUserInfo(req._userId);

      // Create old violation object for snapshot
      const oldViolation = new Violation(oldValues);
      oldViolation._id = violation._id;
      oldViolation.name = violation.name;
      oldViolation.severity = violation.severity;
      oldViolation.feeId = violation.feeId;

      ViolationAuditHelper.logDisabled(req, req._userId, userInfo, oldViolation, "admin")
        .catch((err) => console.error("Failed to log audit event for violation disable", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("DELETE /violations/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to disable violation" },
      });
    }
  },
);

// GET /api/business/admin/violations/:id/audit - proxy to audit service
router.get("/:id/audit", requireJwt, async (req, res) => {
  try {
    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
    const response = await axios.get(`${auditServiceUrl}/api/audit/violation/${req.params.id}`, {
      params: req.query,
    });
    return res.json(response.data);
  } catch (err) {
    console.error("GET /admin/violations/:id/audit error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch audit history",
      },
    });
  }
});

// GET /api/business/admin/violations/:id/inspection-dependencies - get inspection items that reference this violation
router.get("/:id/inspection-dependencies", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid violation ID" },
      });
    }

    const inspectionItems = await InspectionItem.find({
      violationId: id,
      isActive: true
    }).populate('violationId');

    return res.json({
      data: inspectionItems,
      total: inspectionItems.length,
    });
  } catch (err) {
    console.error("GET /violations/:id/inspection-dependencies error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch inspection dependencies" },
    });
  }
});

module.exports = router;
