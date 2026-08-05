const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const InspectionItem = require("../models/InspectionItem");
const Violation = require("../models/Violation");
const Checklist = require("../models/Checklist");
const Fee = require("../models/Fee");
const User = require("../models/User");
const { requireJwt, requireRole, requireAdminStepUp } = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { getUserInfo } = require("../../../../shared/lib/getUserInfo");
const InspectionItemAuditHelper = require("../lib/auditHelpers/inspectionItemAuditHelper");

const router = express.Router();

// GET /api/business/admin/inspection-items - list with filters
router.get("/", requireJwt, async (req, res) => {
  try {
    const { isActive, violationId } = req.query;
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    if (violationId) {
      filter.violationId = violationId;
    }

    const inspectionItems = await InspectionItem.find(filter)
      .populate('violationId')
      .sort({ name: 1 });

    return res.json({
      data: inspectionItems,
      total: inspectionItems.length,
    });
  } catch (err) {
    console.error("GET /inspection-items error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch inspection items" },
    });
  }
});

// GET /api/business/admin/inspection-items/by-violation/:violationId - get inspection items by violation
router.get("/by-violation/:violationId", requireJwt, async (req, res) => {
  try {
    const { violationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(violationId)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid violation ID" },
      });
    }

    const inspectionItems = await InspectionItem.find({ violationId })
      .sort({ name: 1 });

    return res.json({
      data: inspectionItems,
      total: inspectionItems.length,
    });
  } catch (err) {
    console.error("GET /inspection-items/by-violation error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch inspection items by violation" },
    });
  }
});

// GET /api/business/admin/inspection-items/:id - get single inspection item
router.get("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid inspection item ID" },
      });
    }

    const inspectionItem = await InspectionItem.findById(id).populate('violationId');

    if (!inspectionItem) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Inspection item not found" },
      });
    }

    return res.json({ data: inspectionItem });
  } catch (err) {
    console.error("GET /inspection-items/:id error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch inspection item" },
    });
  }
});

// GET /api/business/admin/inspection-items/:id/checklists - get checklists containing this inspection item
router.get("/:id/checklists", requireJwt, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid inspection item ID" },
      });
    }

    const checklists = await Checklist.find({
      'items.inspectionItemId': id,
      isActive: true
    }).populate('items.inspectionItemId');

    return res.json({
      data: checklists,
      total: checklists.length,
    });
  } catch (err) {
    console.error("GET /inspection-items/:id/checklists error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch checklists for inspection item" },
    });
  }
});

// POST /api/business/admin/inspection-items - create inspection item
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { 
        name, 
        question, 
        notes, 
        legalBasis, 
        violationMode,
        violationId,
        violationName,
        violationDescription,
        violationSeverity,
        violationNotes,
        violationCorrectiveAction,
        violationLegalBasis,
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

      if (!question) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Question is required",
          },
        });
      }

      if (!violationMode) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Violation mode is required",
          },
        });
      }

      let finalViolationId;

      if (violationMode === 'select') {
        if (!violationId) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Violation ID is required when selecting existing violation",
            },
          });
        }

        // Validate violation exists and is active
        const violation = await Violation.findById(violationId);
        if (!violation) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Violation not found",
            },
          });
        }

        if (!violation.isActive) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Cannot map to inactive violation",
            },
          });
        }

        finalViolationId = violationId;
      } else if (violationMode === 'create') {
        if (!violationName) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Violation name is required when creating new violation",
            },
          });
        }

        if (!violationSeverity) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Violation severity is required when creating new violation",
            },
          });
        }

        // Create fee if penalty amount is provided
        let feeId = null;
        if (penaltyAmount && penaltyAmount > 0) {
          const fee = await Fee.create({
            name: `${violationName} Penalty`,
            amount: penaltyAmount,
            category: 'penalty',
            createdBy: req._userId,
            updatedBy: req._userId,
          });
          feeId = fee._id;
        }

        // Create violation
        const violation = await Violation.create({
          name: violationName,
          description: violationDescription,
          notes: violationNotes,
          severity: violationSeverity,
          legalBasis: violationLegalBasis || [],
          correctiveAction: violationCorrectiveAction,
          feeId,
          createdBy: req._userId,
          updatedBy: req._userId,
        });
        finalViolationId = violation._id;
      } else {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid violation mode",
          },
        });
      }

      const inspectionItemData = {
        name,
        question,
        notes,
        legalBasis,
        violationId: finalViolationId,
        createdBy: req._userId,
        updatedBy: req._userId,
      };

      const createdInspectionItem = await InspectionItem.create(inspectionItemData);

      const userInfo = await getUserInfo(req._userId);
      InspectionItemAuditHelper.logCreated(req, req._userId, userInfo, createdInspectionItem, "admin")
        .catch((err) => console.error("Failed to log audit event for inspection item create", err));

      // Return populated inspection item
      const populatedInspectionItem = await InspectionItem.findById(createdInspectionItem._id).populate('violationId');

      return res.status(201).json({ data: populatedInspectionItem });
    } catch (err) {
      console.error("POST /inspection-items error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to create inspection item" },
      });
    }
  },
);

