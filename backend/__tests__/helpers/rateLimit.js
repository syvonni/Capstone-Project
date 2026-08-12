// Helpers to reset per-email rate-limit hit counters for the auth-service
// login routes during tests. Express-rate-limit exposes a `resetKey` method on
// the middleware function, and the auth routes mount the limiter as one of the
// route-specific middlewares in `route.stack`.

function getAuthLoginRateLimiter(path) {
  const router = require("../../services/auth-service/src/routes/login");
  const layer = router.stack.find((l) => l.route && l.route.path === path);
  if (!layer) return null;
  return (
    layer.route.stack.find((s) => typeof s.handle.resetKey === "function")
      ?.handle || null
  );
}

/**
 * Reset the rate-limit hit counter for an email on the auth login endpoints.
 * @param {string} email
 * @returns {Promise<void>}
 */
async function resetAuthLoginRateLimitFor(email) {
  const key = String(email).toLowerCase().trim();
  const limiters = [
    getAuthLoginRateLimiter("/login/start"),
    getAuthLoginRateLimiter("/login/resend"),
    getAuthLoginRateLimiter("/login/verify"),
  ];
  for (const limiter of limiters) {
    if (limiter && typeof limiter.resetKey === "function") {
      try {
        await limiter.resetKey(key);
      } catch (_) {
        /* ignore */
      }
    }
  }
}

module.exports = {
  getAuthLoginRateLimiter,
  resetAuthLoginRateLimitFor,
};
