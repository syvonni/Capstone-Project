const mongoose = require("mongoose");
const Variable = require("../../models/Variable");
const Fee = require("../../models/Fee");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const VariableAuditHelper = require("../../lib/auditHelpers/variableAuditHelper");
const {
  validateBrackets,
  validateClassifications,
  validateCalculationMethod,
  validateStringLengths,
  validateLegalBasisUrls,
  validateUnitConsistency,
  validateCustomIdFormat,
} = require("../../lib/variableValidators");
const { auditClient } = require("../../../../../shared/lib/httpClient");

// Fields that are allowed to be updated via PUT endpoint (mass assignment protection)
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "description",
  "notes",
  "question",
  "calculationMethod",
  "customCalculationMethod",
  "baseRate",
  "fixedAmount",
  "unit",
  "unitSingular",
  "unitPlural",
  "unitContextSingular",
  "unitContextPlural",
  "brackets",
  "classifications",
  "legalBasis",
  "checklistId",
  "categories",
];

// Protected fields that cannot be updated via PUT endpoint
const PROTECTED_FIELDS = [
  "_id",
  "customId",
  "createdAt",
  "createdBy",
  "updatedAt",
  "version",
  "feeId",
  "variableFeeRuleId",
  "isActive",
];

/**
 * Filter request data to only include allowed fields
 * Logs attempts to update protected fields for security monitoring
 */
function filterAllowedFields(updateData, userId) {
  const filtered = {};
  const attemptedProtectedFields = [];

  for (const field in updateData) {
    if (updateData[field] !== undefined) {
      if (ALLOWED_UPDATE_FIELDS.includes(field)) {
        filtered[field] = updateData[field];
      } else if (PROTECTED_FIELDS.includes(field)) {
        attemptedProtectedFields.push(field);
      }
    }
  }

  // Log attempts to update protected fields
  if (attemptedProtectedFields.length > 0) {
    console.warn(
      `[Security] User ${userId} attempted to update protected fields: ${attemptedProtectedFields.join(", ")}`,
    );
  }

  return filtered;
}

