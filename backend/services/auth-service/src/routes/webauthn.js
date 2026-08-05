// Web Crypto API polyfill for Node.js (required for @simplewebauthn/server)
if (typeof globalThis.crypto === "undefined") {
  const { webcrypto } = require("crypto");
  globalThis.crypto = webcrypto;
}

const express = require("express");
const os = require("os");
const webauthnServer = require("@simplewebauthn/server");
const QRCode = require("qrcode");
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const respond = require("../middleware/respond");
const {
  sendPasskeyAddedNotification,
  sendPasskeyRemovedNotification,
} = require("../lib/notificationService");
const inAppNotificationService = require("../services/notificationService");
const { validateBody, Joi } = require("../middleware/validation");
const {
  requireJwt,
  requireRole,
  signStepUpToken,
} = require("../middleware/auth");

const router = express.Router();

// Helper function to get local network IP address for development
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        // Prefer WiFi/Ethernet connections
        if (
          name.toLowerCase().includes("wifi") ||
          name.toLowerCase().includes("ethernet") ||
          name.toLowerCase().includes("wi-fi") ||
          name.toLowerCase().includes("wireless") ||
          name.toLowerCase().includes("lan")
        ) {
          return iface.address;
        }
      }
    }
  }
  // Fallback: return first non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// In-memory challenge storage keyed by email. For clustered deployments, persist.
const registrationChallenges = new Map();
const authenticationChallenges = new Map();

// Cross-device authentication sessions: sessionId -> { email, challenge, authenticated, user, createdAt }
const crossDeviceSessions = new Map();
const CROSS_DEVICE_SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Cleanup expired sessions periodically (skip in test to avoid open handles)
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of crossDeviceSessions.entries()) {
      if (now - session.createdAt > CROSS_DEVICE_SESSION_TIMEOUT) {
        crossDeviceSessions.delete(sessionId);
      }
    }
  }, 60000); // Check every minute
}

const emailSchema = Joi.object({
  email: Joi.string().email().optional(),
  allowRegistration: Joi.boolean().optional(),
});

// POST /api/auth/webauthn/register/start
router.post(
  "/webauthn/register/start",
  validateBody(emailSchema),
  async (req, res) => {
    try {
      const { email } = req.body || {};

      // Email is optional but recommended for registration
      // If not provided, we can't register (need to know which user account)
      if (!email) {
        return respond.error(
          res,
          400,
          "email_required",
          "Email is required for passkey registration. Please provide your email address.",
        );
      }

      // Normalize email to lowercase for consistent lookup
      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail }).populate(
        "role",
      );
      if (!user) {
        console.log("[WebAuthn] User not found for email:", normalizedEmail);
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      // Convert user ID to Uint8Array (simplewebauthn v13 expects Uint8Array or Buffer)
      // Use the user's MongoDB _id as bytes
      const userIdString = String(user._id);
      const userId = new Uint8Array(Buffer.from(userIdString, "utf8"));

      const rpName = String(
        process.env.WEBAUTHN_RP_NAME ||
          process.env.DEFAULT_FROM_EMAIL ||
          "Capstone",
      )
        .replace(/<.*?>/g, "")
        .trim();

      // Determine rpID from origin or use environment variable
      // rpID should be the domain (e.g., 'localhost' or 'example.com') without protocol/port
      // IMPORTANT: This must match the rpID used during authentication
      const rpID = process.env.WEBAUTHN_RPID || "localhost";

      console.log("[WebAuthn] Registration start:", {
        email: normalizedEmail,
        rpID: rpID,
        rpName: rpName,
        existingCredentialsCount: (user.webauthnCredentials || []).length,
      });

      // Prepare excludeCredentials - simplewebauthn v13 expects id as base64url string, not Buffer
      const rawCreds = user.webauthnCredentials || [];
      const excludeCredentials = rawCreds
        .map((c) => {
          if (!c || typeof c.credId !== "string" || !c.credId.trim())
            return null;
          const id = String(c.credId).trim();
          // Library validates base64url; skip entries that look invalid to avoid 500
          if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
          return {
            id,
            type: "public-key",
            transports: Array.isArray(c.transports) ? c.transports : [],
          };
        })
        .filter(Boolean);

      // Generate registration options
      // Note: In simplewebauthn v13, generateRegistrationOptions is ASYNC and returns a Promise
      let options;
      try {
        options = await webauthnServer.generateRegistrationOptions({
          rpName,
          rpID: rpID,
          userID: userId,
          userName: user.email,
          timeout: 60000,
          attestationType: "none",
          excludeCredentials:
            excludeCredentials.length > 0 ? excludeCredentials : undefined,
          authenticatorSelection: {
            userVerification: "preferred",
            residentKey: "preferred",
          },
        });
      } catch (genErr) {
        console.error("generateRegistrationOptions threw an error:", genErr);
        console.error("Error stack:", genErr.stack);
        console.error("Parameters used:", {
          rpName,
          rpID,
          userIDType: typeof userId,
          userIDLength: userId.length,
          userName: user.email,
          excludeCredentialsCount: excludeCredentials.length,
        });
        throw genErr;
      }

      // Debug: log the options structure
      console.log("generateRegistrationOptions result:", {
        hasChallenge: !!options.challenge,
        challengeType: typeof options.challenge,
        challengeValue: options.challenge
          ? String(options.challenge).substring(0, 20) + "..."
          : null,
        hasUser: !!options.user,
        userKeys: options.user ? Object.keys(options.user) : null,
        rpID: options.rpID,
      });

      // Store challenge for verification
      if (!options.challenge) {
        console.error(
          "generateRegistrationOptions returned options without challenge:",
          {
            keys: Object.keys(options),
            options: options,
          },
        );
        return respond.error(
          res,
          500,
          "webauthn_challenge_missing",
          "Failed to generate registration challenge",
        );
      }

      // Store challenge - simplewebauthn returns it as a base64url string or Buffer
      // We'll store it as-is since verifyRegistrationResponse can handle both formats
      // But ensure it's in a format that can be serialized/deserialized correctly
      let challengeToStore = options.challenge;
      if (Buffer.isBuffer(challengeToStore)) {
        // Keep as Buffer for verification
        // challengeToStore already in correct format
      } else if (typeof challengeToStore === "string") {
        // If it's already a string (base64url), keep it as is
        // challengeToStore already in correct format
      } else {
        // Convert to Buffer if it's Uint8Array or other format
        challengeToStore = Buffer.from(challengeToStore);
      }

      // Store challenge with normalized email
      registrationChallenges.set(normalizedEmail, challengeToStore);

      // Ensure challenge and user.id are strings for JSON serialization
      // simplewebauthn should return them as base64url strings, but we'll ensure they're strings
      const serializedOptions = {
        ...options,
        challenge: String(options.challenge), // Ensure it's a string
      };

      // Handle user.id if it exists - convert Buffer/Uint8Array to base64url string
      if (options.user) {
        let userIdString;
        if (options.user.id instanceof Buffer) {
          userIdString = options.user.id.toString("base64url");
        } else if (options.user.id instanceof Uint8Array) {
          userIdString = Buffer.from(options.user.id).toString("base64url");
        } else {
          userIdString = String(options.user.id);
        }

        serializedOptions.user = {
          ...options.user,
          id: userIdString,
        };
      }

      // Return options (simplewebauthn already uses base64url for challenge etc.)
      return res.json({ publicKey: serializedOptions });
    } catch (err) {
      console.error("webauthn register start error", err);
      console.error("Error stack:", err.stack);
      return respond.error(
        res,
        500,
        "webauthn_register_start_failed",
        "Failed to start WebAuthn registration: " + String(err.message),
      );
    }
  },
);

const registrationCompleteSchema = Joi.object({
  email: Joi.string().email().optional(),
  credential: Joi.object().required(),
});

