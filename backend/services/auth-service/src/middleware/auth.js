const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
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

/** Short-lived JWT for admin step-up (re-auth). Verified by admin-service. */
function signStepUpToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  const ttlMin = Math.min(
    5,
    Number(process.env.STEP_UP_TOKEN_TTL_MINUTES) || 5,
  );
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + Math.max(1, ttlMin) * 60;
  const payload = {
    sub: String(userId),
    stepUp: true,
    iat: nowSec,
    exp: expSec,
  };
  const token = jwt.sign(payload, secret);
  return { token, expiresAtMs: expSec * 1000 };
}

async function requireJwt(req, res, next) {
  try {
    const auth = String(req.headers["authorization"] || "");
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m ? m[1] : "";
    if (!token)
      return res.status(401).json({
        error: {
          code: "unauthorized",
          message: "Unauthorized: missing token",
        },
      });
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    const decoded = jwt.verify(token, secret); // REQUIREMENT IAS-1.6: validated tokens (JWT)

    // Verify token version matches user's current token version (session invalidation check)
    const User = require("../models/User");
    const user = await User.findById(decoded.sub)
      .select("tokenVersion role")
      .populate("role")
      .lean();
    if (!user) {
      return res.status(401).json({
        error: {
          code: "user_not_found",
          message: "Unauthorized: user not found",
        },
      });
    }

    const tokenVersion = Number(decoded.tokenVersion || 0);
    const currentTokenVersion = Number(user.tokenVersion || 0);
    if (tokenVersion !== currentTokenVersion) {
      return res.status(401).json({
        error: {
          code: "token_invalidated",
          message:
            "Unauthorized: session has been invalidated. Please log in again.",
        },
      });
    }

    // Use the actual role slug from the database (in case JWT has stale/incorrect role)
    const roleSlug = user.role?.slug || decoded.role || "";
    req._userRole = String(roleSlug);

    req._userId = String(decoded.sub || "");
    req._userEmail = String(decoded.email || "");
    req._tokenVersion = Number(decoded.tokenVersion || 0);
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: "invalid_token",
        message: "Unauthorized: invalid or expired token",
      },
    });
  }
}

function requireRole(allowedRoles) {
  // REQUIREMENT IAS-3.2: role-based access control
  return (req, res, next) => {
    // Ensure requireJwt has run or user info is available
    if (!req._userRole) {
      return res.status(401).json({
        error: {
          code: "unauthorized",
          message: "Unauthorized: missing role information",
        },
      });
    }

    if (!allowedRoles.includes(req._userRole)) {
      return res.status(403).json({
        error: {
          code: "forbidden",
          message: "Forbidden: insufficient permissions",
        },
      });
    }
    next();
  };
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
    return res.status(403).json({
      error: {
        code: "step_up_required",
        message:
          "This action requires re-authentication. Please complete step-up and retry.",
      },
    });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    const decoded = jwt.verify(stepUpToken, secret);
    if (!decoded || decoded.stepUp !== true) {
      return res.status(403).json({
        error: {
          code: "invalid_step_up",
          message: "Invalid or expired step-up. Please complete step-up again.",
        },
      });
    }
    if (String(decoded.sub) !== String(req._userId)) {
      return res.status(403).json({
        error: {
          code: "step_up_user_mismatch",
          message: "Step-up token does not match current user.",
        },
      });
    }
    next();
  } catch (err) {
    return res.status(403).json({
      error: {
        code: "invalid_step_up",
        message: "Step-up expired or invalid. Please complete step-up again.",
      },
    });
  }
}

module.exports = {
  signAccessToken,
  signStepUpToken,
  requireJwt,
  requireRole,
  requireAdminStepUp,
};
