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
const Business = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business");

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

describe("Business Profile Smoke Tests", () => {
  let app;
  let businessOwnerToken;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);

    businessOwnerToken = tokens.businessOwnerToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Business.deleteMany({});
  });

  describe("GET /api/business/profile", () => {
    it("should return profile with business auth", async () => {
      const response = await request(app)
        .get("/api/business/profile")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/profile")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("GET /api/business/status/matrix", () => {
    it("should return status matrix with auth", async () => {
      const response = await request(app)
        .get("/api/business/status/matrix")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/status/matrix")
        .expect(401);

      expectErrorResponse(response);
    });
  });
});
