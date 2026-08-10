const request = require("supertest");
const {
  setupMongoDB,
  teardownMongoDB,
  setupApp,
  setupTestEnvironment,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/setup");
const {
  createTestUsers,
  getTestTokens,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/fixtures");
const {
  cleanupTestData,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/cleanup");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Fee = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee");

describe("Name Validation API Integration Tests", () => {
  let app;
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    adminUser = users.adminUser;
    adminToken = tokens.adminToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await PostRequirement.deleteMany({});
    await Fee.deleteMany({});
  });

  describe("GET /api/business/admin/validate-name", () => {
    it("should return 401 without auth token", async () => {
      const response = await request(app).get(
        "/api/business/admin/validate-name?name=Test",
      );

      expect(response.status).toBe(401);
    });

    it("should return 400 when name parameter is missing", async () => {
      const response = await request(app)
        .get("/api/business/admin/validate-name")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return valid when name is unique", async () => {
      const response = await request(app)
        .get("/api/business/admin/validate-name?name=UniqueName123")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.conflicts).toEqual([]);
    });

    it("should return invalid when name exists in PostRequirement", async () => {
      await PostRequirement.create({
        name: "Test Requirement",
        code: "TEST_001",
        description: "Test description",
      });

      const response = await request(app)
        .get("/api/business/admin/validate-name?name=Test%20Requirement")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(false);
      expect(response.body.conflicts).toHaveLength(1);
      expect(response.body.conflicts[0].entityType).toBe("PostRequirement");
    });

    it("should return invalid when name exists in Fee", async () => {
      await Fee.create({
        name: "Test Fee",
        amount: 100,
        category: "global",
      });

      const response = await request(app)
        .get("/api/business/admin/validate-name?name=Test%20Fee")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(false);
      expect(response.body.conflicts).toHaveLength(1);
      expect(response.body.conflicts[0].entityType).toBe("Fee");
    });

    it("should return invalid when name exists in multiple entities", async () => {
      await PostRequirement.create({
        name: "Test Name",
        code: "TEST_001",
        description: "Test description",
      });
      await Fee.create({
        name: "Test Name",
        amount: 100,
        category: "global",
      });

      const response = await request(app)
        .get("/api/business/admin/validate-name?name=Test%20Name")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(false);
      expect(response.body.conflicts.length).toBeGreaterThanOrEqual(2);
    });
  });
});
