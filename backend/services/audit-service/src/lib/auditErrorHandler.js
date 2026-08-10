/**
 * Audit Error Handler Utility
 *
 * PURPOSE: This utility standardizes error handling across all audit endpoints.
 * It ensures consistent error logging, error response format, and error codes.
 * This makes debugging easier and provides a better developer experience.
 *
 * USAGE EXAMPLE:
 * try {
 *   // ... audit logic
 * } catch (err) {
 *   return handleAuditError(err, res, logger, { entityType: 'variable' })
 * }
 *
 * ERROR HANDLING:
 * - Logs error with context (entity type, user ID, etc.)
 * - Returns standardized error response
 * - Uses consistent error code: 'audit_fetch_error'
 */

/**
 * Handles audit endpoint errors with consistent logging and response format
 *
 * USAGE:
 * handleAuditError(err, res, logger, { entityType: 'variable', userId: '123' })
 *
 * This function:
 * 1. Logs the error with context (entity type, user ID, etc.)
 * 2. Returns a standardized error response
 * 3. Uses a consistent error code for all audit errors
 *
 * @param {Error} err - The error object
 * @param {object} res - Express response object
 * @param {object} logger - Logger instance (e.g., from lib/logger)
 * @param {object} context - Additional context to include in error log
 * @returns {object} - Error response sent to client
 */
function handleAuditError(err, res, logger, context = {}) {
  // Log the error with context
  // Context helps with debugging by providing additional information
  // about what entity type, user, or operation caused the error
  logger.error("Audit endpoint error", {
    error: err.message,
    stack: err.stack,
    ...context,
  });

  // Return standardized error response
  // Status code 500 for server errors
  // Error code 'audit_fetch_error' for all audit-related errors
  // This allows frontend to handle audit errors consistently
  return res.status(500).json({
    success: false,
    error: {
      code: "audit_fetch_error",
      message: "Failed to fetch audit logs",
    },
  });
}

/**
 * Handles audit endpoint errors with custom error code and message
 *
 * USAGE:
 * handleAuditErrorWithCustomMessage(err, res, logger, 'not_found', 'Audit log not found', { auditLogId: '123' })
 *
 * Use this when you need a specific error code or message for a particular error scenario.
 *
 * @param {Error} err - The error object
 * @param {object} res - Express response object
 * @param {object} logger - Logger instance
 * @param {string} errorCode - Custom error code
 * @param {string} message - Custom error message
 * @param {object} context - Additional context to include in error log
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {object} - Error response sent to client
 */
function handleAuditErrorWithCustomMessage(
  err,
  res,
  logger,
  errorCode,
  message,
  context = {},
  statusCode = 500,
) {
  // Log the error with context
  logger.error("Audit endpoint error", {
    error: err.message,
    stack: err.stack,
    errorCode,
    ...context,
  });

  // Return custom error response
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
    },
  });
}

/**
 * Handles validation errors with 400 status code
 *
 * USAGE:
 * handleValidationError(res, logger, 'Invalid page number', { page: 'abc' })
 *
 * Use this for client-side validation errors (invalid parameters, etc.)
 *
 * @param {object} res - Express response object
 * @param {object} logger - Logger instance
 * @param {string} message - Validation error message
 * @param {object} context - Additional context to include in error log
 * @returns {object} - Error response sent to client
 */
function handleValidationError(res, logger, message, context = {}) {
  // Log validation error
  logger.warn("Audit validation error", {
    message,
    ...context,
  });

  // Return 400 Bad Request error
  return res.status(400).json({
    success: false,
    error: {
      code: "validation_error",
      message,
    },
  });
}

/**
 * Handles not found errors with 404 status code
 *
 * USAGE:
 * handleNotFoundError(res, logger, 'Audit log not found', { auditLogId: '123' })
 *
 * Use this when a requested resource is not found
 *
 * @param {object} res - Express response object
 * @param {object} logger - Logger instance
 * @param {string} message - Not found error message
 * @param {object} context - Additional context to include in error log
 * @returns {object} - Error response sent to client
 */
function handleNotFoundError(res, logger, message, context = {}) {
  // Log not found error
  logger.warn("Audit not found error", {
    message,
    ...context,
  });

  // Return 404 Not Found error
  return res.status(404).json({
    success: false,
    error: {
      code: "not_found",
      message,
    },
  });
}

/**
 * Handles forbidden errors with 403 status code
 *
 * USAGE:
 * handleForbiddenError(res, logger, 'Insufficient permissions', { userId: '123', requiredRole: 'admin' })
 *
 * Use this when a user doesn't have permission to access a resource
 *
 * @param {object} res - Express response object
 * @param {object} logger - Logger instance
 * @param {string} message - Forbidden error message
 * @param {object} context - Additional context to include in error log
 * @returns {object} - Error response sent to client
 */
function handleForbiddenError(res, logger, message, context = {}) {
  // Log forbidden error
  logger.warn("Audit forbidden error", {
    message,
    ...context,
  });

  // Return 403 Forbidden error
  return res.status(403).json({
    success: false,
    error: {
      code: "forbidden",
      message,
    },
  });
}

module.exports = {
  handleAuditError,
  handleAuditErrorWithCustomMessage,
  handleValidationError,
  handleNotFoundError,
  handleForbiddenError,
};
