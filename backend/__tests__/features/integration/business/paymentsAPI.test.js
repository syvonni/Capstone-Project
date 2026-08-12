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
const Payment = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment");
const BusinessProfile = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/BusinessProfile");
const Business = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business");

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

describe("Payments API Integration Tests", () => {
  let app;
  let businessOwnerToken;
  let businessOwnerId;
  let testBusinessId;
  let testBusinessSubdocId;

  beforeAll(async () => {
    setupTestEnvironment();
    await setupMongoDB();
    app = setupApp("business");

    const users = await createTestUsers();
    const tokens = getTestTokens(users);
    businessOwnerToken = tokens.businessOwnerToken;
    businessOwnerId = users.businessOwner._id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Payment.deleteMany({});
    await BusinessProfile.deleteMany({});
    await Business.deleteMany({});

    // Create a test business profile and business for the business owner
    testBusinessSubdocId = new mongoose.Types.ObjectId();
    testBusinessId = "TEST-BUSINESS-001";

    const profile = await BusinessProfile.create({
      userId: businessOwnerId,
    });

    await Business.create({
      _id: testBusinessSubdocId,
      businessId: testBusinessId,
      userId: businessOwnerId,
      ownerProfileId: profile._id,
      businessName: "Test Business",
      businessRegistrationNumber: "BRN-001",
    });
  });

  describe("GET /api/business/payments", () => {
    it("should return empty list when no payments exist", async () => {
      const response = await request(app)
        .get("/api/business/payments")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should return list with payments", async () => {
      await Payment.create({
        paymentId: "PAY-2024-TEST-001",
        userId: businessOwnerId,
        businessId: testBusinessSubdocId,
        paymentType: "registration_fee",
        description: "Test payment",
        amount: 500,
        status: "pending",
      });

      const response = await request(app)
        .get("/api/business/payments")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/business/payments/pending", () => {
    it("should return pending payments", async () => {
      await Payment.create({
        paymentId: "PAY-2024-TEST-001",
        userId: businessOwnerId,
        businessId: testBusinessSubdocId,
        paymentType: "registration_fee",
        description: "Test payment",
        amount: 500,
        status: "pending",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get("/api/business/payments/pending")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/business/payments/history", () => {
    it("should return payment history", async () => {
      await Payment.create({
        paymentId: "PAY-2024-TEST-001",
        userId: businessOwnerId,
        businessId: testBusinessSubdocId,
        paymentType: "registration_fee",
        description: "Test payment",
        amount: 500,
        status: "paid",
        paidAt: new Date(),
      });

      const response = await request(app)
        .get("/api/business/payments/history")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/business/payments/:paymentId", () => {
    it("should return payment with valid ID", async () => {
      const payment = await Payment.create({
        paymentId: "PAY-2024-TEST-001",
        userId: businessOwnerId,
        businessId: testBusinessSubdocId,
        paymentType: "registration_fee",
        description: "Test payment",
        amount: 500,
        status: "pending",
      });

      const response = await request(app)
        .get(`/api/business/payments/${payment.paymentId}`)
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
      expect(response.body.paymentId).toBe(payment.paymentId);
    });

    it("should return 404 for invalid ID", async () => {
      const response = await request(app)
        .get("/api/business/payments/INVALID-ID")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(404);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/payments", () => {
    it("should create payment with valid data", async () => {
      const response = await request(app)
        .post("/api/business/payments")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: testBusinessSubdocId.toString(),
          paymentType: "registration_fee",
          description: "Business permit fee",
          amount: 500,
          dueDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .expect(201);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });

    it("should validate missing required fields", async () => {
      const response = await request(app)
        .post("/api/business/payments")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: testBusinessSubdocId.toString(),
          // missing paymentType and amount
        })
        .expect(400);

      expectErrorResponse(response);
    });
  });

  describe("POST /api/business/payments/:paymentId/pay", () => {
    it("should process payment with valid data", async () => {
      const payment = await Payment.create({
        paymentId: "PAY-2024-TEST-001",
        userId: businessOwnerId,
        businessId: testBusinessSubdocId,
        paymentType: "registration_fee",
        description: "Test payment",
        amount: 500,
        status: "pending",
      });

      const response = await request(app)
        .post(`/api/business/payments/${payment.paymentId}/pay`)
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          paymentMethod: "credit_card",
          transactionId: "TXN-123456",
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });
  });

  describe("PUT /api/business/payments/:paymentId/cancel", () => {
    it("should cancel pending payment", async () => {
      const payment = await Payment.create({
        paymentId: "PAY-2024-TEST-001",
        userId: businessOwnerId,
        businessId: testBusinessSubdocId,
        paymentType: "registration_fee",
        description: "Test payment",
        amount: 500,
        status: "pending",
      });

      const response = await request(app)
        .put(`/api/business/payments/${payment.paymentId}/cancel`)
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          reason: "No longer needed",
        })
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });
  });

  describe("POST /api/business/payments/:paymentId/receipt", () => {
    it("should generate receipt for paid payment", async () => {
      const payment = await Payment.create({
        paymentId: "PAY-2024-TEST-001",
        userId: businessOwnerId,
        businessId: testBusinessSubdocId,
        paymentType: "registration_fee",
        description: "Test payment",
        amount: 500,
        status: "paid",
        paidAt: new Date(),
        receiptNumber: "RCP-123456",
      });

      const response = await request(app)
        .post(`/api/business/payments/${payment.paymentId}/receipt`)
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });
  });

  describe("POST /api/business/payments/mock", () => {
    it("should create mock payment for testing", async () => {
      const response = await request(app)
        .post("/api/business/payments/mock")
        .set("Authorization", `Bearer ${businessOwnerToken}`)
        .send({
          businessId: testBusinessId,
          amount: 500,
          fees: [
            { label: "Base Fee", amount: 300, type: "base" },
            { label: "Sanitary Fee", amount: 200, type: "other" },
          ],
        })
        .expect(201);

      expectStandardResponse(response);
      expect(response.body).toBeDefined();
    });
  });
});
