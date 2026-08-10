const logger = require("../lib/logger");
const errorTracking = require("../lib/errorTracking");
const respond = require("./respond");

/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and provides consistent error responses
 */
function errorHandlerMiddleware(err, req, res, next) {
  // Extract correlation ID from request
  const correlationId = req.correlationId;
  const userId = req._userId;

  // Log error with structured logging
  logger.error("Unhandled error in request", {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    correlationId,
    userId,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    },
  });

  // Track error
  errorTracking.trackError(err, {
    correlationId,
    userId,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
    statusCode: err.statusCode || 500,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Create safe error response
  const isProduction = process.env.NODE_ENV === "production";
  const errorResponse = {
    error: {
      code: err.code || "server_error",
      message:
        isProduction && statusCode >= 500
          ? "An unexpected error occurred. Please try again later."
          : err.message || "An unexpected error occurred.",
    },
  };

  // Include correlation ID in response
  if (correlationId) {
    errorResponse.correlationId = correlationId;
  }

  // Include error details in development
  if (!isProduction && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandlerMiddleware;
