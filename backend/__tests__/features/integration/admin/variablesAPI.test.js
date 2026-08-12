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
  getStepUpHeaders,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/fixtures");
const {
  cleanupTestData,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/cleanup");
const Variable = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Variable");
const Fee = require("../../../../shared/models/Fee");

// Helper function to create valid variable data
function createValidVariableData(overrides = {}) {
  return {
    name: "Test Variable",
    customId: "TEST_VAR",
    question: "What is the value?",
    calculationMethod: "per_unit",
    unit: "unit",
    unitSingular: "unit",
    unitPlural: "units",
    unitContextSingular: "per unit",
    unitContextPlural: "per units",
    amount: 100,
    ...overrides,
  };
}

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

describe("Variables API Integration Tests", () => {
  let app;
  let mongoServer;
  let adminToken;
  let adminUser;
  let userToken;

  beforeAll(async () => {
    setupTestEnvironment();
    mongoServer = await setupMongoDB();
    app = setupApp("business");

    // Create test users using existing fixtures
    const users = await createTestUsers();
    const tokens = getTestTokens(users);

    adminUser = users.adminUser;
    adminToken = tokens.adminToken;
    userToken = tokens.businessOwnerToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    // Clean up variables and fees
    await Variable.deleteMany({});
    await Fee.deleteMany({});
  });

  describe("GET /api/business/admin/variables", () => {
    it("should return list of variables", async () => {
      // Create test variables
      await Variable.create([
        createValidVariableData({ customId: "VAR1", name: "Variable 1" }),
        createValidVariableData({ customId: "VAR2", name: "Variable 2" }),
      ]);

      const response = await request(app)
        .get("/api/business/admin/variables")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should return empty array when no variables exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/variables")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("GET /api/business/admin/variables/:id", () => {
    it("should return single variable by ID", async () => {
      const variable = await Variable.create(createValidVariableData());

      const response = await request(app)
        .get(`/api/business/admin/variables/${variable._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toHaveProperty("_id");
      expect(response.body.name).toBe("Test Variable");
    });

    it("should return 404 for non-existent variable", async () => {
      const response = await request(app)
        .get("/api/business/admin/variables/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/variables", () => {
    it("should reject without step-up auth", async () => {
      const variableData = createValidVariableData({
        name: "New Variable",
        customId: "NEW_VAR",
      });

      const response = await request(app)
        .post("/api/business/admin/variables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(variableData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });

    it("should reject with invalid data", async () => {
      const variableData = createValidVariableData({
        name: "", // Invalid: empty name
      });

      const response = await request(app)
        .post("/api/business/admin/variables")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableData)
        .expect(400);

      expectErrorResponse(response);
    });
  });

  describe("PUT /api/business/admin/variables/:id", () => {
    it("should update variable with step-up auth", async () => {
      const variable = await Variable.create(
        createValidVariableData({
          name: "Original Name",
          customId: "ORIG_VAR",
        }),
      );

      const updateData = {
        name: "Updated Name",
      };

      const response = await request(app)
        .put(`/api/business/admin/variables/${variable._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(updateData)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.name).toBe("Updated Name");
    });

    it("should reject without step-up auth", async () => {
      const variable = await Variable.create(
        createValidVariableData({
          name: "Original Name",
          customId: "ORIG_VAR",
        }),
      );

      const response = await request(app)
        .put(`/api/business/admin/variables/${variable._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Name" })
        .expect(403);

      expectErrorResponse(response);
    });
  });

  describe("DELETE /api/business/admin/variables/:id", () => {
    it("should disable variable with step-up auth", async () => {
      const variable = await Variable.create(
        createValidVariableData({
          name: "To Delete",
          customId: "DEL_VAR",
        }),
      );

      const response = await request(app)
        .delete(`/api/business/admin/variables/${variable._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .expect(200);

      expectStandardResponse(response);

      // Verify it's disabled (check if isActive is false instead of disabled)
      const deleted = await Variable.findById(variable._id);
      expect(deleted.isActive).toBe(false);
    });

    it("should reject without step-up auth", async () => {
      const variable = await Variable.create(
        createValidVariableData({
          name: "To Delete",
          customId: "DEL_VAR",
        }),
      );

      const response = await request(app)
        .delete(`/api/business/admin/variables/${variable._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
    });
  });

  describe("GET /api/business/admin/variables/data-quality", () => {
    it("should return data quality for all variables", async () => {
      await Variable.create([
        createValidVariableData({ customId: "GOOD", name: "Good Variable" }),
        createValidVariableData({
          customId: "BAD",
          name: "Bad Variable",
          amount: null,
        }), // Missing amount
      ]);

      const response = await request(app)
        .get("/api/business/admin/variables/data-quality")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toHaveProperty("totalEntities");
      expect(response.body).toHaveProperty("issues");
    });
  });

  describe("GET /api/business/admin/variables/:id/data-quality", () => {
    it("should return data quality for single variable", async () => {
      const variable = await Variable.create(createValidVariableData());

      const response = await request(app)
        .get(`/api/business/admin/variables/${variable._id}/data-quality`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      // Single entity data quality returns just the issues array, not wrapped in entityId
      expect(response.body).toHaveProperty("issues");
      expect(Array.isArray(response.body.issues)).toBe(true);
    });
  });

  describe("GET /api/business/admin/variables/performance", () => {
    it("should return performance metrics for variables", async () => {
      const response = await request(app)
        .get("/api/business/admin/variables/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      // Performance endpoint returns the performance object directly, not wrapped in metrics
      expect(response.body).toHaveProperty("avgResponseTime");
      expect(response.body).toHaveProperty("requestCount");
    });
  });
});
