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

describe("Business Fees API Smoke Tests", () => {
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

  describe("POST /api/business/fees/assessment", () => {
    it("should calculate fee assessment with valid data", async () => {
      const response = await request(app)
        .post("/api/business/fees/assessment")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: "507f1f77bcf86cd799439011",
          lineOfBusiness: "retail",
          capitalInvestment: 500000,
          grossReceipts: 1000000,
          numberOfEmployees: 10,
          businessArea: 100,
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.fees).toBeDefined();
      expect(Array.isArray(response.body.data.fees)).toBe(true);
    });
  });

  describe("POST /api/business/fees/what-if", () => {
    it("should calculate what-if scenario with valid data", async () => {
      const response = await request(app)
        .post("/api/business/fees/what-if")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          lineOfBusiness: "service",
          capitalInvestment: 300000,
          grossAnnualSales: 500000,
          numberOfEmployees: 5,
          businessArea: 50,
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });
});
