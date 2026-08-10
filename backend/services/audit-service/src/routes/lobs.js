/**
 * LOBs Audit Router
 *
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for LOB-related entities.
 */

const { createAuditRouter } = require("../lib/auditRouterFactory");
const { getEntityConfig } = require("../config/entityAuditConfig");

// Get LOB configuration from central config
const lobConfig = getEntityConfig("lob");

// Create router using factory for LOB entity
const lobRouter = createAuditRouter("lob", lobConfig, {
  singularPath: "lobId",
  globalPath: "lobs",
  singularPrefix: "lob",
  globalPrefix: "",
});

// Export the router
module.exports = lobRouter;
