const InspectionItemDataQualityService = require("../../../../services/business-service/src/services/admin/inspectionItemDataQuality.service");

// Mock the dependencies
jest.mock(
  "../../../../services/business-service/src/lib/dataQualityHelpers/inspectionItemDataQualityHelper",
);

const InspectionItemDataQualityHelper = require("../../../../services/business-service/src/lib/dataQualityHelpers/inspectionItemDataQualityHelper");

describe("InspectionItemDataQualityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateAllInspectionItems", () => {
    it("should return data quality issues for all inspection items", async () => {
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

      InspectionItemDataQualityHelper.validateAllInspectionItems = jest.fn().mockResolvedValue(mockResult);

      const result = await InspectionItemDataQualityService.validateAllInspectionItems();

      expect(InspectionItemDataQualityHelper.validateAllInspectionItems).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should handle empty inspection items list", async () => {
      const mockResult = {
        issues: [],
        totalEntities: 0,
        totalIssues: 0,
      };

      InspectionItemDataQualityHelper.validateAllInspectionItems = jest.fn().mockResolvedValue(mockResult);

      const result = await InspectionItemDataQualityService.validateAllInspectionItems();

      expect(result).toEqual(mockResult);
    });
  });

  describe("validateInspectionItem", () => {
    it("should return data quality issues for a single inspection item", async () => {
      const mockResult = {
        issues: [
          {
            type: "missing_question",
            label: "Missing Question",
            severity: "critical",
          },
        ],
      };

      InspectionItemDataQualityHelper.validateInspectionItem = jest.fn().mockResolvedValue(mockResult);

      const result = await InspectionItemDataQualityService.validateInspectionItem("inspectionItemId123");

      expect(InspectionItemDataQualityHelper.validateInspectionItem).toHaveBeenCalledWith("inspectionItemId123");
      expect(result).toEqual(mockResult);
    });

    it("should handle inspection item not found error", async () => {
      const error = new Error("Inspection item not found");
      error.code = "NOT_FOUND";
      error.status = 404;

      InspectionItemDataQualityHelper.validateInspectionItem = jest.fn().mockRejectedValue(error);

      await expect(InspectionItemDataQualityService.validateInspectionItem("invalidId")).rejects.toThrow("Inspection item not found");
    });
  });
});
