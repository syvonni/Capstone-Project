const AppealService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business/appeal.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Appeal",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/BusinessProfile",
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
const BusinessProfile = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/BusinessProfile");
const Application = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application");
const Payment = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Payment");
const User = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/User");
const {
  logAuditEvent,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient");
const {
  crossClaimForBusiness,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/crossClaimService");

describe("AppealService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    crossClaimForBusiness.mockResolvedValue();
    logAuditEvent.mockResolvedValue();
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
      BusinessProfile.find.mockResolvedValue([]);

      const result = await AppealService.getById("507f1f77bcf86cd799439011");

      expect(result).toBeDefined();
      expect(result._id).toBe("507f1f77bcf86cd799439011");
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
      Application.findOne.mockResolvedValue({
        applicationId: "TEST-APP-001",
        businessName: "Test Business",
        save: jest.fn().mockResolvedValue(),
      });
      User.findById.mockResolvedValue({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });

      const result = await AppealService.create("507f1f77bcf86cd799439011", {
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
