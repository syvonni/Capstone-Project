/**
 * Entity Performance Monitoring Middleware for Admin Service
 *
 * PURPOSE: Express middleware that automatically tracks API performance metrics
 * for configured entities using the generic performance monitor. Records metrics
 * to MongoDB for persistent storage and analysis.
 *
 * USAGE:
 * const { entityPerformanceMiddleware } = require('./middleware/entityPerformanceMiddleware');
 * app.use(entityPerformanceMiddleware);
 */

const { recordMetric } = require("../../../../shared/lib/performanceMonitor");
const {
  shouldTrackOperation,
} = require("../../../../shared/lib/entityPerformanceConfig");

/**
 * Extracts entity type from request path
 *
 * USAGE:
 * extractEntityType('/api/admin/permit-forms') // returns 'permitForm'
 * extractEntityType('/api/admin/announcements') // returns 'announcement'
 *
 * @param {string} path - The request path
 * @returns {string|null} - The entity type or null if not found
 */
function extractEntityType(path) {
  const entityMap = {
    "/permit-forms": "permitForm",
    "/announcements": "announcement",
    "/users": "user",
    "/roles": "role",
    "/documents": "claimableDocument",
    "/tax-brackets": "taxBracket",
    "/variable-fee-rules": "variableFeeRule",
    "/penalty-rules": "penaltyRule",
  };

  for (const [pathSegment, entityType] of Object.entries(entityMap)) {
    if (path.includes(pathSegment)) {
      return entityType;
    }
  }

  return null;
}

/**
 * Entity performance monitoring middleware
 *
 * Automatically tracks API performance for configured entities
 */
function entityPerformanceMiddleware(req, res, next) {
  const startTime = Date.now();
  const entityType = extractEntityType(req.path);
  const operation = req.method;

  // Skip if entity type not found or operation not configured for tracking
  if (!entityType || !shouldTrackOperation(entityType, operation)) {
    return next();
  }

  // Track response finish
  res.on("finish", async () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;

    try {
      // Prepare error context if request failed
      let errorContext = null;
      if (!success) {
        // Basic error context from response status
        errorContext = {
          errorName: 'HttpError',
          errorMessage: `HTTP ${res.statusCode} Error`,
          errorCode: res.statusCode.toString(),
          severity: res.statusCode >= 500 ? 'high' : 'medium',
          correlationId: req.correlationId,
        };
      }

      // Record metric to database
      await recordMetric(
        entityType,
        operation,
        responseTime,
        success,
        req.path,
        req._userId || null,
        errorContext,
      );
    } catch (err) {
      // Don't block the request if recording fails
      console.error("Failed to record performance metric:", err);
    }
  });

  next();
}

module.exports = {
  entityPerformanceMiddleware,
  extractEntityType,
};