// POST /api/auth/webauthn/register/complete
router.post(
  "/webauthn/register/complete",
  validateBody(registrationCompleteSchema),
  async (req, res) => {
    try {
      const { email, credential } = req.body || {};

      // Email is required for registration completion to identify the user
      if (!email) {
        return respond.error(
          res,
          400,
          "email_required",
          "Email is required to complete passkey registration.",
        );
      }

      // Normalize email to lowercase for consistent lookup
      const normalizedEmail = String(email).toLowerCase().trim();
      const storedChallenge = registrationChallenges.get(normalizedEmail);
      if (!storedChallenge) {
        console.log(
          "[WebAuthn] No registration challenge found for:",
          normalizedEmail,
        );
        return respond.error(
          res,
          400,
          "challenge_missing",
          "No registration in progress",
        );
      }

      // Ensure challenge is in the correct format for verification
      // In simplewebauthn v13, verifyRegistrationResponse expects the challenge as a base64url string
      let expectedChallenge = storedChallenge;
      if (Buffer.isBuffer(storedChallenge)) {
        // Convert Buffer to base64url string
        expectedChallenge = storedChallenge.toString("base64url");
      } else if (storedChallenge instanceof Uint8Array) {
        // Convert Uint8Array to base64url string
        expectedChallenge = Buffer.from(storedChallenge).toString("base64url");
      } else if (typeof storedChallenge !== "string") {
        // Convert other types to base64url string
        expectedChallenge = Buffer.from(storedChallenge).toString("base64url");
      }
      // If it's already a string, use it as-is (should be base64url)

      // Use frontend URL for origin validation - support multiple dev ports
      // Vite may use 5173, 5174, 5175, 5176, etc. depending on availability
      const defaultOrigin = `https://localhost:${process.env.FRONTEND_PORT || 5173}`;
      const expectedOrigin =
        process.env.WEBAUTHN_ORIGIN ||
        process.env.FRONTEND_URL ||
        defaultOrigin;

      // Also accept common dev server ports dynamically
      const requestOrigin =
        credential?.clientExtensionResults?.origin || expectedOrigin;
      const allowedOrigins = [
        expectedOrigin,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "http://localhost:5180",
        "https://localhost:5173",
        "https://localhost:5174",
        "https://localhost:5175",
        "https://localhost:5176",
        "https://localhost:5177",
        "https://localhost:5178",
        "https://localhost:5179",
        "https://localhost:5180",
      ].filter(Boolean);

      // Validate origin flexibly in dev mode
      const isValidOrigin =
        allowedOrigins.includes(requestOrigin) ||
        allowedOrigins.some((origin) => requestOrigin?.startsWith(origin)) ||
        (process.env.NODE_ENV === "development" &&
          (requestOrigin?.includes("localhost:517") ||
            requestOrigin?.includes("192.168.18.12:517")));
      const expectedRPID = process.env.WEBAUTHN_RPID || "localhost";

      console.log("[WebAuthn] Register complete:", {
        expectedOrigin,
        expectedRPID,
        email,
        hasCredential: !!credential,
        credentialKeys: credential ? Object.keys(credential) : [],
        credentialId: credential?.id,
        credentialType: credential?.type,
        hasResponse: !!credential?.response,
        responseKeys: credential?.response
          ? Object.keys(credential.response)
          : [],
        expectedOrigin,
        expectedRPID,
        hasExpectedChallenge: !!expectedChallenge,
        challengeType:
          expectedChallenge?.constructor?.name || typeof expectedChallenge,
      });

      // Validate credential structure before verification
      if (!credential) {
        return respond.error(
          res,
          400,
          "invalid_credential",
          "Credential is missing",
        );
      }

      if (!credential.id || !credential.rawId || !credential.type) {
        return respond.error(
          res,
          400,
          "invalid_credential",
          "Credential missing required fields (id, rawId, type)",
        );
      }

      if (!credential.response) {
        return respond.error(
          res,
          400,
          "invalid_credential",
          "Credential response is missing",
        );
      }

      if (
        !credential.response.clientDataJSON ||
        !credential.response.attestationObject
      ) {
        return respond.error(
          res,
          400,
          "invalid_credential",
          "Credential response missing required fields (clientDataJSON, attestationObject)",
        );
      }

      // Use credential as-is from request (it should already be in the correct format)
      // simplewebauthn v13 expects RegistrationResponseJSON format with base64url-encoded strings
      // Ensure all required fields are present and are strings
      if (typeof credential.id !== "string") {
        credential.id = String(credential.id);
      }
      if (typeof credential.rawId !== "string") {
        credential.rawId = String(credential.rawId);
      }
      if (typeof credential.type !== "string") {
        credential.type = String(credential.type || "public-key");
      }
      if (credential.response) {
        if (typeof credential.response.clientDataJSON !== "string") {
          credential.response.clientDataJSON = String(
            credential.response.clientDataJSON,
          );
        }
        if (typeof credential.response.attestationObject !== "string") {
          credential.response.attestationObject = String(
            credential.response.attestationObject,
          );
        }
      }

      console.log("[WebAuthn] Credential prepared for verification:", {
        hasId: !!credential.id,
        hasRawId: !!credential.rawId,
        type: credential.type,
        hasResponse: !!credential.response,
        hasClientDataJSON: !!credential.response?.clientDataJSON,
        hasAttestationObject: !!credential.response?.attestationObject,
        challengeType: typeof expectedChallenge,
        challengeLength: expectedChallenge?.length,
        credentialStructure: {
          idType: typeof credential.id,
          rawIdType: typeof credential.rawId,
          responseType: typeof credential.response,
          clientDataJSONType: typeof credential.response?.clientDataJSON,
          attestationObjectType: typeof credential.response?.attestationObject,
        },
      });

      let verification;
      try {
        // In simplewebauthn v13, the parameter is 'response', not 'credential'
        // Use the first allowed origin for verification, or skip strict origin check in dev
        const verifyOptions = {
          response: credential,
          expectedChallenge,
          expectedRPID,
        };

        // In development, we may need to be more flexible with origins due to Vite port changes
        if (process.env.NODE_ENV === "development") {
          // In dev mode, accept any localhost:517x origin
          verifyOptions.expectedOrigin = allowedOrigins;
        } else {
          verifyOptions.expectedOrigin = expectedOrigin;
        }

        verification =
          await webauthnServer.verifyRegistrationResponse(verifyOptions);
      } catch (verifyErr) {
        console.error(
          "[WebAuthn] verifyRegistrationResponse threw an error:",
          verifyErr,
        );
        console.error("[WebAuthn] Error stack:", verifyErr.stack);
        console.error(
          "[WebAuthn] Credential structure:",
          JSON.stringify({
            id: credential.id?.substring(0, 20) + "...",
            rawId: credential.rawId?.substring(0, 20) + "...",
            type: credential.type,
            hasResponse: !!credential.response,
            response: credential.response
              ? {
                  hasClientDataJSON: !!credential.response.clientDataJSON,
                  hasAttestationObject: !!credential.response.attestationObject,
                  clientDataJSONType: typeof credential.response.clientDataJSON,
                  attestationObjectType:
                    typeof credential.response.attestationObject,
                }
              : null,
          }),
        );
        throw verifyErr;
      }

      if (!verification.verified) {
        console.error("[WebAuthn] Registration verification failed:", {
          verified: verification.verified,
          error: verification.error,
        });
        return respond.error(
          res,
          401,
          "webauthn_verification_failed",
          verification.error?.message || "Attestation verification failed",
        );
      }

      // In simplewebauthn v13, registrationInfo has a credential object
      const { registrationInfo } = verification;
      if (!registrationInfo || !registrationInfo.credential) {
        console.error("[WebAuthn] Invalid verification result structure:", {
          hasRegistrationInfo: !!registrationInfo,
          registrationInfoKeys: registrationInfo
            ? Object.keys(registrationInfo)
            : [],
          verificationKeys: Object.keys(verification),
        });
        return respond.error(
          res,
          500,
          "webauthn_invalid_response",
          "Invalid registration verification response structure",
        );
      }

      const regCredential = registrationInfo.credential;
      const credID = regCredential.id.toString("base64url");

      // Ensure publicKey is converted to base64 string correctly
      let publicKey;
      if (Buffer.isBuffer(regCredential.publicKey)) {
        publicKey = regCredential.publicKey.toString("base64");
      } else if (regCredential.publicKey instanceof Uint8Array) {
        publicKey = Buffer.from(regCredential.publicKey).toString("base64");
      } else if (typeof regCredential.publicKey === "string") {
        // Already a string - verify it's base64 format
        publicKey = regCredential.publicKey;
      } else {
        // Try to convert to Buffer first, then to base64
        try {
          publicKey = Buffer.from(regCredential.publicKey).toString("base64");
        } catch (e) {
          console.error("[WebAuthn] Failed to convert publicKey to base64:", {
            publicKeyType: typeof regCredential.publicKey,
            publicKeyValue: regCredential.publicKey,
            error: e.message,
          });
          return respond.error(
            res,
            500,
            "webauthn_invalid_publickey",
            "Failed to process public key",
          );
        }
      }

      // Validate publicKey is a proper base64 string (not comma-separated)
      if (publicKey.includes(",") && /^\d+(,\d+)*$/.test(publicKey)) {
        console.error(
          "[WebAuthn] ERROR: publicKey is being stored as comma-separated numbers instead of base64!",
          {
            publicKeyType: typeof publicKey,
            publicKeyLength: publicKey.length,
            publicKeyPreview: publicKey.substring(0, 50),
            regCredentialPublicKeyType: typeof regCredential.publicKey,
            isBuffer: Buffer.isBuffer(regCredential.publicKey),
            isUint8Array: regCredential.publicKey instanceof Uint8Array,
          },
        );
        return respond.error(
          res,
          500,
          "webauthn_invalid_publickey",
          "Public key format error during registration",
        );
      }

      // Ensure it's a string (not an array or object)
      publicKey = String(publicKey);

      console.log("[WebAuthn] Storing credential:", {
        credId: credID.substring(0, 30) + "...",
        publicKeyType: typeof publicKey,
        publicKeyLength: publicKey.length,
        publicKeyPreview: publicKey.substring(0, 50) + "...",
        counter: regCredential.counter || 0,
        transports: regCredential.transports || [],
      });

      // Use normalized email for user lookup
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        console.log("[WebAuthn] User not found for email:", normalizedEmail);
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      user.webauthnCredentials = user.webauthnCredentials || [];

      // Create a plain object to ensure Mongoose doesn't serialize it incorrectly
      const newCredential = {
        credId: String(credID),
        publicKey: String(publicKey), // Explicitly ensure it's a string
        counter: Number(regCredential.counter || 0),
        transports: Array.isArray(regCredential.transports)
          ? regCredential.transports.map(String)
          : [],
      };

      // Validate before pushing
      if (
        newCredential.publicKey.includes(",") &&
        /^\d+(,\d+)*$/.test(newCredential.publicKey)
      ) {
        console.error(
          "[WebAuthn] CRITICAL: publicKey is still comma-separated after conversion!",
          {
            originalType: typeof regCredential.publicKey,
            convertedType: typeof publicKey,
            convertedValue: publicKey.substring(0, 100),
          },
        );
        return respond.error(
          res,
          500,
          "webauthn_invalid_publickey",
          "Public key format error - please try again",
        );
      }

      user.webauthnCredentials.push(newCredential);
      user.mfaEnabled = true;
      user.mfaReEnrollmentRequired = false;

      // Enforce mutual exclusivity: When passkey is registered, disable TOTP
      // This prevents both MFA types from being active simultaneously
      if (user.mfaSecret) {
        console.log(
          `[WebAuthn] User: ${user.email} - Disabling TOTP due to passkey registration`,
        );
        user.mfaSecret = "";
        user.mfaEnabled = false; // Will be set to true below
      }

      // Resolve role for admin check and MFA activation
      let roleSlug = "";
      try {
        if (user.role && user.role.slug) {
          roleSlug = user.role.slug;
        } else if (user.role) {
          const roleDoc = await Role.findById(user.role).lean();
          roleSlug = roleDoc?.slug || "";
        }
      } catch (roleErr) {
        console.warn(
          "[WebAuthn] Failed to load role for MFA activation:",
          roleErr.message,
        );
      }

      // Set mfaMethod to passkey only (TOTP cleared above)
      user.mfaMethod = "passkey";
      user.mfaEnabled = true; // Re-enable after TOTP clear

      // If this user is staff/admin and was pending MFA, clear the flag and
      // activate the account unless credentials still need to be changed.
      const requiresMfa = user.isStaff === true || roleSlug === "admin";
      if (user.mustSetupMfa || requiresMfa) {
        user.mustSetupMfa = false;
        if (user.isStaff) {
          user.isActive = !(user.mustChangeCredentials === true);
          // Update accountStatus for staff when onboarding is complete
          if (!user.mustChangeCredentials && !user.mustSetupMfa) {
            user.accountStatus = "active";
          }
        }
      }

      await user.save();

      sendPasskeyAddedNotification(user._id).catch((err) => {
        console.error("Failed to send passkey added notification:", err);
      });

      inAppNotificationService
        .createSecurityNotification(user._id, "passkey_added", {
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        })
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );

      // Verify it was saved correctly
      const savedUser = await User.findOne({ email: normalizedEmail });
      const savedCred = savedUser.webauthnCredentials.find(
        (c) => c.credId === credID,
      );
      if (
        savedCred &&
        savedCred.publicKey.includes(",") &&
        /^\d+(,\d+)*$/.test(savedCred.publicKey)
      ) {
        console.error(
          "[WebAuthn] CRITICAL: publicKey was saved as comma-separated despite conversion!",
          {
            savedPublicKey: savedCred.publicKey.substring(0, 100),
          },
        );
        // Try to fix it by updating directly
        savedCred.publicKey = publicKey;
        await savedUser.save();
      }

      // Delete challenge using normalized email
      registrationChallenges.delete(normalizedEmail);
      return res.json({ registered: true });
    } catch (err) {
      console.error("[WebAuthn] Register complete error:", err);
      console.error("[WebAuthn] Error stack:", err.stack);
      console.error("[WebAuthn] Error details:", {
        message: err.message,
        name: err.name,
        code: err.code,
      });
      return respond.error(
        res,
        500,
        "webauthn_register_complete_failed",
        `Failed to complete WebAuthn registration: ${err.message}`,
      );
    }
  },
);

const authStartSchema = Joi.object({
  email: Joi.alternatives()
    .try(Joi.string().email(), Joi.string().allow(""), Joi.string().valid(null))
    .optional(),
});

// POST /api/auth/webauthn/authenticate/start
router.post(
  "/webauthn/authenticate/start",
  validateBody(authStartSchema),
  async (req, res) => {
    try {
      const { email } = req.body || {};

      // If email is provided, use it to find user and filter credentials
      let allowCredentials = [];
      if (email && email.trim()) {
        // Normalize email to lowercase for consistent lookup
        const normalizedEmail = String(email).toLowerCase().trim();

        // Validate email format before querying database
        if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
          // Invalid email format - return error but don't treat as critical
          return respond.error(
            res,
            400,
            "invalid_email_format",
            "Invalid email format",
          );
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
          // User not found - this is expected for new users, return gracefully
          return respond.error(res, 404, "user_not_found", "User not found");
        }

        // Check if user has passkeys registered
        const hasPasskeys =
          user.webauthnCredentials && user.webauthnCredentials.length > 0;
        console.log(
          "[WebAuthn] Checking passkeys for:",
          normalizedEmail,
          "- Has passkeys:",
          hasPasskeys,
          "- Count:",
          user.webauthnCredentials?.length || 0,
        );

        if (!hasPasskeys) {
          console.log("[WebAuthn] No passkeys found for:", normalizedEmail);
          return respond.error(
            res,
            400,
            "no_passkeys",
            "No passkeys registered for this account. Please register a passkey first.",
          );
        }

        // Build allowCredentials from user's registered passkeys
        allowCredentials = (user.webauthnCredentials || [])
          .map((c) => {
            // Ensure credId is a string (base64url format)
            const credId = String(c.credId || "").trim();
            if (!credId) return null;

            return {
              id: credId, // Pass as string - simplewebauthn will handle conversion internally
              type: "public-key",
              transports: c.transports || [],
            };
          })
          .filter(Boolean); // Remove any null entries
      }
      // If email is not provided, allowCredentials will be empty array
      // This enables userless/conditional UI authentication where the browser
      // will prompt for any available passkey

      // Ensure rpID matches what was used during registration
      // This is critical - if rpID doesn't match, the browser won't find the passkey
      const rpID = process.env.WEBAUTHN_RPID || "localhost";

      const options = await webauthnServer.generateAuthenticationOptions({
        rpID: rpID, // Explicitly set rpID to match registration
        timeout: 60000,
        allowCredentials:
          allowCredentials.length > 0 ? allowCredentials : undefined, // undefined enables userless auth
        userVerification: "preferred",
      });

      console.log("[WebAuthn] Authentication options generated:", {
        rpID: options.rpID,
        allowCredentialsCount: allowCredentials.length,
        hasEmail: !!email,
      });

      // Store challenge as base64url string (consistent with registration)
      // verifyAuthenticationResponse expects challenge as base64url string
      let challengeToStore = options.challenge;
      if (Buffer.isBuffer(challengeToStore)) {
        // Convert Buffer to base64url string
        challengeToStore = challengeToStore.toString("base64url");
      } else if (challengeToStore instanceof Uint8Array) {
        // Convert Uint8Array to base64url string
        challengeToStore = Buffer.from(challengeToStore).toString("base64url");
      } else if (typeof challengeToStore !== "string") {
        // Convert other types to base64url string
        challengeToStore = Buffer.from(challengeToStore).toString("base64url");
      }
      // If it's already a string, use it as-is (should be base64url)

      // Store challenge with email if provided, otherwise use a generic key for userless auth
      const challengeKey = email ? String(email).toLowerCase() : "userless";
      authenticationChallenges.set(challengeKey, challengeToStore);
      return res.json({ publicKey: options });
    } catch (err) {
      console.error("webauthn authenticate start error", err);
      return respond.error(
        res,
        500,
        "webauthn_auth_start_failed",
        "Failed to start WebAuthn authentication",
      );
    }
  },
);

const authCompleteSchema = Joi.object({
  email: Joi.string().email().optional(),
  credential: Joi.object().required(),
  purpose: Joi.string()
    .valid(
      "admin_step_up",
      "mfa_disable",
      "mfa_disable_undo",
      "password_change",
      "email_change",
      "delete_account",
    )
    .optional(),
});

const mfaStepUpVerify = require("../lib/mfaStepUpVerify");

