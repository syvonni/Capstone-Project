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
const VariableFeeRule = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/VariableFeeRule");
const Fee = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");

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

describe("Variable Fee Rules API Integration Tests", () => {
  let app;
  let adminToken;
  let adminUser;
  let testVariableFeeRule;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    adminToken = tokens.adminToken;
    adminUser = users.adminUser;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await VariableFeeRule.deleteMany({});
    await Fee.deleteMany({});
    await Lob.deleteMany({});
  });

  describe("GET /api/business/admin/variable-fee-rules", () => {
    it("should return empty list when no variable fee rules exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/variable-fee-rules")
        .set("Authorization", "Bearer " + adminToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it("should return list of variable fee rules when variable fee rules exist", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/variable-fee-rules")
        .set("Authorization", "Bearer " + adminToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it("should filter by isActive", async () => {
      await VariableFeeRule.create({
        name: "Active Rule " + Date.now(),
        customId: "active-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      await VariableFeeRule.create({
        name: "Inactive Rule " + Date.now(),
        customId: "inactive-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: false,
      });

      const response = await request(app)
        .get("/api/business/admin/variable-fee-rules?isActive=true")
        .set("Authorization", "Bearer " + adminToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data.every((rule) => rule.isActive === true)).toBe(
        true,
      );
    });
  });

  describe("GET /api/business/admin/variable-fee-rules/:id", () => {
    it("should return 404 for non-existent variable fee rule", async () => {
      const response = await request(app)
        .get("/api/business/admin/variable-fee-rules/507f1f77bcf86cd799439011")
        .set("Authorization", "Bearer " + adminToken)
        .expect(404);

      expectErrorResponse(response);
    });

    it("should return variable fee rule by valid ID", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      const response = await request(app)
        .get(
          "/api/business/admin/variable-fee-rules/" + testVariableFeeRule._id,
        )
        .set("Authorization", "Bearer " + adminToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data._id).toBe(testVariableFeeRule._id.toString());
    });
  });

  describe("GET /api/business/admin/variable-fee-rules/:id/lobs", () => {
    it("should return empty array when no LOBs use this variable fee rule", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      const response = await request(app)
        .get(
          "/api/business/admin/variable-fee-rules/" +
            testVariableFeeRule._id +
            "/lobs",
        )
        .set("Authorization", "Bearer " + adminToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toEqual([]);
    });
  });

  describe("POST /api/business/admin/variable-fee-rules", () => {
    it("should require step-up auth for creation", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        customId: "test-" + Date.now(),
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set("Authorization", "Bearer " + adminToken)
        .send(variableFeeData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });

    it("should validate missing name", async () => {
      const variableFeeData = {
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate missing question", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate missing calculationMethod", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        question: "Test question",
        unit: "sqm",
        baseRate: 100,
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate missing unit", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        question: "Test question",
        calculationMethod: "floor_area",
        baseRate: 100,
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate customCalculationMethod required for custom", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        question: "Test question",
        calculationMethod: "custom",
        unit: "sqm",
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate brackets required for bracketed", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        question: "Test question",
        calculationMethod: "bracketed",
        unit: "sqm",
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate classifications required for classification", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        question: "Test question",
        calculationMethod: "classification",
        unit: "sqm",
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate baseRate null for classification", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        question: "Test question",
        calculationMethod: "classification",
        unit: "sqm",
        baseRate: 100,
        classifications: [{ label: "A", value: 50 }],
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate baseRate required for other methods", async () => {
      const variableFeeData = {
        name: "Test Variable Fee",
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate duplicate name across entity types", async () => {
      // Create a fee with the same name
      await Fee.create({
        name: "Test Entity",
        customId: "fee-" + Date.now(),
        amount: 100,
        category: "global",
        isActive: true,
      });

      const variableFeeData = {
        name: "Test Entity",
        customId: "variable-" + Date.now(),
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData);

      expect(response.status).toBe(400);
      expectErrorResponse(response);
      expect(response.body.error.code).toBe("DUPLICATE_NAME");
    });

    it("should create with step-up auth and valid data", async () => {
      const variableFeeData = {
        name: "Test Variable Fee " + Date.now(),
        customId: "test-" + Date.now(),
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
      };

      const response = await request(app)
        .post("/api/business/admin/variable-fee-rules")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(variableFeeData)
        .expect(201);

      expectStandardResponse(response);
      expect(response.body.data.name).toContain("Test Variable Fee");
    });
  });

  describe("PUT /api/business/admin/variable-fee-rules/:id", () => {
    it("should require admin role for update", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      const response = await request(app)
        .put(
          "/api/business/admin/variable-fee-rules/" + testVariableFeeRule._id,
        )
        .set("Authorization", "Bearer " + adminToken)
        .send({ name: "Updated Variable Fee Rule" })
        .expect(200);

      expectStandardResponse(response);
    });

    it("should update calculationMethod field", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      const response = await request(app)
        .put(
          "/api/business/admin/variable-fee-rules/" + testVariableFeeRule._id,
        )
        .set("Authorization", "Bearer " + adminToken)
        .send({ calculationMethod: "floor_area" })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data.calculationMethod).toBe("floor_area");
    });

    it("should increment version on update", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
        version: 1,
      });

      const response = await request(app)
        .put(
          "/api/business/admin/variable-fee-rules/" + testVariableFeeRule._id,
        )
        .set("Authorization", "Bearer " + adminToken)
        .send({ name: "Updated Variable Fee Rule" })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data.version).toBe(2);
    });
  });

  describe("DELETE /api/business/admin/variable-fee-rules/:id", () => {
    it("should require step-up auth for deletion", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      const response = await request(app)
        .delete(
          "/api/business/admin/variable-fee-rules/" + testVariableFeeRule._id,
        )
        .set("Authorization", "Bearer " + adminToken)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });

    it("should delete with step-up auth", async () => {
      testVariableFeeRule = await VariableFeeRule.create({
        name: "Test Variable Fee Rule " + Date.now(),
        customId: "test-" + Date.now(),
        unit: "percentage",
        calculationMethod: "percentage",
        question: "Test question",
        isActive: true,
      });

      const response = await request(app)
        .delete(
          "/api/business/admin/variable-fee-rules/" + testVariableFeeRule._id,
        )
        .set(getStepUpHeaders(adminToken, adminUser))
        .expect(200);

      expectStandardResponse(response);
    });
  });
});
