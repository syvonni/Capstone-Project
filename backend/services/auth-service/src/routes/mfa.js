const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const {
  otpauthUri,
  generateSecret,
  verifyTotpWithCounter,
} = require("../lib/totp");
const { sendOtp } = require("../lib/mailer");
const {
  sendMfaEnabledNotification,
  sendMfaDisableRequestedNotification,
  sendMfaDisabledNotification,
} = require("../lib/notificationService");
const inAppNotificationService = require("../services/notificationService");
const { mfaRequests } = require("../lib/authRequestsStore");
const { encryptWithHash, decryptWithHash } = require("../lib/secretCipher");
const { generateToken } = require("../lib/codes");
const { requireJwt } = require("../middleware/auth");
const webauthnServer = require("@simplewebauthn/server");
const webauthnRouter = require("./webauthn");
const authenticationChallenges =
  webauthnRouter.authenticationChallenges || new Map();
const {
  consumeDisableRequestVerified,
  consumeDisableUndoVerified,
} = require("../lib/mfaStepUpVerify");
const { logAuditEvent } = require("../lib/auditClient");

const router = express.Router();

const setupSchema = Joi.object({
  method: Joi.string().valid("authenticator").required(),
});

const verifySchema = Joi.object({
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

const oneDayMs = 24 * 60 * 60 * 1000;

// POST /api/auth/mfa/setup
router.post(
  "/mfa/setup",
  requireJwt,
  validateBody(setupSchema),
  async (req, res) => {
    try {
      const userId = req._userId;
      const doc = await User.findById(userId);
      if (!doc)
        return respond.error(res, 404, "user_not_found", "User not found");
      const email = doc.email;

      const secret = generateSecret(20);
      const issuer =
        String(
          process.env.AUTHENTICATOR_APP_NAME ||
            process.env.DEFAULT_FROM_EMAIL ||
            "BizClear",
        )
          .replace(/<.*?>/g, "")
          .trim() || "BizClear";
      const uri = otpauthUri({
        issuer,
        account: email,
        secret,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      const encryptedSecret = encryptWithHash(doc.passwordHash, secret);
      console.log(
        `[MFA Setup] User: ${email}, Secret generated, Encrypted length: ${encryptedSecret?.length || 0}`,
      );

      doc.mfaSecret = encryptedSecret;
      doc.mfaEnabled = false;
      await doc.save();

      console.log(
        `[MFA Setup] Saved to DB - mfaSecret length: ${doc.mfaSecret?.length || 0}, mfaEnabled: ${doc.mfaEnabled}`,
      );

      return res.json({ secret, otpauthUri: uri, issuer });
    } catch (err) {
      console.error("POST /api/auth/mfa/setup error:", err);
      return respond.error(res, 500, "mfa_setup_failed", "Failed to setup MFA");
    }
  },
);

// POST /api/auth/mfa/disable-request/start — for passkey-only users: get WebAuthn options; frontend then does getAssertion and calls webauthn/authenticate/complete with purpose mfa_disable
router.post("/mfa/disable-request/start", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");
    const hasPasskeys =
      Array.isArray(doc.webauthnCredentials) &&
      doc.webauthnCredentials.length > 0;
    if (!hasPasskeys)
      return respond.error(res, 400, "no_passkeys", "No passkeys to verify");
    const allowCredentials = (doc.webauthnCredentials || [])
      .map((c) => {
        const credId = String(c.credId || "").trim();
        if (!credId) return null;
        return {
          id: credId,
          type: "public-key",
          transports: c.transports || [],
        };
      })
      .filter(Boolean);
    const rpID = process.env.WEBAUTHN_RPID || "localhost";
    const options = await webauthnServer.generateAuthenticationOptions({
      rpID,
      timeout: 60000,
      allowCredentials:
        allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: "preferred",
    });
    let challengeToStore = options.challenge;
    if (Buffer.isBuffer(challengeToStore))
      challengeToStore = challengeToStore.toString("base64url");
    else if (challengeToStore instanceof Uint8Array)
      challengeToStore = Buffer.from(challengeToStore).toString("base64url");
    else if (typeof challengeToStore !== "string")
      challengeToStore = Buffer.from(challengeToStore).toString("base64url");
    authenticationChallenges.set(
      "mfa_disable_" + String(userId),
      challengeToStore,
    );
    return res.json({ publicKey: options });
  } catch (err) {
    console.error("POST /api/auth/mfa/disable-request/start error:", err);
    return respond.error(
      res,
      500,
      "mfa_disable_start_failed",
      "Failed to start verification",
    );
  }
});

// POST /api/auth/mfa/disable-request
router.post("/mfa/disable-request", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");
    const hasTotp = !!doc.mfaSecret;
    const hasPasskeys =
      Array.isArray(doc.webauthnCredentials) &&
      doc.webauthnCredentials.length > 0;
    const hasMfa = (doc.mfaEnabled && hasTotp) || hasPasskeys;
    if (!hasMfa) {
      return respond.error(res, 400, "mfa_not_enabled", "MFA not enabled");
    }
    if (hasPasskeys && !hasTotp) {
      if (!consumeDisableRequestVerified(userId)) {
        return respond.error(
          res,
          403,
          "verification_required",
          "Verify with your passkey first",
        );
      }
    } else if (hasTotp) {
      const { code } = req.body || {};
      if (!code) {
        return respond.error(
          res,
          400,
          "totp_required",
          "TOTP code is required to disable MFA",
        );
      }
      let secret;
      try {
        secret = doc.mfaSecret.startsWith("enc:")
          ? decryptWithHash(doc.mfaSecret)
          : doc.mfaSecret;
      } catch {
        secret = doc.mfaSecret;
      }
      const counter = doc.mfaCounter ?? 0;
      const verified = verifyTotpWithCounter(secret, String(code), counter);
      if (!verified.valid) {
        return respond.error(res, 403, "invalid_totp", "Invalid TOTP code");
      }
      if (verified.counter != null) {
        doc.mfaCounter = verified.counter;
      }
    }
    if (doc.mfaDisablePending) {
      return res.json({
        disablePending: true,
        scheduledFor: doc.mfaDisableScheduledFor,
      });
    }
    const now = Date.now();
    doc.mfaDisablePending = true;
    doc.mfaDisableRequestedAt = new Date(now);
    doc.mfaDisableScheduledFor = new Date(now + oneDayMs);
    await doc.save();
    sendMfaDisableRequestedNotification(doc._id, {
      scheduledFor: doc.mfaDisableScheduledFor,
    }).catch((err) => {
      console.error("Failed to send MFA disable requested notification:", err);
    });
    return res.json({
      disablePending: true,
      scheduledFor: doc.mfaDisableScheduledFor,
    });
  } catch (err) {
    console.error("POST /api/auth/mfa/disable-request error:", err);
    return respond.error(
      res,
      500,
      "mfa_disable_request_failed",
      "Failed to request MFA disable",
    );
  }
});

