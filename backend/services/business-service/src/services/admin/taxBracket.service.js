const mongoose = require("mongoose");
const TaxBracket = require("../../models/TaxBracket");
const Lob = require("../../models/Lob");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const TaxBracketAuditHelper = require("../../lib/auditHelpers/taxBracketAuditHelper");
const { auditClient } = require("../../../../../shared/lib/httpClient");

class TaxBracketService {
  /**
   * List tax brackets with filters
   */
  async list(filters = {}) {
    const { taxBasis, isActive, lobId } = filters;
    const filter = {};
    if (taxBasis) filter.taxBasis = taxBasis;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (lobId) filter.lobId = lobId;

    const brackets = await TaxBracket.find(filter)
      .sort({ taxBasis: 1, minValue: 1 })
      .lean();

    return brackets;
  }

  /**
   * Get tax bracket by ID
   */
  async getById(id) {
    const bracket = await TaxBracket.findById(id).lean();

    if (!bracket) {
      const error = new Error("Tax bracket not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return bracket;
  }

  /**
   * Create tax bracket
   */
  async create(bracketData, userId, req) {
    const {
      lobId,
      name,
      taxBasis,
      minValue,
      maxValue,
      fixedAmount,
      excessRate,
      excessRateType,
      paymentFrequency,
      notes,
    } = bracketData;

    // Validate required fields
    if (!lobId || !name || !taxBasis || minValue === undefined) {
      const error = new Error(
        "Missing required fields: lobId, name, taxBasis, minValue",
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate LOB exists
    const lob = await Lob.findById(lobId);
    if (!lob) {
      const error = new Error("LOB not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Validate tax basis
    const validTaxBases = ["capitalization", "gross_sales"];
    if (!validTaxBases.includes(taxBasis)) {
      const error = new Error(
        `Invalid tax basis. Must be one of: ${validTaxBases.join(", ")}`,
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate payment frequency
    const validFrequencies = ["annual", "quarterly", "monthly"];
    if (paymentFrequency && !validFrequencies.includes(paymentFrequency)) {
      const error = new Error(
        `Invalid payment frequency. Must be one of: ${validFrequencies.join(", ")}`,
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Validate excess rate type
    const validRateTypes = ["direct", "percentage"];
    if (excessRateType && !validRateTypes.includes(excessRateType)) {
      const error = new Error(
        `Invalid excess rate type. Must be one of: ${validRateTypes.join(", ")}`,
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    const bracket = await TaxBracket.create({
      lobId,
      name,
      taxBasis,
      minValue,
      maxValue: maxValue || null,
      fixedAmount: fixedAmount || null,
      excessRate: excessRate || null,
      excessRateType: excessRateType || null,
      paymentFrequency: paymentFrequency || "annual",
      notes: notes || "",
      isActive: true,
    });

    const userInfo = await getUserInfo(userId);

    TaxBracketAuditHelper.logCreated(req, userId, userInfo, bracket, "admin").catch(
      (err) => console.error("Failed to log audit event for tax bracket create", err),
    );

    return bracket;
  }

  /**
   * Update tax bracket
   */
  async update(id, bracketData, userId, req) {
    const {
      name,
      minValue,
      maxValue,
      fixedAmount,
      excessRate,
      excessRateType,
      paymentFrequency,
      notes,
      isActive,
    } = bracketData;

    const bracket = await TaxBracket.findById(id);
    if (!bracket) {
      const error = new Error("Tax bracket not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const oldValues = {
      name: bracket.name,
      minValue: bracket.minValue,
      maxValue: bracket.maxValue,
      fixedAmount: bracket.fixedAmount,
      excessRate: bracket.excessRate,
      excessRateType: bracket.excessRateType,
      paymentFrequency: bracket.paymentFrequency,
      notes: bracket.notes,
      isActive: bracket.isActive,
    };

    // Track changes
    const changes = {};
    const allowedFields = [
      "name",
      "minValue",
      "maxValue",
      "fixedAmount",
      "excessRate",
      "excessRateType",
      "paymentFrequency",
      "notes",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (bracketData[field] !== undefined && bracketData[field] !== bracket[field]) {
        bracket[field] = bracketData[field];
        changes[field] = { from: oldValues[field], to: bracketData[field] };
      }
    }

    await bracket.save();

    const userInfo = await getUserInfo(userId);

    const oldBracket = new TaxBracket(oldValues);
    oldBracket._id = bracket._id;
    oldBracket.lobId = bracket.lobId;
    oldBracket.taxBasis = bracket.taxBasis;

    TaxBracketAuditHelper.logUpdated(req, userId, userInfo, oldBracket, bracket, "admin").catch(
      (err) => console.error("Failed to log audit event for tax bracket update", err),
    );

    return bracket;
  }

  /**
   * Get audit history for a tax bracket
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const bracket = await TaxBracket.findById(id);
    if (!bracket) {
      const error = new Error("Tax bracket not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Query audit-service for logs
    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const response = await auditClient.get(
      `/api/audit/tax-bracket/${id}`,
      {
        params,
      },
    );

    const logs = response.data.logs || [];
    const pagination = response.data.pagination || {};

    return { logs, pagination };
  }

  /**
   * Disable tax bracket (soft delete)
   */
  async disable(id, userId, req) {
    const bracket = await TaxBracket.findById(id);
    if (!bracket) {
      const error = new Error("Tax bracket not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (!bracket.isActive) {
      const error = new Error("Tax bracket is already disabled");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: bracket.name,
      isActive: bracket.isActive,
    };

    bracket.isActive = false;
    bracket.version += 1;
    await bracket.save();

    const userInfo = await getUserInfo(userId);

    const oldBracket = new TaxBracket(oldValues);
    oldBracket._id = bracket._id;
    oldBracket.taxBasis = bracket.taxBasis;

    TaxBracketAuditHelper.logDeleted(req, userId, userInfo, oldBracket, "admin").catch(
      (err) => console.error("Failed to log audit event for tax bracket delete", err),
    );

    return { disabled: true };
  }
}

module.exports = new TaxBracketService();
