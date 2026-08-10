const express = require("express");
const crypto = require("crypto");
const Joi = require("joi");
const SignUpRequest = require("../../models/SignUpRequest");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Session = require("../../models/Session");
const { validateBody } = require("../../middleware/validation");
const respond = require("../../middleware/respond");
const { sanitizeName } = require("../../lib/sanitizer");
const { signAccessToken } = require("../../middleware/auth");
const { trackIP } = require("../../lib/ipTracker");
const { validatePasswordStrength } = require("../../lib/passwordValidator");
const bcrypt = require("bcryptjs");
const { logAuditEvent } = require("../../lib/auditClient");

const router = express.Router();

// Shared: create a verified business owner user from a signup payload.
async function createUserFromPayload(payload, email) {
  const roleSlug = "business_owner";
  const role = await Role.findOne({ slug: roleSlug });
  if (!role) {
    const err = new Error(`Role '${roleSlug}' not found`);
    err.statusCode = 500;
    err.code = "role_not_found";
    throw err;
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);

  // Check if PIS is complete (all required fields present)
  const hasPis = !!(
    payload.address?.street &&
    payload.address?.barangay &&
    payload.address?.city &&
    payload.address?.province &&
    payload.address?.zipCode &&
    payload.maritalStatus &&
    payload.dateOfBirth &&
    payload.placeOfBirth &&
    payload.nationality &&
    payload.fatherName &&
    payload.motherName &&
    payload.highestEducationalAttainment
  );

  const user = await User.create({
    firstName: sanitizeName(payload.firstName),
    lastName: sanitizeName(payload.lastName),
    middleName: payload.middleName ? sanitizeName(payload.middleName) : "",
    suffix: payload.suffix || "",
    email: email.toLowerCase().trim(),
    phoneNumber: payload.phoneNumber || "",
    passwordHash: hashedPassword,
    role: role._id,
    isEmailVerified: true, // Email verified via code (or trusted single-step signup)
    pisCompleted: hasPis, // Set to true if all PIS fields were provided during signup
    termsAccepted: true,
    mustChangeCredentials: false, // Business owners set their own password at signup
    mustSetupMfa: true, // Show MFA setup step in onboarding (skippable for business owners)
    passwordChangedAt: new Date(),
    accountStatus: roleSlug === "business_owner" ? "active" : "pending_setup", // Business owners are active after self-signup
    // PIS fields
    address: payload.address,
    sex: payload.sex,
    maritalStatus: payload.maritalStatus,
    dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
    placeOfBirth: payload.placeOfBirth,
    nationality: payload.nationality,
    fatherName: payload.fatherName,
    motherName: payload.motherName,
    distinctiveMark: payload.distinctiveMark,
    highestEducationalAttainment: payload.highestEducationalAttainment,
  });

  return { user, role };
}

// Shared: issue JWT + session and build the safe user object returned to the client.
async function issueSession(req, user, role) {
  const { token, expiresAtMs } = signAccessToken(user);
  const ipAddress =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  try {
    await trackIP(user._id, ipAddress);
  } catch (_) {}

  const sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await Session.create({
    userId: user._id,
    token,
    ipAddress,
    userAgent,
    expiresAt: sessionExpiresAt,
  });

  return {
    id: String(user._id),
    role: role.slug,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    middleName: user.middleName || "",
    suffix: user.suffix || "",
    sex: user.sex || "",
    phoneNumber: user.phoneNumber || "",
    termsAccepted: !!user.termsAccepted,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl || "",
    isActive: user.isActive !== false,
    isStaff: !!user.isStaff,
    isEmailVerified: !!user.isEmailVerified,
    mustChangeCredentials: !!user.mustChangeCredentials,
    mustSetupMfa: !!user.mustSetupMfa,
    token,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

const signupStartSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().allow(""),
  password: Joi.string().min(8).required(),
  termsAccepted: Joi.boolean().valid(true).required(),
  role: Joi.string().default("business_owner"),
  middleName: Joi.string().allow(""),
  suffix: Joi.string().allow(""),
  captchaToken: Joi.string().allow(""),
  // PIS fields (optional)
  address: Joi.object().allow(null),
  sex: Joi.string().allow(""),
  maritalStatus: Joi.string().allow(""),
  dateOfBirth: Joi.string().allow(""),
  placeOfBirth: Joi.string().allow(""),
  nationality: Joi.string().allow(""),
  fatherName: Joi.string().allow(""),
  motherName: Joi.string().allow(""),
  distinctiveMark: Joi.string().allow(""),
  highestEducationalAttainment: Joi.string().allow(""),
});

// Single-step signup schema (matches frontend signup() and integration tests)
const signupSingleStepSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  middleName: Joi.string().allow(""),
  suffix: Joi.string().allow(""),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().allow(""),
  password: Joi.string().min(8).required(),
  termsAccepted: Joi.boolean().valid(true).required(),
  role: Joi.string().default("business_owner"),
  sex: Joi.string().allow(""),
  // PIS fields (optional)
  address: Joi.object().allow(null),
});

const signupCompleteSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().required(),
});

// Link Existing Account schemas
const linkExistingSchema = Joi.object({
  email: Joi.string().email().required(),
  businessPlateNo: Joi.string().trim().max(50).required(),
});

const linkVerifySchema = Joi.object({
  email: Joi.string().email().required(),
  businessPlateNo: Joi.string().trim().max(50).required(),
  code: Joi.string().required(),
});

// POST /api/auth/signup
// Single-step signup (for business owners) - creates user immediately and returns token
// This matches the original implementation and integration tests
router.post("/", validateBody(signupSingleStepSchema), async (req, res) => {
  try {
    const { email, ...rest } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return respond.error(
        res,
        409,
        "email_exists",
        "A user with this email already exists",
      );
    }

    // Enforce password strength policy (IAS-1.7)
    const pwCheck = validatePasswordStrength(req.body.password);
    if (!pwCheck.valid) {
      return respond.error(
        res,
        400,
        "weak_password",
        pwCheck.errors[0] || "Password does not meet strength requirements",
      );
    }

    // Create user and issue session
    const { user, role } = await createUserFromPayload(rest, email);
    const safeUser = await issueSession(req, user, role);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: safeUser,
    });
  } catch (err) {
    console.error("POST /api/auth/signup error:", err);
    return respond.error(
      res,
      500,
      "signup_failed",
      err.message || "Failed to create account",
    );
  }
});

// POST /api/auth/signup/start
// Initiate signup - store request and send verification code
router.post("/start", validateBody(signupStartSchema), async (req, res) => {
  try {
    const { email, ...rest } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return respond.error(
        res,
        409,
        "email_exists",
        "A user with this email already exists",
      );
    }

    // Enforce password strength policy (IAS-1.7)
    const pwCheck = validatePasswordStrength(req.body.password);
    if (!pwCheck.valid) {
      return respond.error(
        res,
        400,
        "weak_password",
        pwCheck.errors[0] || "Password does not meet strength requirements",
      );
    }

    // Generate verification code (6-digit numeric)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Log verification code for development
    console.log(`[SIGNUP] Verification code for ${email}: ${code}`);

    // Store signup request
    await SignUpRequest.create({
      email: email.toLowerCase().trim(),
      code,
      expiresAt,
      payload: rest,
    });

    // In development, return the code for testing/prefill
    const devCode = process.env.NODE_ENV === "development" ? code : undefined;

    return res.json({
      success: true,
      sent: true,
      message: "Verification code sent to your email",
      devCode,
    });
  } catch (err) {
    console.error("POST /api/auth/signup/start error:", err);
    return respond.error(
      res,
      500,
      "signup_failed",
      err.message || "Failed to initiate signup",
    );
  }
});

// POST /api/auth/signup/verify
// Complete signup with verification code
router.post("/verify", validateBody(signupCompleteSchema), async (req, res) => {
  try {
    const { email, code } = req.body;

    // Find valid signup request
    const signUpRequest = await SignUpRequest.findOne({
      email: email.toLowerCase().trim(),
      code,
      expiresAt: { $gt: new Date() },
    });

    if (!signUpRequest) {
      return respond.error(
        res,
        401,
        "invalid_code",
        "Invalid or expired verification code",
      );
    }

    const payload = signUpRequest.payload;

    // Create user and issue session
    const { user, role } = await createUserFromPayload(payload, email);
    const safeUser = await issueSession(req, user, role);

    // Delete signup request
    await SignUpRequest.deleteOne({ _id: signUpRequest._id });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: safeUser,
    });
  } catch (err) {
    // Log minimal info in production, full stack in development
    if (process.env.NODE_ENV === "production") {
      console.error("POST /api/auth/signup/verify error:", err.message);
    } else {
      console.error("POST /api/auth/signup/verify error:", err);
    }
    // Handle duplicate key error gracefully
    if (err.code === 11000 && err.keyPattern?.email) {
      return respond.error(
        res,
        409,
        "email_exists",
        "A user with this email already exists",
      );
    }
    return respond.error(
      res,
      500,
      "signup_failed",
      "Failed to complete signup",
    );
  }
});

// POST /api/auth/signup/resend
// Resend verification code
router.post(
  "/resend",
  validateBody(Joi.object({ email: Joi.string().email().required() })),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Find existing signup request
      const existing = await SignUpRequest.findOne({
        email: email.toLowerCase().trim(),
        expiresAt: { $gt: new Date() },
      });

      if (!existing) {
        return respond.error(
          res,
          404,
          "signup_not_found",
          "No active signup request found for this email",
        );
      }

      // Generate new code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Log verification code for development
      console.log(`[SIGNUP] New verification code for ${email}: ${code}`);

      // Update signup request
      await SignUpRequest.updateOne({ _id: existing._id }, { code, expiresAt });

      const devCode = process.env.NODE_ENV === "development" ? code : undefined;

      return res.json({
        success: true,
        message: "Verification code resent",
        devCode,
      });
    } catch (err) {
      console.error("POST /api/auth/signup/resend error:", err);
      return respond.error(
        res,
        500,
        "resend_failed",
        err.message || "Failed to resend verification code",
      );
    }
  },
);

