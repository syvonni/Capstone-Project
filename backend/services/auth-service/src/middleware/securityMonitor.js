const logger = require("../lib/logger");
const errorTracking = require("../lib/errorTracking");
const { logAuditEvent } = require("../lib/auditClient");
const mongoose = require("mongoose");

/**
 * Security Monitoring Middleware
 * Detects and alerts on suspicious activity
 */

// Track security events
const securityEvents = {
  failedLogins: new Map(), // ip -> { count, lastAttempt, userIds }
  rateLimitViolations: new Map(), // ip -> { count, lastViolation }
  suspiciousRequests: [], // Array of suspicious request patterns
  maxStoredEvents: 1000,
};

/**
 * Track failed login attempt
 */
function trackFailedLogin(ip, userId = null) {
  if (!securityEvents.failedLogins.has(ip)) {
    securityEvents.failedLogins.set(ip, {
      count: 0,
      lastAttempt: null,
      userIds: new Set(),
    });
  }

  const event = securityEvents.failedLogins.get(ip);
  event.count++;
  event.lastAttempt = new Date();
  if (userId) {
    event.userIds.add(userId);
  }

  // Alert on multiple failed logins from same IP
  if (event.count >= 5) {
    logger.logSecurityEvent(
      "multiple_failed_logins",
      {
        ip,
        count: event.count,
        userIds: Array.from(event.userIds),
      },
      {
        severity: "high",
        correlationId: null,
      },
    );

    // Log to audit trail
    logSecurityEvent("multiple_failed_logins", {
      ip,
      count: event.count,
      userIds: Array.from(event.userIds),
    });
  }
}

/**
 * Track rate limit violation
 */
function trackRateLimitViolation(ip, endpoint) {
  const key = `${ip}:${endpoint}`;

  if (!securityEvents.rateLimitViolations.has(key)) {
    securityEvents.rateLimitViolations.set(key, {
      count: 0,
      lastViolation: null,
    });
  }

  const event = securityEvents.rateLimitViolations.get(key);
  event.count++;
  event.lastViolation = new Date();

  // Alert on repeated rate limit violations
  if (event.count >= 10) {
    logger.logSecurityEvent(
      "repeated_rate_limit_violations",
      {
        ip,
        endpoint,
        count: event.count,
      },
      {
        severity: "high",
        correlationId: null,
      },
    );

    logSecurityEvent("repeated_rate_limit_violations", {
      ip,
      endpoint,
      count: event.count,
    });
  }
}

/**
 * Detect suspicious request patterns
 */
function detectSuspiciousActivity(req) {
  const suspiciousPatterns = [];

  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /('|(\\')|(;)|(--)|(\/\*)|(\*\/)|(\+)|(\|)|(\&)|(\%)|(\$)|(\#)|(\@)|(\!)|(\?)|(\=)|(\()|(\))|(\[)|(\])|(\{)|(\})|(\\)|(\/)|(\*)|(\^)|(\~)|(\`)|(\<)|(\>)|(\:)|(\;)|(\,)|(\")|(\')|(\\)|(\/)|(\*)|(\^)|(\~)|(\`)|(\<)|(\>)|(\:)|(\;)|(\,)|(\")|(\'))/,
  ];

  // Check for XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
    /<iframe/i,
    /<img/i,
    /<svg/i,
  ];

  // Check request body, query, and params
  const checkValue = (value) => {
    if (typeof value === "string") {
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(value)) {
          suspiciousPatterns.push("sql_injection_attempt");
        }
      }
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          suspiciousPatterns.push("xss_attempt");
        }
      }
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(checkValue);
    }
  };

  if (req.body) checkValue(req.body);
  if (req.query) checkValue(req.query);
  if (req.params) checkValue(req.params);

  // Check for unusual user agent
  const userAgent = req.get("user-agent") || "";
  // Only check in non-test mode, or if explicitly testing user agent detection
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.TEST_USER_AGENT_DETECTION === "true"
  ) {
    if (!userAgent || userAgent.length < 10) {
      suspiciousPatterns.push("suspicious_user_agent");
    }
  }

  // Check for rapid requests from same IP
  const ip = req.ip || req.connection.remoteAddress;
  if (securityEvents.rateLimitViolations.has(`${ip}:${req.path}`)) {
    const violation = securityEvents.rateLimitViolations.get(
      `${ip}:${req.path}`,
    );
    if (violation.count > 5) {
      suspiciousPatterns.push("rapid_requests");
    }
  }

  // Alert on suspicious patterns
  if (suspiciousPatterns.length > 0) {
    const userAgent = req.get("user-agent") || "";
    logger.logSecurityEvent(
      "suspicious_activity_detected",
      {
        patterns: suspiciousPatterns,
        ip,
        path: req.path,
        method: req.method,
        userAgent,
      },
      {
        severity: "high",
        correlationId: req.correlationId,
        userId: req._userId,
      },
    );

    // Store suspicious request
    securityEvents.suspiciousRequests.push({
      timestamp: new Date().toISOString(),
      patterns: suspiciousPatterns,
      ip,
      path: req.path,
      method: req.method,
      userAgent,
      correlationId: req.correlationId,
      userId: req._userId,
    });

    // Keep only recent events
    if (
      securityEvents.suspiciousRequests.length > securityEvents.maxStoredEvents
    ) {
      securityEvents.suspiciousRequests.shift();
    }

    // Log to audit trail
    logSecurityEvent("suspicious_activity_detected", {
      patterns: suspiciousPatterns,
      ip,
      path: req.path,
      method: req.method,
    });

    // Note: Removed errorTracking.trackError call to prevent false-positive error rate spikes
    // from legitimate service-to-service calls (e.g., empty user-agent from docker internal network)
    // Security logging and audit trail remain active via logSecurityEvent above
  }

  return suspiciousPatterns.length > 0;
}

