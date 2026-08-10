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
const Application = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application");

function expectStandardResponse(response, hasData = true) {
  expect(response.body).toHaveProperty("ok", true);
  if (hasData) {
    expect(response.body).toHaveProperty("data");
  }
}

function expectErrorResponse(response) {
  expect(response.body).toHaveProperty("ok", false);
  expect(response.body).toHaveProperty("error");
  expect(response.body.error).toHaveProperty("code");
  expect(response.body.error).toHaveProperty("message");
}

describe("Permit Applications API Integration Tests", () => {
  let app;
  let staffToken;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    staffToken = tokens.staffToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Application.deleteMany({});
  });

  describe("GET /api/lgu-officer/permit-applications", () => {
    it("should return empty list when no applications exist", async () => {
      const response = await request(app)
        .get("/api/lgu-officer/permit-applications")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it("should return applications with status filter", async () => {
      // Create a test application
      const testApplication = await Application.create({
        applicationId: "TEST-001",
        applicationStatus: "submitted",
        userId: "507f1f77bcf86cd799439011",
        formData: { businessName: "Test Business" },
      });

      const response = await request(app)
        .get("/api/lgu-officer/permit-applications?status=submitted")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.applications).toBeInstanceOf(Array);
    });

    it("should return applications with pagination", async () => {
      // Create multiple test applications
      await Application.create([
        {
          applicationId: "TEST-001",
          applicationStatus: "submitted",
          userId: "507f1f77bcf86cd799439011",
          formData: { businessName: "Test Business 1" },
        },
        {
          applicationId: "TEST-002",
          applicationStatus: "submitted",
          userId: "507f1f77bcf86cd799439011",
          formData: { businessName: "Test Business 2" },
        },
      ]);

      const response = await request(app)
        .get("/api/lgu-officer/permit-applications?page=1&limit=10")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.meta.page).toBe(1);
      expect(response.body.data.meta.limit).toBe(10);
    });
  });

  describe("GET /api/lgu-officer/permit-applications/:id", () => {
    it("should return application with valid ID", async () => {
      const testApplication = await Application.create({
        applicationId: "TEST-001",
        applicationStatus: "submitted",
        userId: "507f1f77bcf86cd799439011",
        formData: { businessName: "Test Business" },
      });

      const response = await request(app)
        .get(`/api/lgu-officer/permit-applications/${testApplication._id}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(testApplication._id.toString());
    });

    it("should return 404 for invalid ID", async () => {
      const response = await request(app)
        .get("/api/lgu-officer/permit-applications/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(404);

      expectErrorResponse(response);
    });
  });
});
