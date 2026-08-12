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
const Variable = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Variable");

// Helper function to validate standard response shape
function expectStandardResponse(response, hasData = true) {
  expect(response.body).toBeDefined();
  if (hasData) {
    expect(response.body).not.toBeNull();
  }
}

// Helper function to validate error response shape
function expectErrorResponse(response) {
  expect(response.body).toHaveProperty("error");
  expect(response.body.error).toHaveProperty("code");
  expect(response.body.error).toHaveProperty("message");
}

describe("Variables Smoke Tests", () => {
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
    // Clean up variables
    await Variable.deleteMany({});
  });

  describe("GET /api/business/admin/variables", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/variables")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/variables")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/variables", () => {
    it("should require step-up auth for variable creation", async () => {
      const variableData = {
        name: "Test Variable",
        customId: "TEST_VAR",
        feeId: null,
        checklistId: null,
        amount: 100,
      };

      // This should fail with 403 because it requires step-up auth
      const response = await request(app)
        .post("/api/business/admin/variables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(variableData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
