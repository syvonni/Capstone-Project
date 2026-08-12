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
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");

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

describe("Checklists Smoke Tests", () => {
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
    await Checklist.deleteMany({});
  });

  describe("GET /api/business/admin/checklists", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/checklists")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/checklists")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/checklists", () => {
    it("should require step-up auth for checklist creation", async () => {
      const checklistData = {
        name: "Test Checklist",
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/checklists")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(checklistData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
