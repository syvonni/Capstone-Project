const request = require("supertest");
const {
  setupTestEnvironment,
  setupMongoDB,
  teardownMongoDB,
  setupApp,
} = require("../helpers/setup");
const {
  createTestUsers,
  getTestTokens,
  generateUniqueEmail,
} = require("../helpers/fixtures");
const { cleanupTestData } = require("../helpers/cleanup");
const User = require("../../services/auth-service/src/models/User");
const Role = require("../../services/auth-service/src/models/Role");
const LoginRequest = require("../../services/auth-service/src/models/LoginRequest");
const Session = require("../../services/auth-service/src/models/Session");

// Access the login route module so we can reset rate-limit hit counters between tests.
const authLoginRouter = require("../../services/auth-service/src/routes/login");

function getRateLimiterFor(path) {
  const layer = authLoginRouter.stack.find(
    (l) => l.route && l.route.path === path,
  );
  if (!layer) return null;
  const limiter = layer.route.stack.find(
    (s) => typeof s.handle.resetKey === "function",
  )?.handle;
  return limiter || null;
}

async function resetRateLimitFor(email) {
  const key = String(email).toLowerCase().trim();
  const limiters = [
    getRateLimiterFor("/login/start"),
    getRateLimiterFor("/login/resend"),
    getRateLimiterFor("/login/verify"),
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

describe("Login Routes", () => {
  let mongo;
  let app;
  let testUser;
  let adminUser;
  let testTokens;

  beforeAll(async () => {
    setupTestEnvironment();
    mongo = await setupMongoDB();
    app = await setupApp();

    // Create test users
    const users = await createTestUsers();
    testUser = users.businessOwner;
    adminUser = users.adminUser;
    testTokens = getTestTokens(users);
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    // Clean up login requests and sessions before each test
    await LoginRequest.deleteMany({});
    await Session.deleteMany({});

    // Reset per-email rate limiters for the shared test users so earlier tests
    // in this file do not cause 429s for later ones.
    if (testUser) await resetRateLimitFor(testUser.email);
    if (adminUser) await resetRateLimitFor(adminUser.email);
  });

  describe("POST /api/auth/login/start", () => {
    it("should start login process for valid email credentials", async () => {
      const response = await request(app).post("/api/auth/login/start").send({
        email: testUser.email,
        password: "Test123!@#",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("sent", true);
      expect(response.body).toHaveProperty("loginEmail", testUser.email);
      expect(response.body.devCode).toMatch(/^\d{6}$/);
    });

    it("should reject login with username (login/start requires an email)", async () => {
      // Create a user with username
      await User.findOneAndUpdate(
        { email: testUser.email },
        { username: "testuser" },
        { new: true },
      );

      const response = await request(app).post("/api/auth/login/start").send({
        email: "testuser",
        password: "Test123!@#",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("invalid_credentials");
    });

    it("should reject invalid email credentials", async () => {
      const response = await request(app).post("/api/auth/login/start").send({
        email: "invalid@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("invalid_credentials");
    });

    it("should reject invalid password", async () => {
      const response = await request(app).post("/api/auth/login/start").send({
        email: testUser.email,
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("invalid_credentials");
    });

    it("should handle missing email field", async () => {
      const response = await request(app).post("/api/auth/login/start").send({
        password: "Test123!@#",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
      expect(response.body.error.details[0].message).toMatch(/email.*required/i);
    });

    it("should handle missing password field", async () => {
      const response = await request(app).post("/api/auth/login/start").send({
        email: testUser.email,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
      expect(response.body.error.details[0].message).toMatch(/password.*required/i);
    });

    it("should handle password too short", async () => {
      const response = await request(app).post("/api/auth/login/start").send({
        email: testUser.email,
        password: "123",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });

    it("should create login request record", async () => {
      await request(app).post("/api/auth/login/start").send({
        email: testUser.email,
        password: "Test123!@#",
      });

      const loginRequest = await LoginRequest.findOne({
        email: testUser.email.toLowerCase(),
      });
      expect(loginRequest).toBeTruthy();
      expect(loginRequest).toHaveProperty("code");
      expect(loginRequest).toHaveProperty("expiresAt");
    });

    it("should handle rate limiting", async () => {
      // Make multiple requests quickly to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app).post("/api/auth/login/start").send({
            email: testUser.email,
            password: "Test123!@#",
          }),
        );
      }

      const responses = await Promise.all(promises);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429,
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it("should handle locked out account", async () => {
      // Simulate a locked out account
      await User.findByIdAndUpdate(testUser._id, {
        failedVerificationAttempts: 5,
        accountLockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      });

      const response = await request(app).post("/api/auth/login/start").send({
        email: testUser.email,
        password: "Test123!@#",
      });

      expect(response.status).toBe(423);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("account_locked");
      expect(response.body.error.message).toMatch(/account.*locked/i);

      // Clean up the lock so later tests are not affected
      await User.findByIdAndUpdate(testUser._id, {
        failedVerificationAttempts: 0,
        accountLockedUntil: null,
      });
    });
  });

  describe("POST /api/auth/login/resend", () => {
    beforeEach(async () => {
      // Create an initial login request using a different shared user so that
      // rate-limit counters for testUser stay low for other describe blocks.
      await request(app).post("/api/auth/login/start").send({
        email: adminUser.email,
        password: "Test123!@#",
      });
    });

    it("should resend OTP code", async () => {
      const response = await request(app).post("/api/auth/login/resend").send({
        email: adminUser.email,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("sent", true);
    });

    it("should reject resend for non-existent email", async () => {
      const response = await request(app).post("/api/auth/login/resend").send({
        email: "nonexistent@example.com",
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("request_not_found");
    });

    it("should handle missing email field", async () => {
      const response = await request(app)
        .post("/api/auth/login/resend")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });

    it("should handle invalid email format", async () => {
      const response = await request(app).post("/api/auth/login/resend").send({
        email: "invalid-email",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });
  });

  describe("POST /api/auth/login/verify", () => {
    let loginCode;

    beforeEach(async () => {
      // Clean up any existing requests
      await LoginRequest.deleteMany({});

      // Start login process to get a code using a fresh shared user
      await request(app).post("/api/auth/login/start").send({
        email: adminUser.email,
        password: "Test123!@#",
      });

      // Get the code from the database
      const loginRequest = await LoginRequest.findOne({
        email: adminUser.email.toLowerCase(),
      });
      loginCode = loginRequest ? loginRequest.code : null;
    });

    it("should verify correct OTP code and complete login", async () => {
      const response = await request(app).post("/api/auth/login/verify").send({
        email: adminUser.email,
        code: loginCode,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("email", adminUser.email);

      // Verify session was created
      const session = await Session.findOne({
        userId: adminUser._id,
        isActive: true,
      });
      expect(session).toBeTruthy();
      expect(session).toHaveProperty("expiresAt");
    });

    it("should reject incorrect OTP code", async () => {
      const response = await request(app).post("/api/auth/login/verify").send({
        email: adminUser.email,
        code: "123456",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("invalid_code");
      expect(response.body.error.message).toMatch(/incorrect/i);
    });

    it("should reject expired login request", async () => {
      // Manually expire the login request
      await LoginRequest.findOneAndUpdate(
        { email: adminUser.email.toLowerCase() },
        { expiresAt: new Date(Date.now() - 1000) },
      );

      const response = await request(app).post("/api/auth/login/verify").send({
        email: adminUser.email,
        code: loginCode,
      });

      expect(response.status).toBe(410);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("code_expired");
      expect(response.body.error.message).toMatch(/expired/i);
    });

    it("should handle too many verification attempts", async () => {
      // The verify endpoint is rate-limited to 10 attempts per 15 minutes.
      // Make 10 failed attempts, then the 11th (valid) attempt should be 429.
      for (let i = 0; i < 10; i++) {
        await request(app).post("/api/auth/login/verify").send({
          email: adminUser.email,
          code: "123456",
        });
      }

      const response = await request(app).post("/api/auth/login/verify").send({
        email: adminUser.email,
        code: loginCode,
      });

      expect(response.status).toBe(429);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("login_verify_rate_limited");
      expect(response.body.error.message).toMatch(/too many/i);
    });

    it("should handle malformed OTP code", async () => {
      const response = await request(app).post("/api/auth/login/verify").send({
        email: adminUser.email,
        code: "abc123",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
      expect(response.body.error.details[0].message).toMatch(/6 digits/i);
    });

    it("should handle missing code field", async () => {
      const response = await request(app).post("/api/auth/login/verify").send({
        email: adminUser.email,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });

    it("should handle missing email field", async () => {
      const response = await request(app).post("/api/auth/login/verify").send({
        code: loginCode,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });
  });

  describe("POST /api/auth/login/verify-totp", () => {
    it("should verify email OTP for a user even when TOTP is configured", async () => {
      // Configure the user with TOTP fields but do not require TOTP for this
      // public two-step login flow.
      await User.findByIdAndUpdate(testUser._id, {
        mfaSecret: "JBSWY3DPEHPK3PXP", // Mock secret
        mfaEnabled: false,
      });

      // Start login process first
      const startResponse = await request(app)
        .post("/api/auth/login/start")
        .send({
          email: testUser.email,
          password: "Test123!@#",
        });
      expect(startResponse.status).toBe(200);

      // Get the code
      const loginRequest = await LoginRequest.findOne({
        email: testUser.email.toLowerCase(),
      });
      expect(loginRequest).toBeTruthy();

      // Verify with the email code
      const response = await request(app).post("/api/auth/login/verify").send({
        email: testUser.email,
        code: loginRequest.code,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("email", testUser.email);
    });

    it("should reject TOTP verification for user without TOTP enabled", async () => {
      await User.findByIdAndUpdate(testUser._id, {
        mfaSecret: "",
        mfaEnabled: false,
      });

      const response = await request(app)
        .post("/api/auth/login/verify-totp")
        .send({
          email: testUser.email,
          code: "123456",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("mfa_not_enabled");
      expect(response.body.error.message).toMatch(/MFA.*not enabled/i);
    });

    it("should handle malformed TOTP code", async () => {
      await User.findByIdAndUpdate(testUser._id, {
        mfaEnabled: true,
      });

      const response = await request(app)
        .post("/api/auth/login/verify-totp")
        .send({
          email: testUser.email,
          code: "abc123",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
      expect(response.body.error.message).toMatch(/Invalid request/i);
    });
  });

  describe("POST /api/auth/google", () => {
    it("should handle missing Google auth parameters", async () => {
      const response = await request(app).post("/api/auth/google").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });

    it("should reject invalid email format in Google login", async () => {
      const response = await request(app).post("/api/auth/google").send({
        email: "invalid-email",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });

    it("should require either idToken or email", async () => {
      const response = await request(app).post("/api/auth/google").send({
        firstName: "Test",
        lastName: "User",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });
  });

  describe("Security and Edge Cases", () => {
    it("should handle case-insensitive email normalization", async () => {
      // Use a different email to avoid rate limiting
      const uniqueEmail = generateUniqueEmail("test");
      await User.create({
        email: uniqueEmail,
        passwordHash: await require("bcryptjs").hash("Test123!@#", 10),
        role: testUser.role,
        termsAccepted: true,
        tokenVersion: 0,
        firstName: "Test",
        lastName: "User",
        phoneNumber: `__unset__${Date.now()}${Math.random()}`,
      });

      const response = await request(app).post("/api/auth/login/start").send({
        email: uniqueEmail.toUpperCase(),
        password: "Test123!@#",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("sent", true);
      expect(response.body).toHaveProperty("loginEmail", uniqueEmail.toLowerCase());
      expect(response.body.devCode).toMatch(/^\d{6}$/);
    });

    it("should handle email with whitespace trimming", async () => {
      // Use a different email to avoid rate limiting
      const uniqueEmail = generateUniqueEmail("test");
      await User.create({
        email: uniqueEmail,
        passwordHash: await require("bcryptjs").hash("Test123!@#", 10),
        role: testUser.role,
        termsAccepted: true,
        tokenVersion: 0,
        firstName: "Test",
        lastName: "User",
        phoneNumber: `__unset__${Date.now()}${Math.random()}`,
      });

      const response = await request(app)
        .post("/api/auth/login/start")
        .send({
          email: `  ${uniqueEmail}  `,
          password: "Test123!@#",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("sent", true);
      expect(response.body).toHaveProperty("loginEmail", uniqueEmail.toLowerCase());
      expect(response.body.devCode).toMatch(/^\d{6}$/);
    });

    it("should handle extremely long email addresses", async () => {
      const longEmail = "a".repeat(200) + "@example.com";

      const response = await request(app).post("/api/auth/login/start").send({
        email: longEmail,
        password: "Test123!@#",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });

    it("should handle extremely long passwords", async () => {
      const longPassword = "a".repeat(300);
      const uniqueEmail = generateUniqueEmail("test");

      const response = await request(app).post("/api/auth/login/start").send({
        email: uniqueEmail,
        password: longPassword,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("validation_error");
    });

    it("should clean up expired login requests", async () => {
      // Use a fresh email so the start endpoint overwrites the same record.
      const uniqueEmail = generateUniqueEmail("test");
      await User.create({
        email: uniqueEmail,
        passwordHash: await require("bcryptjs").hash("Test123!@#", 10),
        role: testUser.role,
        termsAccepted: true,
        tokenVersion: 0,
        firstName: "Test",
        lastName: "User",
        phoneNumber: `__unset__${Date.now()}${Math.random()}`,
      });

      // Create an expired login request for the same email
      await LoginRequest.create({
        email: uniqueEmail.toLowerCase(),
        code: "123456",
        expiresAt: new Date(Date.now() - 1000),
      });

      // Start a new login process (this should overwrite the expired request)
      const response = await request(app).post("/api/auth/login/start").send({
        email: uniqueEmail,
        password: "Test123!@#",
      });

      expect(response.status).toBe(200);

      // Wait a bit for cleanup to happen
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that the expired request was replaced
      const expiredRequest = await LoginRequest.findOne({
        email: uniqueEmail.toLowerCase(),
        expiresAt: { $lt: new Date() },
      });
      expect(expiredRequest).toBeNull();
    });

    it("should track IP address on successful login", async () => {
      // Clean up any existing requests
      await LoginRequest.deleteMany({});

      // Start login process using a shared user
      const startResponse = await request(app)
        .post("/api/auth/login/start")
        .send({
          email: adminUser.email,
          password: "Test123!@#",
        });
      expect(startResponse.status).toBe(200);

      // Get the code
      const loginRequest = await LoginRequest.findOne({
        email: adminUser.email.toLowerCase(),
      });
      expect(loginRequest).toBeTruthy();

      // Verify login
      const response = await request(app).post("/api/auth/login/verify").send({
        email: adminUser.email,
        code: loginRequest.code,
      });

      expect(response.status).toBe(200);

      // Check session has IP tracking
      const session = await Session.findOne({
        userId: adminUser._id,
        isActive: true,
      });
      expect(session).toBeTruthy();
      expect(session.ipAddress).toBeTruthy();
      expect(session.userAgent).toBeTruthy();
    });
  });

  describe("Development Mode", () => {
    it("should handle dev admin shorthand", async () => {
      if (process.env.NODE_ENV !== "development") {
        return; // Skip this test in non-development mode
      }

      const response = await request(app).post("/api/auth/login/start").send({
        email: "1",
        password: "1",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("ok", true);
    });
  });
});
