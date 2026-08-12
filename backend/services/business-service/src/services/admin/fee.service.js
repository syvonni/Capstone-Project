const mongoose = require("mongoose");
const Fee = require("../../../../../shared/models/Fee");
const Variable = require("../../models/Variable");
const PostRequirement = require("../../models/PostRequirement");
const Violation = require("../../models/Violation");
const Lob = require("../../models/Lob");
const Checklist = require("../../models/Checklist");
const ClaimableDocument = require("../../../../../shared/models/ClaimableDocument");
const InspectionItem = require("../../models/InspectionItem");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const FeeAuditHelper = require("../../lib/auditHelpers/feeAuditHelper");
const { logAuditEvent } = require("../../lib/auditClient");
const { auditClient } = require("../../../../../shared/lib/httpClient");

class FeeService {
  /**
   * List fees with optional filters
   */
  async list(filters = {}) {
    const { isActive, category } = filters;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (category) filter.category = category;

    const fees = await Fee.find(filter).sort({ createdAt: -1 }).lean();
    return fees;
  }

  /**
   * Get fee by ID
   */
  async getById(id) {
    const fee = await Fee.findById(id).lean();
    if (!fee) {
      const error = new Error("Fee not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }
    return fee;
  }

  /**
   * Create fee (internal service endpoint)
   */
  async createInternal(feeData) {
    const { name, notes, amount, category, isActive } = feeData;

    if (!name || amount == null) {
      const error = new Error("name and amount are required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name across entity types
    const relatedCollections = [
      PostRequirement,
      Violation,
      Lob,
      Checklist,
      ClaimableDocument,
      InspectionItem,
    ];

    for (const RelatedModel of relatedCollections) {
      const existing = await RelatedModel.findOne({
        name: String(name).trim(),
      });
      if (existing) {
        const error = new Error(
          `Name already exists in ${RelatedModel.modelName}`,
        );
        error.code = "DUPLICATE_NAME";
        error.status = 400;
        throw error;
      }
    }

    const fee = await Fee.create({
      name: String(name).trim(),
      notes: notes ? String(notes).trim() : "",
      amount: Number(amount),
      category: category || "general_application",
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

    return fee;
  }

  /**
   * Create fee (admin endpoint)
   */
  async create(feeData, userId, req) {
    const { name, notes, amount, category, isActive } = feeData;

    if (!name || amount == null) {
      const error = new Error("name and amount are required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name across entity types
    const relatedCollections = [
      PostRequirement,
      Violation,
      Lob,
      Checklist,
      ClaimableDocument,
      InspectionItem,
    ];

    for (const RelatedModel of relatedCollections) {
      const existing = await RelatedModel.findOne({
        name: String(name).trim(),
      });
      if (existing) {
        const error = new Error(
          `Name already exists in ${RelatedModel.modelName}`,
        );
        error.code = "DUPLICATE_NAME";
        error.status = 400;
        throw error;
      }
    }

    const fee = await Fee.create({
      name: String(name).trim(),
      notes: notes ? String(notes).trim() : "",
      amount: Number(amount),
      category: category || "general_application",
      isActive: isActive !== undefined ? isActive : true,
      version: 1,
    });

    const userInfo = await getUserInfo(userId);

    FeeAuditHelper.logCreated(req, userId, userInfo, fee, "admin").catch(
      (err) => console.error("Failed to log audit event for fee create", err),
    );

    return fee;
  }

  /**
   * Update fee (creates new version)
   */
  async update(id, feeData, userId, req) {
    const { name, notes, amount, isActive } = feeData;

    const fee = await Fee.findById(id);
    if (!fee) {
      const error = new Error("Fee not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Migrate legacy category values
    if (fee.category === "general_application") {
      fee.category = "global";
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

    const userInfo = await getUserInfo(userId);

    const oldFee = new Fee(oldValues);
    oldFee._id = fee._id;

    FeeAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldFee,
      fee,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for fee update", err),
    );

    return fee;
  }

  /**
   * Disable fee
   */
  async disable(id, userId, req) {
    const fee = await Fee.findById(id);
    if (!fee) {
      const error = new Error("Fee not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (!fee.isActive) {
      const error = new Error("Fee is already disabled");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: fee.name,
      notes: fee.notes,
      amount: fee.amount,
      isActive: fee.isActive,
      version: fee.version,
    };

    fee.isActive = false;
    fee.version += 1;
    await fee.save();

    const userInfo = await getUserInfo(userId);

    const oldFee = new Fee(oldValues);
    oldFee._id = fee._id;
    oldFee.notes = fee.notes;
    oldFee.amount = fee.amount;

    FeeAuditHelper.logDisabled(req, userId, userInfo, oldFee, "admin").catch(
      (err) => console.error("Failed to log audit event for fee disable", err),
    );

    return { disabled: true };
  }

  /**
   * Get audit history for a fee
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const fee = await Fee.findById(id);
    if (!fee) {
      const error = new Error("Fee not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Query audit-service for logs using specific endpoint
    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const response = await auditClient.get(`/api/audit/fee/${id}`, {
      params,
    });

    const logs = response.data.logs || [];
    const pagination = response.data.pagination || {};

    return { logs, pagination };
  }

  /**
   * Get fees by category
   */
  async getByCategory(category) {
    const fees = await Fee.find({ category }).sort({ name: 1 }).lean();
    return fees;
  }

  /**
   * Update variable calculation for a fee
   */
  async updateVariableCalculation(id, variableData, userId, req) {
    const { baseRate, unit, fixedAmount, customCalculationMethod } =
      variableData;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid fee ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const variable = await Variable.findById(id);
    if (!variable) {
      const error = new Error("Variable not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const oldValues = {
      baseRate: variable.baseRate,
      unit: variable.unit,
      fixedAmount: variable.fixedAmount,
      customCalculationMethod: variable.customCalculationMethod,
    };

    const updates = {
      ...(baseRate !== undefined && { baseRate }),
      ...(unit && { unit }),
      ...(fixedAmount !== undefined && { fixedAmount }),
      ...(customCalculationMethod !== undefined && {
        customCalculationMethod,
      }),
      updatedBy: userId,
    };

    const updated = await Variable.findByIdAndUpdate(id, updates, {
      new: true,
    });

    const updatedValues = {
      baseRate: updated.baseRate,
      unit: updated.unit,
      fixedAmount: updated.fixedAmount,
      customCalculationMethod: updated.customCalculationMethod,
    };

    const changes = Object.keys(updates).filter((key) => key !== "updatedBy");

    const userInfo = await getUserInfo(userId);

    // Use VariableAuditHelper for variable calculation updates
    const VariableAuditHelper = require("../../lib/auditHelpers/variableAuditHelper");
    VariableAuditHelper.logCalculationUpdated(
      req,
      userId,
      userInfo,
      variable,
      JSON.stringify(oldValues),
      JSON.stringify(updatedValues),
      "admin",
    ).catch((err) =>
      console.error(
        "Failed to log audit event for variable calculation update",
        err,
      ),
    );

    return updated;
  }
}

module.exports = new FeeService();
