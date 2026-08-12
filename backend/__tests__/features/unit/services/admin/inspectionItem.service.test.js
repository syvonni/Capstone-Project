const InspectionItemService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/inspectionItem.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist",
);
jest.mock("../../../../../shared/models/Fee");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock("../../../../../shared/models/ClaimableDocument");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/inspectionItemAuditHelper",
);

const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const Fee = require("../../../../../shared/models/Fee");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const ClaimableDocument = require("../../../../../shared/models/ClaimableDocument");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const InspectionItemAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/inspectionItemAuditHelper");

// Mock InspectionItemAuditHelper methods
InspectionItemAuditHelper.logCreated = jest.fn().mockResolvedValue();
InspectionItemAuditHelper.logUpdated = jest.fn().mockResolvedValue();

describe("InspectionItemService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all inspection items when no filters provided", async () => {
      const mockInspectionItems = [
        { name: "Item 1", _id: "1" },
        { name: "Item 2", _id: "2" },
      ];
      InspectionItem.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInspectionItems),
        }),
      });

      const result = await InspectionItemService.list({});

      expect(InspectionItem.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockInspectionItems);
      expect(result).toHaveLength(2);
    });

    it("should filter by violationId", async () => {
      const mockInspectionItems = [{ name: "Item 1", _id: "1" }];
      InspectionItem.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInspectionItems),
        }),
      });

      await InspectionItemService.list({
        violationId: "507f1f77bcf86cd799439011",
      });

      expect(InspectionItem.find).toHaveBeenCalledWith({
        violationId: "507f1f77bcf86cd799439011",
      });
    });

    it("should filter by isActive", async () => {
      const mockInspectionItems = [{ name: "Item 1", _id: "1" }];
      InspectionItem.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInspectionItems),
        }),
      });

      await InspectionItemService.list({ isActive: "true" });

      expect(InspectionItem.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe("getById", () => {
    it("should return inspection item by valid ID", async () => {
      const mockInspectionItem = {
        name: "Test Item",
        _id: "507f1f77bcf86cd799439011",
      };
      InspectionItem.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInspectionItem),
      });

      const result = await InspectionItemService.getById(
        "507f1f77bcf86cd799439011",
      );

      expect(InspectionItem.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(result).toEqual(mockInspectionItem);
    });

    it("should throw error when inspection item not found", async () => {
      InspectionItem.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        InspectionItemService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Inspection item not found");
      await expect(
        InspectionItemService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        InspectionItemService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });

    it("should throw error for invalid ID", async () => {
      await expect(InspectionItemService.getById("invalid-id")).rejects.toThrow(
        "Invalid inspection item ID",
      );
      await expect(
        InspectionItemService.getById("invalid-id"),
      ).rejects.toHaveProperty("code", "INVALID_ID");
      await expect(
        InspectionItemService.getById("invalid-id"),
      ).rejects.toHaveProperty("status", 400);
    });
  });

  describe("create", () => {
    it("should validate duplicate name across entity types", async () => {
      const data = {
        name: "Test Entity",
        question: "Test question",
      };

      PostRequirement.findOne.mockResolvedValue({ name: "Test Entity" });

      await expect(
        InspectionItemService.create(data, "userId", {}),
      ).rejects.toThrow("Name already exists in PostRequirement");
    });
  });
});