// POST /api/auth/mfa/disable-undo/start — for passkey-only: get WebAuthn options; then authenticate/complete with purpose mfa_disable_undo
router.post("/mfa/disable-undo/start", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");
    const hasPasskeys =
      Array.isArray(doc.webauthnCredentials) &&
      doc.webauthnCredentials.length > 0;
    if (!hasPasskeys)
      return respond.error(res, 400, "no_passkeys", "No passkeys to verify");
    const allowCredentials = (doc.webauthnCredentials || [])
      .map((c) => {
        const credId = String(c.credId || "").trim();
        if (!credId) return null;
        return {
          id: credId,
          type: "public-key",
          transports: c.transports || [],
        };
      })
      .filter(Boolean);
    const rpID = process.env.WEBAUTHN_RPID || "localhost";
    const options = await webauthnServer.generateAuthenticationOptions({
      rpID,
      timeout: 60000,
      allowCredentials:
        allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: "preferred",
    });
    let challengeToStore = options.challenge;
    if (Buffer.isBuffer(challengeToStore))
      challengeToStore = challengeToStore.toString("base64url");
    else if (challengeToStore instanceof Uint8Array)
      challengeToStore = Buffer.from(challengeToStore).toString("base64url");
    else if (typeof challengeToStore !== "string")
      challengeToStore = Buffer.from(challengeToStore).toString("base64url");
    authenticationChallenges.set(
      "mfa_undo_" + String(userId),
      challengeToStore,
    );
    return res.json({ publicKey: options });
  } catch (err) {
    console.error("POST /api/auth/mfa/disable-undo/start error:", err);
    return respond.error(
      res,
      500,
      "mfa_disable_undo_start_failed",
      "Failed to start verification",
    );
  }
});

