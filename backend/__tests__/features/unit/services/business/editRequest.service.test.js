const EditRequestService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business/editRequest.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/EditRequest",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/BusinessProfile",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/crossClaimService",
);

const EditRequest = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/EditRequest");
const BusinessProfile = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/BusinessProfile");
const {
  logAuditEvent,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient");
const {
  crossClaimForBusiness,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/crossClaimService");

describe("EditRequestService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    crossClaimForBusiness.mockResolvedValue();
    logAuditEvent.mockResolvedValue();
  });

  describe("create", () => {
    it("should validate missing required fields", async () => {
      await expect(
        EditRequestService.create("507f1f77bcf86cd799439011", {
          businessId: "TEST-BUSINESS-001",
          // missing fieldName, requestedValue, reason
        }),
      ).rejects.toThrow();
    });

    it("should create edit request with valid data", async () => {
      const mockRequest = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        fieldName: "businessName",
        requestedValue: "New Business Name",
        reason: "Need to update business name",
        status: "pending",
        save: jest.fn().mockResolvedValue(),
      };

      EditRequest.create.mockResolvedValue(mockRequest);
      BusinessProfile.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439012",
        userId: "507f1f77bcf86cd799439011",
        businesses: [
          { businessId: "TEST-BUSINESS-001", businessName: "Test Business" },
        ],
        save: jest.fn().mockResolvedValue(),
      });

      const result = await EditRequestService.create(
        "507f1f77bcf86cd799439011",
        {
          businessId: "TEST-BUSINESS-001",
          fieldName: "businessName",
          requestedValue: "New Business Name",
          reason: "Need to update business name",
        },
      );

      expect(result).toBeDefined();
      expect(result.fieldName).toBe("businessName");
    });
  });

  describe("update", () => {
    it("should approve request", async () => {
      const mockRequest = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        fieldName: "businessName",
        requestedValue: "New Business Name",
        reason: "Need to update business name",
        status: "pending",
        save: jest.fn().mockImplementation(function () {
          this.status = "approved";
          this.reviewedBy = "507f1f77bcf86cd799439012";
          this.reviewedAt = new Date();
          this.reviewNotes = "Request approved";
          return Promise.resolve(this);
        }),
      };

      EditRequest.findById.mockResolvedValue(mockRequest);
      BusinessProfile.findOne.mockResolvedValue({
        businesses: [
          { businessId: "TEST-BUSINESS-001", businessName: "Test Business" },
        ],
        save: jest.fn().mockResolvedValue(),
        markModified: jest.fn(),
      });

      const result = await EditRequestService.update(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        "staff",
        {
          status: "approved",
          reviewNotes: "Request approved",
        },
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("approved");
    });

    it("should reject request", async () => {
      const mockRequest = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        fieldName: "businessName",
        requestedValue: "New Business Name",
        reason: "Need to update business name",
        status: "pending",
        save: jest.fn().mockImplementation(function () {
          this.status = "rejected";
          this.reviewedBy = "507f1f77bcf86cd799439012";
          this.reviewedAt = new Date();
          this.reviewNotes = "Request rejected";
          return Promise.resolve(this);
        }),
      };

      EditRequest.findById.mockResolvedValue(mockRequest);

      const result = await EditRequestService.update(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        "staff",
        {
          status: "rejected",
          reviewNotes: "Request rejected",
        },
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("rejected");
    });
  });

  describe("claim", () => {
    it("should assign officer to request", async () => {
      const mockRequest = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        fieldName: "businessName",
        requestedValue: "New Business Name",
        reason: "Need to update business name",
        status: "pending",
        reviewedBy: null,
        save: jest.fn().mockResolvedValue(),
      };

      EditRequest.findById.mockResolvedValue(mockRequest);

      const result = await EditRequestService.claim(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
      );

      expect(result).toBeDefined();
      expect(result.reviewedBy).toBe("507f1f77bcf86cd799439012");
    });
  });

  describe("release", () => {
    it("should remove officer assignment", async () => {
      const mockRequest = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        fieldName: "businessName",
        requestedValue: "New Business Name",
        reason: "Need to update business name",
        status: "pending",
        reviewedBy: "507f1f77bcf86cd799439012",
        save: jest.fn().mockResolvedValue(),
      };

      EditRequest.findById.mockResolvedValue(mockRequest);

      const result = await EditRequestService.release(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        "staff",
      );

      expect(result).toBeDefined();
      expect(result.reviewedBy).toBeNull();
    });
  });

  describe("transfer", () => {
    it("should transfer to different officer", async () => {
      const mockRequest = {
        _id: "507f1f77bcf86cd799439011",
        businessId: "TEST-BUSINESS-001",
        fieldName: "businessName",
        requestedValue: "New Business Name",
        reason: "Need to update business name",
        status: "pending",
        reviewedBy: "507f1f77bcf86cd799439012",
        save: jest.fn().mockResolvedValue(),
      };

      EditRequest.findById.mockResolvedValue(mockRequest);

      const result = await EditRequestService.transfer(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        "staff",
        "507f1f77bcf86cd799439013",
      );

      expect(result).toBeDefined();
      expect(result.reviewedBy).toBe("507f1f77bcf86cd799439013");
    });
  });
});
