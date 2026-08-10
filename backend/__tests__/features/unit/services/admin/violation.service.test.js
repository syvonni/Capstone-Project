const ViolationService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/violation.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/ClaimableDocument",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/violationAuditHelper",
);

const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Fee = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const ClaimableDocument = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/ClaimableDocument");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const ViolationAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/violationAuditHelper");

// Mock ViolationAuditHelper methods
ViolationAuditHelper.logCreated = jest.fn().mockResolvedValue();
ViolationAuditHelper.logUpdated = jest.fn().mockResolvedValue();
ViolationAuditHelper.logDisabled = jest.fn().mockResolvedValue();

describe("ViolationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all violations when no filters provided", async () => {
      const mockViolations = [
        { name: "Violation 1", _id: "1" },
        { name: "Violation 2", _id: "2" },
      ];
      Violation.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockViolations),
        }),
      });

      const result = await ViolationService.list({});

      expect(Violation.find).toHaveBeenCalledWith({});
      expect(result.data).toEqual(mockViolations);
      expect(result.total).toBe(2);
    });

    it("should filter by severity", async () => {
      const mockViolations = [{ name: "Violation 1", _id: "1" }];
      Violation.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockViolations),
        }),
      });

      await ViolationService.list({ severity: "minor" });

      expect(Violation.find).toHaveBeenCalledWith({ severity: "minor" });
    });

    it("should filter by isActive", async () => {
      const mockViolations = [{ name: "Violation 1", _id: "1" }];
      Violation.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockViolations),
        }),
      });

      await ViolationService.list({ isActive: "true" });

      expect(Violation.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe("getById", () => {
    it("should return violation by valid ID", async () => {
      const mockViolation = {
        name: "Test Violation",
        _id: "507f1f77bcf86cd799439011",
      };
      Violation.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockViolation),
      });

      const result = await ViolationService.getById("507f1f77bcf86cd799439011");

      expect(Violation.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(result).toEqual(mockViolation);
    });

    it("should throw error when violation not found", async () => {
      Violation.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        ViolationService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Violation not found");
      await expect(
        ViolationService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        ViolationService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });

    it("should throw error for invalid ID", async () => {
      await expect(ViolationService.getById("invalid-id")).rejects.toThrow(
        "Invalid violation ID",
      );
      await expect(
        ViolationService.getById("invalid-id"),
      ).rejects.toHaveProperty("code", "INVALID_ID");
      await expect(
        ViolationService.getById("invalid-id"),
      ).rejects.toHaveProperty("status", 400);
    });
  });

  describe("create", () => {
    it("should validate missing name", async () => {
      const data = {
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
      };

      await expect(ViolationService.create(data, "userId", {})).rejects.toThrow(
        "Name is required",
      );
    });

    it("should validate missing severity", async () => {
      const data = {
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
      };

      await expect(ViolationService.create(data, "userId", {})).rejects.toThrow(
        "Severity is required",
      );
    });

    it("should create with valid data", async () => {
      const data = {
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
      };

      Violation.findOne.mockResolvedValue(null);
      PostRequirement.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      Violation.create.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        ...data,
      });

      const result = await ViolationService.create(data, "userId", {});

      expect(result).toBeDefined();
    });

    it("should validate duplicate name in own collection", async () => {
      const data = {
        name: "Test Violation",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
      };

      Violation.findOne.mockResolvedValue({ name: "Test Violation" });

      await expect(ViolationService.create(data, "userId", {})).rejects.toThrow(
        "Name already exists",
      );
    });

    it("should validate duplicate name across entity types", async () => {
      const data = {
        name: "Test Entity",
        code: "VIO_001",
        description: "Test description",
        severity: "minor",
      };

      Violation.findOne.mockResolvedValue(null);
      PostRequirement.findOne.mockResolvedValue({ name: "Test Entity" });

      await expect(ViolationService.create(data, "userId", {})).rejects.toThrow(
        "Name already exists in PostRequirement",
      );
    });
  });

  describe("update", () => {
    it("should update name field", async () => {
      const mockViolation = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Violation",
        description: "Test description",
        severity: "minor",
        save: jest.fn().mockResolvedValue({}),
      };

      Violation.findById.mockResolvedValue(mockViolation);
      Violation.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockViolation),
      });

      const result = await ViolationService.update(
        "507f1f77bcf86cd799439011",
        { name: "Updated Violation" },
        "userId",
        {},
      );

      expect(Violation.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should update severity field", async () => {
      const mockViolation = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Violation",
        description: "Test description",
        severity: "minor",
        save: jest.fn().mockResolvedValue({}),
      };

      Violation.findById.mockResolvedValue(mockViolation);
      Violation.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockViolation),
      });

      const result = await ViolationService.update(
        "507f1f77bcf86cd799439011",
        { severity: "major" },
        "userId",
        {},
      );

      expect(Violation.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should update isActive field", async () => {
      const mockViolation = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Violation",
        description: "Test description",
        severity: "minor",
        isActive: true,
        save: jest.fn().mockResolvedValue({}),
      };

      Violation.findById.mockResolvedValue(mockViolation);
      Violation.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockViolation),
      });

      const result = await ViolationService.update(
        "507f1f77bcf86cd799439011",
        { isActive: false },
        "userId",
        {},
      );

      expect(Violation.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe("disable", () => {
    it("should check already-disabled", async () => {
      const mockViolation = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Violation",
        isActive: false,
      };

      Violation.findById.mockResolvedValue(mockViolation);

      await expect(
        ViolationService.disable("507f1f77bcf86cd799439011", "userId", {}),
      ).rejects.toThrow("Violation is already disabled");
    });

    it("should disable violation", async () => {
      const mockViolation = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Violation",
        isActive: true,
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.isActive = false;
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      Violation.findById.mockResolvedValue(mockViolation);

      const result = await ViolationService.disable(
        "507f1f77bcf86cd799439011",
        "userId",
        {},
      );

      expect(mockViolation.isActive).toBe(false);
      expect(mockViolation.version).toBe(2);
    });
  });

  describe("getInspectionItems", () => {
    it("should validate invalid ID", async () => {
      await expect(
        ViolationService.getInspectionItems("invalid-id"),
      ).rejects.toThrow("Invalid violation ID");
    });

    it("should return inspection items", async () => {
      const mockInspectionItems = [
        { name: "Item 1", _id: "1" },
        { name: "Item 2", _id: "2" },
      ];

      InspectionItem.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInspectionItems),
      });

      const result = await ViolationService.getInspectionItems(
        "507f1f77bcf86cd799439011",
      );

      expect(result.data).toEqual(mockInspectionItems);
      expect(result.total).toBe(2);
    });
  });
});