// POST /api/auth/mfa/disable-undo — for TOTP users requires code; for passkey-only requires prior passkey verify
router.post("/mfa/disable-undo", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const { code } = req.body || {};
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");
    if (!doc.mfaDisablePending)
      return res.json({ canceled: false, message: "No pending disable" });
    if (!doc.mfaSecret) {
      if (!consumeDisableUndoVerified(userId)) {
        return respond.error(
          res,
          403,
          "verification_required",
          "Verify with your passkey first",
        );
      }
    } else {
      const codeStr = String(code || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (codeStr.length !== 6)
        return respond.error(
          res,
          400,
          "invalid_code",
          "Verification code required",
        );
      const secretPlain = decryptWithHash(doc.passwordHash, doc.mfaSecret);
      const resVerify = verifyTotpWithCounter({
        secret: secretPlain,
        token: codeStr,
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
        typeof doc.mfaLastUsedTotpCounter === "number" &&
        doc.mfaLastUsedTotpCounter === resVerify.counter
      ) {
        return respond.error(
          res,
          401,
          "totp_replayed",
          "Verification code already used",
        );
      }
      doc.mfaLastUsedTotpCounter = resVerify.counter;
      doc.mfaLastUsedTotpAt = new Date();
    }
    doc.mfaDisablePending = false;
    doc.mfaDisableRequestedAt = null;
    doc.mfaDisableScheduledFor = null;
    await doc.save();
    return res.json({ canceled: true });
  } catch (err) {
    console.error("POST /api/auth/mfa/disable-undo error:", err);
    return respond.error(
      res,
      500,
      "mfa_disable_undo_failed",
      "Failed to undo MFA disable",
    );
  }
});

// POST /api/auth/mfa/verify
router.post(
  "/mfa/verify",
  requireJwt,
  validateBody(verifySchema),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { code } = req.body || {};
      const doc = await User.findById(userId).populate("role");
      if (!doc)
        return respond.error(res, 404, "user_not_found", "User not found");

      console.log(
        `[MFA Verify] User: ${doc.email}, mfaSecret length: ${doc.mfaSecret?.length || 0}, mfaEnabled: ${doc.mfaEnabled}`,
      );

      if (!doc.mfaSecret)
        return respond.error(res, 400, "mfa_not_setup", "MFA not set up");

      const secretPlain = decryptWithHash(doc.passwordHash, doc.mfaSecret);
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

      doc.mfaEnabled = true;
      doc.mfaReEnrollmentRequired = false;

      // Enforce mutual exclusivity: When TOTP is enabled, disable passkeys
      // This prevents both MFA types from being active simultaneously
      if (doc.webauthnCredentials && doc.webauthnCredentials.length > 0) {
        console.log(
          `[MFA Verify] User: ${doc.email} - Disabling ${doc.webauthnCredentials.length} passkeys due to TOTP activation`,
        );
        doc.webauthnCredentials = [];
      }

      const roleSlug =
        doc.role && doc.role.slug
          ? doc.role.slug
          : doc.role && doc.role.toString
            ? doc.role.toString()
            : "";
      // Update mfaMethod to only include authenticator (passkeys cleared above)
      doc.mfaMethod = "authenticator";
      doc.mfaLastUsedTotpCounter = resVerify.counter;
      doc.mfaLastUsedTotpAt = new Date();
      if (doc.mustSetupMfa) doc.mustSetupMfa = false;
      if (doc.isStaff) {
        doc.isActive = !(doc.mustChangeCredentials || doc.mustSetupMfa);
        // Update accountStatus for staff when onboarding is complete
        if (!doc.mustChangeCredentials && !doc.mustSetupMfa) {
          doc.accountStatus = "active";
        }
      }
      await doc.save();

      console.log(
        `[MFA Verify] After save - mfaSecret length: ${doc.mfaSecret?.length || 0}, mfaEnabled: ${doc.mfaEnabled}`,
      );

      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      logAuditEvent("mfa_verified", doc._id, "User", doc._id, {
        role: roleSlug || doc.role?.slug || "business_owner",
        fieldChanged: "mfa",
        oldValue: "disabled",
        newValue: "enabled",
        method: "totp",
      }).catch(() => {});
      sendMfaEnabledNotification(doc._id, { method: "authenticator" }).catch(
        (err) => {
          console.error("Failed to send MFA enabled notification:", err);
        },
      );
      inAppNotificationService
        .createSecurityNotification(doc._id, "mfa_enabled", {
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        })
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );
      return res.json({
        enabled: true,
        user: {
          id: String(doc._id),
          role: doc.role && doc.role.slug ? doc.role.slug : doc.role,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          phoneNumber: doc.phoneNumber,
          username: doc.username || "",
          office: doc.office || "",
          isActive: doc.isActive !== false,
          isStaff: !!doc.isStaff,
          mustChangeCredentials: !!doc.mustChangeCredentials,
          mustSetupMfa: !!doc.mustSetupMfa,
          mfaEnabled: !!doc.mfaEnabled,
          mfaMethod: doc.mfaMethod || "",
        },
      });
    } catch (err) {
      console.error("POST /api/auth/mfa/verify error:", err);
      return respond.error(
        res,
        500,
        "mfa_verify_failed",
        "Failed to verify MFA",
      );
    }
  },
);

