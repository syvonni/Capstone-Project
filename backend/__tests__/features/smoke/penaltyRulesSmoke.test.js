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
  expect(response.body).toBeDefined();
  if (hasData) {
    expect(response.body).not.toBeNull();
  }
}

function expectErrorResponse(response) {
  expect(response.body).toHaveProperty("error");
  expect(response.body.error).toHaveProperty("code");
  expect(response.body.error).toHaveProperty("message");
}

describe("Penalty Rules Smoke Tests", () => {
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
    await PenaltyRule.deleteMany({});
  });

  describe("GET /api/business/admin/penalty-rules", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/penalty-rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/penalty-rules")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/penalty-rules", () => {
    it("should require step-up auth for penalty rule creation", async () => {
      const penaltyRuleData = {
        name: "Test Penalty Rule",
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/penalty-rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(penaltyRuleData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
