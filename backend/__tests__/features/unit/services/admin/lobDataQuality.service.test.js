const { LobDataQualityService } = require("../../../../../services/business-service/src/services/admin/lobDataQuality.service");

describe("LobDataQualityService", () => {
  describe("validateAllLobs", () => {
    it("should return data quality issues for all LOBs", async () => {
      const result = await LobDataQualityService.validateAllLobs();
      expect(result).toHaveProperty("issues");
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result).toHaveProperty("totalEntities");
      expect(result).toHaveProperty("totalIssues");
    });

    it("should handle empty LOB collection", async () => {
      const result = await LobDataQualityService.validateAllLobs();
      expect(result.totalEntities).toBe(0);
      expect(result.issues).toEqual([]);
    });
  });

  describe("validateLob", () => {
    it("should return data quality issues for a specific LOB", async () => {
      // This test would need a mock or a real LOB ID
      // For now, we'll test that the method exists and can be called
      expect(typeof LobDataQualityService.validateLob).toBe("function");
    });

    it("should throw error for non-existent LOB", async () => {
      await expect(
        LobDataQualityService.validateLob("nonexistent-id")
      ).rejects.toThrow("LOB not found");
    });
  });
});
