const VariableFeeRule = require("../../models/VariableFeeRule");
const Lob = require("../../models/Lob");
const PostRequirement = require("../../models/PostRequirement");
const Violation = require("../../models/Violation");
const Fee = require("../../models/Fee");
const Checklist = require("../../models/Checklist");
const ClaimableDocument = require("../../models/ClaimableDocument");
const InspectionItem = require("../../models/InspectionItem");
const { auditClient } = require("../../../../../shared/lib/httpClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const VariableFeeRuleAuditHelper = require("../../lib/auditHelpers/variableFeeRuleAuditHelper");

class VariableFeeRuleService {
  /**
   * List variable fee rules with filters
   */
  async list(filters = {}) {
    const { isActive } = filters;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const rules = await VariableFeeRule.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    
    return rules;
  }

  /**
   * Get LOBs that use this variable fee rule
   */
  async getLobs(id) {
    // Find LOBs that have this variable fee rule in their variableFeeRules array
    const lobs = await Lob.find({
      variableFeeRules: id,
      isActive: true,
    })
      .select("code name category lineOfBusiness")
      .lean();

    return lobs;
  }

  /**
   * Get variable fee rule by ID
   */
  async getById(id) {
    const rule = await VariableFeeRule.findById(id).lean();
    
    if (!rule) {
      const error = new Error("Variable fee rule not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return rule;
  }

  /**
   * Get audit history for a variable fee rule
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const rule = await VariableFeeRule.findById(id);
    if (!rule) {
      const error = new Error("Variable fee rule not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Query audit-service for logs using specific endpoint
    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const response = await auditClient.get(
      `/api/audit/variable-fee-rule/${id}`,
      {
        params,
      },
    );

    const logs = response.data.logs || [];
    const pagination = response.data.pagination || {};

    return { logs, pagination };
  }

  /**
   * Create variable fee rule
   */
  async create(data, userId, req) {
    const {
      name,
      notes,
      question,
      calculationMethod,
      customCalculationMethod,
      baseRate,
      unit,
      brackets,
      classifications,
    } = data;

    if (!name || !question || !calculationMethod || !unit) {
      const error = new Error("name, question, calculationMethod, and unit are required");
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

    if (calculationMethod === "custom" && !customCalculationMethod) {
      const error = new Error(
        "customCalculationMethod is required when calculationMethod is 'custom'"
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (
      calculationMethod === "bracketed" &&
      (!brackets || brackets.length === 0)
    ) {
      const error = new Error(
        "brackets are required when calculationMethod is 'bracketed'"
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (
      calculationMethod === "classification" &&
      (!classifications || classifications.length === 0)
    ) {
      const error = new Error(
        "classifications are required when calculationMethod is 'classification'"
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (calculationMethod === "classification" && baseRate != null) {
      const error = new Error(
        "baseRate should be null when calculationMethod is 'classification'"
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (
      calculationMethod !== "bracketed" &&
      calculationMethod !== "classification" &&
      baseRate == null
    ) {
      const error = new Error("baseRate is required for this calculationMethod");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    const rule = await VariableFeeRule.create({
      name: String(name).trim(),
      notes: notes ? String(notes).trim() : "",
      question: String(question).trim(),
      calculationMethod,
      customCalculationMethod:
        calculationMethod === "custom"
          ? String(customCalculationMethod).trim()
          : null,
      baseRate:
        calculationMethod === "classification"
          ? null
          : baseRate != null
            ? Number(baseRate)
            : null,
      unit: String(unit).trim(),
      brackets: calculationMethod === "bracketed" ? brackets || [] : [],
      classifications:
        calculationMethod === "classification" ? classifications || [] : [],
      isActive: true,
      version: 1,
    });

    const userInfo = await getUserInfo(userId);

    VariableFeeRuleAuditHelper.logCreated(
      req,
      userId,
      userInfo,
      rule,
      "admin",
    ).catch((err) =>
      console.error(
        "Failed to log audit event for variable fee rule create",
        err,
      ),
    );

    return rule;
  }

  /**
   * Update variable fee rule
   */
  async update(id, data, userId, req) {
    const {
      name,
      notes,
      question,
      calculationMethod,
      customCalculationMethod,
      baseRate,
      unit,
      brackets,
      classifications,
      isActive,
    } = data;

    const rule = await VariableFeeRule.findById(id);
    if (!rule) {
      const error = new Error("Variable fee rule not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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
    if (
      calculationMethod !== undefined &&
      calculationMethod !== rule.calculationMethod
    ) {
      rule.calculationMethod = calculationMethod;
      changes.calculationMethod = {
        from: oldValues.calculationMethod,
        to: rule.calculationMethod,
      };
    }
    if (
      customCalculationMethod !== undefined &&
      customCalculationMethod !== rule.customCalculationMethod
    ) {
      rule.customCalculationMethod = String(customCalculationMethod).trim();
      changes.customCalculationMethod = {
        from: oldValues.customCalculationMethod,
        to: rule.customCalculationMethod,
      };
    }
    if (baseRate !== undefined && baseRate !== rule.baseRate) {
      rule.baseRate = Number(baseRate);
      changes.baseRate = { from: oldValues.baseRate, to: rule.baseRate };
    }
    if (unit !== undefined && unit !== rule.unit) {
      rule.unit = String(unit).trim();
      changes.unit = { from: oldValues.unit, to: rule.unit };
    }
    if (
      brackets !== undefined &&
      JSON.stringify(brackets) !== JSON.stringify(rule.brackets)
    ) {
      rule.brackets = brackets || [];
      changes.brackets = { from: oldValues.brackets, to: rule.brackets };
    }
    if (
      classifications !== undefined &&
      JSON.stringify(classifications) !== JSON.stringify(rule.classifications)
    ) {
      rule.classifications = classifications || [];
      changes.classifications = {
        from: oldValues.classifications,
        to: rule.classifications,
      };
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

    const userInfo = await getUserInfo(userId);

    // Create old rule object for comparison
    const oldRule = new VariableFeeRule(oldValues);
    oldRule._id = rule._id;

    VariableFeeRuleAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldRule,
      rule,
      "admin",
    ).catch((err) =>
      console.error(
        "Failed to log audit event for variable fee rule update",
        err,
      ),
    );

    return rule;
  }

  /**
   * Disable variable fee rule (soft delete)
   */
  async disable(id, userId, req) {
    const rule = await VariableFeeRule.findById(id);
    if (!rule) {
      const error = new Error("Variable fee rule not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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

    const userInfo = await getUserInfo(userId);

    // Create old rule object for snapshot
    const oldRule = new VariableFeeRule(oldValues);
    oldRule._id = rule._id;
    oldRule.notes = rule.notes;
    oldRule.question = rule.question;
    oldRule.calculationMethod = rule.calculationMethod;

    VariableFeeRuleAuditHelper.logDisabled(
      req,
      userId,
      userInfo,
      oldRule,
      "admin",
    ).catch((err) =>
      console.error(
        "Failed to log audit event for variable fee rule disable",
        err,
      ),
    );

    return { disabled: true };
  }
}

module.exports = new VariableFeeRuleService();
