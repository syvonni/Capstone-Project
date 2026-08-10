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

describe("LGU Officer Businesses API Integration Tests", () => {
  let app;
  let staffToken;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    staffToken = tokens.staffToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Business.deleteMany({});
  });

  describe("GET /api/lgu-officer/businesses", () => {
    it("should return empty list when no businesses exist", async () => {
      const response = await request(app)
        .get("/api/lgu-officer/businesses")
        .set("Authorization", "Bearer " + staffToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });
});