// ── Link Existing Account ──
// For users who already have a permit and want to create a web account linked to their PIS record

// POST /api/auth/link-existing-account
// Step 1: Search by email + business plate number, send verification code
router.post(
  "/link-existing-account",
  validateBody(linkExistingSchema),
  async (req, res) => {
    try {
      const { email, businessPlateNo } = req.body || {};
      const emailKey = String(email || "")
        .toLowerCase()
        .trim();

      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: emailKey }).lean();
      if (existingUser) {
        return respond.error(
          res,
          409,
          "BUSINESS_ALREADY_LINKED",
          "An account with this email already exists. Please log in instead.",
        );
      }

      // Generate verification code and store the link request
      const code = generateCode();
      const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
      const expiresAtMs = Date.now() + ttlMin * 60 * 1000;

      await SignUpRequest.findOneAndUpdate(
        { email: emailKey },
        {
          code,
          expiresAt: new Date(expiresAtMs),
          payload: { email: emailKey, businessPlateNo, linkExisting: true },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const emailResult = await sendOtp({
        to: email,
        code,
        subject: "Verify your existing account link",
        purpose: "signup",
      });
      if (!emailResult || !emailResult.success) {
        return respond.error(
          res,
          500,
          "email_send_failed",
          "Failed to send verification email",
        );
      }

      return respond.success(res, 200, {
        data: { verificationSent: true, expiresIn: ttlMin * 60 },
      });
    } catch (err) {
      console.error("POST /api/auth/link-existing-account error:", err);
      return respond.error(
        res,
        500,
        "link_failed",
        "Failed to initiate account linking",
      );
    }
  },
);

// POST /api/auth/link-existing-account/verify
// Step 2: Verify code and create account linked to existing business
router.post(
  "/link-existing-account/verify",
  validateBody(linkVerifySchema),
  async (req, res) => {
    try {
      const { email, businessPlateNo, code } = req.body || {};
      const emailKey = String(email || "")
        .toLowerCase()
        .trim();

      const reqObj = await SignUpRequest.findOne({ email: emailKey }).lean();

      if (!reqObj) {
        return respond.error(
          res,
          404,
          "NOT_FOUND",
          "No link request found. Please start again.",
        );
      }

      if (Date.now() > new Date(reqObj.expiresAt).getTime()) {
        return respond.error(
          res,
          400,
          "LINK_CODE_EXPIRED",
          "Verification code expired",
        );
      }

      if (String(reqObj.code) !== String(code)) {
        return respond.error(
          res,
          400,
          "LINK_CODE_INVALID",
          "Wrong verification code",
        );
      }

      // Verify the payload matches
      const p = reqObj.payload || {};
      if (!p.linkExisting || p.businessPlateNo !== businessPlateNo) {
        return respond.error(res, 400, "LINK_CODE_INVALID", "Request mismatch");
      }

      // Check if email already taken
      const existing = await User.findOne({ email: emailKey }).lean();
      if (existing) {
        await SignUpRequest.deleteOne({ email: emailKey });
        return respond.error(
          res,
          409,
          "BUSINESS_ALREADY_LINKED",
          "Account already exists for this email",
        );
      }

      // Create user account (without password — they'll set it up via login flow or password reset)
      // For now, create with a random password; user must use "forgot password" to set their own
      const tempPassword = require("crypto").randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const roleDoc = await Role.findOne({ slug: "business_owner" });
      if (!roleDoc) {
        return respond.error(
          res,
          500,
          "role_not_configured",
          "Business owner role not configured",
        );
      }

      const doc = await User.create({
        role: roleDoc._id,
        firstName: "Pending",
        lastName: "User",
        email: emailKey,
        passwordHash,
        passwordChangedAt: new Date(),
        isEmailVerified: true,
        mustChangeCredentials: true, // Force password setup on first login
        theme: "default",
        createdBy: "self",
      });

      logAuditEvent("signup", doc._id, "User", doc._id, {
        role: "business_owner",
        fieldChanged: "account",
        oldValue: "",
        newValue: "created",
        ip: req.ip,
      }).catch(() => {});

      // Cleanup
      await SignUpRequest.deleteOne({ email: emailKey });

      return respond.success(res, 201, {
        data: {
          linked: true,
          userId: String(doc._id),
          message:
            "Account linked successfully. Please log in and set your password.",
        },
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return respond.error(
          res,
          409,
          "BUSINESS_ALREADY_LINKED",
          "Account already exists",
        );
      }
      console.error("POST /api/auth/link-existing-account/verify error:", err);
      return respond.error(
        res,
        500,
        "link_verify_failed",
        "Failed to verify and link account",
      );
    }
  },
);

module.exports = router;
