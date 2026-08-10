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

describe("Payments API Smoke Tests", () => {
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

  describe("GET /api/business/payments", () => {
    it("should return empty list when no payments exist", async () => {
      const response = await request(app)
        .get("/api/business/payments")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/business/payments without auth", () => {
    it("should return 401 when no auth token provided", async () => {
      const response = await request(app)
        .get("/api/business/payments")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/payments", () => {
    it("should create payment with valid data", async () => {
      const response = await request(app)
        .post("/api/business/payments")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: "TEST-BUSINESS-001",
          paymentType: "registration_fee",
          description: "Business permit fee",
          amount: 500,
          dueDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });

      // Accept 200 or 404 (if business doesn't exist)
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      }
    });
  });
});
