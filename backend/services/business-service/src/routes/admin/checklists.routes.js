const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Checklist = require("../../models/Checklist");
const InspectionItem = require("../../models/InspectionItem");
const User = require("../../models/User");
const { requireJwt, requireRole, requireAdminStepUp } = require("../../middleware/auth");
const { logAuditEvent } = require("../../lib/auditClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const ChecklistAuditHelper = require("../../lib/auditHelpers/checklistAuditHelper");

const router = express.Router();

// GET /api/business/admin/checklists - list with filters
router.get("/", requireJwt, async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const checklists = await Checklist.find(filter)
      .populate({
        path: 'items.inspectionItemId',
        model: 'InspectionItem'
      })
      .populate('postRequirementId')
      .populate('variableId')
      .populate('documentId')
      .sort({ name: 1 });

    return res.json({
      data: checklists,
      total: checklists.length,
    });
  } catch (err) {
    console.error("GET /checklists error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch checklists" },
    });
  }
});

// GET /api/business/admin/checklists/:id - get single checklist
router.get("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid checklist ID" },
      });
    }

    const checklist = await Checklist.findById(id).populate({
      path: 'items.inspectionItemId',
      model: 'InspectionItem',
      populate: {
        path: 'violationId',
        model: 'Violation'
      }
    }).populate('postRequirementId').populate('variableId').populate('documentId');

    if (!checklist) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Checklist not found" },
      });
    }

    return res.json({ data: checklist });
  } catch (err) {
    console.error("GET /checklists/:id error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch checklist" },
    });
  }
});

// POST /api/business/admin/checklists - create checklist
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
        legalBasis,
        items,
        postRequirementId
      } = req.body;

      if (!name) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Name is required",
          },
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Items array is required",
          },
        });
      }

      // Validate all inspection items exist and are active
      const inspectionItemIds = items.map(item => item.inspectionItemId);
      const inspectionItems = await InspectionItem.find({
        _id: { $in: inspectionItemIds },
        isActive: true
      });

      if (inspectionItems.length !== inspectionItemIds.length) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "One or more inspection items not found or inactive",
          },
        });
      }

      // Validate unique order values
      const orders = items.map(item => item.order);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Order values must be unique",
          },
        });
      }

      // Sort items by order
      const sortedItems = items.sort((a, b) => a.order - b.order);

      const checklistData = {
        name,
        description,
        notes,
        legalBasis,
        items: sortedItems,
        postRequirementId,
        createdBy: req._userId,
        updatedBy: req._userId,
      };

      const checklist = await Checklist.create(checklistData);

      const userInfo = await getUserInfo(req._userId);
      ChecklistAuditHelper.logCreated(req, req._userId, userInfo, checklist, "admin")
        .catch((err) => console.error("Failed to log audit event for checklist create", err));

      return res.status(201).json({ data: checklist });
    } catch (err) {
      console.error("POST /checklists error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to create checklist" },
      });
    }
  },
);

// PUT /api/business/admin/checklists/:id - update checklist
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
        legalBasis,
        items, 
        isActive,
        postRequirementId
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid checklist ID" },
        });
      }

      const checklist = await Checklist.findById(id);
      if (!checklist) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Checklist not found" },
        });
      }

      // If items are being updated, validate them
      if (items !== undefined) {
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Items array is required",
            },
          });
        }

        // Validate all inspection items exist and are active
        const inspectionItemIds = items.map(item => item.inspectionItemId);
        const inspectionItems = await InspectionItem.find({
          _id: { $in: inspectionItemIds },
          isActive: true
        });

        if (inspectionItems.length !== inspectionItemIds.length) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "One or more inspection items not found or inactive",
            },
          });
        }

        // Validate unique order values
        const orders = items.map(item => item.order);
        const uniqueOrders = new Set(orders);
        if (uniqueOrders.size !== orders.length) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Order values must be unique",
            },
          });
        }
      }

      // Store old values for audit logging
      const oldValues = {
        name: checklist.name,
        description: checklist.description,
        notes: checklist.notes,
        legalBasis: checklist.legalBasis,
        items: checklist.items,
        isActive: checklist.isActive,
        version: checklist.version,
      };

      // Only update definition fields
      const updates = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(notes !== undefined && { notes }),
        ...(legalBasis !== undefined && { legalBasis }),
        ...(items !== undefined && { items: items.sort((a, b) => a.order - b.order) }),
        ...(isActive !== undefined && { isActive }),
        ...(postRequirementId !== undefined && { postRequirementId }),
        updatedBy: req._userId,
      };

      // Increment version if any definition field changed
      const definitionChanged =
        (name && name !== checklist.name) ||
        (description !== undefined && description !== checklist.description) ||
        (notes !== undefined && notes !== checklist.notes) ||
        (legalBasis !== undefined && JSON.stringify(legalBasis) !== JSON.stringify(checklist.legalBasis)) ||
        (items !== undefined && JSON.stringify(items) !== JSON.stringify(checklist.items));
      
      if (definitionChanged) {
        updates.version = checklist.version + 1;
      }

      const updated = await Checklist.findByIdAndUpdate(id, updates, {
        new: true,
      }).populate({
        path: 'items.inspectionItemId',
        model: 'InspectionItem'
      });

      const updatedValues = {
        name: updated.name,
        description: updated.description,
        notes: updated.notes,
        legalBasis: updated.legalBasis,
        items: updated.items,
        isActive: updated.isActive,
        version: updated.version,
      };

      const changes = Object.keys(updates).filter(key => key !== 'updatedBy' && key !== 'version');

      const userInfo = await getUserInfo(req._userId);

      // Create old checklist object for comparison
      const oldChecklist = new Checklist(oldValues);
      oldChecklist._id = checklist._id;

      ChecklistAuditHelper.logUpdated(req, req._userId, userInfo, oldChecklist, updated, "admin")
        .catch((err) => console.error("Failed to log audit event for checklist update", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("PUT /checklists/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to update checklist" },
      });
    }
  },
);

// DELETE /api/business/admin/checklists/:id - soft delete
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
          error: { code: "INVALID_ID", message: "Invalid checklist ID" },
        });
      }

      const checklist = await Checklist.findById(id);
      if (!checklist) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Checklist not found" },
        });
      }

      // TODO: Add validation for future mapping to claimable documents/post-requirements/variables/LOBs
      // For now, allow disable without dependency check

      const oldValues = {
        isActive: checklist.isActive,
        version: checklist.version,
      };

      // Soft-disable
      const updates = {
        isActive: false,
        version: checklist.version + 1,
        updatedBy: req._userId,
      };

      const updated = await Checklist.findByIdAndUpdate(id, updates, {
        new: true,
      });

      const userInfo = await getUserInfo(req._userId);

      // Create old checklist object for snapshot
      const oldChecklist = new Checklist(oldValues);
      oldChecklist._id = checklist._id;
      oldChecklist.name = checklist.name;
      oldChecklist.items = checklist.items;

      ChecklistAuditHelper.logDisabled(req, req._userId, userInfo, oldChecklist, "admin")
        .catch((err) => console.error("Failed to log audit event for checklist disable", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("DELETE /checklists/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to disable checklist" },
      });
    }
  },
);

// GET /api/business/admin/checklists/:id/audit - proxy to audit service
router.get("/:id/audit", requireJwt, async (req, res) => {
  try {
    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
    const response = await axios.get(`${auditServiceUrl}/api/audit/checklist/${req.params.id}`, {
      params: req.query,
    });
    return res.json(response.data);
  } catch (err) {
    console.error("GET /admin/checklists/:id/audit error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch audit history",
      },
    });
  }
});

module.exports = router;
