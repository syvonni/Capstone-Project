const PenaltyRule = require("../../models/PenaltyRule");
const { auditClient } = require("../../../../../shared/lib/httpClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const PenaltyRuleAuditHelper = require("../../lib/auditHelpers/penaltyRuleAuditHelper");

class PenaltyRuleService {
  /**
   * List penalty rules with filters
   */
  async list(filters = {}) {
    const { category, isActive } = filters;
    const filter = {};
    
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const penaltyRules = await PenaltyRule.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return penaltyRules;
  }

  /**
   * Get penalty rule by ID
   */
  async getById(id) {
    const penaltyRule = await PenaltyRule.findById(id).lean();
    
    if (!penaltyRule) {
      const error = new Error("Penalty rule not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return penaltyRule;
  }

  /**
   * Get audit history for a penalty rule
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const penaltyRule = await PenaltyRule.findById(id);
    if (!penaltyRule) {
      const error = new Error("Penalty rule not found");
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
      `/api/audit/penalty-rule/${id}`,
      {
        params,
      },
    );

    const logs = response.data.logs || [];
    const pagination = response.data.pagination || {};

    return { logs, pagination };
  }

  /**
   * Create penalty rule
   */
  async create(data, userId, req) {
    const { name, description, amount, category } = data;

    if (!name || !description || amount == null) {
      const error = new Error("name, description, and amount are required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    const penaltyRule = await PenaltyRule.create({
      name: String(name).trim(),
      description: String(description).trim(),
      amount: Number(amount),
      category: category || "other",
      isActive: true,
      version: 1,
    });

    const userInfo = await getUserInfo(userId);

    PenaltyRuleAuditHelper.logCreated(req, userId, userInfo, penaltyRule, "admin").catch((err) =>
      console.error("Failed to log audit event for penalty rule create", err),
    );

    return penaltyRule;
  }

  /**
   * Update penalty rule
   */
  async update(id, data, userId, req) {
    const { name, description, amount, category, isActive } = data;

    const penaltyRule = await PenaltyRule.findById(id);
    if (!penaltyRule) {
      const error = new Error("Penalty rule not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const oldValues = {
      name: penaltyRule.name,
      description: penaltyRule.description,
      amount: penaltyRule.amount,
      category: penaltyRule.category,
      isActive: penaltyRule.isActive,
      version: penaltyRule.version,
    };

    // Track changes
    const changes = {};
    if (name !== undefined && name !== penaltyRule.name) {
      penaltyRule.name = String(name).trim();
      changes.name = { from: oldValues.name, to: penaltyRule.name };
    }
    if (description !== undefined && description !== penaltyRule.description) {
      penaltyRule.description = String(description).trim();
      changes.description = {
        from: oldValues.description,
        to: penaltyRule.description,
      };
    }
    if (amount !== undefined && amount !== penaltyRule.amount) {
      penaltyRule.amount = Number(amount);
      changes.amount = { from: oldValues.amount, to: penaltyRule.amount };
    }
    if (category !== undefined && category !== penaltyRule.category) {
      penaltyRule.category = category;
      changes.category = { from: oldValues.category, to: penaltyRule.category };
    }
    if (isActive !== undefined && isActive !== penaltyRule.isActive) {
      penaltyRule.isActive = isActive;
      changes.isActive = { from: oldValues.isActive, to: penaltyRule.isActive };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      penaltyRule.version += 1;
    }

    await penaltyRule.save();

    const userInfo = await getUserInfo(userId);

    // Create old penalty rule object for comparison
    const oldPenaltyRule = new PenaltyRule(oldValues);
    oldPenaltyRule._id = penaltyRule._id;

    PenaltyRuleAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldPenaltyRule,
      penaltyRule,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for penalty rule update", err),
    );

    return penaltyRule;
  }

  /**
   * Disable penalty rule (soft delete)
   */
  async disable(id, userId, req) {
    const penaltyRule = await PenaltyRule.findById(id);
    if (!penaltyRule) {
      const error = new Error("Penalty rule not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (!penaltyRule.isActive) {
      const error = new Error("Penalty rule is already disabled");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: penaltyRule.name,
      isActive: penaltyRule.isActive,
    };

    penaltyRule.isActive = false;
    penaltyRule.version += 1;
    await penaltyRule.save();

    const userInfo = await getUserInfo(userId);

    // Create old penalty rule object for snapshot
    const oldPenaltyRule = new PenaltyRule(oldValues);
    oldPenaltyRule._id = penaltyRule._id;

    PenaltyRuleAuditHelper.logDeleted(req, userId, userInfo, oldPenaltyRule, "admin").catch(
      (err) => console.error("Failed to log audit event for penalty rule delete", err),
    );

    return { disabled: true };
  }
}

module.exports = new PenaltyRuleService();
