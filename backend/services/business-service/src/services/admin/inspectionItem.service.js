const mongoose = require("mongoose");
const InspectionItem = require("../../models/InspectionItem");
const Violation = require("../../models/Violation");
const Checklist = require("../../models/Checklist");
const Fee = require("../../models/Fee");
const PostRequirement = require("../../models/PostRequirement");
const Lob = require("../../models/Lob");
const ClaimableDocument = require("../../models/ClaimableDocument");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const InspectionItemAuditHelper = require("../../lib/auditHelpers/inspectionItemAuditHelper");

class InspectionItemService {
  /**
   * List inspection items with filters
   */
  async list(filters = {}) {
    const { isActive, violationId } = filters;
    const filter = {};
    
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (violationId) filter.violationId = violationId;

    const inspectionItems = await InspectionItem.find(filter)
      .populate("violationId")
      .sort({ name: 1 });

    return inspectionItems;
  }

  /**
   * Get inspection items by violation ID
   */
  async getByViolationId(violationId) {
    if (!mongoose.Types.ObjectId.isValid(violationId)) {
      const error = new Error("Invalid violation ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const inspectionItems = await InspectionItem.find({ violationId }).sort({ name: 1 });

    return inspectionItems;
  }

  /**
   * Get inspection item by ID
   */
  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid inspection item ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const inspectionItem = await InspectionItem.findById(id).populate("violationId");
    
    if (!inspectionItem) {
      const error = new Error("Inspection item not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return inspectionItem;
  }

  /**
   * Get checklists containing this inspection item
   */
  async getChecklists(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid inspection item ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const checklists = await Checklist.find({
      "items.inspectionItemId": id,
      isActive: true,
    }).populate("items.inspectionItemId");

    return checklists;
  }

  /**
   * Create inspection item
   */
  async create(data, userId, req) {
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
      penaltyAmount,
    } = data;

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
      Checklist,
      ClaimableDocument,
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

    if (!question) {
      const error = new Error("Question is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!violationMode) {
      const error = new Error("Violation mode is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    let finalViolationId;

    if (violationMode === "select") {
      if (!violationId) {
        const error = new Error("Violation ID is required when selecting existing violation");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      // Validate violation exists and is active
      const violation = await Violation.findById(violationId);
      if (!violation) {
        const error = new Error("Violation not found");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      if (!violation.isActive) {
        const error = new Error("Cannot map to inactive violation");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      finalViolationId = violationId;
    } else if (violationMode === "create") {
      if (!violationName) {
        const error = new Error("Violation name is required when creating new violation");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      if (!violationSeverity) {
        const error = new Error("Violation severity is required when creating new violation");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      // Create fee if penalty amount is provided
      let feeId = null;
      if (penaltyAmount && penaltyAmount > 0) {
        const fee = await Fee.create({
          name: `${violationName} Penalty`,
          amount: penaltyAmount,
          category: "penalty",
          createdBy: userId,
          updatedBy: userId,
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
        createdBy: userId,
        updatedBy: userId,
      });
      finalViolationId = violation._id;
    } else {
      const error = new Error("Invalid violation mode");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    const inspectionItemData = {
      name,
      question,
      notes,
      legalBasis,
      violationId: finalViolationId,
      createdBy: userId,
      updatedBy: userId,
    };

    const createdInspectionItem = await InspectionItem.create(inspectionItemData);

    const userInfo = await getUserInfo(userId);
    InspectionItemAuditHelper.logCreated(req, userId, userInfo, createdInspectionItem, "admin").catch((err) =>
      console.error("Failed to log audit event for inspection item create", err),
    );

    // Return populated inspection item
    const populatedInspectionItem = await InspectionItem.findById(
      createdInspectionItem._id,
    ).populate("violationId");

    return populatedInspectionItem;
  }

  /**
   * Update inspection item
   */
  async update(id, data, userId, req) {
    const { name, question, notes, legalBasis, violationId, isActive } = data;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid inspection item ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const inspectionItem = await InspectionItem.findById(id);
    if (!inspectionItem) {
      const error = new Error("Inspection item not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // If changing violationId, validate new violation
    if (violationId && violationId !== inspectionItem.violationId) {
      const violation = await Violation.findById(violationId);
      if (!violation) {
        const error = new Error("Violation not found");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }

      if (!violation.isActive) {
        const error = new Error("Cannot map to inactive violation");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
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
      updatedBy: userId,
    };

    // Increment version if any definition field changed
    const definitionChanged =
      (name && name !== inspectionItem.name) ||
      (question !== undefined && question !== inspectionItem.question) ||
      (notes !== undefined && notes !== inspectionItem.notes) ||
      (legalBasis !== undefined &&
        JSON.stringify(legalBasis) !== JSON.stringify(inspectionItem.legalBasis)) ||
      (violationId && violationId !== inspectionItem.violationId);

    if (definitionChanged) {
      updates.version = inspectionItem.version + 1;
    }

    const updated = await InspectionItem.findByIdAndUpdate(id, updates, {
      new: true,
    }).populate("violationId");

    const updatedValues = {
      name: updated.name,
      question: updated.question,
      notes: updated.notes,
      legalBasis: updated.legalBasis,
      violationId: updated.violationId,
      isActive: updated.isActive,
      version: updated.version,
    };

    const changes = Object.keys(updates).filter(
      (key) => key !== "updatedBy" && key !== "version",
    );

    const userInfo = await getUserInfo(userId);

    // Create old inspection item object for comparison
    const oldInspectionItem = new InspectionItem(oldValues);
    oldInspectionItem._id = inspectionItem._id;

    InspectionItemAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldInspectionItem,
      updated,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for inspection item update", err),
    );

    return updated;
  }

  /**
   * Disable inspection item (soft delete)
   */
  async disable(id, userId, req) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid inspection item ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const inspectionItem = await InspectionItem.findById(id);
    if (!inspectionItem) {
      const error = new Error("Inspection item not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (!inspectionItem.isActive) {
      const error = new Error("Inspection item is already disabled");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: inspectionItem.name,
      isActive: inspectionItem.isActive,
    };

    inspectionItem.isActive = false;
    inspectionItem.version += 1;
    await inspectionItem.save();

    const userInfo = await getUserInfo(userId);

    // Create old inspection item object for snapshot
    const oldInspectionItem = new InspectionItem(oldValues);
    oldInspectionItem._id = inspectionItem._id;

    InspectionItemAuditHelper.logDisabled(req, userId, userInfo, oldInspectionItem, "admin").catch(
      (err) => console.error("Failed to log audit event for inspection item delete", err),
    );

    return { disabled: true };
  }
}

module.exports = new InspectionItemService();
