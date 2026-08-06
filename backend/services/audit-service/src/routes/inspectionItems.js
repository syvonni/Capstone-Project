/**
 * Inspection Items Audit Router
 * 
 * This file has been refactored to use the audit router factory pattern.
 * It now generates audit endpoints for inspection item-related entities.
 */

const { createAuditRouter } = require('../lib/auditRouterFactory');
const { getEntityConfig } = require('../config/entityAuditConfig');

// Get inspection item configuration from central config
const inspectionItemConfig = getEntityConfig('inspection_item');

// Create router using factory for inspection item entity
const inspectionItemRouter = createAuditRouter('inspection_item', inspectionItemConfig, {
  singularPath: 'inspectionItemId',
  globalPath: 'inspection-items',
  singularPrefix: 'inspection-item',
  globalPrefix: ''
});

// Export the router
module.exports = inspectionItemRouter;
