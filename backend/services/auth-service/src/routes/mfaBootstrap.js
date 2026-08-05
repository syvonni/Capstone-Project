const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const MfaBootstrapToken = require("../models/MfaBootstrapToken");
const Role = require("../models/Role");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const {
  otpauthUri,
  generateSecret,
  verifyTotpWithCounter,
} = require("../lib/totp");
const { encryptWithHash, decryptWithHash } = require("../lib/secretCipher");
const { logAuditEvent } = require("../lib/auditClient");
const { getStaffRoles } = require("../lib/roleHelpers");

async function leanOrValue(queryOrDoc) {
  if (queryOrDoc && typeof queryOrDoc.lean === "function") {
    return queryOrDoc.lean();
  }
  return queryOrDoc;
}

const router = express.Router();

const createTokenSchema = Joi.object({
  user: Joi.string().min(1).required(), // email or userId
  expiresInMinutes: Joi.number().integer().min(5).max(1440).default(60),
  reason: Joi.string().max(300).allow("").default(""),
});

const startSchema = Joi.object({
  token: Joi.string().min(10).required(),
});

const verifySchema = Joi.object({
  token: Joi.string().min(10).required(),
  code: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

const bulkSchema = Joi.object({
  includeAdmins: Joi.boolean().default(true),
  includeStaff: Joi.boolean().default(true),
  expiresInMinutes: Joi.number().integer().min(5).max(1440).default(60),
  reason: Joi.string().max(300).allow("").default("bulk_seed"),
}).custom((value, helpers) => {
  if (!value.includeAdmins && !value.includeStaff) {
    return helpers.error("any.invalid");
  }
  return value;
});

function parseBootstrapToken(raw) {
  const parts = String(raw || "").split(".");
  if (parts.length !== 2) return null;
  const [id, secret] = parts;
  if (!mongoose.Types.ObjectId.isValid(id) || !secret) return null;
  return { id, secret };
}

function issuerName() {
  return (
    String(process.env.AUTHENTICATOR_APP_NAME || "BizClear").trim() ||
    "BizClear"
  );
}

function accountLabel(user) {
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return fullName || user?.username || user?.email || "User";
}

function resolveBootstrapAuth(req) {
  const headerKey = String(req.headers["x-bootstrap-key"] || "");
  const configuredKey = String(process.env.MFA_BOOTSTRAP_KEY || "");
  if (configuredKey && headerKey && headerKey === configuredKey) {
    return { via: "bootstrap_key", actorId: null };
  }
  if (req._userRole === "admin" && req._userId) {
    return { via: "admin_jwt", actorId: req._userId };
  }
  return null;
}

async function findUserByIdentifier(identifier) {
  const key = String(identifier || "")
    .trim()
    .toLowerCase();
  if (mongoose.Types.ObjectId.isValid(key)) {
    const doc = await User.findById(key).populate("role");
    return doc;
  }
  return User.findOne({ email: key }).populate("role");
}

router.post(
  "/admin/bootstrap-mfa-token",
  validateBody(createTokenSchema),
  async (req, res) => {
    try {
      const auth = resolveBootstrapAuth(req);
      if (!auth) {
        return respond.error(
          res,
          403,
          "forbidden",
          "Forbidden: administrator authorization required",
        );
      }

      const { user: userIdentifier, expiresInMinutes, reason } = req.body || {};
      const targetUser = await findUserByIdentifier(userIdentifier);
      if (!targetUser) {
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      const roleSlug = targetUser.role?.slug || "user";
      if (roleSlug !== "admin" && !targetUser.isStaff) {
        return respond.error(
          res,
          400,
          "not_high_privilege",
          "Bootstrap MFA is only for admin or staff users",
        );
      }

      const rawSecret = crypto.randomBytes(24).toString("base64url");
      const secretHash = await bcrypt.hash(rawSecret, 10);
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      const tokenDoc = await MfaBootstrapToken.create({
        userId: targetUser._id,
        secretHash,
        createdBy: auth.actorId,
        createdVia: auth.via,
        reason: reason || "",
        expiresAt,
        metadata: {
          ipAddress:
            req.ip ||
            req.headers["x-forwarded-for"] ||
            req.connection?.remoteAddress ||
            "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
        },
      });

      if (auth.actorId) {
        await logAuditEvent(
          targetUser._id,
          "mfa_bootstrap_token_created",
          "User",
          targetUser._id,
          {
            role: roleSlug,
            fieldChanged: "mfa",
            oldValue: "",
            newValue: "bootstrap_token_created",
            expiresAt: expiresAt.toISOString(),
            createdBy: String(auth.actorId),
            createdVia: auth.via,
            reason: reason || "",
          },
        );
      }

      const token = `${tokenDoc._id.toString()}.${rawSecret}`;
      return res.json({
        token,
        expiresAt: expiresAt.toISOString(),
        userId: String(targetUser._id),
        userEmail: targetUser.email,
        role: roleSlug,
        createdVia: auth.via,
      });
    } catch (err) {
      console.error("POST /api/auth/admin/bootstrap-mfa-token error:", err);
      return respond.error(
        res,
        500,
        "bootstrap_token_failed",
        "Failed to create MFA bootstrap token",
      );
    }
  },
);

// Dev/reset helper: bulk-create MFA bootstrap tokens for seeded admin/staff users
router.post(
  "/admin/bootstrap-mfa-bulk",
  validateBody(bulkSchema),
  async (req, res) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return respond.error(res, 403, "forbidden", "Forbidden in production");
      }
      const auth = resolveBootstrapAuth(req);
      if (!auth) {
        return respond.error(
          res,
          403,
          "forbidden",
          "Forbidden: administrator authorization required",
        );
      }

      const { includeAdmins, includeStaff, expiresInMinutes, reason } =
        req.body || {};

      // Resolve role ids for filtering
      const roleFilter = [];
      if (includeAdmins) {
        const adminRole = await leanOrValue(
          await Role.findOne({ slug: "admin" }),
        );
        if (adminRole?._id) roleFilter.push(adminRole._id);
      }
      if (includeStaff) {
        const staffRoleSlugs = getStaffRoles();
        const staffRoles = await leanOrValue(
          await Role.find({ slug: { $in: staffRoleSlugs } }),
        );
        for (const r of staffRoles || []) {
          if (r?._id) roleFilter.push(r._id);
        }
      }

      if (roleFilter.length === 0) {
        return respond.error(
          res,
          400,
          "roles_missing",
          "No roles available to bootstrap",
        );
      }

      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
      const candidates = await User.find({
        role: { $in: roleFilter },
        $or: [
          { mustSetupMfa: true },
          { mfaEnabled: false },
          { mfaSecret: { $in: [null, ""] } },
        ],
      }).populate("role");

      const results = [];
      for (const user of candidates) {
        const roleSlug = user.role?.slug || "user";
        const rawBootstrapSecret = crypto.randomBytes(24).toString("base64url");
        const bootstrapSecretHash = await bcrypt.hash(rawBootstrapSecret, 10);
        const tokenDoc = await MfaBootstrapToken.create({
          userId: user._id,
          secretHash: bootstrapSecretHash,
          createdBy: auth.actorId,
          createdVia: auth.via,
          reason: reason || "bulk_seed",
          expiresAt,
          metadata: {
            ipAddress:
              req.ip ||
              req.headers["x-forwarded-for"] ||
              req.connection?.remoteAddress ||
              "unknown",
            userAgent: req.headers["user-agent"] || "unknown",
          },
        });

        // Prepare MFA secret (not yet enabled)
        const totpSecret = generateSecret(20);
        const uri = otpauthUri({
          issuer: issuerName(),
          account: accountLabel(user),
          secret: totpSecret,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
        });
        user.mfaSecret = encryptWithHash(user.passwordHash, totpSecret);
        user.mfaEnabled = false;
        user.mustSetupMfa = true;
        user.mfaMethod = "";
        await user.save();

        results.push({
          userId: String(user._id),
          email: user.email,
          role: roleSlug,
          token: `${tokenDoc._id.toString()}.${rawBootstrapSecret}`,
          expiresAt: expiresAt.toISOString(),
          secret: totpSecret,
          otpauthUri: uri,
        });
      }

      return res.json({ count: results.length, results });
    } catch (err) {
      console.error("POST /api/auth/admin/bootstrap-mfa-bulk error:", err);
      return respond.error(
        res,
        500,
        "bootstrap_bulk_failed",
        "Failed to create MFA bootstrap tokens in bulk",
      );
    }
  },
);

