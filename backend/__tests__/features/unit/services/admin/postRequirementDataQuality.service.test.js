const PostRequirementDataQualityService = require("../../../../../services/business-service/src/services/admin/postRequirementDataQuality.service");

// Mock the dependencies
jest.mock(
  "../../../../../services/business-service/src/lib/dataQualityHelpers/postRequirementDataQualityHelper",
);

const PostRequirementDataQualityHelper = require("../../../../../services/business-service/src/lib/dataQualityHelpers/postRequirementDataQualityHelper");

describe("PostRequirementDataQualityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateAllPostRequirements", () => {
    it("should return data quality issues for all post requirements", async () => {
      const mockResult = {
        issues: [
          {
            type: "missing_name",
            label: "Missing Name",
            severity: "critical",
            count: 2,
            entityIds: ["id1", "id2"],
          },
        ],
        totalEntities: 10,
        totalIssues: 2,
      };

      PostRequirementDataQualityHelper.validateAllPostRequirements = jest.fn().mockResolvedValue(mockResult);

      const result = await PostRequirementDataQualityService.validateAllPostRequirements();

      expect(PostRequirementDataQualityHelper.validateAllPostRequirements).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should handle empty post requirements list", async () => {
      const mockResult = {
        issues: [],
        totalEntities: 0,
        totalIssues: 0,
      };

      PostRequirementDataQualityHelper.validateAllPostRequirements = jest.fn().mockResolvedValue(mockResult);

      const result = await PostRequirementDataQualityService.validateAllPostRequirements();

      expect(result).toEqual(mockResult);
    });
  });

  describe("validatePostRequirement", () => {
    it("should return data quality issues for a single post requirement", async () => {
      const mockResult = {
        issues: [
          {
            type: "missing_code",
            label: "Missing Code",
            severity: "critical",
          },
        ],
      };

      PostRequirementDataQualityHelper.validatePostRequirement = jest.fn().mockResolvedValue(mockResult);

      const result = await PostRequirementDataQualityService.validatePostRequirement("postRequirementId123");

      expect(PostRequirementDataQualityHelper.validatePostRequirement).toHaveBeenCalledWith("postRequirementId123");
      expect(result).toEqual(mockResult);
    });

    it("should handle post requirement not found error", async () => {
      const error = new Error("Post requirement not found");
      error.code = "NOT_FOUND";
      error.status = 404;

      PostRequirementDataQualityHelper.validatePostRequirement = jest.fn().mockRejectedValue(error);

      await expect(PostRequirementDataQualityService.validatePostRequirement("invalidId")).rejects.toThrow("Post requirement not found");
    });
  });
});
