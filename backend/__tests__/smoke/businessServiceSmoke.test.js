const request = require("supertest");
const {
  setupMongoDB,
  teardownMongoDB,
  setupApp,
  setupTestEnvironment,
} = require("../helpers/setup");
const { createTestUsers, getTestTokens } = require("../helpers/fixtures");
const { cleanupTestData } = require("../helpers/cleanup");
const Fee = require("../../shared/models/Fee");
const Variable = require("../../services/business-service/src/models/Variable");
const TaxBracket = require("../../services/business-service/src/models/TaxBracket");
const Lob = require("../../services/business-service/src/models/Lob");

// Helper function to validate standard response shape
function expectStandardResponse(response, hasData = true) {
  expect(response.body).toBeDefined();
  if (hasData) {
    expect(response.body).not.toBeNull();
  }
}

// Helper function to validate error response shape
function expectErrorResponse(response) {
  expect(response.body).toHaveProperty("error");
  expect(response.body.error).toHaveProperty("code");
  expect(response.body.error).toHaveProperty("message");
}

describe("Business Service Smoke Tests", () => {
  let app;
  let mongoServer;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    setupTestEnvironment();
    mongoServer = await setupMongoDB();
    app = setupApp("business");

    // Create test users using existing fixtures
    const users = await createTestUsers();
    const tokens = getTestTokens(users);

    adminToken = tokens.adminToken;
    userToken = tokens.businessOwnerToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    // Clean up business service data
    await Fee.deleteMany({});
    await Variable.deleteMany({});
    await TaxBracket.deleteMany({});
    await Lob.deleteMany({});
  });

  describe("Admin Endpoints", () => {
    describe("GET /api/business/admin/fees", () => {
      it("should return list with admin auth", async () => {
        const response = await request(app)
          .get("/api/business/admin/fees")
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it("should reject without auth", async () => {
        const response = await request(app)
          .get("/api/business/admin/fees")
          .expect(401);

        expectErrorResponse(response);
      });
    });

    describe("POST /api/business/admin/fees", () => {
      it("should require step-up auth for fee creation", async () => {
        const feeData = {
          name: "Test Fee",
          amount: 100,
          category: "general_application",
        };

        // This should fail with 403 because it requires step-up auth
        const response = await request(app)
          .post("/api/business/admin/fees")
          .set("Authorization", `Bearer ${adminToken}`)
          .send(feeData)
          .expect(403);

        expectErrorResponse(response);
        expect(response.body.error.code).toBe("step_up_required");
      });
    });

    describe("GET /api/business/admin/variables", () => {
      it("should return list with admin auth", async () => {
        const response = await request(app)
          .get("/api/business/admin/variables")
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200);

        expectStandardResponse(response);
      });
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
    });
  });

  describe("Business Owner Endpoints", () => {
    describe("GET /api/business/profile", () => {
      it("should return profile with user auth", async () => {
        const response = await request(app)
          .get("/api/business/profile")
          .set("Authorization", `Bearer ${userToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("userId");
      });
    });

    describe("GET /api/business/payments", () => {
      it("should return payments with user auth", async () => {
        const response = await request(app)
          .get("/api/business/payments")
          .set("Authorization", `Bearer ${userToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe("Public Endpoints", () => {
    describe("GET /api/public/business/stats", () => {
      it("should return public stats without auth", async () => {
        const response = await request(app)
          .get("/api/public/business/stats")
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toHaveProperty("totalRegisteredThisYear");
        expect(response.body).toHaveProperty(
          "applicationsProcessedThisYear",
        );
      });
    });
  });

  describe("Health Check", () => {
    describe("GET /api/health", () => {
      it("should return health status", async () => {
        const response = await request(app).get("/api/health").expect(200);

        // Health check returns service status fields
        expect(response.body).toHaveProperty("service");
      });
    });
  });
});
