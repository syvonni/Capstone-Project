const LobDataQualityService = require("../../../../../services/business-service/src/services/admin/lobDataQuality.service");

// Mock the dependencies
jest.mock(
  "../../../../../services/business-service/src/lib/dataQualityHelpers/lobDataQualityHelper",
);

const LobDataQualityHelper = require("../../../../../services/business-service/src/lib/dataQualityHelpers/lobDataQualityHelper");

describe("LobDataQualityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateAllLobs", () => {
    it("should return data quality issues for all LOBs", async () => {
      LobDataQualityHelper.validateAllLobs.mockResolvedValue({
        issues: [{ type: "missing_name", severity: "high" }],
        totalEntities: 5,
        totalIssues: 1,
      });

      const result = await LobDataQualityService.validateAllLobs();

      expect(result).toHaveProperty("issues");
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result).toHaveProperty("totalEntities");
      expect(result).toHaveProperty("totalIssues");
    });

    it("should handle empty LOB collection", async () => {
      LobDataQualityHelper.validateAllLobs.mockResolvedValue({
        totalEntities: 0,
        issues: [],
      });

      const result = await LobDataQualityService.validateAllLobs();

      expect(result.totalEntities).toBe(0);
      expect(result.issues).toEqual([]);
    });
  });

  describe("validateLob", () => {
    it("should return data quality issues for a specific LOB", async () => {
      LobDataQualityHelper.validateLob.mockResolvedValue({
        issues: [],
      });

      const result = await LobDataQualityService.validateLob(
        "507f1f77bcf86cd799439011",
      );

      expect(result).toEqual({ issues: [] });
      expect(LobDataQualityHelper.validateLob).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
    });

    it("should throw error for non-existent LOB", async () => {
      LobDataQualityHelper.validateLob.mockRejectedValue(
        new Error("LOB not found"),
      );

      await expect(
        LobDataQualityService.validateLob("nonexistent-id"),
      ).rejects.toThrow("LOB not found");
    });
  });
});
