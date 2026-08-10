const ViolationDataQualityService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/violationDataQuality.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/dataQualityHelpers/violationDataQualityHelper",
);

const ViolationDataQualityHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/dataQualityHelpers/violationDataQualityHelper");

describe("ViolationDataQualityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateAllViolations", () => {
    it("should return data quality issues for all violations", async () => {
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

      ViolationDataQualityHelper.validateAllViolations = jest.fn().mockResolvedValue(mockResult);

      const result = await ViolationDataQualityService.validateAllViolations();

      expect(ViolationDataQualityHelper.validateAllViolations).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should handle empty violations list", async () => {
      const mockResult = {
        issues: [],
        totalEntities: 0,
        totalIssues: 0,
      };

      ViolationDataQualityHelper.validateAllViolations = jest.fn().mockResolvedValue(mockResult);

      const result = await ViolationDataQualityService.validateAllViolations();

      expect(result).toEqual(mockResult);
    });
  });

  describe("validateViolation", () => {
    it("should return data quality issues for a single violation", async () => {
      const mockResult = {
        issues: [
          {
            type: "missing_severity",
            label: "Missing Severity",
            severity: "critical",
          },
        ],
      };

      ViolationDataQualityHelper.validateViolation = jest.fn().mockResolvedValue(mockResult);

      const result = await ViolationDataQualityService.validateViolation("violationId123");

      expect(ViolationDataQualityHelper.validateViolation).toHaveBeenCalledWith("violationId123");
      expect(result).toEqual(mockResult);
    });

    it("should handle violation not found error", async () => {
      const error = new Error("Violation not found");
      error.code = "NOT_FOUND";
      error.status = 404;

      ViolationDataQualityHelper.validateViolation = jest.fn().mockRejectedValue(error);

      await expect(ViolationDataQualityService.validateViolation("invalidId")).rejects.toThrow("Violation not found");
    });
  });
});