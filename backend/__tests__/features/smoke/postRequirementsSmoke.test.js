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

describe("Post Requirements Smoke Tests", () => {
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
    await PostRequirement.deleteMany({});
  });

  describe("GET /api/business/admin/post-requirements", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/post-requirements")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/post-requirements")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/post-requirements", () => {
    it("should require step-up auth for post requirement creation", async () => {
      const postRequirementData = {
        name: "Test Post Requirement",
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/post-requirements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(postRequirementData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