/**
 * Log security event to audit trail
 */
async function logSecurityEvent(eventType, details) {
  try {
    // For system-level security events, we need a userId. Use a system user or make it optional.
    // Since userId is required, we'll create a system-level audit log with a placeholder user ID if needed.
    // In practice, you might want to create a system user for this purpose.
    await logAuditEvent(
      details.userId || new mongoose.Types.ObjectId("000000000000000000000000"),
      "security_event",
      "SecurityEvent",
      details.userId || new mongoose.Types.ObjectId("000000000000000000000000"),
      {
        role: "system",
        fieldChanged: "security",
        oldValue: null,
        newValue: null,
        ...details,
        eventType,
        timestamp: new Date().toISOString(),
        isSystemEvent: !details.userId,
      },
    );
  } catch (error) {
    logger.error("Failed to log security event to audit trail", { error });
  }
}

/**
 * Security monitoring middleware
 */
function securityMonitorMiddleware(req, res, next) {
  // Detect suspicious activity
  detectSuspiciousActivity(req);

  // Track rate limit violations (called by rate limit middleware)
  if (req.rateLimitViolated) {
    const ip = req.ip || req.connection.remoteAddress;
    trackRateLimitViolation(ip, req.path);
  }

  next();
}

/**
 * Get security statistics
 */
function getSecurityStats() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let failedLoginsLastHour = 0;
  let failedLoginsLastDay = 0;

  for (const [ip, event] of securityEvents.failedLogins.entries()) {
    if (
      event.lastAttempt &&
      new Date(event.lastAttempt).getTime() > oneHourAgo
    ) {
      failedLoginsLastHour += event.count;
    }
    if (
      event.lastAttempt &&
      new Date(event.lastAttempt).getTime() > oneDayAgo
    ) {
      failedLoginsLastDay += event.count;
    }
  }

  const recentSuspiciousRequests = securityEvents.suspiciousRequests.filter(
    (req) => new Date(req.timestamp).getTime() > oneHourAgo,
  );

  return {
    failedLoginsLastHour,
    failedLoginsLastDay,
    suspiciousRequestsLastHour: recentSuspiciousRequests.length,
    totalSuspiciousRequests: securityEvents.suspiciousRequests.length,
    uniqueIPsWithFailedLogins: securityEvents.failedLogins.size,
    rateLimitViolations: securityEvents.rateLimitViolations.size,
  };
}

/**
 * Clear old security event data
 */
function clearOldData() {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  // Remove old failed login data
  for (const [ip, event] of securityEvents.failedLogins.entries()) {
    if (
      event.lastAttempt &&
      new Date(event.lastAttempt).getTime() < oneDayAgo
    ) {
      securityEvents.failedLogins.delete(ip);
    }
  }

  // Remove old rate limit violations
  for (const [key, event] of securityEvents.rateLimitViolations.entries()) {
    if (
      event.lastViolation &&
      new Date(event.lastViolation).getTime() < oneDayAgo
    ) {
      securityEvents.rateLimitViolations.delete(key);
    }
  }

  // Remove old suspicious requests
  securityEvents.suspiciousRequests = securityEvents.suspiciousRequests.filter(
    (req) => new Date(req.timestamp).getTime() > oneDayAgo,
  );
}

// Clean up old data every hour (skip in test mode)
if (process.env.NODE_ENV !== "test") {
  setInterval(
    () => {
      clearOldData();
    },
    60 * 60 * 1000,
  );
}

module.exports = {
  securityMonitorMiddleware,
  trackFailedLogin,
  trackRateLimitViolation,
  detectSuspiciousActivity,
  getSecurityStats,
  clearOldData,
};
