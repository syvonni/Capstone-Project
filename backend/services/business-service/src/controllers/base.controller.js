/**
 * Base Controller Class
 *
 * PURPOSE: Provides common functionality for all controllers to reduce code duplication
 * and ensure consistent error handling, response formatting, and request processing.
 *
 * RESPONSIBILITIES:
 * - Standardize error handling across all controllers
 * - Provide common request/response methods
 * - Integrate with respond middleware for consistent response shapes
 * - Handle request validation and preprocessing
 *
 * USAGE:
 * class FeeController extends BaseController {
 *   async list(req, res) {
 *     return await this.handleRequest(req, res, async () => {
 *       const fees = await feeService.list(req.query);
 *       return fees;
 *     });
 *   }
 * }
 */

// No longer need respond middleware - using direct responses

class BaseController {
  constructor(service) {
    this.service = service;
  }

  /**
   * Handles a request with standardized error handling and response formatting
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function to execute
   * @param {Object} options - Optional configuration
   * @param {number} options.successStatus - HTTP status code for success (default: 200)
   * @returns {Promise<Object>} - Express response
   */
  async handleRequest(req, res, operation, options = {}) {
    const { successStatus = 200 } = options;

    try {
      const result = await operation.call(this, req, res);
      return res.status(successStatus).json(result);
    } catch (err) {
      return this.handleError(req, res, err);
    }
  }

  /**
   * Handles errors in a standardized way
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Error} err - Error object
   * @returns {Object} - Express response
   */
  handleError(req, res, err) {
    console.error(`${this.constructor.name} error:`, err);

    // Determine error code and status
    let errorCode = "INTERNAL";
    let statusCode = 500;
    let message = "An error occurred";

    // Handle specific error types
    if (err.name === "ValidationError") {
      errorCode = "VALIDATION_ERROR";
      statusCode = 400;
      message = err.message || "Validation failed";
    } else if (err.name === "CastError") {
      errorCode = "INVALID_ID";
      statusCode = 400;
      message = "Invalid ID format";
    } else if (err.name === "MongoError" && err.code === 11000) {
      errorCode = "DUPLICATE";
      statusCode = 409;
      message = err.message || "Duplicate entry";
    } else if (err.code === "DUPLICATE") {
      errorCode = "DUPLICATE";
      statusCode = 409;
      message = err.message || "Duplicate entry";
    } else if (err.code === "NOT_FOUND") {
      errorCode = "NOT_FOUND";
      statusCode = 404;
      message = err.message || "Resource not found";
    } else if (err.code === "UNAUTHORIZED") {
      errorCode = "UNAUTHORIZED";
      statusCode = 401;
      message = err.message || "Unauthorized";
    } else if (err.code === "FORBIDDEN") {
      errorCode = "FORBIDDEN";
      statusCode = 403;
      message = err.message || "Forbidden";
    } else if (err.status) {
      // Use custom status if provided
      statusCode = err.status;
      errorCode = err.code || "ERROR";
      message = err.message || "An error occurred";
    }

    // Build error response (REST standard - no ok: false wrapper)
    const errorResponse = {
      error: {
        code: errorCode,
        message: message,
      },
    };

    // Add details in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.error.details = err.stack;
    }

    return res.status(statusCode).json(errorResponse);
  }

  /**
   * Extracts pagination parameters from request
   *
   * @param {Object} req - Express request object
   * @returns {Object} - Pagination parameters
   */
  getPagination(req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Extracts filter parameters from request
   *
   * @param {Object} req - Express request object
   * @param {Array} allowedFilters - Array of allowed filter field names
   * @returns {Object} - Filter object
   */
  getFilters(req, allowedFilters = []) {
    const filters = {};

    for (const filter of allowedFilters) {
      if (req.query[filter] !== undefined) {
        filters[filter] = req.query[filter];
      }
    }

    return filters;
  }

  /**
   * Extracts sort parameters from request
   *
   * @param {Object} req - Express request object
   * @param {string} defaultField - Default sort field
   * @param {string} defaultDirection - Default sort direction (1 or -1)
   * @returns {Object} - Sort object
   */
  getSort(req, defaultField = "createdAt", defaultDirection = -1) {
    const sortField = req.query.sortBy || defaultField;
    const sortDirection = req.query.sortOrder === "asc" ? 1 : -1;

    return { [sortField]: sortDirection };
  }

  /**
   * Validates required fields in request body
   *
   * @param {Object} body - Request body
   * @param {Array} requiredFields - Array of required field names
   * @throws {Error} - If required fields are missing
   */
  validateRequired(body, requiredFields) {
    const missing = requiredFields.filter(
      (field) =>
        body[field] === undefined || body[field] === null || body[field] === "",
    );

    if (missing.length > 0) {
      const error = new Error(`Missing required fields: ${missing.join(", ")}`);
      error.name = "ValidationError";
      error.code = "VALIDATION_ERROR";
      throw error;
    }
  }

  /**
   * Gets user ID from request (set by auth middleware)
   *
   * @param {Object} req - Express request object
   * @returns {string} - User ID
   */
  getUserId(req) {
    return req._userId || req.user?.id;
  }

  /**
   * Gets user role from request (set by auth middleware)
   *
   * @param {Object} req - Express request object
   * @returns {string} - User role
   */
  getUserRole(req) {
    return req._userRole || req.user?.role;
  }
}

module.exports = BaseController;
