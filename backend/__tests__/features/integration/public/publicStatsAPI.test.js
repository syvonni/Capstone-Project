const request = require("supertest");
const {
  setupMongoDB,
  teardownMongoDB,
  setupApp,
  setupTestEnvironment,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/setup");
const {
  cleanupTestData,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/__tests__/helpers/cleanup");

function expectStandardResponse(response, hasData = true) {
  expect(response.body).toHaveProperty("ok", true);
  if (hasData) {
    expect(response.body).toHaveProperty("data");
  }
}

describe("Public Stats API Integration Tests", () => {
  let app;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  describe("GET /api/public/business/stats", () => {
    it("should return statistics", async () => {
      const response = await request(app)
        .get("/api/public/business/stats")
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.totalRegisteredThisYear).toBe("number");
      expect(typeof response.body.data.applicationsProcessedThisYear).toBe(
        "number",
      );
      expect(typeof response.body.data.pendingApplications).toBe("number");
    });
  });

  describe("GET /api/public/business/lobs", () => {
    it("should return LOBs", async () => {
      const response = await request(app)
        .get("/api/public/business/lobs")
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/public/business/post-requirements", () => {
    it("should return post requirements", async () => {
      const response = await request(app)
        .get("/api/public/business/post-requirements")
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
