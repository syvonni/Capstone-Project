const ChecklistDataQualityService = require("../../../../../services/business-service/src/services/admin/checklistDataQuality.service");

// Mock the dependencies
jest.mock(
  "../../../../../services/business-service/src/lib/dataQualityHelpers/checklistDataQualityHelper",
);

const ChecklistDataQualityHelper = require("../../../../../services/business-service/src/lib/dataQualityHelpers/checklistDataQualityHelper");

describe("ChecklistDataQualityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateAllChecklists", () => {
    it("should return data quality issues for all checklists", async () => {
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

      ChecklistDataQualityHelper.validateAllChecklists = jest.fn().mockResolvedValue(mockResult);

      const result = await ChecklistDataQualityService.validateAllChecklists();

      expect(ChecklistDataQualityHelper.validateAllChecklists).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should handle empty checklists list", async () => {
      const mockResult = {
        issues: [],
        totalEntities: 0,
        totalIssues: 0,
      };

      ChecklistDataQualityHelper.validateAllChecklists = jest.fn().mockResolvedValue(mockResult);

      const result = await ChecklistDataQualityService.validateAllChecklists();

      expect(result).toEqual(mockResult);
    });
  });

  describe("validateChecklist", () => {
    it("should return data quality issues for a single checklist", async () => {
      const mockResult = {
        issues: [
          {
            type: "missing_items",
            label: "Missing Items",
            severity: "critical",
          },
        ],
      };

      ChecklistDataQualityHelper.validateChecklist = jest.fn().mockResolvedValue(mockResult);

      const result = await ChecklistDataQualityService.validateChecklist("checklistId123");

      expect(ChecklistDataQualityHelper.validateChecklist).toHaveBeenCalledWith("checklistId123");
      expect(result).toEqual(mockResult);
    });

    it("should handle checklist not found error", async () => {
      const error = new Error("Checklist not found");
      error.code = "NOT_FOUND";
      error.status = 404;

      ChecklistDataQualityHelper.validateChecklist = jest.fn().mockRejectedValue(error);

      await expect(ChecklistDataQualityService.validateChecklist("invalidId")).rejects.toThrow("Checklist not found");
    });
  });
});
