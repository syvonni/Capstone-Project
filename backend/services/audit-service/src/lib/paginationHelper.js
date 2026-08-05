/**
 * Pagination Helper Utility
 * 
 * PURPOSE: This utility handles all pagination logic for audit endpoints.
 * It eliminates the need to duplicate pagination code across multiple router files.
 * It handles edge cases like invalid page numbers, invalid limits, and calculates
 * the skip value for MongoDB queries.
 * 
 * USAGE EXAMPLE:
 * const { page, limit, skip } = parsePagination(req, 20, 50)
 * const pagination = buildPaginationResponse(page, limit, total)
 * 
 * EDGE CASES HANDLED:
 * - Invalid page numbers (0, -1, non-numeric) -> defaults to 1
 * - Invalid limits (0, negative, non-numeric) -> defaults to defaultLimit
 * - Limits exceeding maxLimit -> capped at maxLimit
 * - Negative skip values -> handled by page validation
 */

/**
 * Parses pagination parameters from a request
 * 
 * USAGE:
 * parsePagination(req, 20, 50) // uses defaults: limit=20, maxLimit=50
 * parsePagination(req, 10, 100) // custom defaults: limit=10, maxLimit=100
 * 
 * @param {object} req - Express request object
 * @param {number} defaultLimit - Default limit if not provided (default: 20)
 * @param {number} maxLimit - Maximum allowed limit (default: 50)
 * @returns {object} - Object with page, limit, and skip values
 */
function parsePagination(req, defaultLimit = 20, maxLimit = 50) {
  // Parse page number from query, default to 1 if invalid
  // Handles: undefined, 0, negative numbers, non-numeric strings
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  
  // Parse limit from query, default to defaultLimit if invalid
  // Handles: undefined, 0, negative numbers, non-numeric strings
  // Caps at maxLimit to prevent excessive data retrieval
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(req.query.limit, 10) || defaultLimit)
  );
  
  // Calculate skip value for MongoDB queries
  // Skip = (page - 1) * limit
  // Example: page=2, limit=20 -> skip=20 (skip first 20 results)
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Builds a standardized pagination response object
 * 
 * USAGE:
 * buildPaginationResponse(1, 20, 100) // { page: 1, limit: 20, total: 100, totalPages: 5 }
 * buildPaginationResponse(2, 50, 150) // { page: 2, limit: 50, total: 150, totalPages: 3 }
 * 
 * @param {number} page - Current page number
 * @param {number} limit - Number of items per page
 * @param {number} total - Total number of items
 * @returns {object} - Pagination object with page, limit, total, totalPages
 */
function buildPaginationResponse(page, limit, total) {
  // Calculate total pages
  // Math.ceil rounds up to ensure all items are included
  // Example: total=45, limit=20 -> totalPages=3 (20+20+5)
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

/**
 * Validates pagination parameters
 * 
 * USAGE:
 * validatePagination(1, 20) // { valid: true }
 * validatePagination(0, 20) // { valid: false, error: 'Page must be at least 1' }
 * validatePagination(1, 0) // { valid: false, error: 'Limit must be at least 1' }
 * 
 * @param {number} page - Page number to validate
 * @param {number} limit - Limit to validate
 * @param {number} maxLimit - Maximum allowed limit (default: 50)
 * @returns {object} - Validation result with valid boolean and optional error message
 */
function validatePagination(page, limit, maxLimit = 50) {
  if (page < 1) {
    return { valid: false, error: 'Page must be at least 1' };
  }
  
  if (limit < 1) {
    return { valid: false, error: 'Limit must be at least 1' };
  }
  
  if (limit > maxLimit) {
    return { valid: false, error: `Limit cannot exceed ${maxLimit}` };
  }
  
  return { valid: true };
}

module.exports = {
  parsePagination,
  buildPaginationResponse,
  validatePagination,
};
