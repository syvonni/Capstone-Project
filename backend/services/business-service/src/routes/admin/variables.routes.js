const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Variable = require("../../models/Variable");
const Fee = require("../../models/Fee");
const User = require("../../models/User");
const { requireJwt, requireRole, requireAdminStepUp } = require("../../middleware/auth");
const { ok: respondOk, error: respondError } = require("../../middleware/respond");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const VariableAuditHelper = require("../../lib/auditHelpers/variableAuditHelper");
const VariableDataQualityHelper = require("../../lib/dataQualityHelpers/variableDataQualityHelper");
const VariablePerformanceHelper = require("../../lib/performanceHelpers/variablePerformanceHelper");
const {
  validateBrackets,
  validateClassifications,
  validateCalculationMethod,
  validateStringLengths,
  validateLegalBasisUrls,
  validateUnitConsistency,
  validateCustomIdFormat
} = require("../../lib/variableValidators");

const router = express.Router();

// GET /api/business/admin/variables - list with filters
router.get("/", requireJwt, async (req, res) => {
  try {
    const { calculationMethod, isActive, categories } = req.query;
    const filter = {};
    if (calculationMethod) {
      filter.calculationMethod = calculationMethod;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    if (categories) {
      filter.categories = { $in: categories.split(',') };
    }

    const variables = await Variable.find(filter)
      .populate('feeId')
      .populate('checklistId')
      .sort({ name: 1 });

    return respondOk(res, 200, variables);
  } catch (err) {
    console.error("GET /variables error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch variables. Please try again later.");
  }
});

// GET /api/business/admin/variables/data-quality - get data quality issues for all variables
router.get("/data-quality", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await VariableDataQualityHelper.validateAllVariables();
    console.log("Data quality result:", JSON.stringify(result, null, 2));
    return respondOk(res, 200, result);
  } catch (err) {
    console.error("GET /admin/variables/data-quality error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch data quality issues");
  }
});

// GET /api/business/admin/variables/performance - get performance metrics
router.get("/performance", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { timeRange } = req.query;
    const metrics = await VariablePerformanceHelper.getPerformanceSummary(timeRange);
    return respondOk(res, 200, metrics);
  } catch (err) {
    console.error("GET /admin/variables/performance error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch performance metrics");
  }
});

// GET /api/business/admin/variables/:id - get single
router.get("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respondError(res, 400, "INVALID_ID", "Invalid variable ID");
    }

    const variable = await Variable.findById(id)
      .populate('feeId')
      .populate('checklistId');

    if (!variable) {
      return respondError(res, 404, "NOT_FOUND", "Variable not found");
    }

    return respondOk(res, 200, variable);
  } catch (err) {
    console.error("GET /variables/:id error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch variable. Please try again later.");
  }
});

// GET /api/business/admin/variables/by-fee/:feeId - get variables by fee ID
router.get("/by-fee/:feeId", requireJwt, async (req, res) => {
  try {
    const { feeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(feeId)) {
      return respondError(res, 400, "INVALID_ID", "Invalid fee ID");
    }

    const variables = await Variable.find({ feeId })
      .populate('feeId')
      .sort({ name: 1 });

    return respondOk(res, 200, variables);
  } catch (err) {
    console.error("GET /variables/by-fee/:feeId error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch variables by fee ID. Please try again later.");
  }
});

// GET /api/business/admin/variables/by-variable-fee-rule/:variableFeeRuleId - get variables by variable fee rule ID
router.get("/by-variable-fee-rule/:variableFeeRuleId", requireJwt, async (req, res) => {
  try {
    const { variableFeeRuleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(variableFeeRuleId)) {
      return respondError(res, 400, "INVALID_ID", "Invalid variable fee rule ID");
    }

    const variables = await Variable.find({ variableFeeRuleId })
      .populate('feeId')
      .sort({ name: 1 });

    return respondOk(res, 200, variables);
  } catch (err) {
    console.error("GET /variables/by-variable-fee-rule/:variableFeeRuleId error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch variables by variable fee rule ID. Please try again later.");
  }
});