// Helper: run step-up auth (JWT + role checks where needed) and set req._stepUp for supported purposes.
function withStepUpIfNeeded(req, res, rest) {
  const purpose = req.body.purpose;
  if (purpose === "admin_step_up") {
    return requireJwt(req, res, () => {
      requireRole(["admin", "lgu_officer"])(req, res, async () => {
        try {
          const stepUpKey = "step_up_" + req._userId;
          let expectedChallenge = authenticationChallenges.get(stepUpKey);
          if (!expectedChallenge) {
            return respond.error(
              res,
              428,
              "challenge_missing",
              "Step-up challenge expired. Start step-up again.",
            );
          }
          if (Buffer.isBuffer(expectedChallenge))
            expectedChallenge = expectedChallenge.toString("base64url");
          else if (expectedChallenge instanceof Uint8Array)
            expectedChallenge =
              Buffer.from(expectedChallenge).toString("base64url");
          else if (typeof expectedChallenge !== "string")
            expectedChallenge =
              Buffer.from(expectedChallenge).toString("base64url");
          const user = await User.findById(req._userId).populate("role");
          if (!user)
            return respond.error(res, 404, "user_not_found", "User not found");
          const cred = req.body.credential || {};
          const receivedCredId = String(cred.id || cred.rawId || "").trim();
          const receivedRawId = String(cred.rawId || cred.id || "").trim();
          const credRecord = (user.webauthnCredentials || []).find((c) => {
            if (!c || !c.credId) return false;
            const storedCredId = String(c.credId).trim();
            if (
              storedCredId === receivedCredId ||
              storedCredId === receivedRawId
            )
              return true;
            const n = storedCredId.replace(/=+$/, "");
            return (
              n === receivedCredId.replace(/=+$/, "") ||
              n === receivedRawId.replace(/=+$/, "")
            );
          });
          if (!credRecord)
            return respond.error(
              res,
              404,
              "credential_not_found",
              "Credential not recognized.",
            );
          req._stepUp = { expectedChallenge, user, credRecord };
          rest();
        } catch (e) {
          console.error("[WebAuthn] admin step-up prepare error:", e);
          return respond.error(
            res,
            500,
            "step_up_failed",
            "Step-up verification failed",
          );
        }
      });
    });
  }
  if (
    purpose === "mfa_disable" ||
    purpose === "mfa_disable_undo" ||
    purpose === "password_change" ||
    purpose === "email_change" ||
    purpose === "delete_account"
  ) {
    return requireJwt(req, res, async () => {
      try {
        let key = "mfa_undo_" + req._userId;
        if (purpose === "mfa_disable") key = "mfa_disable_" + req._userId;
        if (purpose === "password_change") key = "pwd_change_" + req._userId;
        if (purpose === "email_change") key = "email_change_" + req._userId;
        if (purpose === "delete_account") key = "delete_account_" + req._userId;
        let expectedChallenge = authenticationChallenges.get(key);
        if (!expectedChallenge) {
          return respond.error(
            res,
            428,
            "challenge_missing",
            "Verification challenge expired. Please try again.",
          );
        }
        if (Buffer.isBuffer(expectedChallenge))
          expectedChallenge = expectedChallenge.toString("base64url");
        else if (expectedChallenge instanceof Uint8Array)
          expectedChallenge =
            Buffer.from(expectedChallenge).toString("base64url");
        else if (typeof expectedChallenge !== "string")
          expectedChallenge =
            Buffer.from(expectedChallenge).toString("base64url");
        const user = await User.findById(req._userId).populate("role");
        if (!user)
          return respond.error(res, 404, "user_not_found", "User not found");
        const cred = req.body.credential || {};
        const receivedCredId = String(cred.id || cred.rawId || "").trim();
        const receivedRawId = String(cred.rawId || cred.id || "").trim();
        const credRecord = (user.webauthnCredentials || []).find((c) => {
          if (!c || !c.credId) return false;
          const storedCredId = String(c.credId).trim();
          if (storedCredId === receivedCredId || storedCredId === receivedRawId)
            return true;
          const n = storedCredId.replace(/=+$/, "");
          return (
            n === receivedCredId.replace(/=+$/, "") ||
            n === receivedRawId.replace(/=+$/, "")
          );
        });
        if (!credRecord)
          return respond.error(
            res,
            404,
            "credential_not_found",
            "Credential not recognized.",
          );
        req._stepUp = { expectedChallenge, user, credRecord };
        rest();
      } catch (e) {
        console.error("[WebAuthn] mfa step-up prepare error:", e);
        return respond.error(
          res,
          500,
          "verification_failed",
          "Verification failed",
        );
      }
    });
  }
  return rest();
}

