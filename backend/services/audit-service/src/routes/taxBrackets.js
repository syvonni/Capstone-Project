/**
 * Tax Brackets Audit Router
 *
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for tax bracket-related entities.
 */

const { createAuditRouter } = require("../lib/auditRouterFactory");
const { getEntityConfig } = require("../config/entityAuditConfig");

// Get tax bracket configuration from central config
const taxBracketConfig = getEntityConfig("tax_bracket");

// Create router using factory for tax bracket entity
const taxBracketRouter = createAuditRouter("tax_bracket", taxBracketConfig, {
  singularPath: "taxBracketId",
  globalPath: "tax-brackets",
  singularPrefix: "tax-bracket",
  globalPrefix: "",
});

// Export the router
module.exports = taxBracketRouter;
