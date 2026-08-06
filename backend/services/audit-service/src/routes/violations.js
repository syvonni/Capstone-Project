/**
 * Violations Audit Router
 * 
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for violation-related entities.
 */

const { createAuditRouter } = require('../lib/auditRouterFactory');
const { getEntityConfig } = require('../config/entityAuditConfig');

// Get violation configuration from central config
const violationConfig = getEntityConfig('violation');

// Create router using factory for violation entity
const violationRouter = createAuditRouter('violation', violationConfig, {
  singularPath: 'violationId',
  globalPath: 'violations',
  singularPrefix: 'violation',
  globalPrefix: ''
});

// Export the router
module.exports = violationRouter;
