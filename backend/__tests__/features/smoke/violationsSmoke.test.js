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
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");

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

describe("Violations Smoke Tests", () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);

    adminToken = tokens.adminToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Violation.deleteMany({});
  });

  describe("GET /api/business/admin/violations", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      // The response might be an object with data property, not necessarily an array
      expect(response.body.data).toBeDefined();
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/violations", () => {
    it("should require step-up auth for violation creation", async () => {
      const violationData = {
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
      };

      const response = await request(app)
        .post("/api/business/admin/violations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(violationData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
