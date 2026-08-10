/**
 * Checklists Audit Router
 *
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for checklist-related entities.
 */

const { createAuditRouter } = require("../lib/auditRouterFactory");
const { getEntityConfig } = require("../config/entityAuditConfig");

// Get checklist configuration from central config
const checklistConfig = getEntityConfig("checklist");

// Create router using factory for checklist entity
const checklistRouter = createAuditRouter("checklist", checklistConfig, {
  singularPath: "checklistId",
  globalPath: "checklists",
  singularPrefix: "checklist",
  globalPrefix: "",
});

// Export the router
module.exports = checklistRouter;
