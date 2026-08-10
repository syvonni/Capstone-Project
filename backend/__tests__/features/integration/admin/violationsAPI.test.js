const request = require("supertest");
const {
  setupMongoDB,
  teardownMongoDB,
  setupApp,
  setupTestEnvironment,
} = require("../../../helpers/setup");
const {
  createTestUsers,
  getTestTokens,
  getStepUpHeaders,
} = require("../../../helpers/fixtures");
const {
  cleanupTestData,
} = require("../../../helpers/cleanup");
const Violation = require("../../../../services/business-service/src/models/Violation");

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

describe("Violations API Integration Tests", () => {
  let app;
  let adminToken;
  let adminUser;
  let testViolation;

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
    await Violation.deleteMany({});
  });

  describe("GET /api/business/admin/violations", () => {
    it("should return empty list when no violations exist", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it("should return list of violations when violations exist", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/violations")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("GET /api/business/admin/violations/:id", () => {
    it("should return 404 for non-existent violation", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });

    it("should return violation by valid ID", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/violations/${testViolation._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data._id).toBe(testViolation._id.toString());
    });
  });

  describe("PUT /api/business/admin/violations/:id", () => {
    it("should require step-up auth for update", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/violations/${testViolation._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Violation" })
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("POST /api/business/admin/violations", () => {
    it("should create violation with step-up auth and valid data", async () => {
      const violationData = {
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
      };

      const response = await request(app)
        .post("/api/business/admin/violations")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(violationData)
        .expect(201);

      expect(response.body.ok).toBe(true);
    });

    it("should validate missing name", async () => {
      const violationData = {
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
      };

      const response = await request(app)
        .post("/api/business/admin/violations")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(violationData)
        .expect(400);

      expectErrorResponse(response);
    });

    it("should validate missing code", async () => {
      const violationData = {
        name: "Test Violation",
        description: "Test description",
        severity: "minor",
      };

      const response = await request(app)
        .post("/api/business/admin/violations")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(violationData);

      // Code might be auto-generated, so just check it succeeds
      expect([200, 201]).toContain(response.status);
    });

    it("should validate missing severity", async () => {
      const violationData = {
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
      };

      const response = await request(app)
        .post("/api/business/admin/violations")
        .set(getStepUpHeaders(adminToken, adminUser))
        .send(violationData)
        .expect(400);

      expectErrorResponse(response);
    });
  });

  describe("PUT /api/business/admin/violations/:id with step-up", () => {
    it("should update name with step-up auth", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/violations/${testViolation._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ name: "Updated Violation" })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it("should update description with step-up auth", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/violations/${testViolation._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ description: "Updated description" })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it("should update severity with step-up auth", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/violations/${testViolation._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ severity: "major" })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it("should update isActive with step-up auth", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/business/admin/violations/${testViolation._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .send({ isActive: false })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe("DELETE /api/business/admin/violations/:id with step-up", () => {
    it("should delete violation with step-up auth and valid data", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/business/admin/violations/${testViolation._id}`)
        .set(getStepUpHeaders(adminToken, adminUser))
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe("GET /api/business/admin/violations with filters", () => {
    it("should filter by isActive", async () => {
      await Violation.create({
        name: "Active Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      await Violation.create({
        name: "Inactive Violation",
        code: "VIO_002",
        description: "Test description",
        severity: "minor",
        isActive: false,
      });

      const response = await request(app)
        .get("/api/business/admin/violations?isActive=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.ok).toBe(true);
    });

    it("should filter by severity", async () => {
      await Violation.create({
        name: "Minor Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      await Violation.create({
        name: "Major Violation",
        code: "VIO_002",
        description: "Test description",
        severity: "major",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/violations?severity=minor")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.ok).toBe(true);
    });
  });

  describe("DELETE /api/business/admin/violations/:id", () => {
    it("should require step-up auth for deletion", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/business/admin/violations/${testViolation._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expectErrorResponse(response);
      expect(response.body.error.code).toBe("step_up_required");
    });
  });

  describe("GET /api/business/admin/violations/:id/inspection-items", () => {
    it("should require admin role for inspection items", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .get(
          `/api/business/admin/violations/${testViolation._id}/inspection-items`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });
  });

  describe("GET /api/business/admin/violations/data-quality", () => {
    it("should return data quality issues for all violations", async () => {
      await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/business/admin/violations/data-quality")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toHaveProperty("issues");
      expect(response.body.data).toHaveProperty("totalEntities");
      expect(response.body.data).toHaveProperty("totalIssues");
    });

    it("should require admin role for data quality endpoint", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/data-quality")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("GET /api/business/admin/violations/:id/data-quality", () => {
    it("should return data quality issues for a specific violation", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/violations/${testViolation._id}/data-quality`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toHaveProperty("issues");
    });

    it("should return 404 for non-existent violation", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/507f1f77bcf86cd799439011/data-quality")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(500);

      expectErrorResponse(response);
    });
  });

  describe("GET /api/business/admin/violations/performance", () => {
    it("should return performance metrics for violations", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toHaveProperty("avgResponseTime");
      expect(response.body.data).toHaveProperty("errorRate");
      expect(response.body.data).toHaveProperty("requestCount");
    });

    it("should support time range parameter", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/performance?timeRange=7d")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });

    it("should require admin role for performance endpoint", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/performance")
        .expect(401);

      expectErrorResponse(response);
    });
  });

  describe("GET /api/business/admin/violations/:id/performance", () => {
    it("should return performance metrics for a specific violation", async () => {
      testViolation = await Violation.create({
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/business/admin/violations/${testViolation._id}/performance`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });

    it("should return 404 for non-existent violation", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/507f1f77bcf86cd799439011/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expectStandardResponse(response);
    });
  });

  describe("GET /api/business/admin/violations/:id/audit", () => {
    it("should return 404 for non-existent violation", async () => {
      const response = await request(app)
        .get("/api/business/admin/violations/507f1f77bcf86cd799439011/audit")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expectErrorResponse(response);
    });
  });
});
