const rateLimit = require("express-rate-limit");
const respond = require("./respond");

// Default key generator for IP-based rate limiting (v7+ uses req.ip by default)
function ipKeyGenerator(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function perEmailRateLimit({ windowMs, max, code, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req /*, res*/) => {
      const bodyEmail =
        req.body && req.body.email
          ? String(req.body.email).toLowerCase().trim()
          : "";
      const headerEmail = String(req.headers["x-user-email"] || "")
        .toLowerCase()
        .trim();
      if (bodyEmail) return bodyEmail;
      if (headerEmail) return headerEmail;
      return ipKeyGenerator(req);
    },
    handler: (req, res /*, next, options */) => {
      // Flag rate limit violation for security monitoring
      req.rateLimitViolated = true;

      let retryAfterSec = 0;
      try {
        const rl = req.rateLimit || {};
        let resetMs = 0;
        if (rl.resetTime) {
          resetMs = new Date(rl.resetTime).getTime();
        } else if (typeof rl.resetMs === "number") {
          resetMs = rl.resetMs;
        }
        if (resetMs > Date.now()) {
          retryAfterSec = Math.ceil((resetMs - Date.now()) / 1000);
        }
      } catch (_) {}
      const baseMsg = message || "Too many requests";
      const msg =
        retryAfterSec > 0
          ? `${baseMsg} Try again in ${retryAfterSec}s.`
          : baseMsg;
      return respond.error(res, 429, code || "rate_limit_exceeded", msg);
    },
  });
}

/**
 * Rate limiter for verification requests (OTP/MFA)
 * 5 attempts per 15 minutes per user
 */
function verificationRateLimit() {
  return perEmailRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    code: "verification_rate_limited",
    message: "Too many verification requests. Please try again later.",
  });
}

/**
 * Rate limiter for profile updates
 * 10 updates per minute per user
 */
function profileUpdateRateLimit() {
  return perEmailRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    code: "profile_update_rate_limited",
    message: "Too many profile updates. Please slow down.",
  });
}

/**
 * Rate limiter for password changes
 * 3 attempts per hour per user
 */
function passwordChangeRateLimit() {
  return perEmailRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    code: "password_change_rate_limited",
    message: "Too many password change attempts. Please try again later.",
  });
}

/**
 * Rate limiter for ID uploads
 * 5 uploads per hour per user
 */
function idUploadRateLimit() {
  return perEmailRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    code: "id_upload_rate_limited",
    message: "Too many ID upload attempts. Please try again later.",
  });
}

/**
 * Rate limiter for blockchain audit logging
 * 20 logs per minute per IP (called by other services)
 */
function auditLogRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use service ID if provided (e.g. x-service-id header from internal services)
      const serviceId =
        req.headers["x-service-id"] || req.headers["x-correlation-id"];
      if (serviceId) return String(serviceId);
      return ipKeyGenerator(req);
    },
    handler: (req, res) => {
      req.rateLimitViolated = true;
      let retryAfterSec = 60;
      try {
        const rl = req.rateLimit || {};
        const resetMs = rl.resetTime
          ? new Date(rl.resetTime).getTime()
          : rl.resetMs;
        if (resetMs > Date.now())
          retryAfterSec = Math.ceil((resetMs - Date.now()) / 1000);
      } catch (_) {}
      return respond.error(
        res,
        429,
        "audit_log_rate_limited",
        `Too many audit logs. Try again in ${retryAfterSec}s.`,
      );
    },
  });
}

/**
 * Rate limiter for admin approval requests
 * 10 requests per hour per admin
 */
function adminApprovalRateLimit() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    keyGenerator: (req) => {
      // Use admin user ID for rate limiting
      return req._userId || ipKeyGenerator(req);
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Flag rate limit violation for security monitoring
      req.rateLimitViolated = true;

      let retryAfterSec = 0;
      try {
        const rl = req.rateLimit || {};
        let resetMs = 0;
        if (rl.resetTime) {
          resetMs = new Date(rl.resetTime).getTime();
        } else if (typeof rl.resetMs === "number") {
          resetMs = rl.resetMs;
        }
        if (resetMs > Date.now()) {
          retryAfterSec = Math.ceil((resetMs - Date.now()) / 1000);
        }
      } catch (_) {}
      const baseMsg = "Too many approval requests";
      const msg =
        retryAfterSec > 0
          ? `${baseMsg}. Try again in ${retryAfterSec}s.`
          : baseMsg;
      return respond.error(res, 429, "admin_approval_rate_limited", msg);
    },
  });
}

// auditVerifyRateLimit function removed - blockchain verify endpoints deleted
// Previously: Rate limiter for audit verify endpoints (hash enumeration protection)

module.exports = {
  perEmailRateLimit,
  verificationRateLimit,
  profileUpdateRateLimit,
  passwordChangeRateLimit,
  idUploadRateLimit,
  adminApprovalRateLimit,
  auditLogRateLimit,
};
