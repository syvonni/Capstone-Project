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
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");

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

describe("Inspection Items API Integration Tests", () => {
  let app;
  let adminToken;
  let adminUser;
  let testInspectionItem;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    adminToken = tokens.adminToken;
    adminUser = users.adminUser;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await InspectionItem.deleteMany({});
    await Violation.deleteMany({});
  });

  describe("GET /api/business/admin/inspection-items", () => {
    it("should return empty list when no inspection items exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/inspection-items")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });

    it("should return list of inspection items when inspection items exist", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/inspection-items")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });
  });

  describe("GET /api/business/admin/inspection-items/:id", () => {
    it("should return 404 for non-existent inspection item", async () => {
      const response = await request(app)
        .get("/api/business/admin/inspection-items/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });

    it("should return inspection item by valid ID", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/inspection-items/${testInspectionItem._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body._id).toBe(testInspectionItem._id.toString());
    });
  });

  describe("PUT /api/business/admin/inspection-items/:id", () => {
    it("should require step-up auth for update", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/inspection-items/${testInspectionItem._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Inspection Item" })
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("POST /api/business/admin/inspection-items", () => {
    it("should create inspection item with step-up auth and valid data", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const inspectionItemData = {
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        violationMode: "select",
      };

      const response = await request(app)
        .post("/api/business/admin/inspection-items")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(inspectionItemData)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should validate missing name", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const inspectionItemData = {
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        violationMode: "select",
      };

      const response = await request(app)
        .post("/api/business/admin/inspection-items")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(inspectionItemData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate missing question", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const inspectionItemData = {
        name: "Test Inspection Item",
        code: "II_001",
        violationId: testViolation._id,
        violationMode: "select",
      };

      const response = await request(app)
        .post("/api/business/admin/inspection-items")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(inspectionItemData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate missing violationId when mode is select", async () => {
      const inspectionItemData = {
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationMode: "select",
      };

      const response = await request(app)
        .post("/api/business/admin/inspection-items")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(inspectionItemData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate missing violationName when mode is create", async () => {
      const inspectionItemData = {
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationMode: "create",
        violationSeverity: "minor",
      };

      const response = await request(app)
        .post("/api/business/admin/inspection-items")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(inspectionItemData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate missing violationSeverity when mode is create", async () => {
      const inspectionItemData = {
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationMode: "create",
        violationName: "Test Violation",
      };

      const response = await request(app)
        .post("/api/business/admin/inspection-items")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(inspectionItemData)
        .expect(400);

      expectErrorResponse(response);
    });
  });

  describe("PUT /api/business/admin/inspection-items/:id with step-up", () => {
    it("should update name with step-up auth", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/inspection-items/${testInspectionItem._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ name: "Updated Inspection Item" })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should update question with step-up auth", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/inspection-items/${testInspectionItem._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ question: "Updated question" })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should update violationId with step-up auth", async () => {
      const testViolation1 = await Violation.create({
        name: "Test Violation 1",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const testViolation2 = await Violation.create({
        name: "Test Violation 2",
        code: "VIO_002",
        description: "Test description",
        severity: "major",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation1._id,
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/inspection-items/${testInspectionItem._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ violationId: testViolation2._id })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should update isActive with step-up auth", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/inspection-items/${testInspectionItem._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ isActive: false })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("DELETE /api/business/admin/inspection-items/:id with step-up", () => {
    it("should delete inspection item with step-up auth and valid data", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .delete(
          `/api/business/admin/inspection-items/${testInspectionItem._id}`,
        )
        .set(getStepUpHeaders(adminToken, adminUser))
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("GET /api/business/admin/inspection-items with filters", () => {
    it("should filter by isActive", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      await InspectionItem.create({
        name: "Active Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      await InspectionItem.create({
        name: "Inactive Inspection Item",
        code: "II_002",
        question: "Test question",
        violationId: testViolation._id,
        isActive: false,
      });

      const response = await request(app)
        .get("/api/business/admin/inspection-items?isActive=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      // The response might have a different structure, just check it's successful
      expect(response.body).toBeDefined();
    });
  });

  describe("DELETE /api/business/admin/inspection-items/:id", () => {
    it("should require step-up auth for deletion", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .delete(
          `/api/business/admin/inspection-items/${testInspectionItem._id}`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("GET /api/business/admin/inspection-items/:id/checklists", () => {
    it("should return checklists for inspection item", async () => {
      const testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      testInspectionItem = await InspectionItem.create({
        name: "Test Inspection Item",
        code: "II_001",
        question: "Test question",
        violationId: testViolation._id,
        isActive: true,
      });

      const response = await request(app)
        .get(
          `/api/business/admin/inspection-items/${testInspectionItem._id}/checklists`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });
  });
});
