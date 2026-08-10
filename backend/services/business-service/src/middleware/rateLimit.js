const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const respond = require("./respond");

/**
 * Global rate limiter for all API endpoints
 * 100 requests per minute per IP
 */
function globalRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if available, otherwise fall back to IP
      return req._userId || ipKeyGenerator(req);
    },
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
      const baseMsg = "Too many requests";
      const msg =
        retryAfterSec > 0
          ? `${baseMsg}. Try again in ${retryAfterSec}s.`
          : baseMsg;
      return respond.error(
        res,
        429,
        "rate_limit_exceeded",
        msg,
        undefined,
        { retryAfterSec },
      );
    },
  });
}

/**
 * Rate limiter for write operations (POST, PUT, DELETE, PATCH)
 * 20 requests per minute per user ID
 */
function writeOperationRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID for rate limiting write operations
      return req._userId || ipKeyGenerator(req);
    },
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
      const baseMsg = "Too many write operations";
      const msg =
        retryAfterSec > 0
          ? `${baseMsg}. Try again in ${retryAfterSec}s.`
          : baseMsg;
      return respond.error(
        res,
        429,
        "write_rate_limit_exceeded",
        msg,
        undefined,
        { retryAfterSec },
      );
    },
  });
}

/**
 * Rate limiter for sensitive admin operations
 * 5 requests per minute per user ID
 */
function sensitiveOperationRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID for rate limiting sensitive operations
      return req._userId || ipKeyGenerator(req);
    },
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
      const baseMsg = "Too many sensitive operations";
      const msg =
        retryAfterSec > 0
          ? `${baseMsg}. Try again in ${retryAfterSec}s.`
          : baseMsg;
      return respond.error(
        res,
        429,
        "sensitive_operation_rate_limit_exceeded",
        msg,
        undefined,
        { retryAfterSec },
      );
    },
  });
}

module.exports = {
  globalRateLimit,
  writeOperationRateLimit,
  sensitiveOperationRateLimit,
};
