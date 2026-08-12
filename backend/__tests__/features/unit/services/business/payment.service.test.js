const PaymentService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business-owner/payment.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient",
);

const Payment = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment");
const Business = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business");
const Application = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application");
const {
  logAuditEvent,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient");

const MOCK_BUSINESS_ID = "507f1f77bcf86cd799439013";
const MOCK_USER_ID = "507f1f77bcf86cd799439011";

const createFindQuery = (leanResult) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(leanResult),
});

const createLeanQuery = (leanResult) => {
  const q = Promise.resolve(leanResult);
  q.lean = jest.fn().mockResolvedValue(leanResult);
  return q;
};

const mockBusiness = {
  _id: MOCK_BUSINESS_ID,
  userId: MOCK_USER_ID,
  businessId: "TEST-BUSINESS-001",
};

describe("PaymentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    logAuditEvent.mockResolvedValue();
    Payment.create.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      paymentId: "PAY-2024-TEST-001",
      userId: MOCK_USER_ID,
      businessId: mockBusiness._id,
      paymentType: "registration_fee",
      amount: 500,
      status: "pending",
      save: jest.fn().mockResolvedValue(),
    });

    Payment.findOne.mockReturnValue(
      createLeanQuery({
        _id: "507f1f77bcf86cd799439011",
        paymentId: "PAY-2024-TEST-001",
        userId: MOCK_USER_ID,
        businessId: mockBusiness._id,
        paymentType: "registration_fee",
        amount: 500,
        status: "pending",
        save: jest.fn().mockResolvedValue(),
      }),
    );

    Payment.find.mockReturnValue(createFindQuery([]));
    Payment.countDocuments.mockResolvedValue(0);

    Business.findById.mockReturnValue(createLeanQuery(null));
    Business.findOne.mockReturnValue(createLeanQuery(mockBusiness));
    Application.findById.mockReturnValue(createLeanQuery(null));
    Application.findOne.mockReturnValue(createLeanQuery(null));
  });

  describe("list", () => {
    it("should return payments for user", async () => {
      const result = await PaymentService.list(MOCK_USER_ID, {});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(Payment.find).toHaveBeenCalled();
    });

    it("should apply status filter", async () => {
      await PaymentService.list(MOCK_USER_ID, {
        status: "pending",
      });

      expect(Payment.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });
  });

  describe("getPending", () => {
    it("should return pending payments with overdue flag", async () => {
      Payment.find.mockReturnValue(
        createFindQuery([
          {
            paymentId: "PAY-001",
            amount: 500,
            dueDate: new Date(Date.now() - 1000), // Past due
            status: "pending",
          },
        ]),
      );

      const result = await PaymentService.getPending(MOCK_USER_ID, {});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].isOverdue).toBe(true);
    });
  });

  describe("getHistory", () => {
    it("should return paid and refunded payments", async () => {
      const result = await PaymentService.getHistory(MOCK_USER_ID, {});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(Payment.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ["paid", "refunded"] },
        }),
      );
    });

    it("should apply date filters", async () => {
      await PaymentService.getHistory(MOCK_USER_ID, {
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
        MOCK_USER_ID,
        "PAY-2024-TEST-001",
      );

      expect(result).toBeDefined();
      expect(result.paymentId).toBe("PAY-2024-TEST-001");
    });

    it("should throw error when payment not found", async () => {
      Payment.findOne.mockReturnValue(createLeanQuery(null));

      await expect(
        PaymentService.getById(MOCK_USER_ID, "INVALID-ID"),
      ).rejects.toThrow("Payment not found");
    });
  });

  describe("create", () => {
    it("should validate missing required fields", async () => {
      await expect(
        PaymentService.create(
          MOCK_USER_ID,
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
          MOCK_USER_ID,
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
        MOCK_USER_ID,
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

    it("should throw error when entity not found", async () => {
      Business.findOne.mockReturnValue(createLeanQuery(null));

      await expect(
        PaymentService.create(
          MOCK_USER_ID,
          {},
          {
            businessId: "UNKNOWN-BUSINESS",
            paymentType: "registration_fee",
            amount: 500,
          },
        ),
      ).rejects.toThrow("Business or application not found");
    });
  });

  describe("pay", () => {
    it("should validate paymentMethod is required", async () => {
      await expect(
        PaymentService.pay(MOCK_USER_ID, "PAY-001", {}),
      ).rejects.toThrow("paymentMethod is required");
    });

    it("should process payment with valid data", async () => {
      const result = await PaymentService.pay(MOCK_USER_ID, "PAY-001", {
        paymentMethod: "credit_card",
        transactionId: "TXN-123456",
      });

      expect(result).toBeDefined();
      expect(result.message).toBe("Payment processed successfully");
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it("should throw error when payment already paid", async () => {
      Payment.findOne.mockReturnValue(
        createLeanQuery({
          _id: "507f1f77bcf86cd799439011",
          paymentId: "PAY-2024-TEST-001",
          userId: MOCK_USER_ID,
          businessId: mockBusiness._id,
          paymentType: "registration_fee",
          amount: 500,
          status: "paid",
          save: jest.fn().mockResolvedValue(),
        }),
      );

      await expect(
        PaymentService.pay(MOCK_USER_ID, "PAY-001", {
          paymentMethod: "credit_card",
        }),
      ).rejects.toThrow("Payment has already been processed");
    });
  });

  describe("cancel", () => {
    it("should cancel pending payment", async () => {
      const result = await PaymentService.cancel(
        MOCK_USER_ID,
        "PAY-001",
        { reason: "No longer needed" },
      );

      expect(result).toBeDefined();
    });

    it("should throw error when payment not pending", async () => {
      Payment.findOne.mockReturnValue(
        createLeanQuery({
          _id: "507f1f77bcf86cd799439011",
          paymentId: "PAY-2024-TEST-001",
          userId: MOCK_USER_ID,
          businessId: mockBusiness._id,
          paymentType: "registration_fee",
          amount: 500,
          status: "paid",
          save: jest.fn().mockResolvedValue(),
        }),
      );

      await expect(
        PaymentService.cancel(MOCK_USER_ID, "PAY-001", {}),
      ).rejects.toThrow("Only pending payments can be cancelled");
    });
  });

  describe("getReceipt", () => {
    it("should generate receipt for paid payment", async () => {
      Payment.findOne.mockReturnValue(
        createLeanQuery({
          _id: "507f1f77bcf86cd799439011",
          paymentId: "PAY-2024-TEST-001",
          userId: MOCK_USER_ID,
          businessId: mockBusiness._id,
          paymentType: "registration_fee",
          amount: 500,
          status: "paid",
          paidAt: new Date(),
          receiptNumber: "RCP-123456",
          save: jest.fn().mockResolvedValue(),
        }),
      );

      const result = await PaymentService.getReceipt(
        MOCK_USER_ID,
        "PAY-001",
      );

      expect(result).toBeDefined();
      expect(result.receiptNumber).toBe("RCP-123456");
    });

    it("should throw error when payment not paid", async () => {
      await expect(
        PaymentService.getReceipt(MOCK_USER_ID, "PAY-001"),
      ).rejects.toThrow("Receipt can only be generated for paid payments");
    });
  });

  describe("createMock", () => {
    it("should validate businessId and amount are required", async () => {
      await expect(
        PaymentService.createMock(
          MOCK_USER_ID,
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
        MOCK_USER_ID,
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