// POST /api/auth/webauthn/authenticate/complete
router.post(
  "/webauthn/authenticate/complete",
  validateBody(authCompleteSchema),
  async (req, res) => {
    withStepUpIfNeeded(req, res, async () => {
      try {
        const { email, credential } = req.body || {};

        // Validate credential structure
        if (!credential) {
          console.error("[WebAuthn] Missing credential in request body");
          return respond.error(
            res,
            400,
            "invalid_credential",
            "Credential is missing",
          );
        }

        if (!credential.id && !credential.rawId) {
          console.error("[WebAuthn] Credential missing id and rawId");
          return respond.error(
            res,
            400,
            "invalid_credential",
            "Credential missing required fields (id or rawId)",
          );
        }

        if (!credential.response) {
          console.error("[WebAuthn] Credential missing response");
          return respond.error(
            res,
            400,
            "invalid_credential",
            "Credential response is missing",
          );
        }

        // When purpose is admin_step_up, req._stepUp was set by withStepUpIfNeeded's async continuation below
        let expectedChallenge;
        let user = null;
        let credRecord = null;

        if (
          (req.body.purpose === "admin_step_up" ||
            req.body.purpose === "mfa_disable" ||
            req.body.purpose === "mfa_disable_undo" ||
            req.body.purpose === "password_change" ||
            req.body.purpose === "email_change" ||
            req.body.purpose === "delete_account") &&
          req._stepUp
        ) {
          expectedChallenge = req._stepUp.expectedChallenge;
          user = req._stepUp.user;
          credRecord = req._stepUp.credRecord;
        } else {
          // Get challenge - use email if provided, otherwise use 'userless' key
          const challengeKey = email ? String(email).toLowerCase() : "userless";
          expectedChallenge = authenticationChallenges.get(challengeKey);
          if (!expectedChallenge) {
            console.error("[WebAuthn] No challenge found for:", challengeKey);
            return respond.error(
              res,
              400,
              "challenge_missing",
              "No authentication in progress",
            );
          }
        }

        // Ensure challenge is in base64url string format for verification
        // verifyAuthenticationResponse expects challenge as base64url string (same as verifyRegistrationResponse)
        if (Buffer.isBuffer(expectedChallenge)) {
          // Convert Buffer to base64url string
          expectedChallenge = expectedChallenge.toString("base64url");
        } else if (expectedChallenge instanceof Uint8Array) {
          // Convert Uint8Array to base64url string
          expectedChallenge =
            Buffer.from(expectedChallenge).toString("base64url");
        } else if (typeof expectedChallenge !== "string") {
          // Convert other types to base64url string
          expectedChallenge =
            Buffer.from(expectedChallenge).toString("base64url");
        }
        // If it's already a string, use it as-is (should be base64url)

        // Normalize credential IDs for comparison (both stored and received should be base64url strings)
        const receivedCredId = String(
          credential.id || credential.rawId || "",
        ).trim();
        const receivedRawId = String(
          credential.rawId || credential.id || "",
        ).trim();

        // Find user and credential record (skip when step-up already set them)
        if (!req._stepUp) {
          if (email) {
            // If email is provided, find user by email
            user = await User.findOne({ email }).populate("role");
            if (!user)
              return respond.error(
                res,
                404,
                "user_not_found",
                "User not found",
              );

            // Find credential in user's registered credentials
            const userCreds = user.webauthnCredentials || [];
            credRecord = userCreds.find((c) => {
              if (!c || !c.credId) return false;
              const storedCredId = String(c.credId).trim();

              // Direct comparison
              if (
                storedCredId === receivedCredId ||
                storedCredId === receivedRawId
              )
                return true;

              // Compare without padding (base64url padding can vary)
              const normalizedStored = storedCredId.replace(/=+$/, "");
              const normalizedReceived = receivedCredId.replace(/=+$/, "");
              const normalizedRaw = receivedRawId.replace(/=+$/, "");

              if (
                normalizedStored === normalizedReceived ||
                normalizedStored === normalizedRaw
              )
                return true;

              return false;
            });
          } else {
            // Userless authentication: find user by credential ID
            // Search all users for a matching credential
            const allUsers = await User.find({
              "webauthnCredentials.credId": { $exists: true },
            }).populate("role");

            for (const u of allUsers) {
              const userCreds = u.webauthnCredentials || [];
              const found = userCreds.find((c) => {
                if (!c || !c.credId) return false;
                const storedCredId = String(c.credId).trim();

                // Direct comparison
                if (
                  storedCredId === receivedCredId ||
                  storedCredId === receivedRawId
                )
                  return true;

                // Compare without padding
                const normalizedStored = storedCredId.replace(/=+$/, "");
                const normalizedReceived = receivedCredId.replace(/=+$/, "");
                const normalizedRaw = receivedRawId.replace(/=+$/, "");

                if (
                  normalizedStored === normalizedReceived ||
                  normalizedStored === normalizedRaw
                )
                  return true;

                return false;
              });

              if (found) {
                user = u;
                credRecord = found;
                break;
              }
            }
          }
        }

        if (!user || !credRecord) {
          console.error("[WebAuthn] Credential not found:", {
            email: email || "userless",
            receivedCredId: receivedCredId.substring(0, 30) + "...",
            receivedRawId: receivedRawId.substring(0, 30) + "...",
          });
          // If no email was provided (userless auth), this might mean no passkeys are registered
          // Return a more helpful error code
          if (!email) {
            return respond.error(
              res,
              400,
              "no_passkeys",
              "No passkeys found. Please register a passkey first.",
            );
          }
          return respond.error(
            res,
            404,
            "credential_not_found",
            "Credential not recognized",
          );
        }

        // Validate credential record has required fields
        if (!credRecord.publicKey) {
          console.error(
            "[WebAuthn] Credential record missing publicKey:",
            credRecord,
          );
          return respond.error(
            res,
            500,
            "invalid_credential_record",
            "Credential record is invalid",
          );
        }

        // Ensure counter exists and is a number (default to 0 if missing)
        if (credRecord.counter === undefined || credRecord.counter === null) {
          credRecord.counter = 0;
        }

        // In simplewebauthn v13, the client response parameter is 'response', not 'credential'
        // Use frontend URL for origin validation
        const expectedOrigin =
          process.env.WEBAUTHN_ORIGIN ||
          process.env.FRONTEND_URL ||
          `http://localhost:${process.env.FRONTEND_PORT || 5173}`;
        const expectedRPID = process.env.WEBAUTHN_RPID || "localhost";

        // Ensure authenticator object has all required fields
        // Use authenticator parameter with credentialPublicKey and credentialID as Buffers
        // This matches the working cross-device authentication format
        if (!credRecord.credId) {
          console.error(
            "[WebAuthn] Credential record missing credId:",
            credRecord,
          );
          return respond.error(
            res,
            500,
            "invalid_credential_record",
            "Credential record is missing credId",
          );
        }

        // Ensure counter is properly set (critical for library)
        let counterValue = 0;
        if (typeof credRecord.counter === "number") {
          counterValue = credRecord.counter;
        } else if (typeof credRecord.counter === "string") {
          counterValue = parseInt(credRecord.counter, 10);
          if (isNaN(counterValue)) counterValue = 0;
        } else if (
          credRecord.counter === undefined ||
          credRecord.counter === null
        ) {
          counterValue = 0;
        }

        // Log credential record details for debugging
        console.log("[WebAuthn] Credential record details:", {
          hasCredId: !!credRecord.credId,
          credIdType: typeof credRecord.credId,
          credIdLength: credRecord.credId?.length,
          credIdPreview: credRecord.credId?.substring(0, 30) + "...",
          hasPublicKey: !!credRecord.publicKey,
          publicKeyType: typeof credRecord.publicKey,
          publicKeyLength: credRecord.publicKey?.length,
          counter: credRecord.counter,
          counterType: typeof credRecord.counter,
          counterValue: counterValue,
          credRecordKeys: Object.keys(credRecord),
          credRecordFull: JSON.stringify(credRecord, null, 2),
        });

        // Handle publicKey format - it might be stored as base64 string or comma-separated numbers
        let credentialPublicKeyBuffer;
        if (typeof credRecord.publicKey === "string") {
          // Check if it's a comma-separated string of numbers (corrupted/malformed data)
          if (
            credRecord.publicKey.includes(",") &&
            /^\d+(,\d+)*$/.test(credRecord.publicKey)
          ) {
            // This is corrupted data - the publicKey should be base64, not comma-separated
            // Convert comma-separated string to Buffer as a workaround
            const numbers = credRecord.publicKey
              .split(",")
              .map((n) => parseInt(n, 10));
            credentialPublicKeyBuffer = Buffer.from(numbers);
            console.warn(
              "[WebAuthn] WARNING: publicKey is stored as comma-separated numbers (corrupted format).",
              {
                originalLength: credRecord.publicKey.length,
                bufferLength: credentialPublicKeyBuffer.length,
                expectedLength: "~138 bytes for CBOR-encoded public key",
                actualLength: `${credentialPublicKeyBuffer.length} bytes`,
                recommendation:
                  "Please re-register this passkey to fix the data format",
              },
            );

            // If the buffer is too small (less than 100 bytes), it's likely corrupted
            if (credentialPublicKeyBuffer.length < 100) {
              console.error(
                "[WebAuthn] publicKey buffer is too small - data is corrupted",
              );
              return respond.error(
                res,
                500,
                "corrupted_credential",
                "The passkey data is corrupted. Please delete this passkey and register a new one.",
              );
            }
          } else {
            // Try to decode as base64 (correct format)
            try {
              credentialPublicKeyBuffer = Buffer.from(
                credRecord.publicKey,
                "base64",
              );
              // Validate the decoded buffer has reasonable size (CBOR-encoded public keys are typically 100-200 bytes)
              if (
                credentialPublicKeyBuffer.length < 50 ||
                credentialPublicKeyBuffer.length > 500
              ) {
                console.warn(
                  "[WebAuthn] Decoded publicKey buffer has unusual size:",
                  credentialPublicKeyBuffer.length,
                );
              }
            } catch (e) {
              console.error(
                "[WebAuthn] Failed to decode publicKey as base64:",
                e,
              );
              // If base64 decode fails, try treating as comma-separated as last resort
              if (credRecord.publicKey.includes(",")) {
                const numbers = credRecord.publicKey
                  .split(",")
                  .map((n) => parseInt(n, 10));
                credentialPublicKeyBuffer = Buffer.from(numbers);
                console.warn(
                  "[WebAuthn] Fallback: Using comma-separated format",
                );
              } else {
                return respond.error(
                  res,
                  500,
                  "invalid_credential_record",
                  "Invalid publicKey format in credential record. Please re-register your passkey.",
                );
              }
            }
          }
        } else if (Buffer.isBuffer(credRecord.publicKey)) {
          credentialPublicKeyBuffer = credRecord.publicKey;
        } else if (Array.isArray(credRecord.publicKey)) {
          credentialPublicKeyBuffer = Buffer.from(credRecord.publicKey);
        } else {
          console.error(
            "[WebAuthn] Invalid publicKey type:",
            typeof credRecord.publicKey,
          );
          return respond.error(
            res,
            500,
            "invalid_credential_record",
            "Invalid publicKey format in credential record. Please re-register your passkey.",
          );
        }

        // Create authenticator object with Buffers (same format as cross-device authentication which works)
        const authenticator = {
          credentialPublicKey: credentialPublicKeyBuffer, // CBOR bytes as Buffer
          credentialID: Buffer.from(credRecord.credId, "base64url"), // Use stored credId like cross-device flow
          counter: counterValue,
        };

        // Validate authenticator object structure
        if (
          !Buffer.isBuffer(authenticator.credentialPublicKey) ||
          authenticator.credentialPublicKey.length === 0
        ) {
          console.error("[WebAuthn] Invalid credentialPublicKey:", {
            hasPublicKey: !!credRecord.publicKey,
            publicKeyType: typeof credRecord.publicKey,
            publicKeyLength: credRecord.publicKey?.length,
            bufferLength: authenticator.credentialPublicKey?.length,
          });
          return respond.error(
            res,
            500,
            "invalid_credential_record",
            "Credential public key is invalid",
          );
        }

        if (
          !Buffer.isBuffer(authenticator.credentialID) ||
          authenticator.credentialID.length === 0
        ) {
          console.error("[WebAuthn] Invalid credentialID:", {
            hasCredId: !!credRecord.credId,
            credIdType: typeof credRecord.credId,
            bufferLength: authenticator.credentialID?.length,
          });
          return respond.error(
            res,
            500,
            "invalid_credential_record",
            "Credential ID is invalid",
          );
        }

        // Validate counter is a number
        if (
          typeof authenticator.counter !== "number" ||
          isNaN(authenticator.counter)
        ) {
          console.error("[WebAuthn] Invalid counter:", {
            counter: authenticator.counter,
            counterType: typeof authenticator.counter,
            originalCounter: credRecord.counter,
            originalCounterType: typeof credRecord.counter,
          });
          return respond.error(
            res,
            500,
            "invalid_credential_record",
            "Credential counter is invalid",
          );
        }

        // Log authenticator object before passing to library
        console.log("[WebAuthn] Authenticator object prepared:", {
          hasCredentialPublicKey: !!authenticator.credentialPublicKey,
          credentialPublicKeyType: Buffer.isBuffer(
            authenticator.credentialPublicKey,
          )
            ? "Buffer"
            : typeof authenticator.credentialPublicKey,
          credentialPublicKeyLength: authenticator.credentialPublicKey?.length,
          hasCredentialID: !!authenticator.credentialID,
          credentialIDType: Buffer.isBuffer(authenticator.credentialID)
            ? "Buffer"
            : typeof authenticator.credentialID,
          credentialIDLength: authenticator.credentialID?.length,
          credentialIDHex:
            authenticator.credentialID?.toString("hex").substring(0, 40) +
            "...",
          hasCounter: "counter" in authenticator,
          counter: authenticator.counter,
          counterType: typeof authenticator.counter,
          authenticatorKeys: Object.keys(authenticator),
        });

        // Ensure credential ID is in the correct format for verification
        // @simplewebauthn/server expects credential.id to be base64url string
        const credentialForVerification = { ...credential };

        // Normalize credential ID - use rawId if available, otherwise use id
        if (credentialForVerification.rawId && !credentialForVerification.id) {
          credentialForVerification.id = credentialForVerification.rawId;
        }

        // Ensure credential ID is a string (not buffer)
        if (
          credentialForVerification.id &&
          typeof credentialForVerification.id !== "string"
        ) {
          try {
            credentialForVerification.id = Buffer.from(
              credentialForVerification.id,
            ).toString("base64url");
          } catch (e) {
            console.error(
              "[WebAuthn] Failed to convert credential.id to string:",
              e,
            );
          }
        }

        // Ensure credential response fields are properly formatted
        if (!credentialForVerification.response) {
          return respond.error(
            res,
            400,
            "invalid_credential",
            "Credential response is missing",
          );
        }

        // Ensure all required response fields are present
        const requiredFields = [
          "clientDataJSON",
          "authenticatorData",
          "signature",
        ];
        const missingFields = requiredFields.filter(
          (field) => !credentialForVerification.response[field],
        );
        if (missingFields.length > 0) {
          console.error(
            "[WebAuthn] Missing required credential response fields:",
            missingFields,
          );
          return respond.error(
            res,
            400,
            "invalid_credential",
            `Missing required fields: ${missingFields.join(", ")}`,
          );
        }

        // Ensure response fields are strings (base64url encoded)
        const response = { ...credentialForVerification.response };
        for (const field of requiredFields) {
          if (response[field] && typeof response[field] !== "string") {
            try {
              response[field] = Buffer.from(response[field]).toString(
                "base64url",
              );
            } catch (e) {
              console.error(
                `[WebAuthn] Failed to convert ${field} to string:`,
                e,
              );
              return respond.error(
                res,
                400,
                "invalid_credential",
                `Invalid ${field} format`,
              );
            }
          }
        }

        credentialForVerification.response = response;

        // Log detailed information for debugging - including credential ID matching
        const responseCredIdBuffer = Buffer.from(
          credentialForVerification.id || credentialForVerification.rawId || "",
          "base64url",
        );
        const authenticatorCredIdBuffer = authenticator.credentialID;
        const credIdsMatch = responseCredIdBuffer.equals(
          authenticatorCredIdBuffer,
        );

        console.log("[WebAuthn] Verifying authentication:", {
          email,
          expectedOrigin,
          expectedRPID,
          hasChallenge: !!expectedChallenge,
          challengeType: Buffer.isBuffer(expectedChallenge)
            ? "Buffer"
            : typeof expectedChallenge,
          challengeLength: expectedChallenge?.length,
          credentialId: credentialForVerification.id?.substring(0, 30) + "...",
          credentialIdType: typeof credentialForVerification.id,
          credentialRawId:
            credentialForVerification.rawId?.substring(0, 30) + "...",
          foundCredRecord: !!credRecord,
          credRecordId: credRecord?.credId?.substring(0, 30) + "...",
          credentialResponseKeys: Object.keys(
            credentialForVerification.response || {},
          ),
          hasClientDataJSON:
            !!credentialForVerification.response?.clientDataJSON,
          hasAuthenticatorData:
            !!credentialForVerification.response?.authenticatorData,
          hasSignature: !!credentialForVerification.response?.signature,
          credentialIdMatching: {
            responseIdString:
              credentialForVerification.id?.substring(0, 30) + "...",
            responseRawIdString:
              credentialForVerification.rawId?.substring(0, 30) + "...",
            storedCredIdString: credRecord?.credId?.substring(0, 30) + "...",
            responseIdBufferHex:
              responseCredIdBuffer.toString("hex").substring(0, 40) + "...",
            authenticatorCredIdBufferHex:
              authenticatorCredIdBuffer.toString("hex").substring(0, 40) +
              "...",
            credIdsMatch: credIdsMatch,
            responseIdBufferLength: responseCredIdBuffer.length,
            authenticatorCredIdBufferLength: authenticatorCredIdBuffer.length,
          },
          authenticatorObject: {
            hasCredentialPublicKey: !!authenticator.credentialPublicKey,
            credentialPublicKeyLength:
              authenticator.credentialPublicKey?.length,
            hasCredentialID: !!authenticator.credentialID,
            credentialIDLength: authenticator.credentialID?.length,
            hasCounter: "counter" in authenticator,
            counter: authenticator.counter,
            counterType: typeof authenticator.counter,
          },
        });

        // Declare verification outside try-catch so it's accessible after the catch block
        let verification = null;

        try {
          // In @simplewebauthn/server v11+, the API changed from 'authenticator' to 'credential'
          // The structure also changed: credentialID -> id, credentialPublicKey -> publicKey
          // The 'id' should be a Buffer matching the response id/rawId
          // The 'publicKey' should be a Buffer containing the CBOR-encoded public key
          const credentialForLibrary = {
            id: Buffer.from(
              credentialForVerification.id ||
                credentialForVerification.rawId ||
                credRecord.credId,
              "base64url",
            ), // Use response id to ensure exact match
            publicKey: credentialPublicKeyBuffer, // publicKey as Buffer (CBOR-encoded public key)
            counter: counterValue,
            transports: credRecord.transports || [],
          };

          console.log(
            "[WebAuthn] Attempting verification with credential parameter (v11+ API):",
            {
              hasId: !!credentialForLibrary.id,
              idType: Buffer.isBuffer(credentialForLibrary.id)
                ? "Buffer"
                : typeof credentialForLibrary.id,
              idLength: credentialForLibrary.id?.length,
              idHex:
                credentialForLibrary.id?.toString("hex").substring(0, 40) +
                "...",
              hasPublicKey: !!credentialForLibrary.publicKey,
              publicKeyType: Buffer.isBuffer(credentialForLibrary.publicKey)
                ? "Buffer"
                : typeof credentialForLibrary.publicKey,
              publicKeyLength: credentialForLibrary.publicKey?.length,
              counter: credentialForLibrary.counter,
              counterType: typeof credentialForLibrary.counter,
              transports: credentialForLibrary.transports,
              responseId:
                credentialForVerification.id?.substring(0, 30) + "...",
              responseRawId:
                credentialForVerification.rawId?.substring(0, 30) + "...",
              storedCredId: credRecord.credId?.substring(0, 30) + "...",
              idMatchesResponse: credentialForLibrary.id.equals(
                Buffer.from(
                  credentialForVerification.id ||
                    credentialForVerification.rawId ||
                    "",
                  "base64url",
                ),
              ),
            },
          );

          verification = await webauthnServer.verifyAuthenticationResponse({
            response: credentialForVerification,
            expectedChallenge,
            expectedOrigin,
            expectedRPID,
            credential: credentialForLibrary, // Use 'credential' parameter (v11+ API)
          });

          if (!verification.verified) {
            console.error("[WebAuthn] Verification failed:", {
              verified: verification.verified,
              error: verification.error,
              authenticationInfo: verification.authenticationInfo,
            });
            return respond.error(
              res,
              401,
              "webauthn_auth_failed",
              "Authentication verification failed",
            );
          }
        } catch (verifyErr) {
          console.error(
            "[WebAuthn] verifyAuthenticationResponse threw an error:",
            verifyErr,
          );
          console.error("[WebAuthn] Error stack:", verifyErr.stack);
          console.error("[WebAuthn] Error details:", {
            message: verifyErr.message,
            name: verifyErr.name,
            email,
            credentialId:
              credentialForVerification.id?.substring(0, 30) + "...",
            authenticator: {
              hasCredentialPublicKey: !!authenticator.credentialPublicKey,
              credentialPublicKeyType: Buffer.isBuffer(
                authenticator.credentialPublicKey,
              )
                ? "Buffer"
                : typeof authenticator.credentialPublicKey,
              credentialPublicKeyLength:
                authenticator.credentialPublicKey?.length,
              hasCredentialID: !!authenticator.credentialID,
              credentialIDType: Buffer.isBuffer(authenticator.credentialID)
                ? "Buffer"
                : typeof authenticator.credentialID,
              credentialIDLength: authenticator.credentialID?.length,
              credentialIDHex:
                authenticator.credentialID?.toString("hex").substring(0, 40) +
                "...",
              hasCounter: "counter" in authenticator,
              counter: authenticator.counter,
              counterType: typeof authenticator.counter,
            },
            credentialForVerification: {
              id: credentialForVerification.id?.substring(0, 30) + "...",
              rawId: credentialForVerification.rawId?.substring(0, 30) + "...",
              type: credentialForVerification.type,
              hasResponse: !!credentialForVerification.response,
            },
          });
          return respond.error(
            res,
            500,
            "webauthn_auth_complete_failed",
            `Authentication verification error: ${verifyErr.message}`,
          );
        }

        // If we get here, verification was successful
        if (!verification || !verification.verified) {
          return respond.error(
            res,
            401,
            "webauthn_auth_failed",
            "Authentication verification failed",
          );
        }

        try {
          // Update counter
          const dbUser = await User.findById(user._id);
          const rec = (dbUser.webauthnCredentials || []).find(
            (c) => c.credId === credRecord.credId,
          );
          if (
            rec &&
            verification.authenticationInfo &&
            verification.authenticationInfo.newCounter !== undefined
          ) {
            rec.counter = verification.authenticationInfo.newCounter;
            await dbUser.save();
          }

          authenticationChallenges.delete(String(email).toLowerCase());

          // Fetch user fresh from database to ensure role is properly populated
          // Handle role ObjectId validation similar to login endpoints
          let userForResponse = await User.findById(user._id).lean();
          if (!userForResponse) {
            return respond.error(res, 404, "user_not_found", "User not found");
          }

          // Auto-fix for legacy/bad data where role is a string slug instead of ObjectId
          if (
            userForResponse.role &&
            typeof userForResponse.role === "string" &&
            !mongoose.Types.ObjectId.isValid(userForResponse.role)
          ) {
            try {
              const slug = userForResponse.role;
              const roleDoc = await Role.findOne({ slug }).lean();
              if (roleDoc) {
                console.log(
                  `[WebAuthn Auto-Fix] Updating user ${userForResponse.email} role from "${slug}" to ObjectId(${roleDoc._id})`,
                );
                await User.updateOne(
                  { _id: userForResponse._id },
                  { role: roleDoc._id },
                );
                userForResponse.role = roleDoc;
              }
            } catch (err) {
              console.warn("[WebAuthn] Failed to auto-fix user role:", err);
            }
          } else if (
            userForResponse.role &&
            mongoose.Types.ObjectId.isValid(userForResponse.role)
          ) {
            // Manual populate role if it's an ObjectId
            userForResponse.role = await Role.findById(
              userForResponse.role,
            ).lean();
          }

          // Return safe user object similar to login endpoints
          const roleSlug =
            userForResponse.role && userForResponse.role.slug
              ? userForResponse.role.slug
              : "user";
          const safe = {
            id: String(userForResponse._id),
            role: roleSlug,
            firstName: userForResponse.firstName,
            lastName: userForResponse.lastName,
            email: userForResponse.email,
            phoneNumber: userForResponse.phoneNumber,
            avatarUrl: userForResponse.avatarUrl || "",
            termsAccepted: userForResponse.termsAccepted,
            deletionPending: !!userForResponse.deletionPending,
            deletionScheduledFor: userForResponse.deletionScheduledFor,
            createdAt: userForResponse.createdAt,
          };

          if (req.body.purpose === "admin_step_up") {
            authenticationChallenges.delete("step_up_" + req._userId);
            const { token: stepUpToken, expiresAtMs } = signStepUpToken(
              req._userId,
            );
            return res.json({ stepUpToken, expiresAtMs });
          }
          if (req.body.purpose === "mfa_disable") {
            authenticationChallenges.delete("mfa_disable_" + req._userId);
            mfaStepUpVerify.setDisableRequestVerified(req._userId);
            return res.json({ verified: true });
          }
          if (req.body.purpose === "mfa_disable_undo") {
            authenticationChallenges.delete("mfa_undo_" + req._userId);
            mfaStepUpVerify.setDisableUndoVerified(req._userId);
            return res.json({ verified: true });
          }
          if (req.body.purpose === "password_change") {
            authenticationChallenges.delete("pwd_change_" + req._userId);
            mfaStepUpVerify.setPasswordChangeVerified(req._userId);
            return res.json({ verified: true });
          }
          if (req.body.purpose === "email_change") {
            authenticationChallenges.delete("email_change_" + req._userId);
            mfaStepUpVerify.setEmailChangeVerified(req._userId);
            return res.json({ verified: true });
          }
          if (req.body.purpose === "delete_account") {
            authenticationChallenges.delete("delete_account_" + req._userId);
            mfaStepUpVerify.setDeleteAccountVerified(req._userId);
            return res.json({ verified: true });
          }

          try {
            // Use the user document with populated role for token signing
            const userDocForToken = await User.findById(user._id).populate(
              "role",
            );
            const { token, expiresAtMs } =
              require("../middleware/auth").signAccessToken(
                userDocForToken || userForResponse,
              );
            safe.token = token;
            safe.expiresAt = new Date(expiresAtMs).toISOString();
          } catch (err) {
            console.error("[WebAuthn] Token signing error:", err);
          }

          const isFirstLoginPasskey = !user.lastLoginAt;
          inAppNotificationService
            .createLoginNotification(user._id, {
              isFirstLogin: isFirstLoginPasskey,
              userAgent: req.headers["user-agent"],
              ip: req.ip,
              method: "passkey",
            })
            .catch((err) =>
              console.error("Failed to create auth notification:", err),
            );

          return res.json(safe);
        } catch (verifyErr) {
          console.error(
            "[WebAuthn] verifyAuthenticationResponse threw an error:",
            verifyErr,
          );
          console.error("[WebAuthn] Error stack:", verifyErr.stack);
          console.error("[WebAuthn] Error details:", {
            message: verifyErr.message,
            name: verifyErr.name,
            authenticator: {
              hasCredentialPublicKey: !!authenticator.credentialPublicKey,
              credentialPublicKeyType: Buffer.isBuffer(
                authenticator.credentialPublicKey,
              )
                ? "Buffer"
                : typeof authenticator.credentialPublicKey,
              credentialPublicKeyLength:
                authenticator.credentialPublicKey?.length,
              hasCredentialID: !!authenticator.credentialID,
              credentialIDType: Buffer.isBuffer(authenticator.credentialID)
                ? "Buffer"
                : typeof authenticator.credentialID,
              credentialIDLength: authenticator.credentialID?.length,
              counter: authenticator.counter,
            },
          });
          throw verifyErr;
        }
      } catch (err) {
        console.error("[WebAuthn] authenticate complete error:", err);
        console.error("[WebAuthn] Error stack:", err.stack);
        console.error("[WebAuthn] Error details:", {
          message: err.message,
          name: err.name,
          email: req.body?.email,
          hasCredential: !!req.body?.credential,
          credentialKeys: req.body?.credential
            ? Object.keys(req.body.credential)
            : [],
        });

        // Provide more specific error message
        let errorMessage = "Failed to complete WebAuthn authentication";
        if (err.message) {
          errorMessage += `: ${err.message}`;
        }

        return respond.error(
          res,
          500,
          "webauthn_auth_complete_failed",
          errorMessage,
        );
      }
    });
  },
);

