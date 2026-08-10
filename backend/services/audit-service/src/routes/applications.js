/**
 * Applications Audit Router
 *
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for application-related entities.
 */

const { createAuditRouter } = require("../lib/auditRouterFactory");
const { getEntityConfig } = require("../config/entityAuditConfig");

// Get application configuration from central config
const applicationConfig = getEntityConfig("application");

// Create router using factory for application entity
const applicationRouter = createAuditRouter("application", applicationConfig, {
  singularPath: "applicationId",
  globalPath: "applications",
  singularPrefix: "application",
  globalPrefix: "",
});

// Export the router
module.exports = applicationRouter;