// PUT /api/business/admin/inspection-items/:id - update inspection item
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
        question, 
        notes, 
        legalBasis, 
        violationId, 
        isActive 
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid inspection item ID" },
        });
      }

      const inspectionItem = await InspectionItem.findById(id);
      if (!inspectionItem) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Inspection item not found" },
        });
      }

      // If changing violationId, validate new violation
      if (violationId && violationId !== inspectionItem.violationId) {
        const violation = await Violation.findById(violationId);
        if (!violation) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Violation not found",
            },
          });
        }

        if (!violation.isActive) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Cannot map to inactive violation",
            },
          });
        }
      }

      // Store old values for audit logging
      const oldValues = {
        name: inspectionItem.name,
        question: inspectionItem.question,
        notes: inspectionItem.notes,
        legalBasis: inspectionItem.legalBasis,
        violationId: inspectionItem.violationId,
        isActive: inspectionItem.isActive,
        version: inspectionItem.version,
      };

      // Only update definition fields
      const updates = {
        ...(name && { name }),
        ...(question !== undefined && { question }),
        ...(notes !== undefined && { notes }),
        ...(legalBasis !== undefined && { legalBasis }),
        ...(violationId && { violationId }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: req._userId,
      };

      // Increment version if any definition field changed
      const definitionChanged = 
        (name && name !== inspectionItem.name) ||
        (question !== undefined && question !== inspectionItem.question) ||
        (notes !== undefined && notes !== inspectionItem.notes) ||
        (legalBasis !== undefined && JSON.stringify(legalBasis) !== JSON.stringify(inspectionItem.legalBasis)) ||
        (violationId && violationId !== inspectionItem.violationId);
      
      if (definitionChanged) {
        updates.version = inspectionItem.version + 1;
      }

      const updated = await InspectionItem.findByIdAndUpdate(id, updates, {
        new: true,
      }).populate('violationId');

      const updatedValues = {
        name: updated.name,
        question: updated.question,
        notes: updated.notes,
        legalBasis: updated.legalBasis,
        violationId: updated.violationId,
        isActive: updated.isActive,
        version: updated.version,
      };

      const changes = Object.keys(updates).filter(key => key !== 'updatedBy' && key !== 'version');

      const userInfo = await getUserInfo(req._userId);

      // Create old inspection item object for comparison
      const oldInspectionItem = new InspectionItem(oldValues);
      oldInspectionItem._id = inspectionItem._id;

      InspectionItemAuditHelper.logUpdated(req, req._userId, userInfo, oldInspectionItem, updated, "admin")
        .catch((err) => console.error("Failed to log audit event for inspection item update", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("PUT /inspection-items/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to update inspection item" },
      });
    }
  },
);

// DELETE /api/business/admin/inspection-items/:id - soft delete
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
          error: { code: "INVALID_ID", message: "Invalid inspection item ID" },
        });
      }

      const inspectionItem = await InspectionItem.findById(id);
      if (!inspectionItem) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Inspection item not found" },
        });
      }

      // Check if inspection item is used in any active checklist
      const dependentChecklists = await Checklist.find({
        'items.inspectionItemId': id,
        isActive: true
      });

      if (dependentChecklists.length > 0) {
        return res.status(400).json({
          error: {
            code: "DEPENDENCY_ERROR",
            message: "Cannot disable inspection item that is used in active checklists",
            dependencies: dependentChecklists.map(c => ({ id: c._id, name: c.name })),
          },
        });
      }

      const oldValues = {
        isActive: inspectionItem.isActive,
        version: inspectionItem.version,
      };

      // Soft-disable
      const updates = {
        isActive: false,
        version: inspectionItem.version + 1,
        updatedBy: req._userId,
      };

      const updated = await InspectionItem.findByIdAndUpdate(id, updates, {
        new: true,
      });

      const userInfo = await getUserInfo(req._userId);

      // Create old inspection item object for snapshot
      const oldInspectionItem = new InspectionItem(oldValues);
      oldInspectionItem._id = inspectionItem._id;
      oldInspectionItem.name = inspectionItem.name;
      oldInspectionItem.violationId = inspectionItem.violationId;

      InspectionItemAuditHelper.logDisabled(req, req._userId, userInfo, oldInspectionItem, "admin")
        .catch((err) => console.error("Failed to log audit event for inspection item disable", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("DELETE /inspection-items/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to disable inspection item" },
      });
    }
  },
);

// GET /api/business/admin/inspection-items/:id/audit - proxy to audit service
router.get("/:id/audit", requireJwt, async (req, res) => {
  try {
    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
    const response = await axios.get(`${auditServiceUrl}/api/audit/inspection-item/${req.params.id}`, {
      params: req.query,
    });
    return res.json(response.data);
  } catch (err) {
    console.error("GET /admin/inspection-items/:id/audit error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch audit history",
      },
    });
  }
});

module.exports = router;