// Cross-device authentication endpoints

// POST /api/auth/webauthn/cross-device/start
router.post(
  "/webauthn/cross-device/start",
  validateBody(emailSchema),
  async (req, res) => {
    try {
      const { email, allowRegistration = false } = req.body || {};
      const user = await User.findOne({ email });
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");

      const hasPasskeys =
        user.webauthnCredentials && user.webauthnCredentials.length > 0;

      // Always allow both registration and authentication for ID Melon compatibility
      // ID Melon can have its own account setup, so we need to support both flows
      // The mobile page will try authentication first, then fall back to registration if needed
      const shouldAllowRegistration = allowRegistration || !hasPasskeys;

      // If no passkeys and registration not allowed, return error (shouldn't happen now, but keep for safety)
      if (!hasPasskeys && !shouldAllowRegistration) {
        return respond.error(
          res,
          400,
          "no_passkeys",
          "No passkeys registered for this user",
        );
      }

      // Generate session ID
      const sessionId = require("crypto").randomBytes(32).toString("base64url");

      // Generate BOTH registration and authentication challenges
      // This allows ID Melon to choose whether to register or authenticate
      // Similar to how Google Lens works - it can do either based on what's available
      let regChallenge = null;
      let authChallenge = null;
      let sessionType = hasPasskeys ? "authenticate" : "register"; // Default type, but both are available

      // Always generate registration challenge (for ID Melon that doesn't have account yet)
      const userIdString = String(user._id);
      const userId = new Uint8Array(Buffer.from(userIdString, "utf8"));
      const rpName = String(
        process.env.WEBAUTHN_RP_NAME ||
          process.env.DEFAULT_FROM_EMAIL ||
          "Capstone",
      )
        .replace(/<.*?>/g, "")
        .trim();
      const rpID = process.env.WEBAUTHN_RPID || "localhost";

      const regOptions = await webauthnServer.generateRegistrationOptions({
        rpName,
        rpID: rpID,
        userID: userId,
        userName: user.email,
        timeout: 60000,
        attestationType: "none",
        authenticatorSelection: {
          userVerification: "preferred",
          residentKey: "preferred",
        },
      });
      regChallenge = regOptions.challenge;

      // Generate authentication challenge if user has passkeys (for ID Melon that already has account)
      if (hasPasskeys) {
        const allowCredentials = (user.webauthnCredentials || [])
          .map((c) => {
            // Ensure credId is a string (base64url format)
            const credId = String(c.credId || "").trim();
            if (!credId) return null;

            return {
              id: credId, // Pass as string - simplewebauthn will handle conversion internally
              type: "public-key",
              transports: c.transports || [],
            };
          })
          .filter(Boolean); // Remove any null entries

        const authOptions = await webauthnServer.generateAuthenticationOptions({
          timeout: 60000,
          allowCredentials: allowCredentials,
          userVerification: "preferred",
        });
        authChallenge = authOptions.challenge;
      }

      // Use authentication challenge if available, otherwise use registration challenge
      // This is the default, but both are stored in session for flexibility
      const challenge = authChallenge || regChallenge;

      console.log(
        "[WebAuthn] Cross-device session created (ID Melon compatible - supports both register and authenticate):",
        {
          email: user.email,
          sessionId: sessionId.substring(0, 20) + "...",
          hasPasskeys,
          hasRegChallenge: !!regChallenge,
          hasAuthChallenge: !!authChallenge,
          defaultType: sessionType,
        },
      );

      // Generate QR code URL - points to mobile authentication page
      // For cross-device authentication, we need a URL accessible from mobile devices
      let baseUrl = process.env.WEBAUTHN_ORIGIN || process.env.FRONTEND_URL;

      if (!baseUrl) {
        // In development, detect local network IP so mobile devices can connect
        // QR code should point to frontend, not backend
        const frontendPort = process.env.FRONTEND_PORT || 5173;
        const localIP = getLocalNetworkIP();

        if (process.env.NODE_ENV !== "production" && localIP) {
          // Use local network IP for development (accessible from mobile devices on same network)
          baseUrl = `http://${localIP}:${frontendPort}`;
          console.log(
            `[WebAuthn] Using local network IP for QR code: ${baseUrl}`,
          );
          console.log(
            `[WebAuthn] Make sure your mobile device is on the same WiFi network`,
          );
        } else {
          // Fallback to localhost (won't work on mobile, but better than nothing)
          baseUrl = `http://localhost:${frontendPort}`;
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[WebAuthn] WARNING: Using localhost for QR code. Mobile devices cannot access this.`,
            );
            console.warn(
              `[WebAuthn] Set WEBAUTHN_ORIGIN or FRONTEND_URL environment variable with your local IP (e.g., http://192.168.1.33:${frontendPort})`,
            );
          }
        }
      }

      // Store session with origin/baseUrl for verification later
      // Store both challenges to support ID Melon's ability to register or authenticate
      crossDeviceSessions.set(sessionId, {
        email: String(email).toLowerCase(),
        challenge: challenge, // Default challenge (auth if available, otherwise reg)
        regChallenge: regChallenge, // Registration challenge (always available)
        authChallenge: authChallenge, // Authentication challenge (if user has passkeys)
        authenticated: false,
        user: null,
        createdAt: Date.now(),
        type: sessionType, // Default type, but both are supported
        supportsBoth: true, // Flag to indicate both registration and authentication are supported
        origin: baseUrl, // Store origin used in QR code for verification
        baseUrl: baseUrl, // Also store as baseUrl for compatibility
      });

      // Get RP ID for pairing information
      let finalRpID = rpID;
      if (!finalRpID || finalRpID === "localhost") {
        try {
          const url = new URL(baseUrl);
          finalRpID = url.hostname;
          // Remove port if present (RP ID should be just domain)
          if (finalRpID.includes(":")) {
            finalRpID = finalRpID.split(":")[0];
          }
        } catch (e) {
          finalRpID = "localhost";
        }
      }

      // Convert challenge to base64url string if it's a Buffer
      let challengeString;
      if (Buffer.isBuffer(challenge)) {
        challengeString = challenge.toString("base64url");
      } else if (typeof challenge === "string") {
        challengeString = challenge;
      } else {
        // If it's Uint8Array or ArrayBuffer
        challengeString = Buffer.from(challenge).toString("base64url");
      }

      // Create FIDO2 cross-device pairing data (Microsoft Authenticator & ID Melon compatible)
      // Microsoft Authenticator and other FIDO2 authenticators expect pairing fields in URL query parameters
      // This follows the standard FIDO2 cross-device authentication protocol
      const finalRpName = rpName;

      // Create FIDO2 pairing data for Microsoft Authenticator and other authenticators
      // Microsoft Authenticator supports standard FIDO2 cross-device authentication format
      // All pairing fields are included in URL query parameters for easy extraction
      const pairingData = {
        challenge: challengeString,
        rpId: rpID,
        rp_id: rpID, // Include both naming conventions for compatibility
        sessionId: sessionId,
        session_id: sessionId, // Include both naming conventions for compatibility
        type: sessionType,
        rpName: rpName,
        rp_name: rpName, // Include both naming conventions for compatibility
        protocol: "FIDO2",
        version: "1.0",
      };

      // Generate URL with ALL pairing fields as query parameters
      // Format: HTTP URL with query parameters (Microsoft Authenticator & FIDO2 standard compatible)
      // Microsoft Authenticator scans QR codes and extracts pairing fields from URL parameters
      const pairingUrl = new URL(`${baseUrl}/auth/passkey-mobile`);

      // Add all pairing fields as URL query parameters (Microsoft Authenticator & FIDO2 compatible)
      // Use the default challenge (auth if available, otherwise reg)
      pairingUrl.searchParams.set("challenge", challengeString);
      pairingUrl.searchParams.set("rpId", rpID);
      pairingUrl.searchParams.set("rp_id", rpID); // Include both naming conventions for compatibility
      pairingUrl.searchParams.set("sessionId", sessionId);
      pairingUrl.searchParams.set("session_id", sessionId); // Include both naming conventions
      pairingUrl.searchParams.set("session", sessionId); // Also include 'session' for browser compatibility
      pairingUrl.searchParams.set("type", sessionType); // Default type, but both are supported
      pairingUrl.searchParams.set("supportsBoth", "true"); // Flag for ID Melon - indicates both register and authenticate are available
      pairingUrl.searchParams.set("rpName", rpName);
      pairingUrl.searchParams.set("rp_name", rpName); // Include both naming conventions
      pairingUrl.searchParams.set("protocol", "FIDO2");
      pairingUrl.searchParams.set("version", "1.0");

      // Also include JSON format as data parameter (for apps that prefer JSON)
      const jsonData = JSON.stringify(pairingData);
      pairingUrl.searchParams.set("data", encodeURIComponent(jsonData));

      // Create full pairing data object for frontend display/debugging
      const fullPairingData = {
        ...pairingData,
        origin: baseUrl,
        url: pairingUrl.toString(),
      };

      // Generate QR code for cross-device authentication
      // Format: HTTP URL with query parameters (Microsoft Authenticator compatible)
      // Microsoft Authenticator supports standard FIDO2 cross-device authentication
      // The URL contains all pairing information needed for secure device-to-device communication
      const qrCodeData = pairingUrl.toString();

      // Generate QR code image server-side (Microsoft Authenticator compatible format)
      // Using standard QR code settings optimized for Microsoft Authenticator scanning
      let qrCodeImage = null;
      try {
        qrCodeImage = await QRCode.toDataURL(qrCodeData, {
          errorCorrectionLevel: "M", // Medium error correction - optimal for Microsoft Authenticator
          type: "image/png",
          margin: 2, // Standard margin for clean scanning
          width: 300, // Standard size for mobile device scanning
          color: {
            dark: "#000000", // Pure black for maximum contrast
            light: "#FFFFFF", // Pure white background
          },
        });
        console.log(
          `[WebAuthn] QR code image generated successfully (Microsoft Authenticator compatible)`,
        );
      } catch (qrErr) {
        console.error(`[WebAuthn] Failed to generate QR code image:`, qrErr);
        // Continue without QR code image - frontend can fallback to generating from URL
      }

      console.log(
        `[WebAuthn] QR code format: HTTP URL with query parameters (Microsoft Authenticator & FIDO2 compatible)`,
      );
      console.log(`[WebAuthn] Pairing fields in URL:`, {
        challenge:
          challengeString.substring(0, 30) +
          "... (length: " +
          challengeString.length +
          ")",
        rpId: finalRpID,
        sessionId:
          sessionId.substring(0, 30) + "... (length: " + sessionId.length + ")",
        type: sessionType,
        rpName: finalRpName,
        supportsBoth: true,
      });
      console.log(
        `[WebAuthn] QR code URL (Microsoft Authenticator compatible):`,
        pairingUrl.toString(),
      );

      return res.json({
        sessionId,
        qrCode: qrCodeData, // URL format with query parameters (Microsoft Authenticator & FIDO2 compatible)
        qrCodeUrl: pairingUrl.toString(), // Same URL for consistency
        qrCodeImage: qrCodeImage, // Base64 data URL (Microsoft Authenticator compatible - server-generated)
        pairingData: fullPairingData, // Full pairing data object for frontend display/debugging
        expiresIn: CROSS_DEVICE_SESSION_TIMEOUT / 1000, // seconds
      });
    } catch (err) {
      console.error("cross-device start error", err);
      return respond.error(
        res,
        500,
        "cross_device_start_failed",
        "Failed to start cross-device authentication",
      );
    }
  },
);

