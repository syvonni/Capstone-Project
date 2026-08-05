/**
 * Audit Response Builder Utility
 * 
 * PURPOSE: This utility standardizes the response format for all audit endpoints.
 * It ensures consistent response structure across all entity types, making it easier
 * for the frontend to parse and display audit logs.
 * 
 * USAGE EXAMPLE:
 * const response = buildSuccessResponse(logs, pagination)
 * const errorResponse = buildErrorResponse('audit_fetch_error', 'Failed to fetch audit logs')
 * 
 * RESPONSE FORMAT:
 * Success: { success: true, logs: [...], pagination: { page, limit, total, totalPages }, ...meta }
 * Error: { success: false, error: { code, message } }
 */

/**
 * Builds a standardized success response for audit endpoints
 * 
 * USAGE:
 * buildSuccessResponse(logs, { page: 1, limit: 20, total: 100, totalPages: 5 })
 * // Returns: { success: true, logs: [...], pagination: { page: 1, limit: 20, total: 100, totalPages: 5 } }
 * 
 * buildSuccessResponse(logs, pagination, { additionalField: 'value' })
 * // Returns: { success: true, logs: [...], pagination: {...}, additionalField: 'value' }
 * 
 * @param {Array} logs - Array of audit log objects
 * @param {object} pagination - Pagination object with page, limit, total, totalPages
 * @param {object} meta - Optional additional metadata to include in response
 * @returns {object} - Standardized success response object
 */
function buildSuccessResponse(logs, pagination, meta = {}) {
  return {
    success: true,
    logs,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
    },
    ...meta,
  };
}

/**
 * Builds a standardized error response for audit endpoints
 * 
 * USAGE:
 * buildErrorResponse('audit_fetch_error', 'Failed to fetch audit logs')
 * // Returns: { success: false, error: { code: 'audit_fetch_error', message: 'Failed to fetch audit logs' } }
 * 
 * buildErrorResponse('not_found', 'Audit log not found', 404)
 * // Returns: { success: false, error: { code: 'not_found', message: 'Audit log not found' } }
 * 
 * @param {string} errorCode - Error code for client-side error handling
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code (for reference, not included in response)
 * @returns {object} - Standardized error response object
 */
function buildErrorResponse(errorCode, message, statusCode = 500) {
  return {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };
}

/**
 * Builds a response with data (for non-audit endpoints that need consistent format)
 * 
 * USAGE:
 * buildDataResponse({ auditLogId: '123', hash: 'abc' })
 * // Returns: { success: true, data: { auditLogId: '123', hash: 'abc' } }
 * 
 * @param {object} data - Data to include in response
 * @param {object} meta - Optional additional metadata
 * @returns {object} - Standardized data response object
 */
function buildDataResponse(data, meta = {}) {
  return {
    success: true,
    data,
    ...meta,
  };
}

/**
 * Validates that a response object has the expected structure
 * 
 * USAGE:
 * validateSuccessResponse(response) // returns true if valid
 * validateErrorResponse(response) // returns true if valid error response
 * 
 * @param {object} response - Response object to validate
 * @param {string} type - Type of response to validate ('success' or 'error')
 * @returns {boolean} - True if response has expected structure
 */
function validateResponse(response, type = 'success') {
  if (type === 'success') {
    return (
      response &&
      response.success === true &&
      Array.isArray(response.logs) &&
      response.pagination &&
      typeof response.pagination.page === 'number' &&
      typeof response.pagination.limit === 'number' &&
      typeof response.pagination.total === 'number' &&
      typeof response.pagination.totalPages === 'number'
    );
  } else if (type === 'error') {
    return (
      response &&
      response.success === false &&
      response.error &&
      typeof response.error.code === 'string' &&
      typeof response.error.message === 'string'
    );
  }
  return false;
}

module.exports = {
  buildSuccessResponse,
  buildErrorResponse,
  buildDataResponse,
  validateResponse,
};
