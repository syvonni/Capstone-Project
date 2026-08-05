const logger = require("./logger");
const { logAuditEvent } = require("./auditClient");

/**
 * Error Tracking Service
 * Centralized error tracking and alerting
 */

class ErrorTrackingService {
  constructor() {
    this.errorCounts = new Map(); // Track error frequency
    this.criticalErrors = []; // Store recent critical errors
    this.maxStoredErrors = 100;
    this.alertThresholds = {
      errorRate: 10, // Errors per minute
      criticalErrors: 5, // Critical errors per hour
    };
  }

  /**
   * Track an error
   */
  async trackError(error, context = {}) {
    const errorKey = `${error.name || "Error"}:${error.message || "Unknown"}`;
    const now = Date.now();

    // Increment error count
    if (!this.errorCounts.has(errorKey)) {
      this.errorCounts.set(errorKey, {
        count: 0,
        firstSeen: now,
        lastSeen: now,
      });
    }
    const errorInfo = this.errorCounts.get(errorKey);
    errorInfo.count++;
    errorInfo.lastSeen = now;

    // Determine error severity
    const severity = this.determineSeverity(error, context);

    // Log error with structured logging
    logger.error("Error tracked", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      context,
      severity,
      correlationId: context.correlationId,
      userId: context.userId,
      request: context.request,
    });

    // Store critical errors
    if (severity === "critical" || severity === "high") {
      this.storeCriticalError(error, context, severity);
    }

    // Check if alerting is needed
    await this.checkAlertThresholds(context);

    // Log to audit trail for critical errors
    if (severity === "critical" && context.userId) {
      try {
        await logAuditEvent(
          context.userId,
          "error_critical",
          "SecurityEvent",
          context.userId,
          {
            role: context.role || "system",
            fieldChanged: "system",
            oldValue: null,
            newValue: null,
            errorName: error.name,
            errorCode: error.code,
            severity,
            correlationId: context.correlationId,
            stack: error.stack?.substring(0, 500),
          },
        );
      } catch (auditError) {
        logger.error("Failed to log critical error to audit trail", {
          error: auditError,
        });
      }
    }
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context) {
    // Database connection errors are critical
    if (error.name === "MongoError" || error.name === "MongooseError") {
      return "critical";
    }

    // Authentication/authorization errors are high severity
    if (
      error.code === "unauthorized" ||
      error.code === "forbidden" ||
      error.code === "token_invalidated"
    ) {
      return "high";
    }

    // Validation errors are low severity
    if (error.isJoi || error.name === "ValidationError") {
      return "low";
    }

    // Rate limiting errors are medium severity
    if (error.code === "rate_limit_exceeded") {
      return "medium";
    }

    // 5xx errors are high severity
    if (context.statusCode && context.statusCode >= 500) {
      return "high";
    }

    // 4xx errors are medium severity
    if (context.statusCode && context.statusCode >= 400) {
      return "medium";
    }

    // Default to medium
    return "medium";
  }

  /**
   * Store critical error
   */
  storeCriticalError(error, context, severity) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
      },
      context,
      severity,
    };

    this.criticalErrors.push(errorEntry);

    // Keep only recent errors
    if (this.criticalErrors.length > this.maxStoredErrors) {
      this.criticalErrors.shift();
    }
  }

  /**
   * Check if alert thresholds are exceeded
   */
  async checkAlertThresholds(context) {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Count errors in last minute
    let recentErrorCount = 0;
    for (const [key, info] of this.errorCounts.entries()) {
      if (info.lastSeen > oneMinuteAgo) {
        recentErrorCount += info.count;
      }
    }

    // Count critical errors in last hour
    const recentCriticalErrors = this.criticalErrors.filter(
      (e) => new Date(e.timestamp).getTime() > oneHourAgo,
    ).length;

    // Alert on high error rate
    if (recentErrorCount > this.alertThresholds.errorRate) {
      logger.warn("High error rate detected", {
        errorRate: recentErrorCount,
        threshold: this.alertThresholds.errorRate,
        correlationId: context.correlationId,
      });

      // TODO: Send alert notification (email, Slack, etc.)
      await this.sendAlert("high_error_rate", {
        errorRate: recentErrorCount,
        threshold: this.alertThresholds.errorRate,
      });
    }

    // Alert on critical errors
    if (recentCriticalErrors > this.alertThresholds.criticalErrors) {
      logger.warn("High critical error count detected", {
        criticalErrorCount: recentCriticalErrors,
        threshold: this.alertThresholds.criticalErrors,
        correlationId: context.correlationId,
      });

      await this.sendAlert("high_critical_errors", {
        criticalErrorCount: recentCriticalErrors,
        threshold: this.alertThresholds.criticalErrors,
      });
    }
  }

  /**
   * Send alert notification
   * TODO: Integrate with email/Slack/PagerDuty/etc.
   */
  async sendAlert(alertType, details) {
    logger.warn(`Alert: ${alertType}`, {
      alert: {
        type: alertType,
        details,
        timestamp: new Date().toISOString(),
      },
    });

    // Future: Send email/Slack notification
    // const notificationService = require('./notificationService');
    // await notificationService.sendAdminAlert('system', alertType, details);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let errorsLastHour = 0;
    let errorsLastDay = 0;

    for (const [key, info] of this.errorCounts.entries()) {
      if (info.lastSeen > oneHourAgo) {
        errorsLastHour += info.count;
      }
      if (info.lastSeen > oneDayAgo) {
        errorsLastDay += info.count;
      }
    }

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce(
        (sum, info) => sum + info.count,
        0,
      ),
      errorsLastHour,
      errorsLastDay,
      criticalErrorsLastHour: this.criticalErrors.filter(
        (e) => new Date(e.timestamp).getTime() > oneHourAgo,
      ).length,
      uniqueErrorTypes: this.errorCounts.size,
    };
  }

  /**
   * Clear old error data
   */
  clearOldData() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Remove old error counts
    for (const [key, info] of this.errorCounts.entries()) {
      if (info.lastSeen < oneDayAgo) {
        this.errorCounts.delete(key);
      }
    }

    // Remove old critical errors
    this.criticalErrors = this.criticalErrors.filter(
      (e) => new Date(e.timestamp).getTime() > oneDayAgo,
    );
  }
}

// Create singleton instance
const errorTracking = new ErrorTrackingService();

// Clean up old data every hour (skip in test mode)
if (process.env.NODE_ENV !== "test") {
  setInterval(
    () => {
      errorTracking.clearOldData();
    },
    60 * 60 * 1000,
  );
}

module.exports = errorTracking;