// POST /api/auth/mfa/disable
router.post("/mfa/disable", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");
    doc.mfaEnabled = false;
    doc.mfaSecret = "";
    doc.mfaMethod = "";
    doc.fprintEnabled = false;
    doc.webauthnCredentials = [];
    await doc.save();
    sendMfaDisabledNotification(doc._id).catch((err) => {
      console.error("Failed to send MFA disabled notification:", err);
    });
    inAppNotificationService
      .createSecurityNotification(doc._id, "mfa_disabled", {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      })
      .catch((err) =>
        console.error("Failed to create auth notification:", err),
      );
    return res.json({ disabled: true });
  } catch (err) {
    console.error("POST /api/auth/mfa/disable error:", err);
    return respond.error(
      res,
      500,
      "mfa_disable_failed",
      "Failed to disable MFA",
    );
  }
});

// GET /api/auth/mfa/status
router.get("/mfa/status", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");
    if (
      doc.mfaDisablePending &&
      doc.mfaDisableScheduledFor &&
      Date.now() >= new Date(doc.mfaDisableScheduledFor).getTime()
    ) {
      doc.mfaEnabled = false;
      doc.mfaSecret = "";
      doc.mfaMethod = "";
      doc.mfaDisablePending = false;
      doc.mfaDisableRequestedAt = null;
      doc.mfaDisableScheduledFor = null;
      doc.fprintEnabled = false;
      doc.webauthnCredentials = [];
      await doc.save();
      sendMfaDisabledNotification(doc._id).catch((err) => {
        console.error("Failed to send MFA disabled notification:", err);
      });
      inAppNotificationService
        .createSecurityNotification(doc._id, "mfa_disabled", {
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        })
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );
    }
    const hasTotp = !!doc.mfaSecret;
    let method = String(doc.mfaMethod || "").toLowerCase();
    if (!hasTotp && !!doc.fprintEnabled) {
      method = "fingerprint";
    }
    const isFingerprint = !!doc.fprintEnabled;

    // Only show TOTP MFA as enabled if mfaMethod is NOT 'passkey'
    // This ensures mutual exclusivity - if passkeys are enabled, TOTP MFA should show as disabled
    const isPasskeyMethod = method === "passkey";
    const totpMfaEnabled =
      !!doc.mfaEnabled && !isPasskeyMethod && (hasTotp || !!doc.fprintEnabled);

    return res.json({
      enabled: totpMfaEnabled,
      disablePending: !!doc.mfaDisablePending,
      scheduledFor: doc.mfaDisableScheduledFor,
      method,
      isFingerprintEnabled: isFingerprint,
      fprintEnabled: !!doc.fprintEnabled,
    });
  } catch (err) {
    console.error("GET /api/auth/mfa/status error:", err);
    return respond.error(
      res,
      500,
      "mfa_status_failed",
      "Failed to get MFA status",
    );
  }
});

// POST /api/auth/mfa/fingerprint/start
router.post("/mfa/fingerprint/start", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");
    const email = doc.email;

    const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
    const expiresAt = Date.now() + ttlMin * 60 * 1000;
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const key = String(email).toLowerCase();
    mfaRequests.set(key, {
      code,
      expiresAt,
      verified: false,
      method: "fingerprint",
    });

    await sendOtp({
      to: email,
      code,
      subject: "Enable fingerprint verification",
      purpose: "mfa_setup",
    });
    return res.json({ sent: true });
  } catch (err) {
    console.error("POST /api/auth/mfa/fingerprint/start error:", err);
    return respond.error(
      res,
      500,
      "fingerprint_start_failed",
      "Failed to send verification code",
    );
  }
});

