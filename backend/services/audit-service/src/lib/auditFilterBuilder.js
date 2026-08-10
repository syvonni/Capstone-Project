/**
 * Audit Filter Builder Utility
 *
 * PURPOSE: This utility builds MongoDB filter objects for audit log queries.
 * It handles the complexity of filtering by entity ID, event type, date range, and search terms.
 * It uses the entity configuration to determine which metadata fields to search for entity IDs,
 * making it flexible across different entity types.
 *
 * USAGE EXAMPLE:
 * const filter = buildEntityFilter(entityId, entityType, config)
 * const filterWithDate = addDateRangeFilter(filter, startDate, endDate)
 * const filterWithEventType = addEventTypeFilter(filterWithDate, eventType, config)
 * const filterWithSearch = addSearchFilter(filterWithEventType, search, config)
 *
 * FILTER PATTERNS:
 * - Entity ID filter: Searches across multiple metadata fields (variableId, entityId, etc.)
 * - Event type filter: Filters by specific event type or array of event types
 * - Date range filter: Filters by createdAt date range
 * - Search filter: Case-insensitive regex search across configured metadata fields
 */

/**
 * Builds a MongoDB filter for fetching audit logs for a specific entity
 *
 * USAGE:
 * buildEntityFilter('123', 'variable', config)
 * // Returns: { $and: [{ $or: [{ 'metadata.variableId': '123' }, { entityId: '123' }] }, { eventType: { $in: [...] } }] }
 *
 * This handles the complexity of different entities storing their ID in different metadata fields.
 * For example, variables use 'metadata.variableId', while applications might use 'metadata.applicationId'.
 *
 * @param {string} entityId - The ID of the entity to filter by
 * @param {string} entityType - The entity type (used for logging/context)
 * @param {object} config - Entity configuration object from entityAuditConfig.js
 * @returns {object} - MongoDB filter object
 */
function buildEntityFilter(entityId, entityType, config) {
  // Get metadata field names from config
  // Examples: ['variableId', 'entityId'] for variables
  // Examples: ['applicationId', 'entityId', 'businessId'] for applications
  const metadataFields = config.metadataFields || ["entityId"];

  // Get event types from config
  // Examples: ['variable_created', 'variable_updated', ...]
  const eventTypes = config.eventTypes || [];

  // Build the $or condition for entity ID
  // This searches across all possible metadata field names where the entity ID might be stored
  // Also includes the direct entityId field for backward compatibility
  const entityIdConditions = metadataFields
    .map((field) => ({
      [`metadata.${field}`]: entityId,
    }))
    .concat({ entityId });

  // Build the complete filter
  // Uses $and to ensure both conditions are met:
  // 1. Entity ID matches (in any of the possible fields)
  // 2. Event type is one of the allowed types for this entity
  const filter = {
    $and: [
      {
        $or: entityIdConditions,
      },
      {
        eventType: { $in: eventTypes },
      },
    ],
  };

  return filter;
}

/**
 * Adds a date range filter to an existing filter object
 *
 * USAGE:
 * addDateRangeFilter(filter, '2024-01-01', '2024-12-31')
 * // Adds: { createdAt: { $gte: ISODate('2024-01-01'), $lte: ISODate('2024-12-31') } }
 *
 * Handles:
 * - Start date only: Filters for records after or on start date
 * - End date only: Filters for records before or on end date
 * - Both dates: Filters for records in the date range
 * - Neither date: No date filter added
 *
 * @param {object} filter - Existing filter object to modify
 * @param {string|Date|null} startDate - Start date (ISO string or Date object)
 * @param {string|Date|null} endDate - End date (ISO string or Date object)
 * @returns {object} - Modified filter object with date range filter
 */
function addDateRangeFilter(filter, startDate, endDate) {
  // Only add date filter if at least one date is provided
  if (startDate || endDate) {
    // Initialize createdAt filter object
    filter.createdAt = {};

    // Add start date condition if provided
    // $gte means "greater than or equal to"
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }

    // Add end date condition if provided
    // $lte means "less than or equal to"
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  return filter;
}

/**
 * Adds an event type filter to an existing filter object
 *
 * USAGE:
 * addEventTypeFilter(filter, 'variable_created', config)
 * // Changes eventType from { $in: [...] } to 'variable_created'
 *
 * This is used when a user wants to filter by a specific event type
 * instead of seeing all event types for an entity.
 *
 * @param {object} filter - Existing filter object to modify
 * @param {string|null} eventType - Specific event type to filter by
 * @param {object} config - Entity configuration object
 * @returns {object} - Modified filter object with event type filter
 */
function addEventTypeFilter(filter, eventType, config) {
  // Only add event type filter if:
  // 1. An event type is provided
  // 2. The event type is valid for this entity (checked against config)
  if (eventType && config.eventTypes.includes(eventType)) {
    // Override the $in filter with exact match
    filter.eventType = eventType;
  }

  return filter;
}

/**
 * Adds a search filter to an existing filter object
 *
 * USAGE:
 * addSearchFilter(filter, 'john', config)
 * // Adds: { $or: [{ 'metadata.userName': /john/i }, { 'metadata.name': /john/i }, ...] }
 *
 * Performs case-insensitive regex search across configured metadata fields.
 * This allows users to search for audit logs by user name, entity name, etc.
 *
 * @param {object} filter - Existing filter object to modify
 * @param {string|null} search - Search term to filter by
 * @param {object} config - Entity configuration object
 * @returns {object} - Modified filter object with search filter
 */
function addSearchFilter(filter, search, config) {
  // Only add search filter if a non-empty search term is provided
  if (search && search.trim()) {
    // Create case-insensitive regex from search term
    // 'i' flag makes it case-insensitive
    const searchRegex = new RegExp(search.trim(), "i");

    // Get search fields from config
    // Examples: ['userName', 'name', 'updatedByName'] for variables
    const searchFields = config.searchFields || [];

    // Build $or condition for search
    // Searches across all configured metadata fields
    // Also searches eventType for searching by event type name
    const searchConditions = searchFields
      .map((field) => ({
        [`metadata.${field}`]: searchRegex,
      }))
      .concat({ eventType: searchRegex });

    // Add $or condition to filter
    filter.$or = searchConditions;
  }

  return filter;
}

/**
 * Builds a complete filter for global audit view (all entities of a type)
 *
 * USAGE:
 * buildGlobalFilter(config, { eventType: 'variable_created', startDate: '2024-01-01', search: 'test' })
 *
 * This is a convenience function that combines all filter builders
 * for the global audit view endpoint.
 *
 * @param {object} config - Entity configuration object
 * @param {object} params - Query parameters (eventType, startDate, endDate, search)
 * @returns {object} - Complete MongoDB filter object
 */
function buildGlobalFilter(config, params = {}) {
  const { eventType, startDate, endDate, search } = params;

  // Start with base filter for entity type
  let filter = { eventType: { $in: config.eventTypes } };

  // Add optional filters
  filter = addEventTypeFilter(filter, eventType, config);
  filter = addDateRangeFilter(filter, startDate, endDate);
  filter = addSearchFilter(filter, search, config);

  return filter;
}

module.exports = {
  buildEntityFilter,
  addDateRangeFilter,
  addEventTypeFilter,
  addSearchFilter,
  buildGlobalFilter,
};