// POST /api/business/admin/variables - create
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
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
        checklistId
      } = req.body;

      // Required field validations
      if (!name) {
        return respondError(res, 400, "VALIDATION_ERROR", "Name is required");
      }

      if (!question) {
        return respondError(res, 400, "VALIDATION_ERROR", "Question is required");
      }

      if (!calculationMethod) {
        return respondError(res, 400, "VALIDATION_ERROR", "Calculation method is required");
      }

      if (!unit) {
        return respondError(res, 400, "VALIDATION_ERROR", "Unit is required");
      }

      if (!unitSingular) {
        return respondError(res, 400, "VALIDATION_ERROR", "Unit singular is required");
      }

      if (!unitPlural) {
        return respondError(res, 400, "VALIDATION_ERROR", "Unit plural is required");
      }

      if (!unitContextSingular) {
        return respondError(res, 400, "VALIDATION_ERROR", "Unit context singular is required");
      }

      if (!unitContextPlural) {
        return respondError(res, 400, "VALIDATION_ERROR", "Unit context plural is required");
      }

      // Duplicate name validation
      const existingVariable = await Variable.findOne({ name });
      if (existingVariable) {
        return respondError(res, 409, "DUPLICATE_NAME", "A variable with this name already exists. Please use a different name.");
      }

      // Custom ID format validation
      if (customId) {
        const customIdValidation = validateCustomIdFormat(customId);
        if (!customIdValidation.valid) {
          return respondError(res, 400, "VALIDATION_ERROR", customIdValidation.error);
        }
      }

      // String length validations
      const stringLengthValidation = validateStringLengths({
        name,
        description,
        notes,
        question,
        unit,
        unitSingular,
        unitPlural,
        customCalculationMethod
      });
      if (!stringLengthValidation.valid) {
        return respondError(res, 400, "VALIDATION_ERROR", stringLengthValidation.error);
      }

      // Unit consistency validation
      const unitValidation = validateUnitConsistency({
        unitSingular,
        unitPlural
      });
      if (!unitValidation.valid) {
        return respondError(res, 400, "VALIDATION_ERROR", unitValidation.error);
      }

      // Legal basis URL validation
      if (legalBasis && legalBasis.length > 0) {
        const urlValidation = validateLegalBasisUrls(legalBasis);
        if (!urlValidation.valid) {
          return respondError(res, 400, "VALIDATION_ERROR", urlValidation.error);
        }
      }

      // Bracket validation
      if (brackets && brackets.length > 0) {
        const bracketValidation = validateBrackets(brackets);
        if (!bracketValidation.valid) {
          return respondError(res, 400, "VALIDATION_ERROR", bracketValidation.error);
        }
      }

      // Classification validation
      if (classifications && classifications.length > 0) {
        const classificationValidation = validateClassifications(classifications);
        if (!classificationValidation.valid) {
          return respondError(res, 400, "VALIDATION_ERROR", classificationValidation.error);
        }
      }

      // Calculation method specific validation
      const calcMethodValidation = validateCalculationMethod(calculationMethod, {
        brackets,
        classifications,
        fixedAmount,
        baseRate,
        customCalculationMethod
      });
      if (!calcMethodValidation.valid) {
        return respondError(res, 400, "VALIDATION_ERROR", calcMethodValidation.error);
      }

      // Create Variable document
      const variableData = {
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
        checklistId,
        createdBy: req._userId,
        updatedBy: req._userId,
      };

      const variable = await Variable.create(variableData);

      // If feeAmount is provided, create Fee and link it
      if (feeAmount) {
        const fee = await Fee.create({
          name: `${name} Fee`,
          amount: feeAmount,
          category: 'variable',
          isActive: true,
        });
        variable.feeId = fee._id;
        await variable.save();
      }

      const userInfo = await getUserInfo(req._userId);
      VariableAuditHelper.logCreated(req, req._userId, userInfo, variable, "admin")
        .catch((err) => console.error("Failed to log audit event for variable create", err));

      return respondOk(res, 201, variable);
    } catch (err) {
      console.error("POST /variables error:", err);
      
      // Handle duplicate key error from MongoDB
      if (err.code === 11000) {
        return respondError(res, 409, "DUPLICATE_NAME", "A variable with this name already exists. Please use a different name.");
      }
      
      return respondError(res, 500, "INTERNAL", "Failed to create variable");
    }
  },
);

