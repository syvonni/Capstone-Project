/**
 * Post Requirements Audit Router
 *
 * This file has been removed - post-requirement endpoint is now handled by fees.js
 * as part of the combined router using the auditRouterFactory pattern.
 */

// Post-requirement endpoint is now handled by fees.js combined router
// This file is kept for backwards compatibility but should be removed

const { createAuditRouter } = require("../lib/auditRouterFactory");
const { getEntityConfig } = require("../config/entityAuditConfig");

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

// Export the router
module.exports = postRequirementRouter;
