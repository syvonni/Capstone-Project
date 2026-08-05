const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const { generateCode, generateToken } = require("../lib/codes");
const { sendOtp } = require("../lib/mailer");
const { loginRequests } = require("../lib/authRequestsStore");
const { signAccessToken } = require("../middleware/auth");
const LoginRequest = require("../models/LoginRequest");
const respond = require("../middleware/respond");
const logger = require("../lib/logger");
const { validateBody, Joi } = require("../middleware/validation");
const { perEmailRateLimit } = require("../middleware/rateLimit");
const {
  checkLockout,
  incrementFailedAttempts,
  clearFailedAttempts,
} = require("../lib/accountLockout");
const { decryptWithHash } = require("../lib/secretCipher");
const Session = require("../models/Session");
const { trackIP } = require("../lib/ipTracker");
const inAppNotificationService = require("../services/notificationService");
const {
  isPasswordExpired,
  isPasswordExpiredByPolicy,
} = require("../lib/passwordExpiry");
const {
  verifyTurnstileToken,
  shouldRequireCaptcha,
} = require("../lib/turnstile");
const { logAuditEvent } = require("../lib/auditClient");
let OAuth2Client = null;
try {
  ({ OAuth2Client } = require("google-auth-library"));
} catch (_) {
  OAuth2Client = null;
}

const router = express.Router();

function displayPhoneNumber(value) {
  const s = typeof value === "string" ? value : "";
  if (s.startsWith("__unset__")) return "";
  return s;
}

function normalizeLoginIdentifier(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim();
}

function isMobileClientRequest(req) {
  const headers = (req && req.headers) || {};
  return (
    String(headers["x-client-type"] || "")
      .trim()
      .toLowerCase() === "mobile"
  );
}

function isEmailIdentifier(identifier) {
  if (process.env.NODE_ENV === "development" && identifier === "1") return true;
  return identifier.includes("@");
}

async function findUserByIdentifier(
  identifier,
  { populateRole = false, lean = true } = {},
) {
  const key = normalizeLoginIdentifier(identifier);
  const query = isEmailIdentifier(key) ? { email: key } : { username: key };
  let q = User.findOne(query);
  if (populateRole) q = q.populate("role");
  if (lean) q = q.lean();
  const doc = await q;
  const emailKey =
    doc && doc.email ? String(doc.email).toLowerCase().trim() : "";
  return { doc, emailKey };
}

const loginCredentialsSchema = Joi.object({
  // Support dev admin shorthand: email === '1' with a very short password
  email: Joi.string().trim().min(1).max(200).required(),
  password: Joi.string()
    .max(200)
    .when("email", {
      is: "1",
      then:
        process.env.NODE_ENV === "development"
          ? Joi.string().min(1)
          : Joi.string().min(6),
      otherwise: Joi.string().min(6),
    })
    .required(),
  captchaToken: Joi.string().allow("", null).optional(),
});

const verifyCodeSchema = Joi.object({
  // Allow dev admin shorthand email '1' in verification as well
  email: Joi.string().trim().min(1).max(200).required(),
  // Be forgiving of accidental whitespace, but ensure only numbers
  code: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      "string.pattern.base":
        "OTP code must contain only 6 digits (numbers only)",
      "any.required": "OTP code is required",
      "string.empty": "Please enter the OTP code",
    }),
});

