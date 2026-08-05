/**
 * Audit Search Builder Utility
 * 
 * PURPOSE: This utility builds MongoDB search queries for audit logs.
 * It performs case-insensitive regex search across configured metadata fields.
 * This allows users to search for audit logs by user name, entity name, etc.
 * 
 * USAGE EXAMPLE:
 * const searchQuery = buildSearchQuery('john', config)
 * // Returns: { $or: [{ 'metadata.userName': /john/i }, { 'metadata.name': /john/i }, ...] }
 * 
 * SEARCH PATTERNS:
 * - Case-insensitive: 'John' matches 'john', 'JOHN', 'John'
 * - Partial match: 'john' matches 'john doe', 'johnny'
 * - Multi-field: Searches across all configured metadata fields
 */

/**
 * Builds a MongoDB search query for audit logs
 * 
 * USAGE:
 * buildSearchQuery('john', config)
 * // Returns: { $or: [{ 'metadata.userName': /john/i }, { 'metadata.name': /john/i }, ...] }
 * 
 * buildSearchQuery('', config)
 * // Returns: null (no search if empty)
 * 
 * This function:
 * 1. Validates that search term is non-empty
 * 2. Creates case-insensitive regex from search term
 * 3. Builds $or condition across all configured search fields
 * 4. Also searches eventType for searching by event type name
 * 
 * @param {string|null} search - Search term to filter by
 * @param {object} config - Entity configuration object from entityAuditConfig.js
 * @returns {object|null} - MongoDB search query object, or null if search is empty
 */
function buildSearchQuery(search, config) {
  // Return null if search is empty or whitespace
  // This allows the caller to skip adding the search filter
  if (!search || !search.trim()) {
    return null;
  }
  
  // Create case-insensitive regex from search term
  // 'i' flag makes it case-insensitive
  // Trim removes leading/trailing whitespace
  const searchRegex = new RegExp(search.trim(), 'i');
  
  // Get search fields from config
  // Examples: ['userName', 'name', 'updatedByName'] for variables
  // Examples: ['userName', 'businessName'] for applications
  const searchFields = config.searchFields || [];
  
  // Build $or condition for search
  // This searches across all configured metadata fields
  // Also includes eventType for searching by event type name
  const searchConditions = searchFields.map(field => ({
    [`metadata.${field}`]: searchRegex
  })).concat({ eventType: searchRegex });
  
  return {
    $or: searchConditions
  };
}

/**
 * Builds a search query with specific fields (overrides config)
 * 
 * USAGE:
 * buildSearchQueryWithFields('john', ['userName', 'name'])
 * // Returns: { $or: [{ 'metadata.userName': /john/i }, { 'metadata.name': /john/i }] }
 * 
 * Use this when you want to search across specific fields
 * instead of using the configured search fields.
 * 
 * @param {string|null} search - Search term to filter by
 * @param {Array<string>} fields - Array of metadata field names to search
 * @returns {object|null} - MongoDB search query object, or null if search is empty
 */
function buildSearchQueryWithFields(search, fields) {
  // Return null if search is empty or whitespace
  if (!search || !search.trim()) {
    return null;
  }
  
  // Return null if no fields provided
  if (!fields || fields.length === 0) {
    return null;
  }
  
  // Create case-insensitive regex
  const searchRegex = new RegExp(search.trim(), 'i');
  
  // Build $or condition for specified fields
  const searchConditions = fields.map(field => ({
    [`metadata.${field}`]: searchRegex
  }));
  
  return {
    $or: searchConditions
  };
}

/**
 * Validates a search term
 * 
 * USAGE:
 * validateSearchTerm('john') // { valid: true }
 * validateSearchTerm('') // { valid: false, error: 'Search term cannot be empty' }
 * validateSearchTerm('a') // { valid: false, error: 'Search term must be at least 2 characters' }
 * 
 * @param {string} search - Search term to validate
 * @param {number} minLength - Minimum length requirement (default: 2)
 * @returns {object} - Validation result with valid boolean and optional error message
 */
function validateSearchTerm(search, minLength = 2) {
  if (!search || !search.trim()) {
    return { valid: false, error: 'Search term cannot be empty' };
  }
  
  if (search.trim().length < minLength) {
    return { valid: false, error: `Search term must be at least ${minLength} characters` };
  }
  
  return { valid: true };
}

/**
 * Escapes special regex characters in a search term
 * 
 * USAGE:
 * escapeRegexSearch('john+doe') // 'john\\+doe'
 * 
 * This prevents regex injection attacks and ensures special characters
 * are treated as literal characters in the search.
 * 
 * @param {string} search - Search term to escape
 * @returns {string} - Escaped search term safe for regex
 */
function escapeRegexSearch(search) {
  // Escape special regex characters: . * + ? ^ $ { } ( ) | [ ] \
  const specialChars = /[.*+?^${}()|[\]\\]/g;
  return search.replace(specialChars, '\\$&');
}

module.exports = {
  buildSearchQuery,
  buildSearchQueryWithFields,
  validateSearchTerm,
  escapeRegexSearch,
};
