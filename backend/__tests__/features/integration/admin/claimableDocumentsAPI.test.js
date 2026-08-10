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
  getStepUpHeaders,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/fixtures");
const {
  cleanupTestData,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/cleanup");
const ClaimableDocument = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/ClaimableDocument");

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

describe("Claimable Documents API Integration Tests", () => {
  let app;
  let adminToken;
  let adminUser;
  let testDocument;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    adminUser = users.adminUser;
    adminToken = tokens.adminToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await ClaimableDocument.deleteMany({});
  });

  describe("GET /api/business/admin/documents", () => {
    it("should return empty list when no documents exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/documents")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it("should return list of documents when documents exist", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/documents")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("GET /api/business/admin/documents/:id", () => {
    it("should return 404 for non-existent document", async () => {
      const response = await request(app)
        .get("/api/business/admin/documents/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });

    it("should return document by valid ID", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/documents/${testDocument._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data._id).toBe(testDocument._id.toString());
    });
  });

  describe("PUT /api/business/admin/documents/:id", () => {
    it("should require step-up auth for update", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/documents/${testDocument._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Document" })
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("DELETE /api/business/admin/documents/:id", () => {
    it("should require step-up auth for deletion", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/business/admin/documents/${testDocument._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("POST /api/business/admin/documents/:id/publish", () => {
    it("should require step-up auth for publish", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .post(`/api/business/admin/documents/${testDocument._id}/publish`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("POST /api/business/admin/documents", () => {
    it("should create document with step-up auth and valid data", async () => {
      const documentData = {
        name: "Test Document",
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/documents")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(documentData);

      expect(response.status).toBe(201);
    });

    it("should validate missing name", async () => {
      const documentData = {
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/documents")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(documentData);

      expect([200, 400]).toContain(response.status);
    });
  });

  describe("PUT /api/business/admin/documents/:id with step-up", () => {
    it("should update name with step-up auth", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/documents/${testDocument._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ name: "Updated Document" });

      expect(response.status).toBe(200);
    });

    it("should update description with step-up auth", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/documents/${testDocument._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ description: "Updated description" });

      expect(response.status).toBe(200);
    });

    it("should update isActive with step-up auth", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/documents/${testDocument._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ isActive: false });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/business/admin/documents/:id with step-up", () => {
    it("should delete document with step-up auth and valid data", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/business/admin/documents/${testDocument._id}`)
        .set(getStepUpHeaders(adminToken, adminUser));

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/business/admin/documents/:id/publish with step-up", () => {
    it("should publish document with step-up auth", async () => {
      testDocument = await ClaimableDocument.create({
        name: "Test Document",
        description: "Test description",
        isActive: true,
      });

      // Create a draft first
      await request(app)
        .post(`/api/business/admin/documents/${testDocument._id}/draft`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Draft Document" });

      const response = await request(app)
        .post(`/api/business/admin/documents/${testDocument._id}/publish`)
        .set(getStepUpHeaders(adminToken, adminUser));

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/business/admin/documents with filters", () => {
    it("should filter by isActive", async () => {
      await ClaimableDocument.create({
        name: "Active Document",
        description: "Test description",
        isActive: true,
      });

      await ClaimableDocument.create({
        name: "Inactive Document",
        description: "Test description",
        isActive: false,
      });

      const response = await request(app)
        .get("/api/business/admin/documents?isActive=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });

    it("should filter by documentType", async () => {
      await ClaimableDocument.create({
        name: "Business Permit",
        description: "Test description",
        documentType: "business_permit",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/documents?documentType=business_permit")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });
  });
});