// PUT /api/business/admin/variables/:id - update definition fields only
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        customId,
        name,
        description,
        notes,
        question,
        legalBasis,
        categories,
        isActive,
        checklistId
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return respondError(res, 400, "INVALID_ID", "Invalid variable ID");
      }

      const variable = await Variable.findById(id);
      if (!variable) {
        return respondError(res, 404, "NOT_FOUND", "Variable not found");
      }

      // Duplicate name validation (allow self-update)
      if (name && name !== variable.name) {
        const existingVariable = await Variable.findOne({ name, _id: { $ne: id } });
        if (existingVariable) {
          return respondError(res, 409, "DUPLICATE_NAME", "A variable with this name already exists. Please use a different name.");
        }
      }

      // String length validations
      const stringLengthValidation = validateStringLengths({
        name: name || variable.name,
        description: description !== undefined ? description : variable.description,
        notes: notes !== undefined ? notes : variable.notes,
        question: question || variable.question,
      });
      if (!stringLengthValidation.valid) {
        return respondError(res, 400, "VALIDATION_ERROR", stringLengthValidation.error);
      }

      // Legal basis URL validation
      if (legalBasis && legalBasis.length > 0) {
        const urlValidation = validateLegalBasisUrls(legalBasis);
        if (!urlValidation.valid) {
          return respondError(res, 400, "VALIDATION_ERROR", urlValidation.error);
        }
      }

      // Store old values for audit logging
      const oldValues = {
        name: variable.name,
        description: variable.description,
        notes: variable.notes,
        question: variable.question,
        legalBasis: variable.legalBasis,
        categories: variable.categories,
        isActive: variable.isActive,
        checklistId: variable.checklistId,
        version: variable.version,
      };

      // Track changes
      const changes = {};
      if (customId !== undefined && customId !== variable.customId) {
        changes.customId = { from: variable.customId, to: customId };
      }
      if (name !== undefined && name !== variable.name) {
        changes.name = { from: variable.name, to: name };
      }
      if (description !== undefined && description !== variable.description) {
        changes.description = { from: variable.description, to: description };
      }
      if (notes !== undefined && notes !== variable.notes) {
        changes.notes = { from: variable.notes, to: notes };
      }
      if (question !== undefined && question !== variable.question) {
        changes.question = { from: variable.question, to: question };
      }
      if (legalBasis !== undefined && JSON.stringify(legalBasis) !== JSON.stringify(variable.legalBasis)) {
        changes.legalBasis = { from: variable.legalBasis, to: legalBasis };
      }
      if (categories !== undefined && JSON.stringify(categories) !== JSON.stringify(variable.categories)) {
        changes.categories = { from: variable.categories, to: categories };
      }
      if (isActive !== undefined && isActive !== variable.isActive) {
        changes.isActive = { from: variable.isActive, to: isActive };
      }
      if (checklistId !== undefined && checklistId !== variable.checklistId?.toString()) {
        changes.checklistId = { from: variable.checklistId, to: checklistId };
      }

      // Only update definition fields (not calculation fields)
      const updates = {
        ...(customId !== undefined && { customId }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(notes !== undefined && { notes }),
        ...(question && { question }),
        ...(legalBasis !== undefined && { legalBasis }),
        ...(categories !== undefined && { categories }),
        ...(isActive !== undefined && { isActive }),
        ...(checklistId !== undefined && { checklistId }),
        updatedBy: req._userId,
      };

      // Increment version if there are changes
      if (Object.keys(changes).length > 0) {
        updates.version = variable.version + 1;
      }

      const updated = await Variable.findByIdAndUpdate(id, updates, {
        new: true,
      });

      const updatedValues = {
        name: updated.name,
        description: updated.description,
        notes: updated.notes,
        question: updated.question,
        legalBasis: updated.legalBasis,
        categories: updated.categories,
        isActive: updated.isActive,
        version: updated.version,
      };

      const userInfo = await getUserInfo(req._userId);
      VariableAuditHelper.logUpdated(req, req._userId, userInfo, variable, updated, "admin")
        .catch((err) => console.error("Failed to log audit event for variable update", err));

      return respondOk(res, 200, updated);
    } catch (err) {
      console.error("PUT /variables/:id error:", err);
      
      // Handle version conflict (optimistic locking)
      if (err.name === 'VersionError') {
        return respondError(res, 409, "VERSION_CONFLICT", "This variable was modified by another user. Please refresh and try again.");
      }
      
      // Handle duplicate key error from MongoDB
      if (err.code === 11000) {
        return respondError(res, 409, "DUPLICATE_NAME", "A variable with this name already exists. Please use a different name.");
      }
      
      return respondError(res, 500, "INTERNAL", "Failed to update variable");
    }
  },
);

// DELETE /api/business/admin/variables/:id - soft delete
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return respondError(res, 400, "INVALID_ID", "Invalid variable ID");
      }

      const variable = await Variable.findById(id);
      if (!variable) {
        return respondError(res, 404, "NOT_FOUND", "Variable not found");
      }

      const oldValues = {
        isActive: variable.isActive,
        version: variable.version,
      };

      // Soft-disable
      const updates = {
        isActive: false,
        version: variable.version + 1,
        updatedBy: req._userId,
      };

      const updated = await Variable.findByIdAndUpdate(id, updates, {
        new: true,
      });

      const userInfo = await getUserInfo(req._userId);
      VariableAuditHelper.logDisabled(req, req._userId, userInfo, variable, "admin")
        .catch((err) => console.error("Failed to log audit event for variable disable", err));

      return respondOk(res, 200, updated);
    } catch (err) {
      console.error("DELETE /variables/:id error:", err);
      return respondError(res, 500, "INTERNAL", "Failed to disable variable. Please try again later.");
    }
  },
);

// GET /api/business/admin/variables/:id/audit - proxy to audit service
router.get("/:id/audit", requireJwt, async (req, res) => {
  try {
    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
    const response = await axios.get(`${auditServiceUrl}/api/audit/variable/${req.params.id}`, {
      params: req.query,
    });
    return respondOk(res, 200, response.data);
  } catch (err) {
    console.error("GET /admin/variables/:id/audit error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch audit history");
  }
});

module.exports = router;
