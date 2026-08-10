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
const EditRequest = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/EditRequest");

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

describe("Edit Requests API Integration Tests", () => {
  let app;
  let businessOwnerToken;
  let staffToken;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    businessOwnerToken = tokens.businessOwnerToken;
    staffToken = tokens.staffToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await EditRequest.deleteMany({});
  });

  describe("Smoke Tests", () => {
    describe("GET /api/business/edit-requests", () => {
      it("should return empty list when no requests exist", async () => {
        const response = await request(app)
          .get("/api/business/edit-requests")
          .set("Authorization", `Bearer ${businessOwnerToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      });
    });

    describe("GET /api/business/edit-requests without auth", () => {
      it("should return 401 when no auth token provided", async () => {
        const response = await request(app)
          .get("/api/business/edit-requests")
          .expect(401);

        expectErrorResponse(response);
      });
    });
  });

  describe("Integration Tests", () => {
    describe("GET /api/business/edit-requests", () => {
      it("should return list with requests", async () => {
        await EditRequest.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          fieldName: "businessName",
          requestedValue: "New Business Name",
          reason: "Need to update business name",
          status: "pending",
        });

        const response = await request(app)
          .get("/api/business/edit-requests")
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      });
    });

    describe("POST /api/business/edit-requests", () => {
      it("should validate missing required fields", async () => {
        const response = await request(app)
          .post("/api/business/edit-requests")
          .set("Authorization", `Bearer ${businessOwnerToken}`)
          .send({
            businessId: new mongoose.Types.ObjectId(),
            // missing fieldName, requestedValue, reason
          })
          .expect(400);

        expectErrorResponse(response);
      });
    });

    describe("PUT /api/business/edit-requests/:id", () => {
      it("should approve request with valid data", async () => {
        const editRequest = await EditRequest.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          fieldName: "businessName",
          requestedValue: "New Business Name",
          reason: "Need to update business name",
          status: "pending",
        });

        const response = await request(app)
          .put(`/api/business/edit-requests/${editRequest._id}`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({
            action: "approve",
            notes: "Request approved",
          })
          .expect(200);

        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      });

      it("should reject request with valid data", async () => {
        const editRequest = await EditRequest.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          fieldName: "businessName",
          requestedValue: "New Business Name",
          reason: "Need to update business name",
          status: "pending",
        });

        const response = await request(app)
          .put(`/api/business/edit-requests/${editRequest._id}`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({
            action: "reject",
            notes: "Request rejected",
          })
          .expect(200);

        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      });
    });

    describe("PUT /api/business/edit-requests/:id/claim", () => {
      it("should claim request for review", async () => {
        const editRequest = await EditRequest.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          fieldName: "businessName",
          requestedValue: "New Business Name",
          reason: "Need to update business name",
          status: "pending",
        });

        const response = await request(app)
          .put(`/api/business/edit-requests/${editRequest._id}/claim`)
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      });
    });

    describe("PUT /api/business/edit-requests/:id/release", () => {
      it("should release claimed request", async () => {
        const editRequest = await EditRequest.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          fieldName: "businessName",
          requestedValue: "New Business Name",
          reason: "Need to update business name",
          status: "pending",
        });

        // First claim the request
        await request(app)
          .put(`/api/business/edit-requests/${editRequest._id}/claim`)
          .set("Authorization", `Bearer ${staffToken}`);

        // Then release it
        const response = await request(app)
          .put(`/api/business/edit-requests/${editRequest._id}/release`)
          .set("Authorization", `Bearer ${staffToken}`)
          .expect(200);

        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      });
    });

    describe("PUT /api/business/edit-requests/:id/transfer", () => {
      it("should transfer request to different officer", async () => {
        const editRequest = await EditRequest.create({
          businessId: new mongoose.Types.ObjectId(),
          requestedBy: new mongoose.Types.ObjectId(),
          fieldName: "businessName",
          requestedValue: "New Business Name",
          reason: "Need to update business name",
          status: "pending",
        });

        const targetOfficerId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .put(`/api/business/edit-requests/${editRequest._id}/transfer`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({
            targetOfficerId: targetOfficerId.toString(),
          })
          .expect(200);

        expectStandardResponse(response);
        expect(response.body.data).toBeDefined();
      });
    });
  });
});