router.post(
  "/mfa/bootstrap/start",
  validateBody(startSchema),
  async (req, res) => {
    try {
      const { token: rawToken } = req.body || {};
      const parsed = parseBootstrapToken(rawToken);
      if (!parsed)
        return respond.error(
          res,
          400,
          "invalid_token",
          "Invalid bootstrap token",
        );

      const tokenDoc = await MfaBootstrapToken.findById(parsed.id).populate({
        path: "userId",
        populate: { path: "role" },
      });
      if (!tokenDoc || !tokenDoc.isUsable()) {
        return respond.error(
          res,
          410,
          "token_expired",
          "Bootstrap token expired or already used",
        );
      }

      const secretMatches = await bcrypt.compare(
        parsed.secret,
        tokenDoc.secretHash,
      );
      if (!secretMatches)
        return respond.error(
          res,
          401,
          "invalid_token",
          "Invalid bootstrap token",
        );

      const user = tokenDoc.userId;
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");

      const roleSlug = user.role?.slug || "user";
      if (roleSlug !== "admin" && !user.isStaff) {
        return respond.error(
          res,
          400,
          "not_high_privilege",
          "Bootstrap MFA is only for admin or staff users",
        );
      }

      const secret = generateSecret(20);
      const uri = otpauthUri({
        issuer: issuerName(),
        account: accountLabel(user),
        secret,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      user.mfaSecret = encryptWithHash(user.passwordHash, secret);
      user.mfaEnabled = false;
      user.mustSetupMfa = true;
      await user.save();

      return res.json({
        secret,
        otpauthUri: uri,
        issuer: issuerName(),
        userEmail: user.email,
        token: rawToken,
      });
    } catch (err) {
      console.error("POST /api/auth/mfa/bootstrap/start error:", err);
      return respond.error(
        res,
        500,
        "bootstrap_start_failed",
        "Failed to start MFA bootstrap",
      );
    }
  },
);

router.post(
  "/mfa/bootstrap/verify",
  validateBody(verifySchema),
  async (req, res) => {
    try {
      const { token: rawToken, code } = req.body || {};
      const parsed = parseBootstrapToken(rawToken);
      if (!parsed)
        return respond.error(
          res,
          400,
          "invalid_token",
          "Invalid bootstrap token",
        );

      const tokenDoc = await MfaBootstrapToken.findById(parsed.id).populate({
        path: "userId",
        populate: { path: "role" },
      });
      if (!tokenDoc || !tokenDoc.isUsable()) {
        return respond.error(
          res,
          410,
          "token_expired",
          "Bootstrap token expired or already used",
        );
      }

      const secretMatches = await bcrypt.compare(
        parsed.secret,
        tokenDoc.secretHash,
      );
      if (!secretMatches)
        return respond.error(
          res,
          401,
          "invalid_token",
          "Invalid bootstrap token",
        );

      const user = tokenDoc.userId;
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");
      if (!user.mfaSecret)
        return respond.error(
          res,
          400,
          "mfa_not_started",
          "MFA bootstrap has not been started",
        );

      const secretPlain = decryptWithHash(user.passwordHash, user.mfaSecret);
      const resVerify = verifyTotpWithCounter({
        secret: secretPlain,
        token: String(code),
        window: 1,
        period: 30,
        digits: 6,
      });
      if (!resVerify.ok)
        return respond.error(
          res,
          401,
          "invalid_mfa_code",
          "Invalid verification code",
        );
      if (
        typeof user.mfaLastUsedTotpCounter === "number" &&
        user.mfaLastUsedTotpCounter === resVerify.counter
      ) {
        return respond.error(
          res,
          401,
          "totp_replayed",
          "Verification code already used",
        );
      }

      const currentMethod = String(user.mfaMethod || "").toLowerCase();
      const methods = new Set();
      methods.add("authenticator");
      if (user.fprintEnabled) methods.add("fingerprint");
      if (currentMethod.includes("passkey")) methods.add("passkey");

      user.mfaEnabled = true;
      user.mfaMethod = Array.from(methods).join(",");
      user.mfaLastUsedTotpCounter = resVerify.counter;
      user.mfaLastUsedTotpAt = new Date();
      user.mustSetupMfa = false;
      if (user.isStaff) {
        user.isActive = !(user.mustChangeCredentials || user.mustSetupMfa);
      }
      await user.save();

      tokenDoc.usedAt = new Date();
      await tokenDoc.save();

      await logAuditEvent(
        user._id,
        "mfa_bootstrap_completed",
        "User",
        user._id,
        {
          role: user.role?.slug || "user",
          fieldChanged: "mfa",
          oldValue: "",
          newValue: "bootstrap_mfa_enabled",
          tokenId: String(tokenDoc._id),
          verifiedAt: new Date().toISOString(),
        },
      );

      return res.json({
        enabled: true,
        user: {
          id: String(user._id),
          role: user.role?.slug || "user",
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isStaff: !!user.isStaff,
          mustSetupMfa: !!user.mustSetupMfa,
          mfaEnabled: !!user.mfaEnabled,
          mfaMethod: user.mfaMethod || "",
        },
      });
    } catch (err) {
      console.error("POST /api/auth/mfa/bootstrap/verify error:", err);
      return respond.error(
        res,
        500,
        "bootstrap_verify_failed",
        "Failed to verify MFA bootstrap",
      );
    }
  },
);

module.exports = router;
