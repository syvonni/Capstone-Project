const jwt = require("jsonwebtoken");
const { error: respondError } = require("./respond");

function signAccessToken(user) {
  const secret = process.env.JWT_SECRET || "dev_secret_change_me";
  const ttlMin = Number(process.env.ACCESS_TOKEN_TTL_MINUTES) || 240; // Default 4 hours (240 minutes)
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + Math.max(1, ttlMin) * 60;
  const payload = {
    sub: String(user._id || user.id || ""),
    email: String(user.email || ""),
    role: String(
      user.role && user.role.slug ? user.role.slug : user.role || "",
    ),
    tokenVersion: Number(user.tokenVersion || 0), // Include token version for session invalidation
    iat: nowSec,
    exp: expSec,
  };
  const token = jwt.sign(payload, secret);
  return { token, expiresAtMs: expSec * 1000 };
}

async function requireJwt(req, res, next) {
  try {
    // Check Authorization header first
    const auth = String(req.headers["authorization"] || "");
    const m = auth.match(/^Bearer\s+(.+)$/i);
    let token = m ? m[1] : "";

    // Fallback to cookie if no header token
    if (!token && req.cookies) {
      token = req.cookies.accessToken || req.cookies.access_token || "";
    }

    if (!token)
      return respondError(res, 401, "unauthorized", "Unauthorized: missing token");
    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const decoded = jwt.verify(token, secret);

    // Skip user lookup in test mode to avoid cross-service model conflicts
    if (process.env.NODE_ENV !== "test") {
      // Verify token version matches user's current token version (session invalidation check)
      const User = require("../models/User");
      const user = await User.findById(decoded.sub)
        .select("tokenVersion role")
        .populate("role")
        .lean();
      if (!user) {
        return respondError(res, 401, "user_not_found", "Unauthorized: user not found");
      }

      const tokenVersion = Number(decoded.tokenVersion || 0);
      const currentTokenVersion = Number(user.tokenVersion || 0);
      if (tokenVersion !== currentTokenVersion) {
        return respondError(res, 401, "token_invalidated",
          "Unauthorized: session has been invalidated. Please log in again.");
      }

      // Use the actual role slug from the database (in case JWT has stale/incorrect role)
      const roleSlug = user.role?.slug || decoded.role || "";
      req._userRole = String(roleSlug);
    } else {
      req._userRole = String(decoded.role || "");
    }

    req._userId = String(decoded.sub || "");
    req._userEmail = String(decoded.email || "");
    req._tokenVersion = Number(decoded.tokenVersion || 0);
    next();
  } catch (err) {
    // Only treat genuine JWT verification failures as auth errors (401).
    // Infrastructure errors (e.g. DB not connected) must NOT masquerade as
    // invalid_token, otherwise the frontend force-logs-out the user on a
    // transient backend problem.
    const isJwtError =
      err &&
      (err.name === "JsonWebTokenError" ||
        err.name === "TokenExpiredError" ||
        err.name === "NotBeforeError");
    if (isJwtError) {
      return respondError(res, 401, "invalid_token",
        "Unauthorized: invalid or expired token");
    }
    console.error("[requireJwt] non-auth error during verification:", err);
    return respondError(res, 503, "auth_unavailable",
      "Authentication temporarily unavailable. Please try again.");
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    // Ensure requireJwt has run or user info is available
    if (!req._userRole) {
      return respondError(res, 401, "unauthorized",
        "Unauthorized: missing role information");
    }

    if (!allowedRoles.includes(req._userRole)) {
      return respondError(res, 403, "forbidden",
        "Forbidden: insufficient permissions");
    }
    next();
  };
}

/** Require internal service-to-service authentication (shared secret). */
function requireInternalAuth(req, res, next) {
  const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-service-secret';
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey === INTERNAL_API_KEY) {
    next();
  } else {
    return respondError(res, 401, "UNAUTHORIZED",
      "Invalid or missing internal API key");
  }
}

/** Require valid admin step-up token (X-Step-Up-Token). Use after requireJwt + requireRole(['admin', 'lgu_officer']). */
function requireAdminStepUp(req, res, next) {
  const raw = req.headers["x-step-up-token"] || "";
  const bearer = String(req.headers["authorization"] || "");
  const stepUpToken =
    raw.trim() ||
    (bearer.match(/^StepUp\s+(.+)$/i)
      ? bearer.replace(/^StepUp\s+/i, "").trim()
      : "");
  if (!stepUpToken) {
    return respondError(res, 403, "step_up_required",
      "This action requires re-authentication. Please complete step-up and retry.");
  }
  try {
    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const decoded = jwt.verify(stepUpToken, secret);
    if (!decoded || decoded.stepUp !== true) {
      return respondError(res, 403, "invalid_step_up",
        "Invalid or expired step-up. Please complete step-up again.");
    }
    if (String(decoded.sub) !== String(req._userId)) {
      return respondError(res, 403, "step_up_user_mismatch",
        "Step-up token does not match current user.");
    }
    next();
  } catch (err) {
    return respondError(res, 403, "invalid_step_up",
      "Step-up expired or invalid. Please complete step-up again.");
  }
}

module.exports = {
  signAccessToken,
  requireJwt,
  requireRole,
  requireAdminStepUp,
  requireInternalAuth,
};