// POST /api/auth/webauthn/cross-device/auth-options
router.post("/webauthn/cross-device/auth-options", async (req, res) => {
  try {
    const { sessionId, type } = req.body || {};
    const session = crossDeviceSessions.get(sessionId);

    if (!session) {
      return respond.error(
        res,
        404,
        "session_not_found",
        "Session not found or expired",
      );
    }

    // Check if session expired
    if (Date.now() - session.createdAt > CROSS_DEVICE_SESSION_TIMEOUT) {
      crossDeviceSessions.delete(sessionId);
      return respond.error(res, 410, "session_expired", "Session expired");
    }

    const user = await User.findOne({ email: session.email });
    if (!user)
      return respond.error(res, 404, "user_not_found", "User not found");

    // Check if this is a registration request or if we should try registration
    // ID Melon can request either registration or authentication
    // If supportsBoth is true, we can handle either based on the request
    // Client can specify type in request body, or we use session default
    const requestType = type || session.type; // Allow client to specify type

    // If client requests registration, or if session is registration type and no type specified, use registration
    if (requestType === "register" || (session.type === "register" && !type)) {
      // Return registration options
      // IMPORTANT: Reuse the challenge from QR code generation to ensure consistency
      // ID Melon and other authenticators use the challenge from the QR code URL
      // Use regChallenge if available (for ID Melon registration), otherwise fall back to session challenge
      const existingChallenge = session.regChallenge || session.challenge;

      const userIdString = String(user._id);
      const userId = new Uint8Array(Buffer.from(userIdString, "utf8"));
      const rpName = String(
        process.env.WEBAUTHN_RP_NAME ||
          process.env.DEFAULT_FROM_EMAIL ||
          "Capstone",
      )
        .replace(/<.*?>/g, "")
        .trim();
      const rpID = process.env.WEBAUTHN_RPID || "localhost";

      // Convert existing challenge to Buffer if it's a string
      let challengeBuffer = existingChallenge;
      if (existingChallenge && typeof existingChallenge === "string") {
        challengeBuffer = Buffer.from(existingChallenge, "base64url");
      } else if (existingChallenge && !Buffer.isBuffer(existingChallenge)) {
        challengeBuffer = Buffer.from(existingChallenge);
      }

      const regOptions = await webauthnServer.generateRegistrationOptions({
        rpName,
        rpID: rpID,
        userID: userId,
        userName: user.email,
        timeout: 60000,
        attestationType: "none",
        authenticatorSelection: {
          userVerification: "preferred",
          residentKey: "preferred",
        },
        challenge: challengeBuffer, // Use existing challenge from QR code
      });

      // Keep the original challenge from QR code (don't overwrite)
      // The challenge in regOptions should match what we passed in
      if (existingChallenge) {
        session.challenge = existingChallenge;
      } else {
        session.challenge = regOptions.challenge;
      }

      // Serialize for JSON response
      const serializedOptions = {
        ...regOptions,
        challenge: String(session.challenge), // Use the challenge from session
      };

      if (regOptions.user) {
        let userIdString;
        if (regOptions.user.id instanceof Buffer) {
          userIdString = regOptions.user.id.toString("base64url");
        } else if (regOptions.user.id instanceof Uint8Array) {
          userIdString = Buffer.from(regOptions.user.id).toString("base64url");
        } else {
          userIdString = String(regOptions.user.id);
        }

        serializedOptions.user = {
          ...regOptions.user,
          id: userIdString,
        };
      }

      return res.json({
        publicKey: serializedOptions,
        email: session.email,
        type: "register",
      });
    } else {
      // Return authentication options
      // IMPORTANT: Reuse the challenge from QR code generation to ensure consistency
      // ID Melon and other authenticators use the challenge from the QR code URL
      // Use authChallenge if available (for ID Melon authentication), otherwise fall back to session challenge
      const existingChallenge = session.authChallenge || session.challenge;

      // If no auth challenge and user has passkeys, this shouldn't happen, but handle gracefully
      if (
        !existingChallenge &&
        user.webauthnCredentials &&
        user.webauthnCredentials.length > 0
      ) {
        console.warn(
          "[WebAuthn] No auth challenge in session, generating new one",
        );
        // Generate a new auth challenge as fallback
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

        const authOptions = await webauthnServer.generateAuthenticationOptions({
          timeout: 60000,
          allowCredentials: allowCredentials,
          userVerification: "preferred",
        });
        session.authChallenge = authOptions.challenge;
        session.challenge = authOptions.challenge;
        const challengeBuffer = Buffer.isBuffer(authOptions.challenge)
          ? authOptions.challenge
          : Buffer.from(authOptions.challenge);
        return res.json({
          publicKey: {
            ...authOptions,
            challenge: authOptions.challenge.toString("base64url"),
          },
          email: session.email,
          type: "authenticate",
        });
      }

      const allowCredentials = (user.webauthnCredentials || [])
        .map((c) => {
          // Ensure credId is a string (base64url format)
          const credId = String(c.credId || "").trim();
          if (!credId) return null;

          return {
            id: credId, // Pass as string - simplewebauthn will handle conversion internally
            type: "public-key",
            transports: c.transports || [],
          };
        })
        .filter(Boolean); // Remove any null entries

      // Convert existing challenge to Buffer if it's a string
      let challengeBuffer = existingChallenge;
      if (existingChallenge && typeof existingChallenge === "string") {
        challengeBuffer = Buffer.from(existingChallenge, "base64url");
      } else if (existingChallenge && !Buffer.isBuffer(existingChallenge)) {
        challengeBuffer = Buffer.from(existingChallenge);
      }

      const options = await webauthnServer.generateAuthenticationOptions({
        timeout: 60000,
        allowCredentials: allowCredentials,
        userVerification: "preferred",
        challenge: challengeBuffer, // Use existing challenge from QR code
      });

      // Keep the original challenge from QR code (don't overwrite)
      // The challenge in options should match what we passed in
      if (existingChallenge) {
        session.challenge = existingChallenge;
      } else {
        session.challenge = options.challenge;
      }

      console.log("[WebAuthn] Auth options challenge:", {
        sessionId,
        usedExistingChallenge: !!existingChallenge,
        challengeLength: session.challenge?.length,
        challengeType: Buffer.isBuffer(session.challenge)
          ? "Buffer"
          : typeof session.challenge,
      });

      // Serialize options with the session challenge (from QR code)
      const serializedOptions = {
        ...options,
        challenge: String(session.challenge), // Use the challenge from session (QR code)
      };

      return res.json({
        publicKey: serializedOptions,
        email: session.email,
        type: "authenticate",
      });
    }
  } catch (err) {
    console.error("cross-device auth-options error", err);
    return respond.error(
      res,
      500,
      "cross_device_auth_options_failed",
      "Failed to get authentication options",
    );
  }
});

// GET /api/auth/webauthn/cross-device/status/:sessionId
router.get("/webauthn/cross-device/status/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = crossDeviceSessions.get(sessionId);

    if (!session) {
      return respond.error(
        res,
        404,
        "session_not_found",
        "Session not found or expired",
      );
    }

    // Check if session expired
    if (Date.now() - session.createdAt > CROSS_DEVICE_SESSION_TIMEOUT) {
      crossDeviceSessions.delete(sessionId);
      return respond.error(res, 410, "session_expired", "Session expired");
    }

    if (session.authenticated && session.user) {
      return res.json({
        authenticated: true,
        user: session.user,
        registered: session.registered || false,
      });
    }

    return res.json({
      authenticated: false,
      pending: true,
    });
  } catch (err) {
    console.error("cross-device status error", err);
    return respond.error(
      res,
      500,
      "cross_device_status_failed",
      "Failed to check cross-device status",
    );
  }
});

const crossDeviceCompleteSchema = Joi.object({
  sessionId: Joi.string().required(),
  credential: Joi.object().required(),
});

