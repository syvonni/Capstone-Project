/**
 * Requirements Audit Router
 *
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for requirement-related entities.
 */

const { createAuditRouter } = require("../lib/auditRouterFactory");
const { getEntityConfig } = require("../config/entityAuditConfig");

// Get requirement configuration from central config
const requirementConfig = getEntityConfig("requirement");

// Create router using factory for requirement entity
const requirementRouter = createAuditRouter("requirement", requirementConfig, {
  singularPath: "requirementId",
  globalPath: "requirements",
  singularPrefix: "requirement",
  globalPrefix: "",
});

// Get requirement group configuration from central config
const requirementGroupConfig = getEntityConfig("requirement_group");

// Create router using factory for requirement group entity
const requirementGroupRouter = createAuditRouter(
  "requirement_group",
  requirementGroupConfig,
  {
    singularPath: "requirementGroupId",
    globalPath: "requirement-groups",
    singularPrefix: "requirement-group",
    globalPrefix: "",
  },
);

// Combine all routers into a single router for backwards compatibility
const express = require("express");
const combinedRouter = express.Router();
combinedRouter.use(requirementRouter);
combinedRouter.use(requirementGroupRouter);

module.exports = combinedRouter;