const verifyTotpSchema = Joi.object({
  email: Joi.string().trim().min(1).max(200).required(),
  code: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

const googleLoginSchema = Joi.object({
  idToken: Joi.string().min(10),
  email: Joi.string().email(),
  providerId: Joi.string().min(5),
  emailVerified: Joi.boolean(),
  firstName: Joi.string().min(1).max(100),
  lastName: Joi.string().min(1).max(100),
}).or("idToken", "email");

const resendCodeSchema = Joi.object({
  email:
    process.env.NODE_ENV === "development"
      ? Joi.alternatives()
          .try(Joi.string().email(), Joi.string().valid("1"))
          .required()
      : Joi.string().email().required(),
  captchaToken: Joi.string().allow("", null).optional(),
});

// Allow disabling rate limits only when explicitly set (e.g. load tests or local debugging)
const DISABLE_LIMITS = process.env.DISABLE_RATE_LIMIT === "true";
const passthrough = (req, res, next) => next();

const loginStartLimiter = DISABLE_LIMITS
  ? passthrough
  : perEmailRateLimit({
      windowMs: 10 * 60 * 1000,
      max: 5,
      code: "login_code_rate_limited",
      message: "Too many login code requests; try again later.",
    });

const loginVerifyLimiter = DISABLE_LIMITS
  ? passthrough
  : perEmailRateLimit({
      windowMs: 10 * 60 * 1000,
      max: 10,
      code: "login_verify_rate_limited",
      message: "Too many login verification attempts; try again later.",
    });

async function createSessionForUser(doc, roleSlug, req) {
  try {
    const ipAddress =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await trackIP(doc._id, ipAddress);
    const getSessionTimeout = (slug) => {
      // Match JWT TTL (ACCESS_TOKEN_TTL_MINUTES=240 = 4 hours)
      return 240 * 60 * 1000; // 4 hours for all roles
    };
    const timeout = getSessionTimeout(roleSlug);
    const expiresAt = new Date(Date.now() + timeout);
    await Session.create({
      userId: doc._id,
      tokenVersion: doc.tokenVersion || 0,
      ipAddress,
      userAgent,
      lastActivityAt: new Date(),
      expiresAt,
      isActive: true,
    });
  } catch (sessionError) {
    console.warn("Failed to create session on login:", sessionError);
  }
}

// POST /api/auth/login/start
// Step 1 of two-step login: validate credentials, send verification code
// Also handles '1' shorthand for dev admin
router.post(
  "/login/start",
  loginStartLimiter,
  validateBody(loginCredentialsSchema),
  async (req, res) => {
    try {
      // CAPTCHA (IAS-2: Rate + CAPTCHA): verify when Turnstile is configured
      if (shouldRequireCaptcha(req)) {
        const token = (req.body.captchaToken || "").trim();
        if (!token) {
          return respond.error(
            res,
            400,
            "captcha_failed",
            "Verification failed. Please try again.",
          );
        }
        const result = await verifyTurnstileToken(token, req.ip);
        if (!result.success) {
          return respond.error(
            res,
            400,
            "captcha_failed",
            "Verification failed. Please try again.",
          );
        }
      }

      let { email, password } = req.body || {};
      const bypass =
        String(req.headers["x-bypass-fingerprint"] || "").toLowerCase() ===
        "true";
      // already validated

      const identifier = normalizeLoginIdentifier(email);

      // Ensure admin seed for testing if email is "1" (dev only)
      if (
        process.env.NODE_ENV === "development" &&
        String(identifier) === "1"
      ) {
        let adminDoc = await User.findOne({ email: "1" }).lean();
        if (!adminDoc) {
          const passwordHash = await bcrypt.hash("1", 10);
          const adminRole = await Role.findOne({ slug: "admin" });
          const createdAdmin = await User.create({
            role: adminRole ? adminRole._id : undefined,
            firstName: "Admin",
            lastName: "User",
            email: "1",
            phoneNumber: "",
            termsAccepted: true,
            passwordHash,
          });
          adminDoc = await User.findById(createdAdmin._id).lean();
        }
      }

      // Use normalized (lowercase) identifier for lookup - MongoDB is case-sensitive
      const emailKey = normalizeLoginIdentifier(email);
      let doc = await User.findOne({ email: emailKey }).lean();
      if (
        doc &&
        doc.role &&
        typeof doc.role === "string" &&
        !mongoose.Types.ObjectId.isValid(doc.role)
      ) {
        // Auto-fix bad role data
        try {
          const r = await Role.findOne({ slug: doc.role }).lean();
          if (r) {
            await User.updateOne({ _id: doc._id }, { role: r._id });
            doc.role = r;
          }
        } catch (_) {}
      } else if (doc && doc.role) {
        doc.role = await Role.findById(doc.role).lean();
      }

      if (!doc || typeof doc.passwordHash !== "string" || !doc.passwordHash) {
        // Track failed login attempt
        const securityMonitor = require("../middleware/securityMonitor");
        securityMonitor.trackFailedLogin(
          req.ip || req.connection.remoteAddress,
          null,
        );
        return respond.error(
          res,
          401,
          "invalid_credentials",
          "Invalid email or password",
        ); // REQUIREMENT IAS-1.3: generic login errors
      }

      // Account lockout: reject if account is locked due to too many failed attempts
      const lockoutCheck = await checkLockout(doc._id);
      if (lockoutCheck.locked) {
        const lockedUntilMs = lockoutCheck.lockedUntil
          ? new Date(lockoutCheck.lockedUntil).getTime()
          : Date.now() + 15 * 60 * 1000;
        return respond.error(
          res,
          423,
          "account_locked",
          "Account temporarily locked due to too many failed attempts. Try again later.",
          undefined,
          {
            lockedUntil: lockedUntilMs,
            remainingMinutes: lockoutCheck.remainingMinutes,
          },
        );
      }

      let match = false;
      const isBcrypt = /^\$2[aby]\$/.test(String(doc.passwordHash));
      if (isBcrypt) {
        match = await bcrypt.compare(password, doc.passwordHash); // REQUIREMENT IAS-1.1: strong password hashing (bcrypt)
      } else {
        match = String(password) === String(doc.passwordHash);
        if (match) {
          try {
            // doc is plain object, need to find doc to save
            const dbDoc = await User.findById(doc._id);
            if (dbDoc) {
              dbDoc.passwordHash = await bcrypt.hash(password, 10);
              dbDoc.passwordChangedAt = new Date();
              await dbDoc.save();
            }
          } catch (_) {}
        }
      }
      if (!match) {
        // Track failed login attempt and enforce account lockout after threshold
        const securityMonitor = require("../middleware/securityMonitor");
        securityMonitor.trackFailedLogin(
          req.ip || req.connection.remoteAddress,
          doc._id ? String(doc._id) : null,
        );
        const lockResult = await incrementFailedAttempts(doc._id);
        if (lockResult.locked && lockResult.lockedUntil) {
          const lockedUntilMs = new Date(lockResult.lockedUntil).getTime();
          return respond.error(
            res,
            423,
            "account_locked",
            "Account temporarily locked due to too many failed attempts. Try again later.",
            undefined,
            {
              lockedUntil: lockedUntilMs,
            },
          );
        }
        return respond.error(
          res,
          401,
          "invalid_credentials",
          "Invalid email or password",
        );
      }

      // Successful password check: clear any failed-attempt count so future failures start from zero
      await clearFailedAttempts(doc._id);

      // emailKey already set above from normalized request email

      // Ensure role is properly populated before extracting slug
      if (!doc.role || !doc.role.slug) {
        if (doc.role && mongoose.Types.ObjectId.isValid(doc.role)) {
          doc.role = await Role.findById(doc.role).lean();
        } else if (doc.role && typeof doc.role === "string") {
          doc.role = await Role.findOne({ slug: doc.role }).lean();
        } else {
          // If no role found, try to get from user document
          const userWithRole = await User.findById(doc._id)
            .populate("role")
            .lean();
          if (userWithRole && userWithRole.role) {
            doc.role = userWithRole.role;
          }
        }
      }

      // Enforce MFA requirement for staff and admins before proceeding.
      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : null;
      if (!roleSlug) {
        return respond.error(
          res,
          500,
          "role_not_found",
          "User role not found. Please contact support.",
        );
      }

      // Reject inspector login attempts from web interface - they must use mobile app
      if (roleSlug === "inspector" && !isMobileClientRequest(req)) {
        // Track failed login attempt
        const securityMonitor = require("../middleware/securityMonitor");
        securityMonitor.trackFailedLogin(
          req.ip || req.connection.remoteAddress,
          doc._id ? String(doc._id) : null,
        );
        return respond.error(
          res,
          401,
          "invalid_credentials",
          "Invalid email or password",
        ); // REQUIREMENT IAS-1.3: generic login errors
      }
      // Dev mode: bypass MFA entirely when BYPASS_MFA_DEV=true and not in production
      const bypassMfaDev =
        process.env.BYPASS_MFA_DEV === "true" &&
        process.env.NODE_ENV === "development";
      const requiresMfa = bypassMfaDev
        ? false
        : doc.isStaff === true || roleSlug === "admin";
      // Re-fetch MFA fields so we use latest persisted state (e.g. after onboarding)
      try {
        const mfaDoc = await User.findOne({ email: emailKey })
          .select("webauthnCredentials mfaSecret mfaEnabled mfaMethod")
          .lean();
        if (mfaDoc) {
          doc.webauthnCredentials = mfaDoc.webauthnCredentials;
          doc.mfaSecret = mfaDoc.mfaSecret;
          doc.mfaEnabled = mfaDoc.mfaEnabled;
          doc.mfaMethod = mfaDoc.mfaMethod;
        }
      } catch (_) {}
      const hasPasskey =
        Array.isArray(doc.webauthnCredentials) &&
        doc.webauthnCredentials.length > 0;
      const hasTotpMfa = !!doc.mfaSecret;
      // Working MFA = passkey enrolled OR TOTP fully enabled (secret saved and mfaEnabled true)
      const hasWorkingMfa =
        hasPasskey || (hasTotpMfa && doc.mfaEnabled === true);
      // Do not skip email OTP for admin/staff (including fresh accounts that must set up MFA).
      // They must receive the login OTP first, then after verify we return token with mustSetupMfa so they can complete MFA setup.

      // Dev-only: seeded business owner can skip email OTP entirely (no MFA required for this role).
      // In production (NODE_ENV=production) always require email OTP.
      const seedDevEnabled = process.env.SEED_DEV === "true";
      const isNonProduction = process.env.NODE_ENV !== "production";
      const isSeededBusinessOwner =
        roleSlug === "business_owner" && emailKey === "business@example.com";

      // Dev mode: bypass all MFA, email OTP, and onboarding for any seeded user when BYPASS_MFA_DEV=true
      // For staff and admin we never bypass so they are always required to complete onboarding (change password + MFA).
      const isSeededUser =
        emailKey.endsWith("@example.com") ||
        emailKey.endsWith("@mailslurp.biz");
      const isStaffOrAdmin = doc.isStaff === true || roleSlug === "admin";
      if (bypassMfaDev && isSeededUser && !isStaffOrAdmin) {
        try {
          const dbDoc = await User.findById(doc._id);
          if (dbDoc) {
            dbDoc.lastLoginAt = new Date();
            // Clear all onboarding requirements in dev mode
            dbDoc.mustSetupMfa = false;
            dbDoc.mustChangeCredentials = false;
            // Update accountStatus for business owners when onboarding is complete
            if (!dbDoc.isStaff && roleSlug === "business_owner") {
              dbDoc.accountStatus = "active";
            }
            await dbDoc.save();
          }
        } catch (_) {}
        try {
          const { token, expiresAtMs } = signAccessToken(doc);
          await createSessionForUser(doc, roleSlug, req);
          logger.info("Login: dev mode MFA bypass", {
            email: emailKey,
            role: roleSlug,
          });
          const isFirstLogin = !doc.lastLoginAt;
          inAppNotificationService
            .createLoginNotification(doc._id, {
              isFirstLogin,
              userAgent: req.headers["user-agent"],
              ip: req.ip,
              method: "dev_bypass",
            })
            .catch((err) =>
              console.error("Failed to create auth notification:", err),
            );
          return res.json({
            id: String(doc._id),
            role: roleSlug,
            firstName: doc.firstName,
            lastName: doc.lastName,
            email: doc.email,
            phoneNumber: displayPhoneNumber(doc.phoneNumber),
            termsAccepted: doc.termsAccepted,
            createdAt: doc.createdAt,
            username: doc.username || "",
            office: doc.office || "",
            isActive: doc.isActive !== false,
            isStaff: !!doc.isStaff,
            mustChangeCredentials: false,
            mustSetupMfa: false,
            mfaEnabled: false,
            mfaMethod: "",
            skipEmailVerification: true,
            devMfaBypassed: true,
            token,
            expiresAt: new Date(expiresAtMs).toISOString(),
          });
        } catch (err) {
          console.error("Failed to bypass MFA for dev user:", err);
          // Fall through to normal flow
        }
      }

      if (
        seedDevEnabled &&
        isNonProduction &&
        isSeededBusinessOwner &&
        !requiresMfa
      ) {
        const bypassPasswordExpired = isPasswordExpired(doc.passwordChangedAt);
        const bypassMustChange =
          !!doc.mustChangeCredentials || bypassPasswordExpired;
        try {
          const dbDoc = await User.findById(doc._id);
          if (dbDoc) {
            dbDoc.lastLoginAt = new Date();
            if (bypassPasswordExpired) dbDoc.mustChangeCredentials = true;
            await dbDoc.save();
          }
        } catch (_) {}
        try {
          const { token, expiresAtMs } = signAccessToken(doc);
          await createSessionForUser(doc, roleSlug, req);
          const isFirstLoginBO = !doc.lastLoginAt;
          inAppNotificationService
            .createLoginNotification(doc._id, {
              isFirstLogin: isFirstLoginBO,
              userAgent: req.headers["user-agent"],
              ip: req.ip,
              method: "dev_bypass",
            })
            .catch((err) =>
              console.error("Failed to create auth notification:", err),
            );
          return res.json({
            id: String(doc._id),
            role: roleSlug,
            firstName: doc.firstName,
            lastName: doc.lastName,
            email: doc.email,
            phoneNumber: displayPhoneNumber(doc.phoneNumber),
            termsAccepted: doc.termsAccepted,
            createdAt: doc.createdAt,
            username: doc.username || "",
            office: doc.office || "",
            isActive: doc.isActive !== false,
            isStaff: !!doc.isStaff,
            mustChangeCredentials: bypassMustChange,
            mustSetupMfa: !!doc.mustSetupMfa,
            mfaEnabled: !!doc.mfaEnabled,
            mfaMethod: doc.mfaMethod || "",
            skipEmailVerification: true,
            ...(bypassPasswordExpired ? { passwordExpired: true } : {}),
            token,
            expiresAt: new Date(expiresAtMs).toISOString(),
          });
        } catch (err) {
          console.error("Failed to bypass OTP for seeded business owner:", err);
          // Fall through to normal OTP flow
        }
      }

      // Update last login timestamp and increment token version
      try {
        const dbDoc = await User.findById(doc._id);
        if (dbDoc) {
          dbDoc.lastLoginAt = new Date();
          // Increment token version for new login to create separate session
          const oldTokenVersion = dbDoc.tokenVersion || 0;
          dbDoc.tokenVersion = oldTokenVersion + 1;
          // Update accountStatus for business owners when they log in and don't need to change credentials
          if (
            !dbDoc.isStaff &&
            roleSlug === "business_owner" &&
            !dbDoc.mustChangeCredentials
          ) {
            dbDoc.accountStatus = "active";
          }
          console.log(
            `[Login Verify] User: ${dbDoc.email}, Token version: ${oldTokenVersion} -> ${dbDoc.tokenVersion}`,
          );
          await dbDoc.save();
        }
      } catch (_) {}

      const isLguOfficer = doc.role && doc.role.slug === "lgu_officer";
      const code = generateCode();

      const expiresAtMs = Date.now() + 10 * 60 * 1000; // 10 minutes
      const loginToken = generateToken();

      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      if (useDB) {
        await LoginRequest.findOneAndUpdate(
          { email: emailKey },
          {
            code,
            expiresAt: new Date(expiresAtMs),
            verified: false,
            loginToken,
            userId: String(doc._id),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } else {
        loginRequests.set(emailKey, {
          code,
          expiresAt: expiresAtMs,
          verified: false,
          loginToken,
          userId: String(doc._id),
        });
      }

      // Determine which authentication method is enabled
      const hasTotp = !!doc.mfaSecret;
      let method = String(doc.mfaMethod || "").toLowerCase();
      if (!method) {
        if (hasTotp) method = "authenticator";
        else if (doc.fprintEnabled) method = "fingerprint";
      }
      const isPasskeyMethod =
        method === "passkey" || method.includes("passkey");
      const isTotpMethod =
        method === "authenticator" ||
        method.includes("authenticator") ||
        method.includes("fingerprint");

      // Determine if TOTP MFA is actually enabled and available
      // MFA is only truly enabled if: mfaEnabled is true AND has mfaSecret (TOTP is set up)
      const totpMfaEnabled = doc.mfaEnabled === true && hasTotp && isTotpMethod;

      // Check if account deletion is scheduled - if so, always send OTP via email
      const hasScheduledDeletion =
        doc.deletionScheduledFor &&
        new Date(doc.deletionScheduledFor) > new Date();

      // In non-production: use email OTP for admin/staff only when they have no working MFA (avoid lockout during setup)
      const forceEmailOtpInDev =
        process.env.NODE_ENV !== "production" && requiresMfa && !hasWorkingMfa;

      try {
        // Send verification code via email if:
        // 1. Account deletion is scheduled (ALWAYS send email OTP for scheduled deletion accounts)
        // 2. TOTP MFA is NOT enabled (regular email verification)
        // 3. NOT using passkey authentication (passkeys are used at login page) - UNLESS deletion is scheduled
        // 4. NOT an LGU Officer - UNLESS deletion is scheduled
        if (hasScheduledDeletion) {
          // Account deletion is scheduled - ALWAYS send OTP via email
          // This ensures users can log in to see deletion status and potentially undo it
          const emailResult = await sendOtp({
            to: email,
            code,
            subject:
              "Your Login Verification Code - Account Deletion Scheduled",
            purpose: "login",
          });
          if (!emailResult || !emailResult.success) {
            logger.error("Login OTP email failed (scheduled deletion)", {
              email,
              error: emailResult?.error || "Unknown error",
            });
            return respond.error(
              res,
              500,
              "email_send_failed",
              `Failed to send verification email. ${emailResult?.error || "Check email configuration."}`,
            );
          }
          logger.info("Login: sent email OTP (scheduled deletion)", { email });
        } else if (hasPasskey && !isLguOfficer) {
          // User has passkeys - skip email OTP, they'll authenticate via passkey
          logger.info("Login: skipping email OTP (passkey enrolled)", {
            email,
          });
        } else if (forceEmailOtpInDev || (!totpMfaEnabled && !isLguOfficer)) {
          const emailResult = await sendOtp({
            to: email,
            code,
            subject: "Your Login Verification Code",
            purpose: "login",
          });
          if (!emailResult || !emailResult.success) {
            logger.error("Login OTP email failed", {
              email,
              error: emailResult?.error || "Unknown error",
            });
            return respond.error(
              res,
              500,
              "email_send_failed",
              `Failed to send verification email. ${emailResult?.error || "Check email configuration (e.g. sender verification in your provider)."}`,
            );
          }
          if (forceEmailOtpInDev) {
            logger.info("Login: sent email OTP (dev, admin/staff)", { email });
          } else {
            logger.info("Login: sent email OTP", { email });
          }
        } else if (totpMfaEnabled && !isLguOfficer) {
          // TOTP MFA is enabled - DO NOT send email OTP
          logger.info("Login: skipping email OTP (TOTP MFA enabled)", {
            email,
          });
        } else if (isPasskeyMethod && !isLguOfficer) {
          logger.info("Login: skipping email OTP (passkey enabled)", { email });
        } else if (isLguOfficer) {
          logger.info("Login: LGU Officer fixed OTP (no email)", {
            email,
            code,
          });
        }
      } catch (mailErr) {
        logger.error("Failed to send login verification email", {
          email,
          error: mailErr.message,
        });
        return respond.error(
          res,
          500,
          "email_send_failed",
          `Failed to send verification email: ${mailErr.message}`,
        );
      }

      const payload = { sent: true };
      payload.mfaEnabled = forceEmailOtpInDev ? false : totpMfaEnabled;
      payload.mfaMethod = forceEmailOtpInDev ? "email" : method;
      payload.hasPasskey = hasPasskey;
      try {
        payload.isFingerprintEnabled =
          !!doc.fprintEnabled || method.includes("fingerprint");
      } catch (_) {}
      payload.loginEmail = emailKey;

      if (hasScheduledDeletion || forceEmailOtpInDev) {
        payload.forceEmailOtp = true;
        if (forceEmailOtpInDev) payload.mfaEnabled = false;
        payload.mfaMethod = "email";
      } else if (hasPasskey && !totpMfaEnabled) {
        // Passkey-only user (no TOTP) - indicate passkey method
        payload.mfaMethod = "passkey";
      }

      if (process.env.NODE_ENV !== "production") payload.devCode = code;
      return res.json(payload);
    } catch (err) {
      console.error("POST /api/auth/login/start error:", err);
      return respond.error(
        res,
        500,
        "login_start_failed",
        `Failed to start login: ${err.message}`,
      );
    }
  },
);

// POST /api/auth/login/resend
// Resend verification code for an existing login request
router.post(
  "/login/resend",
  loginStartLimiter,
  validateBody(resendCodeSchema),
  async (req, res) => {
    try {
      if (shouldRequireCaptcha(req)) {
        const token = (req.body.captchaToken || "").trim();
        if (!token) {
          return respond.error(
            res,
            400,
            "captcha_failed",
            "Verification failed. Please try again.",
          );
        }
        const result = await verifyTurnstileToken(token, req.ip);
        if (!result.success) {
          return respond.error(
            res,
            400,
            "captcha_failed",
            "Verification failed. Please try again.",
          );
        }
      }

      const { email } = req.body || {};
      const emailKey = String(email).toLowerCase().trim();
      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      let reqObj = null;

      if (useDB) {
        reqObj = await LoginRequest.findOne({ email: emailKey }).lean();
      } else {
        reqObj = loginRequests.get(emailKey);
      }

      if (!reqObj)
        return respond.error(
          res,
          404,
          "request_not_found",
          "No pending login request found. Please log in again.",
        );

      // Check if account deletion is scheduled - if so, always send OTP via email
      let hasScheduledDeletion = false;
      try {
        const userDoc = await User.findOne({ email: emailKey })
          .select("deletionScheduledFor")
          .lean();
        hasScheduledDeletion =
          userDoc &&
          userDoc.deletionScheduledFor &&
          new Date(userDoc.deletionScheduledFor) > new Date();
      } catch (err) {
        console.warn("Failed to check scheduled deletion in resend:", err);
      }

      // Allow resending even if expired, but update expiration.
      // Or if strictly expired, force login again.
      // Let's force login again if expired significantly, but here we just refresh it.
      // Actually, if it's expired, the record might be gone if we had TTL, but we handle it manually.

      const code = generateCode();
      const expiresAtMs = Date.now() + 10 * 60 * 1000; // 10 minutes refreshed

      if (useDB) {
        await LoginRequest.findOneAndUpdate(
          { email: emailKey },
          { code, expiresAt: new Date(expiresAtMs) },
        );
      } else {
        reqObj.code = code;
        reqObj.expiresAt = expiresAtMs;
        loginRequests.set(emailKey, reqObj);
      }

      try {
        // Always send email OTP if account deletion is scheduled
        const subject = hasScheduledDeletion
          ? "Your Login Verification Code (Resend) - Account Deletion Scheduled"
          : "Your Login Verification Code (Resend)";
        const emailResult = await sendOtp({
          to: email,
          code,
          subject,
          purpose: "login",
        });
        if (!emailResult || !emailResult.success) {
          console.error(
            `[Login Resend] Failed to send OTP email to ${email}:`,
            emailResult?.error || "Unknown error",
          );
          return respond.error(
            res,
            500,
            "email_failed",
            `Failed to send email: ${emailResult?.error || "Please check your email configuration"}`,
          );
        }
        if (hasScheduledDeletion) {
          console.log(
            `[Login Resend] Account deletion scheduled for ${email} - sending email OTP`,
          );
        }
      } catch (mailErr) {
        console.error("Failed to resend login email:", mailErr);
        return respond.error(
          res,
          500,
          "email_failed",
          `Failed to send email: ${mailErr.message}`,
        );
      }

      return res.json({ sent: true });
    } catch (err) {
      console.error("POST /api/auth/login/resend error:", err);
      return respond.error(res, 500, "resend_failed", "Failed to resend code");
    }
  },
);

// POST /api/auth/login/verify
// Step 2 of two-step login: verify code and complete login
router.post(
  "/login/verify",
  loginVerifyLimiter,
  validateBody(verifyCodeSchema),
  async (req, res) => {
    try {
      let { email, code } = req.body || {};
      const identifier = normalizeLoginIdentifier(email);
      const { doc: userDoc, emailKey } = await findUserByIdentifier(
        identifier,
        { populateRole: true, lean: true },
      );
      if (!userDoc)
        return respond.error(res, 404, "user_not_found", "User not found");
      const useDB = mongoose.connection && mongoose.connection.readyState === 1;
      let reqObj = null;
      if (useDB) {
        reqObj = await LoginRequest.findOne({ email: emailKey }).lean();
        if (!reqObj)
          return respond.error(
            res,
            404,
            "login_request_not_found",
            "No active login verification request found. Please start the login process again.",
          );
        if (Date.now() > new Date(reqObj.expiresAt).getTime())
          return respond.error(
            res,
            410,
            "code_expired",
            "The OTP code has expired. Please request a new code.",
          );
        if (String(reqObj.code) !== String(code)) {
          // Track failed login attempt
          const securityMonitor = require("../middleware/securityMonitor");
          securityMonitor.trackFailedLogin(
            req.ip || req.connection.remoteAddress,
            userDoc._id ? String(userDoc._id) : null,
          );
          return respond.error(
            res,
            401,
            "invalid_code",
            "The OTP code you entered is incorrect. Please check and try again.",
          );
        }
      } else {
        reqObj = loginRequests.get(emailKey);
        if (!reqObj)
          return respond.error(
            res,
            404,
            "login_request_not_found",
            "No active login verification request found. Please start the login process again.",
          );
        if (Date.now() > reqObj.expiresAt)
          return respond.error(
            res,
            410,
            "code_expired",
            "The OTP code has expired. Please request a new code.",
          );
        if (String(reqObj.code) !== String(code)) {
          // Track failed login attempt
          const securityMonitor = require("../middleware/securityMonitor");
          securityMonitor.trackFailedLogin(
            req.ip || req.connection.remoteAddress,
            userDoc._id ? String(userDoc._id) : null,
          );
          return respond.error(
            res,
            401,
            "invalid_code",
            "The OTP code you entered is incorrect. Please check and try again.",
          );
        }
      }

      // Load user and return safe object
      // Use manual populate to handle potential schema mismatches (e.g. role as string "admin")
      let doc = await User.findOne({ email: emailKey }).lean();
      if (!doc)
        return respond.error(res, 404, "user_not_found", "User not found");

      // Auto-fix for legacy/bad data where role is a string slug instead of ObjectId
      if (
        doc.role &&
        typeof doc.role === "string" &&
        !mongoose.Types.ObjectId.isValid(doc.role)
      ) {
        try {
          const slug = doc.role;
          const roleDoc = await Role.findOne({ slug }).lean();
          if (roleDoc) {
            console.log(
              `[Auto-Fix] Updating user ${doc.email} role from "${slug}" to ObjectId(${roleDoc._id})`,
            );
            await User.updateOne({ _id: doc._id }, { role: roleDoc._id });
            doc.role = roleDoc;
          }
        } catch (err) {
          console.warn("Failed to auto-fix user role:", err);
        }
      } else if (doc.role) {
        // Manual populate
        doc.role = await Role.findById(doc.role).lean();
      }

      // Ensure role is properly populated before extracting slug
      if (!doc.role || !doc.role.slug) {
        if (doc.role && mongoose.Types.ObjectId.isValid(doc.role)) {
          doc.role = await Role.findById(doc.role).lean();
        } else if (doc.role && typeof doc.role === "string") {
          doc.role = await Role.findOne({ slug: doc.role }).lean();
        } else {
          // If no role found, try to get from user document
          const userWithRole = await User.findById(doc._id)
            .populate("role")
            .lean();
          if (userWithRole && userWithRole.role) {
            doc.role = userWithRole.role;
          }
        }
      }

      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : null;
      if (!roleSlug) {
        return respond.error(
          res,
          500,
          "role_not_found",
          "User role not found. Please contact support.",
        );
      }

      // Default allow in non-production unless explicitly disabled
      const allowSeededMfaSetup =
        process.env.ALLOW_SEEDED_MFA_SETUP === "true" ||
        (process.env.ALLOW_SEEDED_MFA_SETUP !== "false" &&
          process.env.NODE_ENV !== "production");

      const requiresMfa = doc.isStaff === true || roleSlug === "admin";
      // Re-fetch MFA fields so we use latest persisted state before deciding to clear TOTP / set mustSetupMfa
      try {
        const mfaDoc = await User.findOne({ email: emailKey })
          .select("webauthnCredentials mfaSecret mfaEnabled mfaMethod")
          .lean();
        if (mfaDoc) {
          doc.webauthnCredentials = mfaDoc.webauthnCredentials;
          doc.mfaSecret = mfaDoc.mfaSecret;
          doc.mfaEnabled = mfaDoc.mfaEnabled;
          doc.mfaMethod = mfaDoc.mfaMethod;
        }
      } catch (_) {}
      const hasPasskey =
        Array.isArray(doc.webauthnCredentials) &&
        doc.webauthnCredentials.length > 0;
      const hasTotp = !!doc.mfaSecret;
      const hasWorkingMfaVerify =
        hasPasskey || (hasTotp && doc.mfaEnabled === true);
      // Admin/staff with no working MFA but valid OTP: avoid lockout by forcing MFA setup on next login
      if (requiresMfa && !hasWorkingMfaVerify) {
        try {
          const dbDoc = await User.findById(doc._id);
          if (dbDoc) {
            dbDoc.mustSetupMfa = true;
            if (dbDoc.mfaSecret && dbDoc.mfaEnabled !== true) {
              dbDoc.mfaSecret = undefined;
              dbDoc.mfaEnabled = false;
              dbDoc.mfaMethod = "";
            }
            await dbDoc.save();
            doc.mustSetupMfa = true;
            doc.mfaEnabled = false;
          }
        } catch (_) {}
        // Fall through to issue token so user is logged in and redirected to MFA setup
      }

      // 90-day password expiry: if expired, force password change on next use
      let mustChangeCredentials = !!doc.mustChangeCredentials;
      const passwordExpiredByPolicy = isPasswordExpiredByPolicy(
        doc.passwordChangedAt,
      );
      const passwordExpired = isPasswordExpired(doc.passwordChangedAt);
      if (passwordExpired) {
        mustChangeCredentials = true;
        try {
          const dbDoc = await User.findById(doc._id);
          if (dbDoc) {
            dbDoc.mustChangeCredentials = true;
            await dbDoc.save();
          }
        } catch (_) {}
      }

      const safe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: displayPhoneNumber(doc.phoneNumber),
        termsAccepted: doc.termsAccepted,
        createdAt: doc.createdAt,
        deletionPending: !!doc.deletionPending,
        deletionRequestedAt: doc.deletionRequestedAt,
        deletionScheduledFor: doc.deletionScheduledFor,
        avatarUrl: doc.avatarUrl || "",
        username: doc.username || "",
        office: doc.office || "",
        isActive: doc.isActive !== false,
        isStaff: !!doc.isStaff,
        mustChangeCredentials,
        mustSetupMfa: !!doc.mustSetupMfa,
        ...(passwordExpiredByPolicy ? { passwordExpired: true } : {}),
      };
      try {
        const { token, expiresAtMs } = signAccessToken(doc);
        safe.token = token;
        safe.expiresAt = new Date(expiresAtMs).toISOString();

        // Create session for successful login
        try {
          const Session = require("../models/Session");
          const { trackIP } = require("../lib/ipTracker");
          const ipAddress =
            req.ip ||
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress ||
            "unknown";
          const userAgent = req.headers["user-agent"] || "unknown";

          // Track IP
          await trackIP(doc._id, ipAddress);

          // Determine session timeout based on role
          const getSessionTimeout = (roleSlug) => {
            // Match JWT TTL (ACCESS_TOKEN_TTL_MINUTES=240 = 4 hours)
            return 240 * 60 * 1000; // 4 hours for all roles
          };

          const timeout = getSessionTimeout(roleSlug);
          const expiresAt = new Date(Date.now() + timeout);

          await Session.create({
            userId: doc._id,
            tokenVersion: doc.tokenVersion || 0,
            ipAddress,
            userAgent,
            lastActivityAt: new Date(),
            expiresAt,
            isActive: true,
          });
        } catch (sessionError) {
          // Don't fail login if session creation fails
          console.warn("Failed to create session on login:", sessionError);
        }
      } catch (_) {}

      // Cleanup login state
      if (useDB) await LoginRequest.deleteOne({ email: emailKey });
      else loginRequests.delete(emailKey);

      const isFirstLogin = !doc.lastLoginAt;
      inAppNotificationService
        .createLoginNotification(doc._id, {
          isFirstLogin,
          userAgent: req.headers["user-agent"],
          ip: req.ip,
          method: "email_otp",
        })
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );
      logAuditEvent("login", doc._id, "Session", doc._id, {
        role: doc.role?.slug || roleSlug || "business_owner",
        fieldChanged: "session",
        oldValue: "",
        newValue: "active",
        method: "email_otp",
        ip: req.ip,
      }).catch(() => {});

      return res.json(safe);
    } catch (err) {
      try {
        const logPath = path.join(process.cwd(), "backend-error.log");
        const logMsg = `[${new Date().toISOString()}] login/verify error: ${err.message}\n${err.stack}\n\n`;
        fs.appendFileSync(logPath, logMsg);
      } catch (_) {}
      console.error("POST /api/auth/login/verify error:", err);
      return respond.error(
        res,
        500,
        "login_verify_failed",
        `Failed to verify login code: ${err.message}`,
      );
    }
  },
);

// POST /api/auth/login/verify-totp
router.post(
  "/login/verify-totp",
  validateBody(verifyTotpSchema),
  async (req, res) => {
    try {
      let { email, code } = req.body || {};
      const identifier = normalizeLoginIdentifier(email);
      const { doc, emailKey } = await findUserByIdentifier(identifier, {
        populateRole: true,
        lean: false,
      });
      if (!doc)
        return respond.error(res, 404, "user_not_found", "User not found");

      // Check if account deletion is scheduled - if so, TOTP verification is not allowed
      // Users with scheduled deletion must use email OTP verification instead
      const hasScheduledDeletion =
        doc.deletionScheduledFor &&
        new Date(doc.deletionScheduledFor) > new Date();
      if (hasScheduledDeletion) {
        return respond.error(
          res,
          403,
          "use_email_otp_for_scheduled_deletion",
          "Account deletion is scheduled. Please use email OTP verification instead of TOTP. Check your email for the verification code.",
        );
      }

      if (doc.mfaEnabled !== true || !doc.mfaSecret) {
        return respond.error(
          res,
          400,
          "mfa_not_enabled",
          "MFA is not enabled for this account",
        );
      }

      const { verifyTotpWithCounter } = require("../lib/totp");
      const secretPlain = decryptWithHash(
        String(doc.passwordHash || ""),
        String(doc.mfaSecret),
      );
      const resVerify = verifyTotpWithCounter({
        secret: secretPlain,
        token: String(code),
        window: 1,
        period: 30,
        digits: 6,
      });
      if (!resVerify.ok) {
        // Track failed login attempt
        const securityMonitor = require("../middleware/securityMonitor");
        securityMonitor.trackFailedLogin(
          req.ip || req.connection.remoteAddress,
          doc._id ? String(doc._id) : null,
        );
        return respond.error(
          res,
          401,
          "invalid_mfa_code",
          "Invalid verification code",
        );
      }
      if (
        typeof doc.mfaLastUsedTotpCounter === "number" &&
        doc.mfaLastUsedTotpCounter === resVerify.counter
      ) {
        // Track failed login attempt
        const securityMonitor = require("../middleware/securityMonitor");
        securityMonitor.trackFailedLogin(
          req.ip || req.connection.remoteAddress,
          doc._id ? String(doc._id) : null,
        );
        return respond.error(
          res,
          401,
          "totp_replayed",
          "Verification code already used",
        );
      }

      // Update mfaMethod to include authenticator, preserving existing methods (including passkey)
      const currentMethod = String(doc.mfaMethod || "").toLowerCase();
      const methods = new Set();
      methods.add("authenticator");
      if (doc.fprintEnabled) methods.add("fingerprint");
      if (currentMethod.includes("passkey")) methods.add("passkey");
      doc.mfaMethod = Array.from(methods).join(",");
      doc.mustChangeCredentials =
        doc.mustChangeCredentials || isPasswordExpired(doc.passwordChangedAt);
      doc.mfaLastUsedTotpCounter = resVerify.counter;
      doc.mfaLastUsedTotpAt = new Date();
      doc.lastLoginAt = new Date();
      // Increment token version for new login to create separate session
      const oldTokenVersion = doc.tokenVersion || 0;
      doc.tokenVersion = oldTokenVersion + 1;
      // Update accountStatus for business owners when they log in and don't need to change credentials
      if (
        !doc.isStaff &&
        roleSlug === "business_owner" &&
        !doc.mustChangeCredentials
      ) {
        doc.accountStatus = "active";
      }
      console.log(
        `[Login] User: ${doc.email}, Token version: ${oldTokenVersion} -> ${doc.tokenVersion}`,
      );
      await doc.save();

      const passwordExpiredByPolicy = isPasswordExpiredByPolicy(
        doc.passwordChangedAt,
      );

      // Create session for successful login
      try {
        const Session = require("../models/Session");
        const { trackIP } = require("../lib/ipTracker");
        const ipAddress =
          req.ip ||
          req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress ||
          "unknown";
        const userAgent = req.headers["user-agent"] || "unknown";

        // Track IP
        await trackIP(doc._id, ipAddress);

        // Determine session timeout based on role
        const getSessionTimeout = (roleSlug) => {
          // Match JWT TTL (ACCESS_TOKEN_TTL_MINUTES=240 = 4 hours)
          return 240 * 60 * 1000; // 4 hours for all roles
        };

        // Ensure role is populated before extracting slug
        if (!doc.role || !doc.role.slug) {
          if (doc.role && mongoose.Types.ObjectId.isValid(doc.role)) {
            doc.role = await Role.findById(doc.role).lean();
          } else {
            const userWithRole = await User.findById(doc._id)
              .populate("role")
              .lean();
            if (userWithRole && userWithRole.role) {
              doc.role = userWithRole.role;
            }
          }
        }

        const roleSlug = doc.role && doc.role.slug ? doc.role.slug : null;
        if (!roleSlug) {
          console.warn(`User ${doc.email} has no valid role`);
        } else {
          const timeout = getSessionTimeout(roleSlug);
          const expiresAt = new Date(Date.now() + timeout);

          await Session.create({
            userId: doc._id,
            tokenVersion: doc.tokenVersion || 0,
            ipAddress,
            userAgent,
            lastActivityAt: new Date(),
            expiresAt,
            isActive: true,
          });
        }
      } catch (sessionError) {
        // Don't fail login if session creation fails
        console.warn("Failed to create session on login:", sessionError);
      }

      // Ensure role is populated before extracting slug
      if (!doc.role || !doc.role.slug) {
        if (doc.role && mongoose.Types.ObjectId.isValid(doc.role)) {
          doc.role = await Role.findById(doc.role).lean();
        } else {
          const userWithRole = await User.findById(doc._id)
            .populate("role")
            .lean();
          if (userWithRole && userWithRole.role) {
            doc.role = userWithRole.role;
          }
        }
      }

      const roleSlug = doc.role && doc.role.slug ? doc.role.slug : null;
      if (!roleSlug) {
        return respond.error(
          res,
          500,
          "role_not_found",
          "User role not found. Please contact support.",
        );
      }

      const safe = {
        id: String(doc._id),
        role: roleSlug,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phoneNumber: displayPhoneNumber(doc.phoneNumber),
        avatarUrl: doc.avatarUrl || "",
        termsAccepted: doc.termsAccepted,
        deletionPending: !!doc.deletionPending,
        deletionScheduledFor: doc.deletionScheduledFor,
        createdAt: doc.createdAt,
        username: doc.username || "",
        office: doc.office || "",
        isActive: doc.isActive !== false,
        isStaff: !!doc.isStaff,
        mustChangeCredentials: !!doc.mustChangeCredentials,
        mustSetupMfa: !!doc.mustSetupMfa,
        ...(passwordExpiredByPolicy ? { passwordExpired: true } : {}),
      };
      try {
        const { token, expiresAtMs } = signAccessToken(doc);
        safe.token = token;
        safe.expiresAt = new Date(expiresAtMs).toISOString();
      } catch (_) {}
      try {
        await createSessionForUser(doc, roleSlug, req);
      } catch (sessionError) {
        console.warn("Failed to create session on TOTP login:", sessionError);
      }
      const isFirstLoginTotp = !doc.lastLoginAt;
      inAppNotificationService
        .createLoginNotification(doc._id, {
          isFirstLogin: isFirstLoginTotp,
          userAgent: req.headers["user-agent"],
          ip: req.ip,
          method: "totp",
        })
        .catch((err) =>
          console.error("Failed to create auth notification:", err),
        );
      logAuditEvent("login", doc._id, "Session", doc._id, {
        role: doc.role?.slug || roleSlug || "business_owner",
        fieldChanged: "session",
        oldValue: "",
        newValue: "active",
        method: "totp",
        ip: req.ip,
      }).catch(() => {});
      return res.json(safe);
    } catch (err) {
      console.error("POST /api/auth/login/verify-totp error:", err);
      return respond.error(res, 500, "totp_failed", "Failed to verify TOTP");
    }
  },
);

// POST /api/auth/google
// Exchange Google ID Token for session
router.post("/google", validateBody(googleLoginSchema), async (req, res) => {
  try {
    const { idToken, email, providerId, emailVerified, firstName, lastName } =
      req.body || {};
    let finalEmail = email;
    let finalSub = providerId;

    // Verify ID token if provided
    if (idToken && OAuth2Client) {
      try {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload) {
          finalEmail = payload.email;
          finalSub = payload.sub;
        }
      } catch (e) {
        console.error("Google ID Token verification failed:", e);
        return respond.error(
          res,
          401,
          "invalid_token",
          "Invalid Google ID Token",
        );
      }
    }

    if (!finalEmail)
      return respond.error(res, 400, "email_required", "Email is required");

    const emailKey = String(finalEmail).toLowerCase().trim();
    let doc = await User.findOne({ email: emailKey }).populate("role");

    if (!doc) {
      // Create new user via Google - assign business_owner role for signup
      const roleSlug = "business_owner";
      let roleDoc = await Role.findOne({ slug: roleSlug });
      if (!roleDoc) {
        return respond.error(
          res,
          500,
          "role_not_configured",
          "Business owner role not configured",
        );
      }

      const passwordHash = await bcrypt.hash(generateCode(16), 10); // random password
      doc = await User.create({
        role: roleDoc._id,
        firstName: firstName || "Google",
        lastName: lastName || "User",
        email: emailKey,
        phoneNumber: "",
        termsAccepted: true,
        passwordHash,
        passwordChangedAt: new Date(),
        authProvider: "google",
        providerId: finalSub,
        isEmailVerified: true, // Google verified
        theme: "default", // Set default theme for new accounts
      });
      // Reload to populate role
      doc = await User.findById(doc._id).populate("role");
    } else {
      // Update existing user
      if (!doc.authProvider) {
        doc.authProvider = "google";
        doc.providerId = finalSub;
      }
      doc.isEmailVerified = true;
      doc.lastLoginAt = new Date();
      // Update accountStatus for business owners on Google login
      if (
        !doc.isStaff &&
        roleSlug === "business_owner" &&
        !doc.mustChangeCredentials
      ) {
        doc.accountStatus = "active";
      }
      await doc.save();
      // Ensure role is populated
      if (!doc.role || !doc.role.slug) {
        doc = await User.findById(doc._id).populate("role");
      }
    }

    // Ensure role is populated before extracting slug
    if (!doc.role || !doc.role.slug) {
      if (doc.role && mongoose.Types.ObjectId.isValid(doc.role)) {
        doc.role = await Role.findById(doc.role).lean();
      } else {
        const userWithRole = await User.findById(doc._id)
          .populate("role")
          .lean();
        if (userWithRole && userWithRole.role) {
          doc.role = userWithRole.role;
        }
      }
    }

    const roleSlug = doc.role && doc.role.slug ? doc.role.slug : null;
    if (!roleSlug) {
      return respond.error(
        res,
        500,
        "role_not_found",
        "User role not found. Please contact support.",
      );
    }
    const safe = {
      id: String(doc._id),
      role: roleSlug,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phoneNumber: displayPhoneNumber(doc.phoneNumber),
      termsAccepted: doc.termsAccepted,
      createdAt: doc.createdAt,
      avatarUrl: doc.avatarUrl || "",
      username: doc.username || "",
      office: doc.office || "",
      isActive: doc.isActive !== false,
      isStaff: !!doc.isStaff,
      mustChangeCredentials: !!doc.mustChangeCredentials,
      mustSetupMfa: !!doc.mustSetupMfa,
    };
    try {
      const { token, expiresAtMs } = signAccessToken(doc);
      safe.token = token;
      safe.expiresAt = new Date(expiresAtMs).toISOString();
    } catch (_) {}

    try {
      await createSessionForUser(doc, roleSlug, req);
    } catch (sessionError) {
      console.warn("Failed to create session on Google login:", sessionError);
    }
    const isFirstLoginGoogle = !doc.lastLoginAt;
    inAppNotificationService
      .createLoginNotification(doc._id, {
        isFirstLogin: isFirstLoginGoogle,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        method: "google",
      })
      .catch((err) =>
        console.error("Failed to create auth notification:", err),
      );

    return res.json(safe);
  } catch (err) {
    console.error("POST /api/auth/google error:", err);
    return respond.error(
      res,
      500,
      "google_login_failed",
      "Failed to login with Google",
    );
  }
});

module.exports = router;