// POST /api/auth/webauthn/cross-device/complete
router.post(
  "/webauthn/cross-device/complete",
  validateBody(crossDeviceCompleteSchema),
  async (req, res) => {
    try {
      const { sessionId, credential } = req.body || {};
      const session = crossDeviceSessions.get(sessionId);

      if (!session) {
        return respond.error(
          res,
          404,
          "session_not_found",
          "Session not found or expired",
        );
      }

      // Check if session expired
      if (Date.now() - session.createdAt > CROSS_DEVICE_SESSION_TIMEOUT) {
        crossDeviceSessions.delete(sessionId);
        return respond.error(res, 410, "session_expired", "Session expired");
      }

      if (session.authenticated) {
        return res.json({
          authenticated: true,
          user: session.user,
          registered: session.registered || false,
        });
      }

      const user = await User.findOne({ email: session.email }).populate(
        "role",
      );
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");

      // Log credential format for debugging (especially for ID Melon)
      console.log("[WebAuthn] Cross-device complete received:", {
        sessionId: sessionId?.substring(0, 20) + "...",
        sessionType: session.type,
        email: session.email,
        hasCredential: !!credential,
        credentialId: credential?.id?.substring(0, 30) + "...",
        credentialRawId: credential?.rawId?.substring(0, 30) + "...",
        credentialType: credential?.type,
        hasResponse: !!credential?.response,
        responseKeys: credential?.response
          ? Object.keys(credential.response)
          : [],
      });

      // Auto-detect credential type based on credential structure
      // ID Melon might send registration even if session type is 'authenticate' (or vice versa)
      // Registration credentials have 'attestationObject', authentication has 'authenticatorData' and 'signature'
      const hasAttestationObject = !!credential?.response?.attestationObject;
      const hasAuthenticatorData = !!credential?.response?.authenticatorData;
      const hasSignature = !!credential?.response?.signature;

      // Determine if this is registration or authentication based on credential structure
      const isRegistrationCredential =
        hasAttestationObject && !hasAuthenticatorData;
      const isAuthenticationCredential =
        hasAuthenticatorData && hasSignature && !hasAttestationObject;

      // Use credential structure to determine type, but fall back to session type if unclear
      let credentialType = session.type;
      if (isRegistrationCredential) {
        credentialType = "register";
        console.log(
          "[WebAuthn] Auto-detected registration credential (ID Melon registration)",
        );
      } else if (isAuthenticationCredential) {
        credentialType = "authenticate";
        console.log(
          "[WebAuthn] Auto-detected authentication credential (ID Melon authentication)",
        );
      } else {
        console.warn(
          "[WebAuthn] Could not auto-detect credential type, using session type:",
          session.type,
        );
      }

      // Handle registration vs authentication
      if (credentialType === "register") {
        // Get the origin from session (stored when QR code was generated)
        const sessionOrigin = session.origin || session.baseUrl;
        const expectedOrigin =
          sessionOrigin ||
          process.env.WEBAUTHN_ORIGIN ||
          process.env.FRONTEND_URL ||
          `https://localhost:${process.env.FRONTEND_PORT || 5173}`;

        // Extract RPID from origin (remove protocol and port)
        let expectedRPID = process.env.WEBAUTHN_RPID;
        if (!expectedRPID && expectedOrigin) {
          try {
            const url = new URL(expectedOrigin);
            expectedRPID = url.hostname;
          } catch (e) {
            expectedRPID = "localhost";
          }
        }
        if (!expectedRPID) {
          expectedRPID = "localhost";
        }

        // Convert challenge to Buffer if needed (verifyRegistrationResponse expects Buffer)
        // Use regChallenge if available (for ID Melon registration), otherwise fall back to session challenge
        let expectedChallenge = session.regChallenge || session.challenge;
        if (!expectedChallenge) {
          console.error(
            "[WebAuthn] No registration challenge found in session:",
            {
              hasRegChallenge: !!session.regChallenge,
              hasChallenge: !!session.challenge,
              sessionType: session.type,
            },
          );
          return respond.error(
            res,
            400,
            "challenge_missing",
            "No registration challenge found in session",
          );
        }

        // Ensure challenge is in Buffer format
        if (typeof expectedChallenge === "string") {
          // If it's a base64url string, convert to Buffer
          expectedChallenge = Buffer.from(expectedChallenge, "base64url");
        } else if (!Buffer.isBuffer(expectedChallenge)) {
          // If it's Uint8Array or ArrayBuffer, convert to Buffer
          expectedChallenge = Buffer.from(expectedChallenge);
        }

        console.log(
          "[WebAuthn] Verifying registration (ID Melon compatible):",
          {
            sessionId: sessionId?.substring(0, 20) + "...",
            expectedOrigin,
            expectedRPID,
            hasChallenge: !!expectedChallenge,
            challengeType: Buffer.isBuffer(expectedChallenge)
              ? "Buffer"
              : typeof expectedChallenge,
            credentialId: credential?.id?.substring(0, 30) + "...",
            credentialRawId: credential?.rawId?.substring(0, 30) + "...",
            hasAttestationObject: !!credential?.response?.attestationObject,
            hasClientDataJSON: !!credential?.response?.clientDataJSON,
          },
        );

        // Handle registration flow
        // In simplewebauthn v13, the parameter is 'response', not 'credential'
        // ID Melon sends credential in standard WebAuthn format
        let verification;
        try {
          verification = await webauthnServer.verifyRegistrationResponse({
            response: credential,
            expectedChallenge: expectedChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: expectedRPID,
          });
        } catch (verifyErr) {
          console.error(
            "[WebAuthn] Registration verification threw exception:",
            {
              error: verifyErr,
              message: verifyErr?.message,
              name: verifyErr?.name,
              stack: verifyErr?.stack,
              credentialStructure: {
                hasId: !!credential?.id,
                hasRawId: !!credential?.rawId,
                hasType: !!credential?.type,
                hasResponse: !!credential?.response,
                responseKeys: credential?.response
                  ? Object.keys(credential.response)
                  : [],
              },
            },
          );
          return respond.error(
            res,
            500,
            "webauthn_verification_exception",
            `Registration verification failed: ${verifyErr?.message || "Unknown error"}`,
          );
        }

        if (!verification.verified) {
          const errorDetails = {
            sessionId,
            expectedOrigin,
            expectedRPID,
            verificationError:
              verification.error?.message ||
              verification.error ||
              "Unknown error",
            errorName: verification.error?.name,
            errorStack: verification.error?.stack,
          };
          console.error(
            "[WebAuthn] Registration verification failed:",
            errorDetails,
          );
          console.error(
            "[WebAuthn] Full verification result:",
            JSON.stringify(verification, null, 2),
          );

          // Provide more helpful error message
          let errorMessage = "Registration verification failed";
          if (verification.error?.message) {
            errorMessage += `: ${verification.error.message}`;
          } else if (verification.error) {
            errorMessage += `: ${String(verification.error)}`;
          }

          return respond.error(
            res,
            401,
            "webauthn_verification_failed",
            errorMessage,
          );
        }

        const { registrationInfo } = verification;
        const credID = registrationInfo.credentialID.toString("base64url");

        // Ensure publicKey is converted to base64 string correctly
        let publicKey;
        if (Buffer.isBuffer(registrationInfo.credentialPublicKey)) {
          publicKey = registrationInfo.credentialPublicKey.toString("base64");
        } else if (registrationInfo.credentialPublicKey instanceof Uint8Array) {
          publicKey = Buffer.from(
            registrationInfo.credentialPublicKey,
          ).toString("base64");
        } else if (typeof registrationInfo.credentialPublicKey === "string") {
          publicKey = registrationInfo.credentialPublicKey;
        } else {
          try {
            publicKey = Buffer.from(
              registrationInfo.credentialPublicKey,
            ).toString("base64");
          } catch (e) {
            console.error(
              "[WebAuthn] Failed to convert credentialPublicKey to base64:",
              e,
            );
            return respond.error(
              res,
              500,
              "webauthn_invalid_publickey",
              "Failed to process public key",
            );
          }
        }

        // Ensure it's a string (not an array or object)
        publicKey = String(publicKey);

        // Validate it's not comma-separated
        if (publicKey.includes(",") && /^\d+(,\d+)*$/.test(publicKey)) {
          console.error(
            "[WebAuthn] ERROR: credentialPublicKey is comma-separated instead of base64!",
          );
          return respond.error(
            res,
            500,
            "webauthn_invalid_publickey",
            "Public key format error",
          );
        }

        const dbUser = await User.findOne({ email: session.email });
        if (!dbUser)
          return respond.error(res, 404, "user_not_found", "User not found");

        dbUser.webauthnCredentials = dbUser.webauthnCredentials || [];
        dbUser.webauthnCredentials.push({
          credId: credID,
          publicKey: publicKey, // Explicitly ensure it's a string
          counter: registrationInfo.counter || 0,
          transports: registrationInfo.transports || [],
        });
        dbUser.mfaEnabled = true;
        dbUser.mfaReEnrollmentRequired = false;

        // Update mfaMethod to include passkey, preserving existing methods
        const currentMethod = String(dbUser.mfaMethod || "").toLowerCase();
        const methods = new Set();
        if (currentMethod.includes("authenticator"))
          methods.add("authenticator");
        if (currentMethod.includes("fingerprint")) methods.add("fingerprint");
        methods.add("passkey");
        dbUser.mfaMethod = Array.from(methods).join(",");

        // Clear MFA setup flag and activate staff/admin users once passkey is registered
        let roleSlugValue = "";
        try {
          if (dbUser.role && dbUser.role.slug) {
            roleSlugValue = dbUser.role.slug;
          } else if (dbUser.role) {
            const roleDoc = await Role.findById(dbUser.role).lean();
            roleSlugValue = roleDoc?.slug || "";
          }
        } catch (roleErr) {
          console.warn(
            "[WebAuthn] Failed to load role for MFA activation (cross-device):",
            roleErr.message,
          );
        }
        const requiresMfa =
          dbUser.isStaff === true || roleSlugValue === "admin";
        if (dbUser.mustSetupMfa || requiresMfa) {
          dbUser.mustSetupMfa = false;
          if (dbUser.isStaff) {
            dbUser.isActive = !(dbUser.mustChangeCredentials === true);
            // Update accountStatus for staff when onboarding is complete
            if (!dbUser.mustChangeCredentials && !dbUser.mustSetupMfa) {
              dbUser.accountStatus = "active";
            }
          }
        }
        await dbUser.save();

        // After registration, authenticate the user
        const populatedUser = await User.findById(dbUser._id).populate("role");
        const roleSlug =
          populatedUser.role && populatedUser.role.slug
            ? populatedUser.role.slug
            : roleSlugValue || "user";
        const safe = {
          id: String(populatedUser._id),
          role: roleSlug,
          firstName: populatedUser.firstName,
          lastName: populatedUser.lastName,
          email: populatedUser.email,
          phoneNumber: populatedUser.phoneNumber,
          avatarUrl: populatedUser.avatarUrl || "",
          termsAccepted: populatedUser.termsAccepted,
          deletionPending: !!populatedUser.deletionPending,
          deletionScheduledFor: populatedUser.deletionScheduledFor,
          createdAt: populatedUser.createdAt,
        };

        try {
          const { token, expiresAtMs } =
            require("../middleware/auth").signAccessToken(populatedUser);
          safe.token = token;
          safe.expiresAt = new Date(expiresAtMs).toISOString();
        } catch (err) {
          console.error("cross-device token signing error", err);
        }

        const isFirstLoginIdMelon = !populatedUser.lastLoginAt;
        inAppNotificationService
          .createLoginNotification(populatedUser._id, {
            isFirstLogin: isFirstLoginIdMelon,
            userAgent: req.headers["user-agent"],
            ip: req.ip,
            method: "passkey",
          })
          .catch((err) =>
            console.error("Failed to create auth notification:", err),
          );

        session.authenticated = true;
        session.user = safe;
        session.registered = true; // Mark that registration occurred

        console.log(
          "[WebAuthn] Registration and login successful (ID Melon):",
          {
            sessionId: sessionId?.substring(0, 20) + "...",
            email: safe.email,
            userId: safe.id,
            registered: true,
            authenticated: true,
          },
        );

        return res.json({
          authenticated: true,
          user: safe,
          registered: true,
        });
      } else {
        // Handle authentication flow
        // Try to find the credential - check both id and rawId
        // ID Melon and other authenticators may send credentials in different formats
        const credRecord = (user.webauthnCredentials || []).find((c) => {
          const storedCredId = String(c.credId || "").trim();

          // Check credential.id (base64url string)
          if (credential.id) {
            const receivedId = String(credential.id).trim();
            if (storedCredId === receivedId) return true;

            // Also try comparing after normalizing base64url (handle padding variations)
            const normalizedStored = storedCredId.replace(/=+$/, "");
            const normalizedReceived = receivedId.replace(/=+$/, "");
            if (normalizedStored === normalizedReceived) return true;
          }

          // Check credential.rawId (base64url string from buffer)
          if (credential.rawId) {
            const receivedRawId = String(credential.rawId).trim();
            if (storedCredId === receivedRawId) return true;

            // Also try comparing after normalizing base64url
            const normalizedStored = storedCredId.replace(/=+$/, "");
            const normalizedReceived = receivedRawId.replace(/=+$/, "");
            if (normalizedStored === normalizedReceived) return true;
          }

          // Try converting stored credId to base64url and compare
          try {
            // If stored credId is in a different format, try to convert
            const storedBuffer = Buffer.from(storedCredId, "base64url");
            const storedBase64url = storedBuffer.toString("base64url");

            if (
              credential.id &&
              storedBase64url === String(credential.id).trim()
            )
              return true;
            if (
              credential.rawId &&
              storedBase64url === String(credential.rawId).trim()
            )
              return true;
          } catch (e) {
            // Conversion failed, continue with other checks
          }

          return false;
        });

        if (!credRecord) {
          console.error("[WebAuthn] Credential not found:", {
            sessionId,
            email: session.email,
            credentialId: credential.id,
            credentialRawId: credential.rawId,
            credentialType: credential.type,
            availableCredIds: (user.webauthnCredentials || []).map(
              (c) => c.credId,
            ),
            credentialKeys: Object.keys(credential || {}),
          });
          return respond.error(
            res,
            404,
            "credential_not_found",
            "Credential not recognized. Please register a new passkey.",
          );
        }

        // Get the origin from session (stored when QR code was generated) or use environment variable
        // This ensures the origin matches what was used when the QR code was created
        const sessionOrigin = session.origin || session.baseUrl;
        const expectedOrigin =
          sessionOrigin ||
          process.env.WEBAUTHN_ORIGIN ||
          process.env.FRONTEND_URL ||
          `http://localhost:${process.env.FRONTEND_PORT || 5173}`;

        // Extract RPID from origin (remove protocol and port)
        let expectedRPID = process.env.WEBAUTHN_RPID;
        if (!expectedRPID && expectedOrigin) {
          try {
            const url = new URL(expectedOrigin);
            expectedRPID = url.hostname;
          } catch (e) {
            expectedRPID = "localhost";
          }
        }
        if (!expectedRPID) {
          expectedRPID = "localhost";
        }

        // Ensure challenge is in base64url string format for verification
        // verifyAuthenticationResponse expects challenge as base64url string
        let expectedChallenge = session.challenge;
        if (!expectedChallenge) {
          return respond.error(
            res,
            400,
            "challenge_missing",
            "No challenge found in session",
          );
        }

        // Convert challenge to base64url string format
        if (Buffer.isBuffer(expectedChallenge)) {
          // Convert Buffer to base64url string
          expectedChallenge = expectedChallenge.toString("base64url");
        } else if (expectedChallenge instanceof Uint8Array) {
          // Convert Uint8Array to base64url string
          expectedChallenge =
            Buffer.from(expectedChallenge).toString("base64url");
        } else if (typeof expectedChallenge !== "string") {
          // Convert other types to base64url string
          expectedChallenge =
            Buffer.from(expectedChallenge).toString("base64url");
        }
        // If it's already a string, use it as-is (should be base64url)

        // Ensure credential ID is in the correct format for verification
        // @simplewebauthn/server expects credential.id to be base64url string
        const credentialForVerification = { ...credential };

        // Normalize credential ID - use rawId if available, otherwise use id
        if (credentialForVerification.rawId && !credentialForVerification.id) {
          credentialForVerification.id = credentialForVerification.rawId;
        }

        // Ensure credential ID is a string (not buffer)
        if (
          credentialForVerification.id &&
          typeof credentialForVerification.id !== "string"
        ) {
          try {
            credentialForVerification.id = Buffer.from(
              credentialForVerification.id,
            ).toString("base64url");
          } catch (e) {
            console.error(
              "[WebAuthn] Failed to convert credential.id to string:",
              e,
            );
          }
        }

        // Log detailed information for debugging ID Melon issues
        console.log(
          "[WebAuthn] Verifying authentication (ID Melon compatible):",
          {
            sessionId,
            expectedOrigin,
            expectedRPID,
            hasChallenge: !!expectedChallenge,
            challengeType: Buffer.isBuffer(expectedChallenge)
              ? "Buffer"
              : typeof expectedChallenge,
            challengeLength: expectedChallenge?.length,
            credentialId:
              credentialForVerification.id?.substring(0, 30) + "...",
            credentialIdType: typeof credentialForVerification.id,
            credentialRawId:
              credentialForVerification.rawId?.substring(0, 30) + "...",
            foundCredRecord: !!credRecord,
            credRecordId: credRecord?.credId?.substring(0, 30) + "...",
            credentialResponseKeys: Object.keys(
              credentialForVerification.response || {},
            ),
            hasClientDataJSON:
              !!credentialForVerification.response?.clientDataJSON,
            hasAuthenticatorData:
              !!credentialForVerification.response?.authenticatorData,
            hasSignature: !!credentialForVerification.response?.signature,
          },
        );

        // Ensure credential response fields are properly formatted
        // ID Melon and other authenticators may send data in slightly different formats
        if (!credentialForVerification.response) {
          return respond.error(
            res,
            400,
            "invalid_credential",
            "Credential response is missing",
          );
        }

        // Ensure all required response fields are present
        const requiredFields = [
          "clientDataJSON",
          "authenticatorData",
          "signature",
        ];
        const missingFields = requiredFields.filter(
          (field) => !credentialForVerification.response[field],
        );
        if (missingFields.length > 0) {
          console.error(
            "[WebAuthn] Missing required credential response fields:",
            missingFields,
          );
          return respond.error(
            res,
            400,
            "invalid_credential",
            `Missing required fields: ${missingFields.join(", ")}`,
          );
        }

        // Ensure response fields are strings (base64url encoded)
        const response = { ...credentialForVerification.response };
        for (const field of requiredFields) {
          if (response[field] && typeof response[field] !== "string") {
            try {
              response[field] = Buffer.from(response[field]).toString(
                "base64url",
              );
            } catch (e) {
              console.error(
                `[WebAuthn] Failed to convert ${field} to string:`,
                e,
              );
              return respond.error(
                res,
                400,
                "invalid_credential",
                `Invalid ${field} format`,
              );
            }
          }
        }

        credentialForVerification.response = response;

        // Handle publicKey format - it might be stored as base64 string or comma-separated numbers
        let credentialPublicKeyBuffer;
        if (typeof credRecord.publicKey === "string") {
          // Check if it's a comma-separated string of numbers (old format or serialization issue)
          if (
            credRecord.publicKey.includes(",") &&
            /^\d+(,\d+)*$/.test(credRecord.publicKey)
          ) {
            // Convert comma-separated string to Buffer
            const numbers = credRecord.publicKey
              .split(",")
              .map((n) => parseInt(n, 10));
            credentialPublicKeyBuffer = Buffer.from(numbers);
          } else {
            // Try to decode as base64
            try {
              credentialPublicKeyBuffer = Buffer.from(
                credRecord.publicKey,
                "base64",
              );
            } catch (e) {
              // If base64 decode fails, try treating as comma-separated
              if (credRecord.publicKey.includes(",")) {
                const numbers = credRecord.publicKey
                  .split(",")
                  .map((n) => parseInt(n, 10));
                credentialPublicKeyBuffer = Buffer.from(numbers);
              } else {
                throw new Error("Invalid publicKey format");
              }
            }
          }
        } else if (Buffer.isBuffer(credRecord.publicKey)) {
          credentialPublicKeyBuffer = credRecord.publicKey;
        } else if (Array.isArray(credRecord.publicKey)) {
          credentialPublicKeyBuffer = Buffer.from(credRecord.publicKey);
        } else {
          return respond.error(
            res,
            500,
            "invalid_credential_record",
            "Invalid publicKey format in credential record",
          );
        }

        // In simplewebauthn v13, the client response parameter is 'response', not 'credential'
        const verification = await webauthnServer.verifyAuthenticationResponse({
          response: credentialForVerification,
          expectedChallenge: expectedChallenge,
          expectedOrigin: expectedOrigin,
          expectedRPID: expectedRPID,
          authenticator: {
            credentialPublicKey: credentialPublicKeyBuffer,
            credentialID: Buffer.from(credRecord.credId, "base64url"),
            counter: credRecord.counter || 0,
          },
        });

        if (!verification.verified) {
          const errorDetails = {
            sessionId,
            expectedOrigin,
            expectedRPID,
            verificationError:
              verification.error?.message ||
              verification.error ||
              "Unknown error",
            errorName: verification.error?.name,
            errorStack: verification.error?.stack,
          };
          console.error(
            "[WebAuthn] Authentication verification failed:",
            errorDetails,
          );
          console.error(
            "[WebAuthn] Full verification result:",
            JSON.stringify(verification, null, 2),
          );

          // Provide more helpful error message
          let errorMessage = "Authentication verification failed";
          if (verification.error?.message) {
            errorMessage += `: ${verification.error.message}`;
          } else if (verification.error) {
            errorMessage += `: ${String(verification.error)}`;
          }

          return respond.error(res, 401, "webauthn_auth_failed", errorMessage);
        }

        // Update counter
        const dbUser = await User.findById(user._id);
        const rec = (dbUser.webauthnCredentials || []).find(
          (c) => c.credId === credRecord.credId,
        );
        if (rec)
          rec.counter =
            verification.authenticationInfo.newCounter || rec.counter;
        await dbUser.save();

        // Prepare safe user object
        const roleSlug = user.role && user.role.slug ? user.role.slug : "user";
        const safe = {
          id: String(user._id),
          role: roleSlug,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl || "",
          termsAccepted: user.termsAccepted,
          deletionPending: !!user.deletionPending,
          deletionScheduledFor: user.deletionScheduledFor,
          createdAt: user.createdAt,
        };

        try {
          const { token, expiresAtMs } =
            require("../middleware/auth").signAccessToken(user);
          safe.token = token;
          safe.expiresAt = new Date(expiresAtMs).toISOString();
        } catch (err) {
          console.error("cross-device token signing error", err);
        }

        const isFirstLoginCrossDevice = !user.lastLoginAt;
        inAppNotificationService
          .createLoginNotification(user._id, {
            isFirstLogin: isFirstLoginCrossDevice,
            userAgent: req.headers["user-agent"],
            ip: req.ip,
            method: "passkey",
          })
          .catch((err) =>
            console.error("Failed to create auth notification:", err),
          );

        // Update session
        session.authenticated = true;
        session.user = safe;
        session.registered = false; // Mark as authentication, not registration

        return res.json({
          authenticated: true,
          user: safe,
          registered: false,
        });
      }
    } catch (err) {
      // Comprehensive error logging for debugging ID Melon issues
      console.error(
        "[WebAuthn] Cross-device complete error (ID Melon debugging):",
        {
          error: err,
          message: err?.message,
          name: err?.name,
          stack: err?.stack,
          sessionId: req.body?.sessionId?.substring(0, 20) + "...",
          hasCredential: !!req.body?.credential,
          credentialStructure: req.body?.credential
            ? {
                hasId: !!req.body.credential.id,
                hasRawId: !!req.body.credential.rawId,
                hasType: !!req.body.credential.type,
                hasResponse: !!req.body.credential.response,
                responseKeys: req.body.credential.response
                  ? Object.keys(req.body.credential.response)
                  : [],
                hasAttestationObject:
                  !!req.body.credential.response?.attestationObject,
                hasAuthenticatorData:
                  !!req.body.credential.response?.authenticatorData,
                hasSignature: !!req.body.credential.response?.signature,
                hasClientDataJSON:
                  !!req.body.credential.response?.clientDataJSON,
              }
            : null,
        },
      );

      // Provide more specific error messages based on error type
      let errorMessage =
        "Failed to complete cross-device authentication. Please try scanning the QR code again.";
      let errorCode = "cross_device_complete_failed";

      if (err?.message) {
        // Never use "Something went wrong" in error messages
        const msg = String(err.message).trim();
        if (msg && !msg.toLowerCase().includes("something went wrong")) {
          errorMessage = msg;
        }
      }

      // Map specific error types to user-friendly messages
      if (err?.name === "TypeError" || err?.name === "ReferenceError") {
        errorMessage =
          "Invalid request format. Please try scanning the QR code again.";
        errorCode = "invalid_request_format";
      } else if (err?.name === "ValidationError") {
        errorMessage =
          "Invalid credential format. Please try scanning the QR code again.";
        errorCode = "invalid_credential_format";
      } else if (err?.message?.includes("challenge")) {
        errorMessage =
          "Challenge verification failed. Please try scanning the QR code again.";
        errorCode = "challenge_verification_failed";
      } else if (
        err?.message?.includes("credential") ||
        err?.message?.includes("passkey")
      ) {
        errorMessage =
          "Passkey verification failed. Please try scanning the QR code again.";
        errorCode = "credential_verification_failed";
      }

      // Ensure error message never contains "Something went wrong"
      if (errorMessage.toLowerCase().includes("something went wrong")) {
        errorMessage =
          "Authentication failed. Please try scanning the QR code again.";
      }

      return respond.error(res, 500, errorCode, errorMessage);
    }
  },
);

