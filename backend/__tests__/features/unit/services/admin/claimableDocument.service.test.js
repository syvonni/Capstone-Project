const ClaimableDocumentService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/claimableDocument.service");

// Mock the dependencies
jest.mock("../../../../../shared/models/ClaimableDocument");
jest.mock("../../../../../shared/models/Fee");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/httpClient",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/claimableDocumentAuditHelper",
);

const ClaimableDocument = require("../../../../../shared/models/ClaimableDocument");
const Fee = require("../../../../../shared/models/Fee");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const ClaimableDocumentAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/claimableDocumentAuditHelper");

// Mock ClaimableDocumentAuditHelper methods
ClaimableDocumentAuditHelper.logCreated = jest.fn().mockResolvedValue();
ClaimableDocumentAuditHelper.logUpdated = jest.fn().mockResolvedValue();
ClaimableDocumentAuditHelper.logPublished = jest.fn().mockResolvedValue();
ClaimableDocumentAuditHelper.logDisabled = jest.fn().mockResolvedValue();

// Mock getUserInfo
getUserInfo.mockResolvedValue({
  _id: "507f1f77bcf86cd799439011",
  email: "admin@example.com",
  role: "admin",
});

describe("ClaimableDocumentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all documents when no filters provided", async () => {
      const mockDocuments = [
        {
          name: "Document 1",
          _id: "1",
          feeId: null,
          toObject: () => ({ name: "Document 1", _id: "1", feeId: null }),
        },
        {
          name: "Document 2",
          _id: "2",
          feeId: null,
          toObject: () => ({ name: "Document 2", _id: "2", feeId: null }),
        },
      ];
      ClaimableDocument.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockDocuments),
      });
      Fee.find.mockResolvedValue([]);

      const result = await ClaimableDocumentService.list({});

      expect(ClaimableDocument.find).toHaveBeenCalledWith({
        isDraft: { $ne: true },
      });
      expect(result).toBeDefined();
    });

    it("should filter by category", async () => {
      const mockDocuments = [
        {
          name: "Document 1",
          _id: "1",
          feeId: null,
          toObject: () => ({ name: "Document 1", _id: "1", feeId: null }),
        },
      ];
      ClaimableDocument.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockDocuments),
      });
      Fee.find.mockResolvedValue([]);

      await ClaimableDocumentService.list({ category: "permit" });

      expect(ClaimableDocument.find).toHaveBeenCalledWith({
        isDraft: { $ne: true },
        category: "permit",
      });
    });

    it("should filter by isActive", async () => {
      const mockDocuments = [
        {
          name: "Document 1",
          _id: "1",
          feeId: null,
          toObject: () => ({ name: "Document 1", _id: "1", feeId: null }),
        },
      ];
      ClaimableDocument.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockDocuments),
      });
      Fee.find.mockResolvedValue([]);

      await ClaimableDocumentService.list({ isActive: "true" });

      expect(ClaimableDocument.find).toHaveBeenCalledWith({
        isDraft: { $ne: true },
        isActive: true,
      });
    });
  });

  describe("getById", () => {
    it("should throw error for invalid ID", async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null),
      };
      ClaimableDocument.findById.mockReturnValue(mockQuery);

      await expect(
        ClaimableDocumentService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Document not found");
      await expect(
        ClaimableDocumentService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        ClaimableDocumentService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });
  });

  describe("create", () => {
    it("should validate missing name", async () => {
      const data = {
        description: "Test description",
      };

      await expect(
        ClaimableDocumentService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should create with valid data", async () => {
      const data = {
        name: "Test Document",
        description: "Test description",
      };

      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);
      ClaimableDocument.create.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        ...data,
      });

      const result = await ClaimableDocumentService.create(data, "userId", {});

      expect(ClaimableDocument.create).toHaveBeenCalled();
    });

    it("should validate duplicate name across entity types", async () => {
      const data = {
        name: "Test Entity",
        description: "Test description",
      };

      PostRequirement.findOne.mockResolvedValue({ name: "Test Entity" });

      await expect(
        ClaimableDocumentService.create(data, "userId", {}),
      ).rejects.toThrow("Name already exists in PostRequirement");
    });
  });

  describe("update", () => {
    it("should update name field", async () => {
      const mockDocument = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Document",
        description: "Test description",
        save: jest.fn().mockResolvedValue({}),
      };

      ClaimableDocument.findById.mockResolvedValue(mockDocument);

      const result = await ClaimableDocumentService.update(
        "507f1f77bcf86cd799439011",
        { name: "Updated Document" },
        "userId",
        {},
      );

      expect(mockDocument.save).toHaveBeenCalled();
    });

    it("should update notes field", async () => {
      const mockDocument = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Document",
        notes: "Test notes",
        save: jest.fn().mockResolvedValue({}),
      };

      ClaimableDocument.findById.mockResolvedValue(mockDocument);

      const result = await ClaimableDocumentService.update(
        "507f1f77bcf86cd799439011",
        { notes: "Updated notes" },
        "userId",
        {},
      );

      expect(mockDocument.save).toHaveBeenCalled();
    });

    it("should update isActive field", async () => {
      const mockDocument = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Document",
        description: "Test description",
        isActive: true,
        save: jest.fn().mockResolvedValue({}),
      };

      ClaimableDocument.findById.mockResolvedValue(mockDocument);

      const result = await ClaimableDocumentService.update(
        "507f1f77bcf86cd799439011",
        { isActive: false },
        "userId",
        {},
      );

      expect(mockDocument.save).toHaveBeenCalled();
    });

    it("should increment version with changes", async () => {
      const mockDocument = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Document",
        description: "Test description",
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.name = "Updated Document";
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      ClaimableDocument.findById.mockResolvedValue(mockDocument);

      const result = await ClaimableDocumentService.update(
        "507f1f77bcf86cd799439011",
        { name: "Updated Document" },
        "userId",
        {},
      );

      expect(mockDocument.version).toBe(2);
    });
  });

  describe("publishDraft", () => {
    it("should publish document", async () => {
      const mockDraft = {
        _id: "draft123",
        name: "Test Document",
        description: "Test description",
        isDraft: true,
        version: 1,
        save: jest.fn().mockResolvedValue({}),
      };

      const mockOriginal = {
        _id: "507f1f77bcf86cd799439011",
        name: "Original Document",
        description: "Original description",
        isDraft: false,
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.name = mockDraft.name;
          this.description = mockDraft.description;
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      ClaimableDocument.findOne.mockResolvedValue(mockDraft);
      ClaimableDocument.findById.mockResolvedValue(mockOriginal);

      const result = await ClaimableDocumentService.publishDraft(
        "507f1f77bcf86cd799439011",
        "userId",
        {},
      );

      expect(mockOriginal.save).toHaveBeenCalled();
    });
  });

  describe("disable", () => {
    it("should disable document", async () => {
      const mockDocument = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Document",
        notes: "Test notes",
        isActive: true,
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.isActive = false;
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      ClaimableDocument.findById.mockResolvedValue(mockDocument);

      const result = await ClaimableDocumentService.disable(
        "507f1f77bcf86cd799439011",
        "userId",
        {},
      );

      expect(mockDocument.isActive).toBe(false);
    });
  });
});
