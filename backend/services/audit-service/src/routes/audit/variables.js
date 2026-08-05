/**
 * Variables Audit Router
 * 
 * BEFORE (Original Implementation):
 * This file contained 167 lines of duplicated code with:
 * - Hardcoded event type arrays
 * - Manual pagination logic
 * - Manual filter building
 * - Manual error handling
 * - Response format inconsistencies
 * 
 * AFTER (Factory-Based Implementation):
 * This file now uses the generic audit router factory to generate endpoints.
 * All logic is centralized in utilities, reducing this file to ~20 lines.
 * 
 * MIGRATION NOTES:
 * - Response format changed from { logs, total, page, limit, totalPages } 
 *   to { logs, pagination: { page, limit, total, totalPages } }
 * - Frontend needs to be updated to handle new response format
 * - This serves as a reference implementation for other entities
 * 
 * HOW TO USE THIS PATTERN FOR OTHER ENTITIES:
 * 1. Import createAuditRouter from lib/auditRouterFactory
 * 2. Import getEntityConfig from config/entityAuditConfig
 * 3. Get entity config: const config = getEntityConfig('entityName')
 * 4. Create router: const router = createAuditRouter('entityName', config, options)
 * 5. Export router
 */

const { createAuditRouter } = require('../../lib/auditRouterFactory');
const { getEntityConfig } = require('../../config/entityAuditConfig');

// Get variables configuration from central config
const variablesConfig = getEntityConfig('variable');

// Create router using factory with custom path options
// The factory generates standard endpoints with configurable path names:
// - GET /variable/:variableId - Get audit logs for specific entity
// - GET /variables - Get all audit logs for entity type
module.exports = createAuditRouter('variable', variablesConfig, {
  singularPath: 'variableId',
  globalPath: 'variables',
  singularPrefix: 'variable',
  globalPrefix: ''
});
