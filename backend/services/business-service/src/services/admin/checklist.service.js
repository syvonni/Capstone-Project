const mongoose = require("mongoose");
const Checklist = require("../../models/Checklist");
const InspectionItem = require("../../models/InspectionItem");
const PostRequirement = require("../../models/PostRequirement");
const Violation = require("../../models/Violation");
const Fee = require("../../models/Fee");
const Lob = require("../../models/Lob");
const ClaimableDocument = require("../../models/ClaimableDocument");
const { auditClient } = require("../../../../../shared/lib/httpClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const ChecklistAuditHelper = require("../../lib/auditHelpers/checklistAuditHelper");

class ChecklistService {
  /**
   * List checklists with filters
   */
  async list(filters = {}) {
    const { isActive } = filters;
    const filter = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const checklists = await Checklist.find(filter)
      .populate({
        path: "items.inspectionItemId",
        model: "InspectionItem",
      })
      .populate("postRequirementId")
      .populate("variableId")
      .populate("documentId")
      .sort({ name: 1 });

    return checklists;
  }

  /**
   * Get checklist by ID
   */
  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid checklist ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const checklist = await Checklist.findById(id)
      .populate({
        path: "items.inspectionItemId",
        model: "InspectionItem",
        populate: {
          path: "violationId",
          model: "Violation",
        },
      })
      .populate("postRequirementId")
      .populate("variableId")
      .populate("documentId");
    
    if (!checklist) {
      const error = new Error("Checklist not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return checklist;
  }

  /**
   * Get audit history for a checklist
   */
  async getAuditHistory(id, filters = {}) {
    const response = await auditClient.get(`/api/audit/checklist/${id}`, {
      params: filters,
    });
    return response;
  }

  /**
   * Create checklist
   */
  async create(data, userId, req) {
    const { name, description, notes, legalBasis, items, postRequirementId } = data;

    if (!name) {
      const error = new Error("Name is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name across entity types
    const relatedCollections = [
      PostRequirement,
      Violation,
      Fee,
      Lob,
      ClaimableDocument,
      InspectionItem,
    ];

    for (const RelatedModel of relatedCollections) {
      const existing = await RelatedModel.findOne({ name });
      if (existing) {
        const error = new Error(`Name already exists in ${RelatedModel.modelName}`);
        error.code = "DUPLICATE_NAME";
        error.status = 400;
        throw error;
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      const error = new Error("Items array is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate all inspection items exist and are active
    const inspectionItemIds = items.map((item) => item.inspectionItemId);
    const inspectionItems = await InspectionItem.find({
      _id: { $in: inspectionItemIds },
      isActive: true,
    });

    if (inspectionItems.length !== inspectionItemIds.length) {
      const error = new Error("One or more inspection items not found or inactive");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate unique order values
    const orders = items.map((item) => item.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      const error = new Error("Order values must be unique");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
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
      createdBy: userId,
      updatedBy: userId,
    };

    const checklist = await Checklist.create(checklistData);

    const userInfo = await getUserInfo(userId);
    ChecklistAuditHelper.logCreated(
      req,
      userId,
      userInfo,
      checklist,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for checklist create", err),
    );

    return checklist;
  }

  /**
   * Update checklist
   */
  async update(id, data, userId, req) {
    const {
      name,
      description,
      notes,
      legalBasis,
      items,
      isActive,
      postRequirementId,
    } = data;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid checklist ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const checklist = await Checklist.findById(id);
    if (!checklist) {
      const error = new Error("Checklist not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // If items are being updated, validate them
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        const error = new Error("Items array is required");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      // Validate all inspection items exist and are active
      const inspectionItemIds = items.map((item) => item.inspectionItemId);
      const inspectionItems = await InspectionItem.find({
        _id: { $in: inspectionItemIds },
        isActive: true,
      });

      if (inspectionItems.length !== inspectionItemIds.length) {
        const error = new Error("One or more inspection items not found or inactive");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      // Validate unique order values
      const orders = items.map((item) => item.order);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        const error = new Error("Order values must be unique");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
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
      ...(items !== undefined && {
        items: items.sort((a, b) => a.order - b.order),
      }),
      ...(isActive !== undefined && { isActive }),
      ...(postRequirementId !== undefined && { postRequirementId }),
      updatedBy: userId,
    };

    // Increment version if any definition field changed
    const definitionChanged =
      (name && name !== checklist.name) ||
      (description !== undefined && description !== checklist.description) ||
      (notes !== undefined && notes !== checklist.notes) ||
      (legalBasis !== undefined &&
        JSON.stringify(legalBasis) !== JSON.stringify(checklist.legalBasis)) ||
      (items !== undefined &&
        JSON.stringify(items) !== JSON.stringify(checklist.items));

    if (definitionChanged) {
      updates.version = checklist.version + 1;
    }

    const updated = await Checklist.findByIdAndUpdate(id, updates, {
      new: true,
    }).populate({
      path: "items.inspectionItemId",
      model: "InspectionItem",
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

    const changes = Object.keys(updates).filter(
      (key) => key !== "updatedBy" && key !== "version",
    );

    const userInfo = await getUserInfo(userId);

    // Create old checklist object for comparison
    const oldChecklist = new Checklist(oldValues);
    oldChecklist._id = checklist._id;

    ChecklistAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldChecklist,
      updated,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for checklist update", err),
    );

    return updated;
  }

  /**
   * Disable checklist (soft delete)
   */
  async disable(id, userId, req) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid checklist ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const checklist = await Checklist.findById(id);
    if (!checklist) {
      const error = new Error("Checklist not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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
      updatedBy: userId,
    };

    const updated = await Checklist.findByIdAndUpdate(id, updates, {
      new: true,
    });

    const userInfo = await getUserInfo(userId);

    // Create old checklist object for snapshot
    const oldChecklist = new Checklist(oldValues);
    oldChecklist._id = checklist._id;
    oldChecklist.name = checklist.name;
    oldChecklist.items = checklist.items;

    ChecklistAuditHelper.logDisabled(
      req,
      userId,
      userInfo,
      oldChecklist,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for checklist disable", err),
    );

    return updated;
  }
}

module.exports = new ChecklistService();