// POST /api/auth/mfa/fingerprint/verify
router.post(
  "/mfa/fingerprint/verify",
  requireJwt,
  validateBody(verifySchema),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { code } = req.body || {};
      const doc = await User.findById(userId).populate("role");
      if (!doc)
        return respond.error(res, 404, "user_not_found", "User not found");
      const email = doc.email;
      const key = String(email).toLowerCase();
      const reqObj = mfaRequests.get(key);
      if (!reqObj)
        return respond.error(
          res,
          404,
          "fingerprint_request_not_found",
          "No fingerprint verification request found",
        );
      if (Date.now() > reqObj.expiresAt)
        return respond.error(res, 410, "code_expired", "Code expired");
      if (String(reqObj.code) !== String(code))
        return respond.error(res, 401, "invalid_code", "Invalid code");

      doc.mfaEnabled = true;
      doc.fprintEnabled = true;
      const hasTotp = !!doc.mfaSecret;

      // Update mfaMethod to include fingerprint, preserving existing methods (including passkey)
      const currentMethod = String(doc.mfaMethod || "").toLowerCase();
      const methods = new Set();
      if (hasTotp) methods.add("authenticator");
      methods.add("fingerprint");
      if (currentMethod.includes("passkey")) methods.add("passkey");
      doc.mfaMethod = Array.from(methods).join(",");
      doc.tokenFprint = generateToken();
      if (doc.mustSetupMfa) doc.mustSetupMfa = false;
      if (doc.isStaff) {
        doc.isActive = !(doc.mustChangeCredentials || doc.mustSetupMfa);
        // Update accountStatus for staff when onboarding is complete
        if (!doc.mustChangeCredentials && !doc.mustSetupMfa) {
          doc.accountStatus = "active";
        }
      }
      await doc.save();
      mfaRequests.delete(key);
      const roleSlug =
        doc.role && doc.role.slug
          ? doc.role.slug
          : doc.role && doc.role.toString
            ? doc.role.toString()
            : "business_owner";
      logAuditEvent("mfa_verified", doc._id, "User", doc._id, {
        role: roleSlug,
        fieldChanged: "mfa",
        oldValue: "disabled",
        newValue: "enabled",
        method: "fingerprint",
      }).catch(() => {});
      return res.json({
        enabled: true,
        user: {
          id: String(doc._id),
          role: doc.role && doc.role.slug ? doc.role.slug : doc.role,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          phoneNumber: doc.phoneNumber,
          username: doc.username || "",
          office: doc.office || "",
          isActive: doc.isActive !== false,
          isStaff: !!doc.isStaff,
          mustChangeCredentials: !!doc.mustChangeCredentials,
          mustSetupMfa: !!doc.mustSetupMfa,
          mfaEnabled: !!doc.mfaEnabled,
          mfaMethod: doc.mfaMethod || "",
        },
      });
    } catch (err) {
      console.error("POST /api/auth/mfa/fingerprint/verify error:", err);
      return respond.error(
        res,
        500,
        "fingerprint_verify_failed",
        "Failed to verify fingerprint",
      );
    }
  },
);

// POST /api/auth/mfa/fingerprint/disable
router.post("/mfa/fingerprint/disable", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const doc = await User.findById(userId);
    if (!doc)
      return respond.error(res, 404, "user_not_found", "User not found");

    const hasTotp = !!doc.mfaSecret;
    doc.fprintEnabled = false;
    if (hasTotp) {
      doc.mfaEnabled = true;
      doc.mfaMethod = "authenticator";
    } else {
      doc.mfaEnabled = false;
      if (String(doc.mfaMethod || "").toLowerCase() === "fingerprint")
        doc.mfaMethod = "";
    }
    doc.tokenFprint = "";
    await doc.save();
    return res.json({
      fingerprintDisabled: true,
      mfaEnabled: !!doc.mfaEnabled,
    });
  } catch (err) {
    console.error("POST /api/auth/mfa/fingerprint/disable error:", err);
    return respond.error(
      res,
      500,
      "fingerprint_disable_failed",
      "Failed to disable fingerprint",
    );
  }
});

module.exports = router;
