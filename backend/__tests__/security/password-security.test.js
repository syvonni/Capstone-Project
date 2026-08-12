const request = require("supertest");
const {
  setupTestEnvironment,
  setupMongoDB,
  teardownMongoDB,
  setupApp,
} = require("../helpers/setup");
const { createTestUser } = require("../helpers/fixtures");
const { cleanupTestData } = require("../helpers/cleanup");
const User = require("../../services/auth-service/src/models/User");
const Role = require("../../services/auth-service/src/models/Role");
const {
  signAccessToken,
} = require("../../services/auth-service/src/middleware/auth");
const {
  validatePasswordStrength,
} = require("../../services/auth-service/src/lib/passwordValidator");
const {
  checkPasswordHistory,
  addToPasswordHistory,
} = require("../../services/auth-service/src/lib/passwordHistory");
const bcrypt = require("bcryptjs");

describe("Password Security Tests", () => {
  let mongo;
  let app;
  let testUser;
  let testToken;

  beforeAll(async () => {
    setupTestEnvironment();
    mongo = await setupMongoDB();
    app = setupApp();

    testUser = await createTestUser({
      roleSlug: "business_owner",
      password: "Test123!@#",
    });
    testToken = signAccessToken(testUser).token;
  });

  afterAll(async () => {
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser({
      roleSlug: "business_owner",
      password: "Test123!@#",
    });
    testToken = signAccessToken(testUser).token;
  });

  describe("Password Strength Validation", () => {
    it("should accept a strong password", () => {
      const result = validatePasswordStrength("StrongPass123!");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password shorter than 12 characters", () => {
      const result = validatePasswordStrength("Short1!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("12 characters"))).toBe(true);
    });

    it("should reject password without uppercase letter", () => {
      const result = validatePasswordStrength("lowercase123!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
    });

    it("should reject password without lowercase letter", () => {
      const result = validatePasswordStrength("UPPERCASE123!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
    });

    it("should reject password without number", () => {
      const result = validatePasswordStrength("NoNumberPass!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("number"))).toBe(true);
    });

    it("should reject password without special character", () => {
      const result = validatePasswordStrength("NoSpecial123");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("special"))).toBe(true);
    });

    it("should reject password longer than 200 characters", () => {
      const longPassword = "A".repeat(201) + "1!";
      const result = validatePasswordStrength(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("200 characters"))).toBe(
        true,
      );
    });
  });

  describe("Password History", () => {
    it("should detect password in history", async () => {
      const password = "TestPassword123!";
      const history = [];

      // Add password to history
      const hash1 = await bcrypt.hash(password, 10);
      history.push(hash1);

      // Check if same password is in history
      const check = await checkPasswordHistory(password, history);
      expect(check.inHistory).toBe(true);
    });

    it("should not detect different password in history", async () => {
      const password1 = "Password1!";
      const password2 = "Password2!";
      const history = [];

      // Add first password to history
      const hash1 = await bcrypt.hash(password1, 10);
      history.push(hash1);

      // Check if different password is in history
      const check = await checkPasswordHistory(password2, history);
      expect(check.inHistory).toBe(false);
    });

    it("should maintain max 5 passwords in history", () => {
      const history = ["hash1", "hash2", "hash3", "hash4", "hash5", "hash6"];
      const updated = addToPasswordHistory("hash7", history);
      expect(updated).toHaveLength(5);
      expect(updated).not.toContain("hash1");
      expect(updated).toContain("hash7");
    });
  });

  describe("Password Change Endpoint Integration", () => {
    it("should reject weak password", async () => {
      const response = await request(app)
        .post("/api/auth/change-password-authenticated")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          currentPassword: "Test123!@#",
          newPassword: "weak", // Too weak - caught by Joi min(6) first
        });

      expect(response.status).toBe(400);

      // Test with a password that passes Joi but fails our validator
      const response2 = await request(app)
        .post("/api/auth/change-password-authenticated")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          currentPassword: "Test123!@#",
          newPassword: "weakpass", // Passes Joi min(6) but fails our strength check
        });

      expect(response2.status).toBe(400);
      expect(response2.body.error.code).toBe("weak_password");
    });

    it("should accept strong password and invalidate sessions", async () => {
      const oldToken = testToken;

      const response = await request(app)
        .post("/api/auth/change-password-authenticated")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          currentPassword: "Test123!@#",
          newPassword: "NewStrongPass123!",
        });

      expect(response.status).toBe(200);

      // Verify tokenVersion was incremented
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.tokenVersion).toBe(1);

      // Verify old token is now invalid
      const tokenResponse = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${oldToken}`);

      expect(tokenResponse.status).toBe(401);
      expect(tokenResponse.body.error.code).toBe("token_invalidated");
    });

    it("should preserve MFA enrollment after password change", async () => {
      // Setup MFA first
      await User.findByIdAndUpdate(testUser._id, {
        mfaEnabled: true,
        mfaSecret: "test-secret",
      });

      const response = await request(app)
        .post("/api/auth/change-password-authenticated")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          currentPassword: "Test123!@#",
          newPassword: "NewStrongPass123!",
        });

      expect(response.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.mfaEnabled).toBe(true);
      expect(updatedUser.mfaReEnrollmentRequired).toBe(false);
      expect(updatedUser.mfaSecret).toBeTruthy();
    });
  });
});
