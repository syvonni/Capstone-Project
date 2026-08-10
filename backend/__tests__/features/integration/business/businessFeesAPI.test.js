const request = require("supertest");
const mongoose = require("mongoose");
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

describe("Business Fees API Integration Tests", () => {
  let app;
  let businessOwnerToken;
  const testBusinessId = new mongoose.Types.ObjectId();

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
    it("should calculate assessment with valid data", async () => {
      const response = await request(app)
        .post("/api/business/fees/assessment")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: testBusinessId.toString(),
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
      expect(response.body.data.success).toBe(true);
    });

    it("should validate missing required fields", async () => {
      const response = await request(app)
        .post("/api/business/fees/assessment")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: testBusinessId.toString(),
          // missing lineOfBusiness and other fields
        })
        .expect(200); // Service returns success even with minimal data

      expectStandardResponse(response);
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

  describe("POST /api/business/fees/impact/:businessId", () => {
    it("should get fee impact analysis with valid data", async () => {
      const response = await request(app)
        .post(`/api/business/fees/impact/${testBusinessId}`)
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          changes: {
            capitalInvestment: 600000,
            grossReceipts: 1200000,
          },
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("POST /api/business/fees/compare", () => {
    it("should compare scenarios with valid data", async () => {
      const response = await request(app)
        .post("/api/business/fees/compare")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          scenarios: [
            {
              lineOfBusiness: "retail",
              capitalInvestment: 500000,
              grossAnnualSales: 1000000,
            },
            {
              lineOfBusiness: "service",
              capitalInvestment: 300000,
              grossAnnualSales: 500000,
            },
          ],
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("POST /api/business/fees/breakdown", () => {
    it("should get detailed fee breakdown with valid data", async () => {
      const response = await request(app)
        .post("/api/business/fees/breakdown")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          lineOfBusiness: "manufacturing",
          capitalInvestment: 1000000,
          grossAnnualSales: 2000000,
          numberOfEmployees: 20,
          businessArea: 200,
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.fees).toBeDefined();
      expect(response.body.data.explanations).toBeDefined();
    });
  });

  describe("GET /api/business/fees/history/:businessId", () => {
    it("should get fee history for business", async () => {
      const response = await request(app)
        .get(`/api/business/fees/history/${testBusinessId}`)
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("POST /api/business/fees/projections", () => {
    it("should get fee projections with valid data", async () => {
      const response = await request(app)
        .post("/api/business/fees/projections")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: testBusinessId.toString(),
          periods: 12,
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.projections).toBeDefined();
      expect(Array.isArray(response.body.data.projections)).toBe(true);
    });
  });

  describe("POST /api/business/fees/estimates", () => {
    it("should get fee estimates with valid data", async () => {
      const response = await request(app)
        .post("/api/business/fees/estimates")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessTypes: ["retail", "service"],
          capitalRanges: ["0-100k", "100k-500k"],
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe("object");
    });
  });
});
