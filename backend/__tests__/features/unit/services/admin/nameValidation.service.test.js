const NameValidationService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/nameValidation.service");

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

const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Fee = require("../../../../../shared/models/Fee");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const ClaimableDocument = require("../../../../../shared/models/ClaimableDocument");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");

describe("NameValidationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateName", () => {
    it("should return valid when name is empty", async () => {
      const result = await NameValidationService.validateName("", "Fee", null);

      expect(result.valid).toBe(true);
      expect(result.conflicts).toEqual([]);
    });

    it("should return valid when name is whitespace only", async () => {
      const result = await NameValidationService.validateName(
        "   ",
        "Fee",
        null,
      );

      expect(result.valid).toBe(true);
      expect(result.conflicts).toEqual([]);
    });

    it("should return valid when no conflicts exist", async () => {
      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      const result = await NameValidationService.validateName(
        "Test Name",
        "Fee",
        null,
      );

      expect(result.valid).toBe(true);
      expect(result.conflicts).toEqual([]);
    });

    it("should detect conflict in PostRequirement", async () => {
      PostRequirement.findOne.mockResolvedValue({
        name: "Test Name",
        _id: "123",
      });
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      const result = await NameValidationService.validateName(
        "Test Name",
        "Fee",
        null,
      );

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].entityType).toBe("PostRequirement");
    });

    it("should detect conflict in Violation", async () => {
      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue({ name: "Test Name", _id: "456" });
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      const result = await NameValidationService.validateName(
        "Test Name",
        "Fee",
        null,
      );

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].entityType).toBe("Violation");
    });

    it("should detect multiple conflicts", async () => {
      PostRequirement.findOne.mockResolvedValue({
        name: "Test Name",
        _id: "123",
      });
      Violation.findOne.mockResolvedValue({ name: "Test Name", _id: "456" });
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      const result = await NameValidationService.validateName(
        "Test Name",
        "Fee",
        null,
      );

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(2);
    });

    it("should exclude current entity when excludeId is provided", async () => {
      PostRequirement.findOne.mockImplementation((query) => {
        if (query._id && query._id.$ne) {
          return null; // Exclude the current entity
        }
        return { name: "Test Name", _id: "507f1f77bcf86cd799439011" };
      });
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      const result = await NameValidationService.validateName(
        "Test Name",
        "PostRequirement",
        "507f1f77bcf86cd799439011",
      );

      expect(result.valid).toBe(true);
      expect(result.conflicts).toEqual([]);
    });

    it("should trim whitespace from name", async () => {
      PostRequirement.findOne.mockResolvedValue({
        name: "Test Name",
        _id: "123",
      });
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      const result = await NameValidationService.validateName(
        "  Test Name  ",
        "Fee",
        null,
      );

      expect(result.valid).toBe(false);
      expect(result.conflicts[0].name).toBe("Test Name");
    });
  });
});
