const AppealService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business-owner/appeal.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Appeal",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/User",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/crossClaimService",
);

const Appeal = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Appeal");
const Business = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business");
const Application = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application");
const Payment = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment");
const User = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/User");
const {
  logAuditEvent,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient");
const {
  crossClaimForBusiness,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/crossClaimService");

const createLeanQuery = (leanResult) => {
  const q = Promise.resolve(leanResult);
  q.lean = jest.fn().mockResolvedValue(leanResult);
  q.select = jest.fn().mockReturnThis();
  return q;
};

const MOCK_BUSINESS_ID = "507f1f77bcf86cd799439013";
const MOCK_USER_ID = "507f1f77bcf86cd799439011";

const mockBusiness = {
  _id: MOCK_BUSINESS_ID,
  userId: MOCK_USER_ID,
  businessId: "TEST-BUSINESS-001",
  businessName: "Test Business",
  reviewedBy: null,
};

const mockApplication = {
  _id: "507f1f77bcf86cd799439014",
  applicationId: "TEST-APP-001",
  userId: MOCK_USER_ID,
  businessName: "Test Business",
  applicationStatus: "rejected",
  rejectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  save: jest.fn().mockResolvedValue(),
};

describe("AppealService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    crossClaimForBusiness.mockResolvedValue();
    logAuditEvent.mockResolvedValue();

    Business.findById.mockReturnValue(createLeanQuery(null));
    Business.findOne.mockReturnValue(createLeanQuery(mockBusiness));

    Application.findById.mockReturnValue(createLeanQuery(null));
    Application.findOne.mockReturnValue(createLeanQuery(mockApplication));
    Application.updateOne.mockResolvedValue({});

    Payment.create.mockResolvedValue({
      _id: "507f1f77bcf86cd799439015",
      paymentId: "PAY-APPEAL-001",
    });

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      }),
    });
  });

  describe("getById", () => {
    it("should validate ID parameter", async () => {
      await expect(AppealService.getById(null)).rejects.toThrow();
    });

    it("should return appeal details when found", async () => {
      const mockAppeal = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        appealType: "incorrect_fees",
        description: "Test appeal description",
        status: "submitted",
        toObject: jest.fn().mockReturnValue({
          _id: "507f1f77bcf86cd799439011",
          businessId: "TEST-BUSINESS-001",
          appealType: "incorrect_fees",
          description: "Test appeal description",
          status: "submitted",
        }),
      };

      Appeal.findById.mockResolvedValue(mockAppeal);

      const result = await AppealService.getById("507f1f77bcf86cd799439011");

      expect(result).toBeDefined();
      expect(result._id).toBe("507f1f77bcf86cd799439011");
      expect(result.businessName).toBe("Test Business");
    });

    it("should throw error when appeal not found", async () => {
      Appeal.findById.mockResolvedValue(null);

      await expect(
        AppealService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("should validate missing required fields", async () => {
      await expect(
        AppealService.create("507f1f77bcf86cd799439011", {
          businessId: "TEST-BUSINESS-001",
          // missing appealType and description
        }),
      ).rejects.toThrow();
    });

    it("should create appeal with valid data", async () => {
      const mockAppeal = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        appealType: "incorrect_fees",
        description: "Test appeal description",
        status: "submitted",
        save: jest.fn().mockResolvedValue(),
      };

      Appeal.create.mockResolvedValue(mockAppeal);

      const result = await AppealService.create(MOCK_USER_ID, {
        businessId: "TEST-BUSINESS-001",
        appealType: "incorrect_fees",
        description: "Test appeal description",
      });

      expect(result).toBeDefined();
      expect(result.appealType).toBe("incorrect_fees");
    });
  });

  describe("claim", () => {
    it("should assign officer to appeal", async () => {
      const mockAppeal = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        appealType: "incorrect_fees",
        description: "Test appeal description",
        status: "submitted",
        reviewedBy: null,
        save: jest.fn().mockResolvedValue(),
      };

      Appeal.findById.mockResolvedValue(mockAppeal);

      const result = await AppealService.claim(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
      );

      expect(result).toBeDefined();
      expect(result.reviewedBy).toBe("507f1f77bcf86cd799439012");
    });
  });

  describe("release", () => {
    it("should remove officer assignment", async () => {
      const mockAppeal = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        appealType: "incorrect_fees",
        description: "Test appeal description",
        status: "submitted",
        reviewedBy: "507f1f77bcf86cd799439012",
        save: jest.fn().mockResolvedValue(),
      };

      Appeal.findById.mockResolvedValue(mockAppeal);

      const result = await AppealService.release(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
      );

      expect(result).toBeDefined();
      expect(result.reviewedBy).toBeNull();
    });
  });

  describe("transfer", () => {
    it("should transfer to different officer", async () => {
      const mockAppeal = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        appealType: "incorrect_fees",
        description: "Test appeal description",
        status: "submitted",
        reviewedBy: "507f1f77bcf86cd799439012",
        save: jest.fn().mockResolvedValue(),
      };

      Appeal.findById.mockResolvedValue(mockAppeal);

      const result = await AppealService.transfer(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        "507f1f77bcf86cd799439013",
      );

      expect(result).toBeDefined();
      expect(result.reviewedBy).toBe("507f1f77bcf86cd799439013");
    });
  });
});
