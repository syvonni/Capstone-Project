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
const TaxBracket = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/TaxBracket");
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

describe("Tax Brackets Smoke Tests", () => {
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
    await TaxBracket.deleteMany({});
    await Lob.deleteMany({});
  });

  describe("GET /api/business/admin/tax-brackets", () => {
    it("should return list with admin auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/tax-brackets")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .get("/api/business/admin/tax-brackets")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/admin/tax-brackets", () => {
    it("should require step-up auth for tax bracket creation", async () => {
      const testLob = await Lob.create({
        name: "Test LOB",
        code: "LOB_001",
        description: "Test description",
        category: "Business",
        lineOfBusiness: "Retail",
        isActive: true,
      });

      const taxBracketData = {
        lobId: testLob._id,
        taxBasis: "gross_sales",
        name: "Test Tax Bracket",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        excessRate: 0.1,
      };

      const response = await request(app)
        .post("/api/business/admin/tax-brackets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(taxBracketData)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });
});
