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
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");

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

describe("Checklists API Integration Tests", () => {
  let app;
  let adminToken;
  let adminUser;
  let testChecklist;

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
    await Checklist.deleteMany({});
    await InspectionItem.deleteMany({});
    await Violation.deleteMany({});
  });

  describe("GET /api/business/admin/checklists", () => {
    it("should return empty list when no checklists exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/checklists")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it("should return list of checklists when checklists exist", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/checklists")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("GET /api/business/admin/checklists/:id", () => {
    it("should return 404 for non-existent checklist", async () => {
      const response = await request(app)
        .get("/api/business/admin/checklists/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });

    it("should return checklist by valid ID", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/checklists/${testChecklist._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data._id).toBe(testChecklist._id.toString());
    });
  });

  describe("PUT /api/business/admin/checklists/:id", () => {
    it("should require step-up auth for update", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/checklists/${testChecklist._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Checklist" })
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("DELETE /api/business/admin/checklists/:id", () => {
    it("should require step-up auth for deletion", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/business/admin/checklists/${testChecklist._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("POST /api/business/admin/checklists", () => {
    it("should create checklist with step-up auth and valid data", async () => {
      // Create a violation first (required by inspection item)
      const violation = await Violation.create({
        name: "Test Violation",
        code: "TEST_VIOLATION",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      // Create an inspection item
      const inspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        question: "Test question",
        violationId: violation._id,
        isActive: true,
      });

      const checklistData = {
        name: "Test Checklist",
        description: "Test description",
        items: [
          {
            inspectionItemId: inspectionItem._id,
            required: true,
            order: 1,
          },
        ],
      };

      const response = await request(app)
        .post("/api/business/admin/checklists")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(checklistData)
        .expect(201);

      expect(response.body.ok).toBe(true);
    });

    it("should validate missing name", async () => {
      const checklistData = {
        description: "Test description",
        items: [],
      };

      const response = await request(app)
        .post("/api/business/admin/checklists")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(checklistData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate duplicate name", async () => {
      await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        items: [],
        isActive: true,
      });

      const response = await request(app)
        .post("/api/business/admin/checklists")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({
          name: "Test Checklist",
          description: "Test description",
          items: [],
        });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe("PUT /api/business/admin/checklists/:id with step-up", () => {
    it("should update name with step-up auth", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/checklists/${testChecklist._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ name: "Updated Checklist" })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it("should update description with step-up auth", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/checklists/${testChecklist._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ description: "Updated description" })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it("should update isActive with step-up auth", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/checklists/${testChecklist._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ isActive: false })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe("DELETE /api/business/admin/checklists/:id with step-up", () => {
    it("should delete checklist with step-up auth and valid data", async () => {
      testChecklist = await Checklist.create({
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/business/admin/checklists/${testChecklist._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe("GET /api/business/admin/checklists with filters", () => {
    it("should filter by isActive", async () => {
      await Checklist.create({
        name: "Active Checklist",
        description: "Test description",
        isActive: true,
      });

      await Checklist.create({
        name: "Inactive Checklist",
        description: "Test description",
        isActive: false,
      });

      const response = await request(app)
        .get("/api/business/admin/checklists?isActive=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });
  });
});
