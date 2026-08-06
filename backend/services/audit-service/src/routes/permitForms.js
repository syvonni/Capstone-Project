/**
 * Permit Forms Audit Router
 * 
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for permit form-related entities.
 */

const { createAuditRouter } = require('../lib/auditRouterFactory');
const { getEntityConfig } = require('../config/entityAuditConfig');

// Get permit form configuration from central config
const permitFormConfig = getEntityConfig('permit_form');

// Create router using factory for permit form entity
const permitFormRouter = createAuditRouter('permit_form', permitFormConfig, {
  singularPath: 'permitFormId',
  globalPath: 'permit-forms',
  singularPrefix: 'permit-form',
  globalPrefix: ''
});

// Export the router
module.exports = permitFormRouter;
