const PostRequirementService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/postRequirement.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation",
);
jest.mock("../../../../../shared/models/Fee");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist",
);
jest.mock("../../../../../shared/models/ClaimableDocument");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/postRequirementAuditHelper",
);

const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Fee = require("../../../../../shared/models/Fee");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const ClaimableDocument = require("../../../../../shared/models/ClaimableDocument");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const PostRequirementAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/postRequirementAuditHelper");

// Mock PostRequirementAuditHelper methods
PostRequirementAuditHelper.logCreated = jest.fn().mockResolvedValue();
PostRequirementAuditHelper.logUpdated = jest.fn().mockResolvedValue();
PostRequirementAuditHelper.logDisabled = jest.fn().mockResolvedValue();

// Mock getUserInfo
getUserInfo.mockResolvedValue({
  _id: "507f1f77bcf86cd799439011",
  email: "admin@example.com",
  role: "admin",
});

describe("PostRequirementService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PostRequirement.findOne.mockResolvedValue(null);
    PostRequirement.create.mockResolvedValue({});
  });

  describe("list", () => {
    it("should return all post requirements when no filters provided", async () => {
      const mockPostRequirements = [
        { name: "Req 1", _id: "1" },
        { name: "Req 2", _id: "2" },
      ];
      PostRequirement.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockPostRequirements),
      });

      const result = await PostRequirementService.list({});

      expect(PostRequirement.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockPostRequirements);
      expect(result).toHaveLength(mockPostRequirements.length);
    });

    it("should filter by isActive", async () => {
      const mockPostRequirements = [{ name: "Req 1", _id: "1" }];
      PostRequirement.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockPostRequirements),
      });

      await PostRequirementService.list({ isActive: "true" });

      expect(PostRequirement.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe("getById", () => {
    it("should throw error for invalid ID", async () => {
      await expect(
        PostRequirementService.getById("invalid-id"),
      ).rejects.toThrow("Invalid post-requirement ID");
      await expect(
        PostRequirementService.getById("invalid-id"),
      ).rejects.toHaveProperty("code", "INVALID_ID");
      await expect(
        PostRequirementService.getById("invalid-id"),
      ).rejects.toHaveProperty("status", 400);
    });

    it("should throw error for non-existent post requirement", async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null),
      };
      PostRequirement.findById.mockReturnValue(mockQuery);

      await expect(
        PostRequirementService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Post-requirement not found");
      await expect(
        PostRequirementService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        PostRequirementService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });
  });

  describe("create", () => {
    it("should validate missing name", async () => {
      const data = {
        code: "TEST_REQ",
        description: "Test description",
      };

      await expect(
        PostRequirementService.create(data, "userId", {}),
      ).rejects.toThrow("Name is required");
    });

    it("should validate missing code", async () => {
      const data = {
        name: "Test Post Requirement",
        description: "Test description",
      };

      await expect(
        PostRequirementService.create(data, "userId", {}),
      ).rejects.toThrow("Code is required");
    });

    it("should validate duplicate code", async () => {
      const data = {
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
      };

      PostRequirement.findOne.mockResolvedValueOnce({ code: "TEST_REQ" });

      await expect(
        PostRequirementService.create(data, "userId", {}),
      ).rejects.toThrow("Post requirement with this code already exists");
    });

    it("should create with valid data", async () => {
      const data = {
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
      };

      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);
      PostRequirement.create.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        ...data,
        legalBasis: [],
      });

      const result = await PostRequirementService.create(data, "userId", {});

      expect(result).toBeDefined();
    });

    it("should validate duplicate name across entity types", async () => {
      const data = {
        name: "Test Entity",
        code: "TEST_REQ",
        description: "Test description",
      };

      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue({ name: "Test Entity" });

      await expect(
        PostRequirementService.create(data, "userId", {}),
      ).rejects.toThrow("Name already exists in Violation");
    });
  });

  describe("update", () => {
    it("should update description field", async () => {
      const mockPostReq = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
      };

      PostRequirement.findById.mockResolvedValue(mockPostReq);
      PostRequirement.findByIdAndUpdate.mockResolvedValue({
        ...mockPostReq,
        description: "Updated description",
      });

      await PostRequirementService.update(
        "507f1f77bcf86cd799439011",
        { description: "Updated description" },
        "userId",
        {},
      );

      expect(PostRequirement.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should update notes field", async () => {
      const mockPostReq = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
      };

      PostRequirement.findById.mockResolvedValue(mockPostReq);
      PostRequirement.findByIdAndUpdate.mockResolvedValue({
        ...mockPostReq,
        notes: "Updated notes",
      });

      await PostRequirementService.update(
        "507f1f77bcf86cd799439011",
        { notes: "Updated notes" },
        "userId",
        {},
      );

      expect(PostRequirement.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should update isActive field", async () => {
      const mockPostReq = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
      };

      PostRequirement.findById.mockResolvedValue(mockPostReq);
      PostRequirement.findByIdAndUpdate.mockResolvedValue({
        ...mockPostReq,
        isActive: false,
      });

      await PostRequirementService.update(
        "507f1f77bcf86cd799439011",
        { isActive: false },
        "userId",
        {},
      );

      expect(PostRequirement.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should increment version with changes", async () => {
      const mockPostReq = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        version: 1,
      };

      PostRequirement.findById.mockResolvedValue(mockPostReq);
      PostRequirement.findByIdAndUpdate.mockResolvedValue({
        ...mockPostReq,
        description: "Updated description",
        version: 2,
      });

      const result = await PostRequirementService.update(
        "507f1f77bcf86cd799439011",
        { description: "Updated description" },
        "userId",
        {},
      );

      expect(PostRequirement.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe("disable", () => {
    it("should check already-disabled", async () => {
      const mockPostReq = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: false,
      };

      PostRequirement.findById.mockResolvedValue(mockPostReq);

      await expect(
        PostRequirementService.disable(
          "507f1f77bcf86cd799439011",
          "userId",
          {},
        ),
      ).rejects.toThrow();
    });

    it("should increment version on disable", async () => {
      const mockPostReq = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Post Requirement",
        code: "TEST_REQ",
        description: "Test description",
        isActive: true,
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.isActive = false;
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      PostRequirement.findById.mockResolvedValue(mockPostReq);

      const result = await PostRequirementService.disable(
        "507f1f77bcf86cd799439011",
        "userId",
        {},
      );

      expect(mockPostReq.version).toBe(2);
    });
  });
});