// Passkey Management Endpoints (require authentication)

// GET /api/auth/webauthn/credentials - List all passkeys for authenticated user
router.get("/webauthn/credentials", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const user = await User.findById(userId).lean();
    if (!user)
      return respond.error(res, 404, "user_not_found", "User not found");

    const credentials = (user.webauthnCredentials || []).map((cred, index) => ({
      credId: cred.credId,
      index: index,
      // Note: We don't return the publicKey for security reasons
      // The frontend doesn't need it for display purposes
    }));

    return res.json({ credentials });
  } catch (err) {
    console.error("GET /api/auth/webauthn/credentials error:", err);
    return respond.error(
      res,
      500,
      "credentials_list_failed",
      "Failed to list credentials",
    );
  }
});

// DELETE /api/auth/webauthn/credentials/:credId - Delete a specific passkey
router.delete("/webauthn/credentials/:credId", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const { credId } = req.params;

    const user = await User.findById(userId);
    if (!user)
      return respond.error(res, 404, "user_not_found", "User not found");

    const credentials = user.webauthnCredentials || [];
    const initialLength = credentials.length;

    // Remove the credential with matching credId
    user.webauthnCredentials = credentials.filter(
      (c) => String(c.credId) !== String(credId),
    );

    if (user.webauthnCredentials.length === initialLength) {
      return respond.error(
        res,
        404,
        "credential_not_found",
        "Credential not found",
      );
    }

    // If no credentials remain, remove 'passkey' from mfaMethod and disable if no other MFA method
    if (user.webauthnCredentials.length === 0) {
      let mfaMethod = String(user.mfaMethod || "").toLowerCase();
      // Remove 'passkey' from mfaMethod
      mfaMethod = mfaMethod
        .split(",")
        .filter((m) => m.trim() !== "passkey")
        .join(",")
        .trim();
      user.mfaMethod = mfaMethod || "";

      // If mfaMethod is now empty and no other MFA methods exist, disable MFA
      if (!mfaMethod && !user.mfaSecret) {
        user.mfaEnabled = false;
      }
    }

    await user.save();
    sendPasskeyRemovedNotification(userId).catch((err) => {
      console.error("Failed to send passkey removed notification:", err);
    });
    inAppNotificationService
      .createSecurityNotification(userId, "passkey_removed", {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      })
      .catch((err) =>
        console.error("Failed to create auth notification:", err),
      );
    return res.json({
      deleted: true,
      remainingCount: user.webauthnCredentials.length,
    });
  } catch (err) {
    console.error("DELETE /api/auth/webauthn/credentials/:credId error:", err);
    return respond.error(
      res,
      500,
      "credential_delete_failed",
      "Failed to delete credential",
    );
  }
});

// DELETE /api/auth/webauthn/credentials - Delete all passkeys (disable passkey authentication)
router.delete("/webauthn/credentials", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;
    const user = await User.findById(userId);
    if (!user)
      return respond.error(res, 404, "user_not_found", "User not found");

    const hadCredentials = (user.webauthnCredentials || []).length > 0;

    // Clear all credentials
    user.webauthnCredentials = [];

    // Remove 'passkey' from mfaMethod
    let mfaMethod = String(user.mfaMethod || "").toLowerCase();
    mfaMethod = mfaMethod
      .split(",")
      .filter((m) => m.trim() !== "passkey")
      .join(",")
      .trim();
    user.mfaMethod = mfaMethod || "";

    // If mfaMethod is now empty and no other MFA methods exist, disable MFA
    if (!mfaMethod && !user.mfaSecret) {
      user.mfaEnabled = false;
    }

    await user.save();
    if (hadCredentials) {
      sendPasskeyRemovedNotification(userId).catch((err) => {
        console.error("Failed to send passkey removed notification:", err);
      });
      inAppNotificationService
        .createSecurityNotification(userId, "passkey_removed", {
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        })
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );
    }
    return res.json({ disabled: true, hadCredentials });
  } catch (err) {
    console.error("DELETE /api/auth/webauthn/credentials error:", err);
    return respond.error(
      res,
      500,
      "credentials_disable_failed",
      "Failed to disable passkey authentication",
    );
  }
});

// Expose for admin step-up passkey flow (start stores challenge with key 'step_up_' + userId)
router.authenticationChallenges = authenticationChallenges;

module.exports = router;