class VariableService {
  /**
   * List variables with filters
   */
  async list(filters = {}) {
    const { calculationMethod, isActive, categories } = filters;
    const filter = {};
    if (calculationMethod) {
      filter.calculationMethod = calculationMethod;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    if (categories) {
      filter.categories = { $in: categories.split(",") };
    }

    const variables = await Variable.find(filter)
      .populate("feeId")
      .populate("checklistId")
      .sort({ name: 1 });

    return variables;
  }

  /**
   * Get variable by ID
   */
  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid variable ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const variable = await Variable.findById(id)
      .populate("feeId")
      .populate("checklistId");

    if (!variable) {
      const error = new Error("Variable not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return variable;
  }

  /**
   * Get variables by fee ID
   */
  async getByFeeId(feeId) {
    if (!mongoose.Types.ObjectId.isValid(feeId)) {
      const error = new Error("Invalid fee ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const variables = await Variable.find({ feeId })
      .populate("feeId")
      .sort({ name: 1 });

    return variables;
  }

  /**
   * Get variables by variable fee rule ID
   */
  async getByVariableFeeRuleId(variableFeeRuleId) {
    if (!mongoose.Types.ObjectId.isValid(variableFeeRuleId)) {
      const error = new Error("Invalid variable fee rule ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const variables = await Variable.find({ variableFeeRuleId })
      .populate("feeId")
      .sort({ name: 1 });

    return variables;
  }

  /**
   * Create variable
   */
  async create(variableData, userId, req) {
    const {
      customId,
      name,
      description,
      notes,
      question,
      calculationMethod,
      customCalculationMethod,
      baseRate,
      unit,
      unitSingular,
      unitPlural,
      unitContextSingular,
      unitContextPlural,
      categories,
      brackets,
      classifications,
      fixedAmount,
      legalBasis,
      feeAmount,
      checklistId,
    } = variableData;

    // Required field validations
    if (!name) {
      const error = new Error("Name is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!question) {
      const error = new Error("Question is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!calculationMethod) {
      const error = new Error("Calculation method is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!unit) {
      const error = new Error("Unit is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!unitSingular) {
      const error = new Error("Unit singular is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!unitPlural) {
      const error = new Error("Unit plural is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!unitContextSingular) {
      const error = new Error("Unit context singular is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!unitContextPlural) {
      const error = new Error("Unit context plural is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Duplicate name validation
    const existingVariable = await Variable.findOne({ name });
    if (existingVariable) {
      const error = new Error("Variable with this name already exists");
      error.code = "DUPLICATE";
      error.status = 409;
      throw error;
    }

    // Validate calculation method
    const calcMethodValidation = validateCalculationMethod(calculationMethod, variableData);
    if (calcMethodValidation && !calcMethodValidation.valid) {
      const error = new Error(calcMethodValidation.error);
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate brackets if provided
    if (brackets && brackets.length > 0) {
      const bracketValidation = validateBrackets(brackets);
      if (!bracketValidation.valid) {
        const error = new Error(bracketValidation.error);
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }
    }

    // Validate classifications if provided
    if (classifications && classifications.length > 0) {
      const classificationValidation = validateClassifications(classifications);
      if (!classificationValidation.valid) {
        const error = new Error(classificationValidation.error);
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }
    }

    // Validate string lengths
    const lengthValidation = validateStringLengths({
      name,
      description,
      question,
      unit,
      unitSingular,
      unitPlural,
      unitContextSingular,
      unitContextPlural,
    });
    if (!lengthValidation.valid) {
      const error = new Error(lengthValidation.error);
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate legal basis URLs if provided
    if (legalBasis && legalBasis.length > 0) {
      const urlValidation = validateLegalBasisUrls(legalBasis);
      if (!urlValidation.valid) {
        const error = new Error(urlValidation.error);
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }
    }

    // Validate unit consistency
    const unitValidation = validateUnitConsistency({
      unit,
      unitSingular,
      unitPlural,
      unitContextSingular,
      unitContextPlural,
    });
    if (!unitValidation.valid) {
      const error = new Error(unitValidation.error);
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate custom ID format if provided
    if (customId) {
      const customIdValidation = validateCustomIdFormat(customId);
      if (!customIdValidation.valid) {
        const error = new Error(customIdValidation.error);
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        throw error;
      }
    }

    const variable = await Variable.create({
      customId,
      name,
      description,
      notes,
      question,
      calculationMethod,
      customCalculationMethod,
      baseRate,
      unit,
      unitSingular,
      unitPlural,
      unitContextSingular,
      unitContextPlural,
      categories,
      brackets,
      classifications,
      fixedAmount,
      legalBasis,
      feeAmount,
      checklistId,
      isActive: true,
      version: 1,
    });

    // If feeAmount is provided, create Fee and link it
    if (feeAmount) {
      const fee = await Fee.create({
        name: `${name} Fee`,
        amount: feeAmount,
        category: "variable",
        isActive: true,
      });
      variable.feeId = fee._id;
      await variable.save();
    }

    const userInfo = await getUserInfo(userId);

    VariableAuditHelper.logCreated(req, userId, userInfo, variable, "admin").catch(
      (err) => console.error("Failed to log audit event for variable create", err),
    );

    return variable;
  }

  /**
   * Update variable
   */
  async update(id, variableData, userId, req) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid variable ID");
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

    // Apply field allowlisting to prevent mass assignment attacks
    const filteredData = filterAllowedFields(variableData, userId);

    // Check if any allowed fields were provided
    if (Object.keys(filteredData).length === 0) {
      const error = new Error("No valid fields to update");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: variable.name,
      description: variable.description,
      notes: variable.notes,
      question: variable.question,
      calculationMethod: variable.calculationMethod,
      customCalculationMethod: variable.customCalculationMethod,
      baseRate: variable.baseRate,
      unit: variable.unit,
      unitSingular: variable.unitSingular,
      unitPlural: variable.unitPlural,
      unitContextSingular: variable.unitContextSingular,
      unitContextPlural: variable.unitContextPlural,
      categories: variable.categories,
      brackets: variable.brackets,
      classifications: variable.classifications,
      fixedAmount: variable.fixedAmount,
      legalBasis: variable.legalBasis,
      feeAmount: variable.feeAmount,
      checklistId: variable.checklistId,
      isActive: variable.isActive,
      version: variable.version,
    };

    // Track changes using filtered data
    const changes = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (filteredData[field] !== undefined && filteredData[field] !== variable[field]) {
        variable[field] = filteredData[field];
        changes[field] = { from: oldValues[field], to: filteredData[field] };
      }
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      variable.version += 1;
    }

    await variable.save();

    const userInfo = await getUserInfo(userId);

    const oldVariable = new Variable(oldValues);
    oldVariable._id = variable._id;

    VariableAuditHelper.logUpdated(req, userId, userInfo, oldVariable, variable, "admin").catch(
      (err) => console.error("Failed to log audit event for variable update", err),
    );

    return variable;
  }

  /**
   * Disable variable
   */
  async disable(id, userId, req) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid variable ID");
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

    if (!variable.isActive) {
      const error = new Error("Variable is already disabled");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: variable.name,
      isActive: variable.isActive,
      version: variable.version,
    };

    variable.isActive = false;
    variable.version += 1;
    await variable.save();

    const userInfo = await getUserInfo(userId);

    const oldVariable = new Variable(oldValues);
    oldVariable._id = variable._id;
    oldVariable.notes = variable.notes;
    oldVariable.question = variable.question;

    VariableAuditHelper.logDisabled(req, userId, userInfo, oldVariable, "admin").catch(
      (err) => console.error("Failed to log audit event for variable disable", err),
    );

    return { disabled: true };
  }

  /**
   * Get audit history for a variable
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const variable = await Variable.findById(id);
    if (!variable) {
      const error = new Error("Variable not found");
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

    const response = await auditClient.get(`/api/audit/variable/${id}`, {
      params,
    });

    const logs = response.data.logs || [];
    const pagination = response.data.pagination || {};

    return { logs, pagination };
  }
}

module.exports = new VariableService();
