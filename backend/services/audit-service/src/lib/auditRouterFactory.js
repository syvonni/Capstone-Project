/**
 * Generic Audit Router Factory
 * 
 * PURPOSE: This factory function generates Express routers for audit endpoints.
 * It eliminates the need to write duplicate router code for each entity type.
 * It uses the entity configuration to determine permissions, event types, and metadata fields.
 * 
 * USAGE EXAMPLE (for implementing audit for other entities):
 * 
 * // In routes/audit/variables.js:
 * const { createAuditRouter } = require('../../lib/auditRouterFactory')
 * const { getEntityConfig } = require('../../config/entityAuditConfig')
 * 
 * const variablesConfig = getEntityConfig('variable')
 * module.exports = createAuditRouter('variable', variablesConfig)
 * 
 * // In routes/audit/fees.js:
 * const { createAuditRouter } = require('../../lib/auditRouterFactory')
 * const { getEntityConfig } = require('../../config/entityAuditConfig')
 * 
 * const feesConfig = getEntityConfig('fee')
 * module.exports = createAuditRouter('fee', feesConfig)
 * 
 * GENERATED ENDPOINTS:
 * - GET /:id - Get audit logs for a specific entity (singular view)
 * - GET /global - Get all audit logs for entity type (global view)
 * 
 * The factory automatically handles:
 * - Pagination
 * - Event type filtering
 * - Date range filtering
 * - Search functionality
 * - Permission checking
 * - Error handling
 * - Response formatting
 */

const express = require('express');
const { requireJwt, requireRole } = require('../middleware/auth');
const { parsePagination, buildPaginationResponse } = require('./paginationHelper');
const { buildEntityFilter, buildGlobalFilter } = require('./auditFilterBuilder');
const { buildSuccessResponse } = require('./auditResponseBuilder');
const { handleAuditError } = require('./auditErrorHandler');
const logger = require('../lib/logger');
const AuditLog = require('../models/AuditLog');

/**
 * Creates an Express router for audit endpoints for a specific entity type
 * 
 * USAGE:
 * createAuditRouter('variable', variablesConfig)
 * // Returns Express router with GET /:id and GET /global endpoints
 * 
 * createAuditRouter('variable', variablesConfig, { 
 *   singularPath: 'variableId', 
 *   globalPath: 'variables',
 *   singularPrefix: 'variable',
 *   globalPrefix: ''  // No prefix for global endpoint
 * })
 * // Returns Express router with GET /variable/:variableId and GET /variables endpoints
 * 
 * The generated router:
 * 1. Uses entity config for permissions, event types, metadata fields
 * 2. Handles pagination automatically
 * 3. Supports filtering by event type, date range, and search
 * 4. Returns standardized response format
 * 5. Handles errors consistently
 * 
 * @param {string} entityType - The entity type (singular, lowercase, e.g., 'variable', 'fee')
 * @param {object} config - Entity configuration object from entityAuditConfig.js
 * @param {object} options - Optional configuration for path names
 * @param {string} options.singularPath - Parameter name for singular endpoint (default: 'id')
 * @param {string} options.globalPath - Path for global endpoint (default: 'global')
 * @param {string} options.singularPrefix - Path prefix for singular endpoint (default: '')
 * @param {string} options.globalPrefix - Path prefix for global endpoint (default: '')
 * @returns {object} - Express router with audit endpoints
 */
function createAuditRouter(entityType, config, options = {}) {
  const router = express.Router();
  const { 
    singularPath = 'id', 
    globalPath = 'global',
    singularPrefix = '',
    globalPrefix = ''
  } = options;
  
  // GET /:id - Get audit logs for a specific entity (singular view)
  // 
  // This endpoint fetches audit logs for a single entity instance.
  // Example: GET /api/audit/variable/123 gets all audit logs for variable with ID 123
  //
  // Query parameters:
  // - page: Page number (default: 1)
  // - limit: Items per page (default: 20, max: 50)
  //
  // Response format:
  // {
  //   success: true,
  //   logs: [...],
  //   pagination: { page, limit, total, totalPages }
  // }
  router.get(`${singularPrefix ? '/' + singularPrefix : ''}/:${singularPath}`, requireJwt, requireRole(config.permissions), async (req, res) => {
    try {
      const { [singularPath]: id } = req.params;
      
      // Parse pagination parameters
      const { page, limit, skip } = parsePagination(req);
      
      // Build filter for this specific entity
      // This handles the complexity of different entities storing their ID
      // in different metadata fields (variableId, applicationId, etc.)
      const filter = buildEntityFilter(id, entityType, config);
      
      // Fetch audit logs and total count in parallel
      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 }) // Most recent first
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter)
      ]);
      
      // Build pagination response
      const pagination = buildPaginationResponse(page, limit, total);
      
      // Return standardized success response
      return res.json(buildSuccessResponse(logs, pagination));
    } catch (err) {
      // Handle error with consistent logging and response format
      return handleAuditError(err, res, logger, { entityType, endpoint: 'singular' });
    }
  });
  
  // GET /global - Get all audit logs for entity type (global view)
  //
  // This endpoint fetches all audit logs for an entity type across all instances.
  // Example: GET /api/audit/variables gets all variable audit logs
  //
  // Query parameters:
  // - page: Page number (default: 1)
  // - limit: Items per page (default: 20, max: 50)
  // - eventType: Filter by specific event type (optional)
  // - startDate: Filter by start date (ISO string, optional)
  // - endDate: Filter by end date (ISO string, optional)
  // - search: Search term for metadata fields (optional)
  //
  // Response format:
  // {
  //   success: true,
  //   logs: [...],
  //   pagination: { page, limit, total, totalPages }
  // }
  router.get(`${globalPrefix ? '/' + globalPrefix : ''}/${globalPath}`, requireJwt, requireRole(config.permissions), async (req, res) => {
    try {
      // Parse pagination parameters
      const { page, limit, skip } = parsePagination(req);
      
      // Parse filter parameters
      const eventType = req.query.eventType;
      const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
      const search = req.query.search;
      
      // Build filter using the convenience function
      // This combines event type, date range, and search filters
      const filter = buildGlobalFilter(config, {
        eventType,
        startDate,
        endDate,
        search,
      });
      
      // Fetch audit logs and total count in parallel
      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 }) // Most recent first
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter)
      ]);
      
      // Build pagination response
      const pagination = buildPaginationResponse(page, limit, total);
      
      // Return standardized success response
      return res.json(buildSuccessResponse(logs, pagination));
    } catch (err) {
      // Handle error with consistent logging and response format
      return handleAuditError(err, res, logger, { entityType, endpoint: 'global' });
    }
  });
  
  return router;
}

/**
 * Creates an audit router with custom endpoints
 * 
 * USAGE:
 * createAuditRouterWithCustomEndpoints('variable', variablesConfig, (router) => {
 *   // Add custom endpoints here
 *   router.get('/custom', customHandler)
 * })
 * 
 * Use this when you need to add custom endpoints in addition to the standard ones.
 * 
 * @param {string} entityType - The entity type
 * @param {object} config - Entity configuration object
 * @param {function} customizer - Function that receives the router for customization
 * @returns {object} - Express router with standard and custom endpoints
 */
function createAuditRouterWithCustomEndpoints(entityType, config, customizer) {
  // Create standard router
  const router = createAuditRouter(entityType, config);
  
  // Apply customizations
  if (typeof customizer === 'function') {
    customizer(router);
  }
  
  return router;
}

module.exports = {
  createAuditRouter,
  createAuditRouterWithCustomEndpoints,
};
