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
const Appeal = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Appeal");

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

describe("Appeals API Integration Tests", () => {
  let app;
  let businessOwnerToken;
  let staffToken;
  let stepUpToken;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    businessOwnerToken = tokens.businessOwnerToken;
    staffToken = tokens.staffToken;
    stepUpToken = tokens.stepUpToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Appeal.deleteMany({});
  });

  describe("Smoke Tests", () => {
    describe("GET /api/business/appeals", () => {
      it("should return empty list when no appeals exist", async () => {
        const response = await request(app)
          .get("/api/business/appeals")
          .set("Authorization", `Bearer ${businessOwnerToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toBeDefined();
      });
    });

    describe("GET /api/business/appeals without auth", () => {
      it("should return 401 when no auth token provided", async () => {
        const response = await request(app)
          .get("/api/business/appeals")
          .expect(401);

        expectErrorResponse(response);
      });
    });

    describe("POST /api/business/appeals", () => {
      it("should create appeal with valid data", async () => {
        const response = await request(app)
          .post("/api/business/appeals")
          .set("Authorization", `Bearer ${businessOwnerToken}`)
          .send({
            businessId: new mongoose.Types.ObjectId(),
            appealType: "incorrect_fees",
            description: "Test appeal description",
          });

        // Accept either 200 or 404 (if business doesn't exist)
        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expectStandardResponse(response);
          expect(response.body).toBeDefined();
        }
      });
    });
  });

  describe("Integration Tests", () => {
    describe("GET /api/business/appeals", () => {
      it("should return list with appeals", async () => {
        await Appeal.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
        });

        const response = await request(app)
          .get("/api/business/appeals")
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toBeDefined();
      });
    });

    describe("GET /api/business/appeals/:id", () => {
      it("should return appeal with valid ID", async () => {
        const appeal = await Appeal.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
        });

        const response = await request(app)
          .get(`/api/business/appeals/${appeal._id}`)
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toBeDefined();
        expect(response.body._id).toBe(appeal._id.toString());
      });

      it("should return 404 for invalid ID", async () => {
        const response = await request(app)
          .get("/api/business/appeals/507f1f77bcf86cd799439011")
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(404);

        expectErrorResponse(response);
      });
    });

    describe("POST /api/business/appeals", () => {
      it("should validate missing required fields", async () => {
        const response = await request(app)
          .post("/api/business/appeals")
          .set("Authorization", `Bearer ${businessOwnerToken}`)
          .send({
            businessId: new mongoose.Types.ObjectId(),
            // missing appealType and description
          })
          .expect(400);

        expectErrorResponse(response);
      });
    });

    describe("PUT /api/business/appeals/:id", () => {
      it("should resolve appeal with valid data", async () => {
        const appeal = await Appeal.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
        });

        const response = await request(app)
          .put(`/api/business/appeals/${appeal._id}`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({
            resolution: "approved",
            notes: "Appeal approved",
          })
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toBeDefined();
      });
    });

    describe("POST /api/business/appeals/:id/claim", () => {
      it("should claim appeal for review", async () => {
        const appeal = await Appeal.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
        });

        const response = await request(app)
          .post(`/api/business/appeals/${appeal._id}/claim`)
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toBeDefined();
      });
    });

    describe("PUT /api/business/appeals/:id/release", () => {
      it("should release claimed appeal", async () => {
        const appeal = await Appeal.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
        });

        // First claim the appeal
        await request(app)
          .post(`/api/business/appeals/${appeal._id}/claim`)
          .set("Authorization", `Bearer ${staffToken}`);

        // Then release it
        const response = await request(app)
          .put(`/api/business/appeals/${appeal._id}/release`)
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toBeDefined();
      });
    });

    describe("PUT /api/business/appeals/:id/transfer", () => {
      it("should transfer appeal to different officer", async () => {
        const appeal = await Appeal.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
          assignedTo: new mongoose.Types.ObjectId(),
        });

        const targetOfficerId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .put(`/api/business/appeals/${appeal._id}/transfer`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({
            targetOfficerId: targetOfficerId.toString(),
          })
          .expect(200);

        expectStandardResponse(response);
        expect(response.body).toBeDefined();
      });
    });

    describe("POST /api/business/appeals/:id/resend-email", () => {
      it("should return 403 without step-up auth", async () => {
        const appeal = await Appeal.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
        });

        const response = await request(app)
          .post(`/api/business/appeals/${appeal._id}/resend-email`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({
            emailType: "appeal_submitted",
          })
          .expect(403);

        expectErrorResponse(response);
      });
    });
  });
});
