/**
 * Fees Audit Router
 *
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for fee-related entities.
 */

const { createAuditRouter } = require("../lib/auditRouterFactory");
const { getEntityConfig } = require("../config/entityAuditConfig");

// Get fee configuration from central config
const feeConfig = getEntityConfig("fee");

// Create router using factory for fee entity
const feeRouter = createAuditRouter("fee", feeConfig, {
  singularPath: "feeId",
  globalPath: "fees",
  singularPrefix: "fee",
  globalPrefix: "",
});

// Get penalty rule configuration from central config
const penaltyRuleConfig = getEntityConfig("penalty_rule");

// Create router using factory for penalty rule entity
const penaltyRuleRouter = createAuditRouter("penalty_rule", penaltyRuleConfig, {
  singularPath: "penaltyRuleId",
  globalPath: "penalty-rules",
  singularPrefix: "penalty-rule",
  globalPrefix: "",
});

// Get variable fee rule configuration from central config
const variableFeeRuleConfig = getEntityConfig("variable_fee_rule");

// Create router using factory for variable fee rule entity
const variableFeeRuleRouter = createAuditRouter(
  "variable_fee_rule",
  variableFeeRuleConfig,
  {
    singularPath: "variableFeeRuleId",
    globalPath: "variable-fee-rules",
    singularPrefix: "variable-fee-rule",
    globalPrefix: "",
  },
);

// Get post requirement configuration from central config
const postRequirementConfig = getEntityConfig("post_requirement");

// Create router using factory for post requirement entity
const postRequirementRouter = createAuditRouter(
  "post_requirement",
  postRequirementConfig,
  {
    singularPath: "postRequirementId",
    globalPath: "post-requirements",
    singularPrefix: "post-requirement",
    globalPrefix: "",
  },
);

// Combine all routers into a single router for backwards compatibility
const express = require("express");
const combinedRouter = express.Router();
combinedRouter.use(feeRouter);
combinedRouter.use(penaltyRuleRouter);
combinedRouter.use(variableFeeRuleRouter);
combinedRouter.use(postRequirementRouter);

module.exports = combinedRouter;
