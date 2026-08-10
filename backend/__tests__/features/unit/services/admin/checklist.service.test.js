const ChecklistService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/checklist.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/ClaimableDocument",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/httpClient",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/checklistAuditHelper",
);

const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Fee = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const ClaimableDocument = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/ClaimableDocument");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const ChecklistAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/checklistAuditHelper");

// Mock ChecklistAuditHelper methods
ChecklistAuditHelper.logCreated = jest.fn().mockResolvedValue();
ChecklistAuditHelper.logUpdated = jest.fn().mockResolvedValue();
ChecklistAuditHelper.logDisabled = jest.fn().mockResolvedValue();

// Mock getUserInfo
getUserInfo.mockResolvedValue({
  _id: "507f1f77bcf86cd799439011",
  email: "admin@example.com",
  role: "admin",
});

describe("ChecklistService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all checklists when no filters provided", async () => {
      const mockChecklists = [
        { name: "Checklist 1", _id: "1" },
        { name: "Checklist 2", _id: "2" },
      ];
      Checklist.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockChecklists),
      });

      const result = await ChecklistService.list({});

      expect(Checklist.find).toHaveBeenCalledWith({});
      expect(result.data).toEqual(mockChecklists);
      expect(result.total).toBe(2);
    });

    it("should filter by isActive", async () => {
      const mockChecklists = [{ name: "Checklist 1", _id: "1" }];
      Checklist.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockChecklists),
      });

      await ChecklistService.list({ isActive: "true" });

      expect(Checklist.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe("getById", () => {
    it("should throw error for invalid ID", async () => {
      await expect(ChecklistService.getById("invalid-id")).rejects.toThrow(
        "Invalid checklist ID",
      );
      await expect(
        ChecklistService.getById("invalid-id"),
      ).rejects.toHaveProperty("code", "INVALID_ID");
      await expect(
        ChecklistService.getById("invalid-id"),
      ).rejects.toHaveProperty("status", 400);
    });
  });

  describe("create", () => {
    it("should validate missing name", async () => {
      const data = {
        description: "Test description",
        items: [{ inspectionItemId: "507f1f77bcf86cd799439011" }],
      };

      await expect(
        ChecklistService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should validate missing items", async () => {
      const data = {
        name: "Test Checklist",
        description: "Test description",
      };

      await expect(
        ChecklistService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should validate duplicate name", async () => {
      const data = {
        name: "Test Checklist",
        description: "Test description",
        items: [{ inspectionItemId: "507f1f77bcf86cd799439011" }],
      };

      Checklist.findOne.mockResolvedValue({ name: "Test Checklist" });

      await expect(
        ChecklistService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should create with valid data", async () => {
      const data = {
        name: "Test Checklist",
        description: "Test description",
        items: [{ inspectionItemId: "507f1f77bcf86cd799439011" }],
      };

      Checklist.findOne.mockResolvedValue(null);
      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.find.mockResolvedValue([
        { _id: "507f1f77bcf86cd799439011" },
      ]);
      Checklist.create.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        ...data,
      });

      const result = await ChecklistService.create(data, "userId", {});

      expect(Checklist.create).toHaveBeenCalled();
    });

    it("should validate duplicate name across entity types", async () => {
      const data = {
        name: "Test Entity",
        description: "Test description",
        items: [{ inspectionItemId: "507f1f77bcf86cd799439011" }],
      };

      Checklist.findOne.mockResolvedValue(null);
      PostRequirement.findOne.mockResolvedValue({ name: "Test Entity" });

      await expect(ChecklistService.create(data, "userId", {})).rejects.toThrow(
        "Name already exists in PostRequirement",
      );
    });
  });

  describe("update", () => {
    it("should update name field", async () => {
      const mockChecklist = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Checklist",
        description: "Test description",
      };

      const mockUpdated = {
        ...mockChecklist,
        name: "Updated Checklist",
      };

      Checklist.findById.mockResolvedValue(mockChecklist);
      Checklist.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await ChecklistService.update(
        "507f1f77bcf86cd799439011",
        { name: "Updated Checklist" },
        "userId",
        {},
      );

      expect(Checklist.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should update description field", async () => {
      const mockChecklist = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Checklist",
        description: "Test description",
      };

      const mockUpdated = {
        ...mockChecklist,
        description: "Updated description",
      };

      Checklist.findById.mockResolvedValue(mockChecklist);
      Checklist.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await ChecklistService.update(
        "507f1f77bcf86cd799439011",
        { description: "Updated description" },
        "userId",
        {},
      );

      expect(Checklist.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should update isActive field", async () => {
      const mockChecklist = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
      };

      const mockUpdated = {
        ...mockChecklist,
        isActive: false,
      };

      Checklist.findById.mockResolvedValue(mockChecklist);
      Checklist.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await ChecklistService.update(
        "507f1f77bcf86cd799439011",
        { isActive: false },
        "userId",
        {},
      );

      expect(Checklist.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should increment version with changes", async () => {
      const mockChecklist = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Checklist",
        description: "Test description",
        version: 1,
      };

      const mockUpdated = {
        ...mockChecklist,
        name: "Updated Checklist",
        version: 2,
      };

      Checklist.findById.mockResolvedValue(mockChecklist);
      Checklist.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await ChecklistService.update(
        "507f1f77bcf86cd799439011",
        { name: "Updated Checklist" },
        "userId",
        {},
      );

      expect(Checklist.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe("disable", () => {
    it("should disable checklist", async () => {
      const mockChecklist = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Checklist",
        description: "Test description",
        isActive: true,
        version: 1,
      };

      const mockUpdated = {
        ...mockChecklist,
        isActive: false,
        version: 2,
      };

      Checklist.findById.mockResolvedValue(mockChecklist);
      Checklist.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await ChecklistService.disable(
        "507f1f77bcf86cd799439011",
        "userId",
        {},
      );

      expect(Checklist.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});
