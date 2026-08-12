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
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");

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

describe("LOBs Smoke Tests", () => {
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
    await Lob.deleteMany({});
  });

  describe("GET /api/business/admin/lobs", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/lobs")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/lobs")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/lobs", () => {
    it("should require step-up auth for LOB creation", async () => {
      const lobData = {
        name: "Test LOB",
        code: "LOB_001",
        description: "Test description",
        category: "Business",
        lineOfBusiness: "Retail",
      };

      const response = await request(app)
        .post("/api/business/admin/lobs")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(lobData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("GET /api/business/admin/lobs/post-requirements", () => {
    it("should return post-requirements with auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/lobs/post-requirements")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });

    it("should reject without auth", async () => {
      await request(app)
        .get("/api/business/admin/lobs/post-requirements")
        .expect(401);
    });
  });
});
