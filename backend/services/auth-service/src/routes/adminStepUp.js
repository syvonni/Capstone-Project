const express = require("express");
const User = require("../models/User");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const {
  requireJwt,
  requireRole,
  signStepUpToken,
} = require("../middleware/auth");
const { verifyTotpWithCounter } = require("../lib/totp");
const { decryptWithHash } = require("../lib/secretCipher");
const webauthnServer = require("@simplewebauthn/server");

const router = express.Router();

const stepUpTOTPSchema = Joi.object({
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

// Step-up challenge store for passkey flow (key: 'step_up_' + userId) — shared with webauthn
const webauthnRouter = require("./webauthn");
const authenticationChallenges =
  webauthnRouter.authenticationChallenges || new Map();

// POST /api/auth/admin/step-up — verify TOTP and return short-lived step-up token
router.post(
  "/admin/step-up",
  requireJwt,
  requireRole(["admin", "lgu_officer"]),
  validateBody(stepUpTOTPSchema),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { code } = req.body || {};
      const doc = await User.findById(userId).populate("role");
      if (!doc)
        return respond.error(res, 404, "user_not_found", "User not found");
      const roleSlug =
        doc.role && doc.role.slug
          ? doc.role.slug
          : doc.role && doc.role.toString
            ? doc.role.toString()
            : "";
      if (roleSlug !== "admin" && roleSlug !== "lgu_officer")
        return respond.error(
          res,
          403,
          "forbidden",
          "Step-up is for authorized roles only",
        );

      if (!doc.mfaSecret)
        return respond.error(
          res,
          400,
          "mfa_not_setup",
          "MFA not set up. Use authenticator or passkey.",
        );
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

      // Update counter to prevent replay (same as mfa/verify)
      doc.mfaLastUsedTotpCounter = resVerify.counter;
      doc.mfaLastUsedTotpAt = new Date();
      await doc.save();

      const { token: stepUpToken, expiresAtMs } = signStepUpToken(userId);
      return res.json({ stepUpToken, expiresAtMs });
    } catch (err) {
      console.error("POST /api/auth/admin/step-up error:", err);
      return respond.error(
        res,
        500,
        "step_up_failed",
        "Step-up verification failed",
      );
    }
  },
);

// POST /api/auth/admin/step-up/start — start passkey step-up (returns WebAuthn options)
router.post(
  "/admin/step-up/start",
  requireJwt,
  requireRole(["admin", "lgu_officer"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const user = await User.findById(userId);
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");
      const hasPasskeys =
        user.webauthnCredentials && user.webauthnCredentials.length > 0;
      if (!hasPasskeys)
        return respond.error(
          res,
          400,
          "no_passkeys",
          "No passkeys registered. Use authenticator code for step-up.",
        );

      const allowCredentials = (user.webauthnCredentials || [])
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

      const stepUpKey = "step_up_" + String(userId);
      authenticationChallenges.set(stepUpKey, challengeToStore);
      return res.json({ publicKey: options });
    } catch (err) {
      console.error("POST /api/auth/admin/step-up/start error:", err);
      return respond.error(
        res,
        500,
        "step_up_start_failed",
        "Failed to start step-up",
      );
    }
  },
);

module.exports = router;
