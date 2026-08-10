const PaymentService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business/payment.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/BusinessProfile",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient",
);

const Payment = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment");
const BusinessProfile = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/BusinessProfile");
const {
  logAuditEvent,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient");

describe("PaymentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    logAuditEvent.mockResolvedValue();
    Payment.create.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      paymentId: "PAY-2024-TEST-001",
      userId: "507f1f77bcf86cd799439011",
      businessId: "TEST-BUSINESS-001",
      paymentType: "registration_fee",
      amount: 500,
      status: "pending",
      save: jest.fn().mockResolvedValue(),
    });

    Payment.findOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      paymentId: "PAY-2024-TEST-001",
      userId: "507f1f77bcf86cd799439011",
      businessId: "TEST-BUSINESS-001",
      paymentType: "registration_fee",
      amount: 500,
      status: "pending",
      save: jest.fn().mockResolvedValue(),
    });

    Payment.find.mockResolvedValue([]);
    Payment.countDocuments.mockResolvedValue(0);

    BusinessProfile.findOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      userId: "507f1f77bcf86cd799439011",
      businesses: [
        {
          _id: "507f1f77bcf86cd799439013",
          businessId: "TEST-BUSINESS-001",
        },
      ],
    });
  });

  describe("list", () => {
    it("should return payments for user", async () => {
      const result = await PaymentService.list("507f1f77bcf86cd799439011", {});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(Payment.find).toHaveBeenCalled();
    });

    it("should apply status filter", async () => {
      await PaymentService.list("507f1f77bcf86cd799439011", {
        status: "pending",
      });

      expect(Payment.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });
  });

  describe("getPending", () => {
    it("should return pending payments with overdue flag", async () => {
      Payment.find.mockResolvedValue([
        {
          paymentId: "PAY-001",
          amount: 500,
          dueDate: new Date(Date.now() - 1000), // Past due
          status: "pending",
        },
      ]);

      const result = await PaymentService.getPending(
        "507f1f77bcf86cd799439011",
        {},
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].isOverdue).toBe(true);
    });
  });

  describe("getHistory", () => {
    it("should return paid and refunded payments", async () => {
      const result = await PaymentService.getHistory(
        "507f1f77bcf86cd799439011",
        {},
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(Payment.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ["paid", "refunded"] },
        }),
      );
    });

    it("should apply date filters", async () => {
      await PaymentService.getHistory("507f1f77bcf86cd799439011", {
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      });

      expect(Payment.find).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAt: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("getById", () => {
    it("should return payment details when found", async () => {
      const result = await PaymentService.getById(
        "507f1f77bcf86cd799439011",
        "PAY-2024-TEST-001",
      );

      expect(result).toBeDefined();
      expect(result.paymentId).toBe("PAY-2024-TEST-001");
    });

    it("should throw error when payment not found", async () => {
      Payment.findOne.mockResolvedValue(null);

      await expect(
        PaymentService.getById("507f1f77bcf86cd799439011", "INVALID-ID"),
      ).rejects.toThrow("Payment not found");
    });
  });

  describe("create", () => {
    it("should validate missing required fields", async () => {
      await expect(
        PaymentService.create(
          "507f1f77bcf86cd799439011",
          {},
          {
            businessId: "TEST-BUSINESS-001",
            // missing paymentType and amount
          },
        ),
      ).rejects.toThrow("businessId, paymentType, and amount are required");
    });

    it("should validate amount must be greater than 0", async () => {
      await expect(
        PaymentService.create(
          "507f1f77bcf86cd799439011",
          {},
          {
            businessId: "TEST-BUSINESS-001",
            paymentType: "registration_fee",
            amount: 0,
          },
        ),
      ).rejects.toThrow("Amount must be greater than 0");
    });

    it("should create payment with valid data", async () => {
      const result = await PaymentService.create(
        "507f1f77bcf86cd799439011",
        {},
        {
          businessId: "TEST-BUSINESS-001",
          paymentType: "registration_fee",
          description: "Business permit fee",
          amount: 500,
          dueDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      );

      expect(result).toBeDefined();
      expect(Payment.create).toHaveBeenCalled();
    });
  });

  describe("pay", () => {
    it("should validate paymentMethod is required", async () => {
      await expect(
        PaymentService.pay("507f1f77bcf86cd799439011", "PAY-001", {}),
      ).rejects.toThrow("paymentMethod is required");
    });

    it("should process payment with valid data", async () => {
      const result = await PaymentService.pay(
        "507f1f77bcf86cd799439011",
        "PAY-001",
        {
          paymentMethod: "credit_card",
          transactionId: "TXN-123456",
        },
      );

      expect(result).toBeDefined();
      expect(result.message).toBe("Payment processed successfully");
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it("should throw error when payment already paid", async () => {
      Payment.findOne.mockResolvedValue({
        ...Payment.findOne.mock.results[0].value,
        status: "paid",
      });

      await expect(
        PaymentService.pay("507f1f77bcf86cd799439011", "PAY-001", {
          paymentMethod: "credit_card",
        }),
      ).rejects.toThrow("Payment has already been processed");
    });
  });

  describe("cancel", () => {
    it("should cancel pending payment", async () => {
      const result = await PaymentService.cancel(
        "507f1f77bcf86cd799439011",
        "PAY-001",
        { reason: "No longer needed" },
      );

      expect(result).toBeDefined();
    });

    it("should throw error when payment not pending", async () => {
      Payment.findOne.mockResolvedValue({
        ...Payment.findOne.mock.results[0].value,
        status: "paid",
      });

      await expect(
        PaymentService.cancel("507f1f77bcf86cd799439011", "PAY-001", {}),
      ).rejects.toThrow("Only pending payments can be cancelled");
    });
  });

  describe("getReceipt", () => {
    it("should generate receipt for paid payment", async () => {
      Payment.findOne.mockResolvedValue({
        ...Payment.findOne.mock.results[0].value,
        status: "paid",
        paidAt: new Date(),
        receiptNumber: "RCP-123456",
      });

      const result = await PaymentService.getReceipt(
        "507f1f77bcf86cd799439011",
        "PAY-001",
      );

      expect(result).toBeDefined();
      expect(result.receiptNumber).toBe("RCP-123456");
    });

    it("should throw error when payment not paid", async () => {
      await expect(
        PaymentService.getReceipt("507f1f77bcf86cd799439011", "PAY-001"),
      ).rejects.toThrow("Receipt can only be generated for paid payments");
    });
  });

  describe("createMock", () => {
    it("should validate businessId and amount are required", async () => {
      await expect(
        PaymentService.createMock(
          "507f1f77bcf86cd799439011",
          {},
          {
            businessId: "TEST-BUSINESS-001",
            // missing amount
          },
        ),
      ).rejects.toThrow("businessId and amount are required");
    });

    it("should create mock payment with valid data", async () => {
      const result = await PaymentService.createMock(
        "507f1f77bcf86cd799439011",
        {},
        {
          businessId: "TEST-BUSINESS-001",
          amount: 500,
          fees: [
            { label: "Base Fee", amount: 300, type: "base" },
            { label: "Sanitary Fee", amount: 200, type: "other" },
          ],
        },
      );

      expect(result).toBeDefined();
      expect(Payment.create).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        "mock_payment_recorded",
        expect.any(String),
        "Payment",
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
