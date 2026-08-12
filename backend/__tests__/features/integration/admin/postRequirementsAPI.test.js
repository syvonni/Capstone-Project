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
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");

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

describe("Post Requirements API Integration Tests", () => {
  let app;
  let adminToken;
  let adminUser;
  let testPostRequirement;

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
    await PostRequirement.deleteMany({});
  });

  describe("GET /api/business/admin/post-requirements", () => {
    it("should return empty list when no post requirements exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/post-requirements")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });

    it("should return list of post requirements when post requirements exist", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/post-requirements")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });
  });

  describe("GET /api/business/admin/post-requirements/:id", () => {
    it("should return 404 for non-existent post requirement", async () => {
      const response = await request(app)
        .get("/api/business/admin/post-requirements/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });

    it("should return post requirement by valid ID", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/post-requirements/${testPostRequirement._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body._id).toBe(testPostRequirement._id.toString());
    });
  });

  describe("PUT /api/business/admin/post-requirements/:id", () => {
    it("should require step-up auth for update", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/post-requirements/${testPostRequirement._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Post Requirement" })
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("DELETE /api/business/admin/post-requirements/:id", () => {
    it("should require step-up auth for deletion", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .delete(
          `/api/business/admin/post-requirements/${testPostRequirement._id}`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("POST /api/business/admin/post-requirements", () => {
    it("should create post requirement with step-up auth and valid data", async () => {
      const postData = {
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
      };

      const headers = getStepUpHeaders(adminToken, adminUser);

      const response = await request(app)
        .post("/api/business/admin/post-requirements")
        .set(headers)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
    });

    it("should validate missing name", async () => {
      const postData = {
        code: "TEST_REQ",
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/post-requirements")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(postData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate missing code", async () => {
      const postData = {
        name: "Test Post Requirement",
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/post-requirements")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(postData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate duplicate code", async () => {
      await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .post("/api/business/admin/post-requirements")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({
          name: "Another Post Requirement",
          code: "TEST_REQ",
          description: "Test description",
        });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe("PUT /api/business/admin/post-requirements/:id with step-up", () => {
    it("should update post requirement with step-up auth and valid data", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/post-requirements/${testPostRequirement._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ notes: "Updated notes" })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should update description field", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/post-requirements/${testPostRequirement._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ description: "Updated description" })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should update isActive field", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/post-requirements/${testPostRequirement._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ isActive: false })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("DELETE /api/business/admin/post-requirements/:id with step-up", () => {
    it("should delete post requirement with step-up auth and valid data", async () => {
      testPostRequirement = await PostRequirement.create({
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .delete(
          `/api/business/admin/post-requirements/${testPostRequirement._id}`,
        )
        .set(getStepUpHeaders(adminToken, adminUser))
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("GET /api/business/admin/post-requirements with filters", () => {
    it("should filter by isActive", async () => {
      await PostRequirement.create({
        name: "Active Post Requirement",
        code: "TEST_REQ_001",
        description: "Test description",
        legalBasis: [
          {
            url: "https://example.com/law",
            title: "Test Law",
            description: "Test legal basis",
          },
        ],
        isActive: true,
      });

      await PostRequirement.create({
        name: "Inactive Post Requirement",
        code: "TEST_REQ_002",
        description: "Test description",
        legalBasis: [
          {
            url: "https://example.com/law",
            title: "Test Law",
            description: "Test legal basis",
          },
        ],
        isActive: false,
      });

      const response = await request(app)
        .get("/api/business/admin/post-requirements?isActive=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });

    it("should filter by category", async () => {
      await PostRequirement.create({
        name: "Category 1 Post Requirement",
        code: "TEST_REQ_001",
        description: "Test description",
        legalBasis: [
          {
            url: "https://example.com/law",
            title: "Test Law",
            description: "Test legal basis",
          },
        ],
        category: "general",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/post-requirements?category=general")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });
  });
});
