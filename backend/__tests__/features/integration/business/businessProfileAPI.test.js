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

describe("Business Profile API Integration Tests", () => {
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
    it("should return profile data when user has business", async () => {
      const response = await request(app)
        .get("/api/business/profile")
        .set("Authorization", "Bearer " + businessOwnerToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("GET /api/business/status/matrix", () => {
    it("should return status transition matrix", async () => {
      const response = await request(app)
        .get("/api/business/status/matrix")
        .set("Authorization", "Bearer " + businessOwnerToken)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("POST /api/business/profile/owner-id/upload", () => {
    it("should validate missing file", async () => {
      const response = await request(app)
        .post("/api/business/profile/owner-id/upload")
        .set("Authorization", "Bearer " + businessOwnerToken)
        .expect(400);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("FILE_REQUIRED");
    });
  });

  describe("POST /api/business/businesses/:businessId/status/validate", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .post(
          "/api/business/businesses/507f1f77bcf86cd799439011/status/validate",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .send({ targetStatus: "submitted" })
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/businesses/:businessId/status/transition", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .post(
          "/api/business/businesses/507f1f77bcf86cd799439011/status/transition",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .send({ targetStatus: "submitted" })
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/businesses/:businessId/primary", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .post("/api/business/businesses/507f1f77bcf86cd799439011/primary")
        .set("Authorization", "Bearer " + businessOwnerToken)
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("PUT /api/business/businesses/:businessId/risk-profile", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .put("/api/business/businesses/507f1f77bcf86cd799439011/risk-profile")
        .set("Authorization", "Bearer " + businessOwnerToken)
        .send({ riskLevel: "low" })
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/business-registration/:businessId/requirements/confirm", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .post(
          "/api/business/business-registration/507f1f77bcf86cd799439011/requirements/confirm",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .send({ confirmed: true })
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("GET /api/business/business-registration/:businessId/requirements/pdf", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .get(
          "/api/business/business-registration/507f1f77bcf86cd799439011/requirements/pdf",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/business-registration/:businessId/documents/upload", () => {
    it("should require valid business ID", async () => {
      const testBuffer = Buffer.from("test document data");

      const response = await request(app)
        .post(
          "/api/business/business-registration/507f1f77bcf86cd799439011/documents/upload",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .attach("file", testBuffer, "test-document.pdf")
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/business-registration/:businessId/bir", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .post(
          "/api/business/business-registration/507f1f77bcf86cd799439011/bir",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .send({ birData: "test" })
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/business-registration/:businessId/agencies", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .post(
          "/api/business/business-registration/507f1f77bcf86cd799439011/agencies",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .send({ agencyData: "test" })
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/business-registration/:businessId/submit", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .post(
          "/api/business/business-registration/507f1f77bcf86cd799439011/submit",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("GET /api/business/business-registration/:businessId/status", () => {
    it("should require valid business ID", async () => {
      const response = await request(app)
        .get(
          "/api/business/business-registration/507f1f77bcf86cd799439011/status",
        )
        .set("Authorization", "Bearer " + businessOwnerToken)
        .expect(404);

      expectErrorResponse(response);
    });
  });
});
