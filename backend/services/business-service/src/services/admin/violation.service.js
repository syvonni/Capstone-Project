const mongoose = require("mongoose");
const Violation = require("../../models/Violation");
const Fee = require("../../models/Fee");
const InspectionItem = require("../../models/InspectionItem");
const PostRequirement = require("../../models/PostRequirement");
const Lob = require("../../models/Lob");
const Checklist = require("../../models/Checklist");
const ClaimableDocument = require("../../models/ClaimableDocument");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const ViolationAuditHelper = require("../../lib/auditHelpers/violationAuditHelper");
const { auditClient } = require("../../../../../shared/lib/httpClient");

class ViolationService {
  /**
   * List violations with filters
   */
  async list(filters = {}) {
    const { category, severity, isActive, feeId } = filters;
    const filter = {};
    
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (feeId) filter.feeId = new mongoose.Types.ObjectId(feeId);

    const violations = await Violation.find(filter)
      .populate("feeId")
      .sort({ name: 1 });

    return violations;
  }

  /**
   * Get violation by ID
   */
  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid violation ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const violation = await Violation.findById(id).populate("feeId");
    
    if (!violation) {
      const error = new Error("Violation not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return violation;
  }

  /**
   * Create violation
   */
  async create(data, userId, req) {
    const {
      name,
      description,
      notes,
      severity,
      legalBasis,
      correctiveAction,
      penaltyAmount,
    } = data;

    if (!name) {
      const error = new Error("Name is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!severity) {
      const error = new Error("Severity is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name in own collection
    const existingInOwnCollection = await Violation.findOne({ name });
    if (existingInOwnCollection) {
      const error = new Error("Name already exists");
      error.code = "DUPLICATE_NAME";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name across entity types
    const relatedCollections = [
      PostRequirement,
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

    const violationData = {
      name,
      description,
      notes,
      severity,
      legalBasis,
      correctiveAction,
      createdBy: userId,
      updatedBy: userId,
    };

    // Create penalty fee if penaltyAmount is provided
    if (penaltyAmount && penaltyAmount > 0) {
      const fee = await Fee.create({
        name: `Penalty for ${name}`,
        amount: penaltyAmount,
        category: "penalty",
        isActive: true,
      });
      violationData.feeId = fee._id;
    }

    const violation = await Violation.create(violationData);

    const userInfo = await getUserInfo(userId);
    ViolationAuditHelper.logCreated(req, userId, userInfo, violation, "admin").catch((err) =>
      console.error("Failed to log audit event for violation create", err),
    );

    return violation;
  }

  /**
   * Update violation
   */
  async update(id, data, userId, req) {
    const {
      name,
      description,
      notes,
      severity,
      legalBasis,
      correctiveAction,
      isActive,
    } = data;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid violation ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const violation = await Violation.findById(id);
    if (!violation) {
      const error = new Error("Violation not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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
      updatedBy: userId,
    };

    // Increment version if any definition field changed
    const definitionChanged =
      (name && name !== violation.name) ||
      (description !== undefined && description !== violation.description) ||
      (notes !== undefined && notes !== violation.notes) ||
      (severity && severity !== violation.severity) ||
      (legalBasis !== undefined &&
        JSON.stringify(legalBasis) !== JSON.stringify(violation.legalBasis)) ||
      (correctiveAction !== undefined &&
        correctiveAction !== violation.correctiveAction) ||
      (isActive !== undefined && isActive !== violation.isActive);

    if (definitionChanged) {
      updates.version = violation.version + 1;
    }

    const updated = await Violation.findByIdAndUpdate(id, updates, {
      new: true,
    }).populate("feeId");

    // Disable the associated penalty fee if violation is being disabled
    if (
      isActive !== undefined &&
      isActive === false &&
      violation.isActive !== false
    ) {
      if (violation.feeId) {
        const fee = await Fee.findById(violation.feeId);
        if (fee && fee.category === "penalty" && fee.isActive) {
          await Fee.findByIdAndUpdate(violation.feeId, { isActive: false });
        }
      }
    }

    // Enable the associated penalty fee if violation is being enabled
    if (
      isActive !== undefined &&
      isActive === true &&
      violation.isActive !== true
    ) {
      if (violation.feeId) {
        const fee = await Fee.findById(violation.feeId);
        if (fee && fee.category === "penalty" && !fee.isActive) {
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

    const changes = Object.keys(updates).filter(
      (key) => key !== "updatedBy" && key !== "version",
    );

    const userInfo = await getUserInfo(userId);

    // Create old violation object for comparison
    const oldViolation = new Violation(oldValues);
    oldViolation._id = violation._id;

    ViolationAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldViolation,
      updated,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for violation update", err),
    );

    return updated;
  }

  /**
   * Disable violation (soft delete)
   */
  async disable(id, userId, req) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid violation ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const violation = await Violation.findById(id);
    if (!violation) {
      const error = new Error("Violation not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (!violation.isActive) {
      const error = new Error("Violation is already disabled");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: violation.name,
      isActive: violation.isActive,
      feeId: violation.feeId,
    };

    violation.isActive = false;
    violation.version += 1;
    await violation.save();

    // Disable the associated penalty fee
    if (violation.feeId) {
      const fee = await Fee.findById(violation.feeId);
      if (fee && fee.category === "penalty" && fee.isActive) {
        await Fee.findByIdAndUpdate(violation.feeId, { isActive: false });
      }
    }

    const userInfo = await getUserInfo(userId);

    // Create old violation object for snapshot
    const oldViolation = new Violation(oldValues);
    oldViolation._id = violation._id;

    ViolationAuditHelper.logDisabled(req, userId, userInfo, oldViolation, "admin").catch(
      (err) => console.error("Failed to log audit event for violation delete", err),
    );

    return { disabled: true };
  }

  /**
   * Get inspection items for a violation
   */
  async getInspectionItems(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid violation ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const violation = await Violation.findById(id);
    if (!violation) {
      const error = new Error("Violation not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const inspectionItems = await InspectionItem.find({
      violationId: id,
      isActive: true,
    }).populate("violationId");

    return inspectionItems;
  }

  /**
   * Get audit history for a violation
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const violation = await Violation.findById(id);
    if (!violation) {
      const error = new Error("Violation not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Query audit-service for logs
    const auditServiceUrl =
      process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
    const headers = { "Content-Type": "application/json" };
    if (process.env.AUDIT_SERVICE_API_KEY)
      headers["X-API-Key"] = process.env.AUDIT_SERVICE_API_KEY;

    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const response = await auditClient.get(`/api/audit/violation/${id}`, {
      params,
    });

    const logs = response.logs || [];
    const pagination = response.pagination || {};

    return { logs, pagination };
  }
}

module.exports = new ViolationService();
