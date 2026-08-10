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
const Fee = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee");

// Helper function to validate standard response shape
function expectStandardResponse(response, hasData = true) {
  expect(response.body).toHaveProperty("ok", true);
  if (hasData) {
    expect(response.body).toHaveProperty("data");
  }
}

// Helper function to validate error response shape
function expectErrorResponse(response) {
  expect(response.body).toHaveProperty("ok", false);
  expect(response.body).toHaveProperty("error");
  expect(response.body.error).toHaveProperty("code");
  expect(response.body.error).toHaveProperty("message");
}

describe("Fees Smoke Tests", () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    // Create test users using existing fixtures
    const users = await createTestUsers();
    const tokens = getTestTokens(users);

    adminToken = tokens.adminToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    // Clean up fees
    await Fee.deleteMany({});
  });

  describe("GET /api/business/admin/fees", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/fees")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/fees")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/fees", () => {
    it("should require step-up auth for fee creation", async () => {
      const feeData = {
        name: "Test Fee",
        customId: "FEE_001",
        amount: 100,
      };

      // This should fail with 403 because it requires step-up auth
      const response = await request(app)
        .post("/api/business/admin/fees")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(feeData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
