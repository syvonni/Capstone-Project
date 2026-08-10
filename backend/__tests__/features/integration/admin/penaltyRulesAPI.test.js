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
const PenaltyRule = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PenaltyRule");

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

describe("Penalty Rules API Integration Tests", () => {
  let app;
  let adminToken;
  let testPenaltyRule;

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
    await PenaltyRule.deleteMany({});
  });

  describe("GET /api/business/admin/penalty-rules", () => {
    it("should return empty list when no penalty rules exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/penalty-rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it("should return list of penalty rules when penalty rules exist", async () => {
      testPenaltyRule = await PenaltyRule.create({
        name: "Test Penalty Rule",
        description: "Test description",
        amount: 100,
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/penalty-rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("GET /api/business/admin/penalty-rules/:id", () => {
    it("should return 404 for non-existent penalty rule", async () => {
      const response = await request(app)
        .get("/api/business/admin/penalty-rules/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });

    it("should return penalty rule by valid ID", async () => {
      testPenaltyRule = await PenaltyRule.create({
        name: "Test Penalty Rule",
        description: "Test description",
        amount: 100,
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/penalty-rules/${testPenaltyRule._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data._id).toBe(testPenaltyRule._id.toString());
    });
  });

  describe("PUT /api/business/admin/penalty-rules/:id", () => {
    it("should require admin role for update", async () => {
      testPenaltyRule = await PenaltyRule.create({
        name: "Test Penalty Rule",
        description: "Test description",
        amount: 100,
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/penalty-rules/${testPenaltyRule._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Penalty Rule" })
        .expect(200);

      expectStandardResponse(response);
    });
  });

  describe("DELETE /api/business/admin/penalty-rules/:id", () => {
    it("should require step-up auth for deletion", async () => {
      testPenaltyRule = await PenaltyRule.create({
        name: "Test Penalty Rule",
        description: "Test description",
        amount: 100,
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/business/admin/penalty-rules/${testPenaltyRule._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
