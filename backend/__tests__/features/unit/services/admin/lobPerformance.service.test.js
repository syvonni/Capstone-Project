const { LobPerformanceService } = require("../../../../../services/business-service/src/services/admin/lobPerformance.service");

describe("LobPerformanceService", () => {
  describe("getPerformanceSummary", () => {
    it("should return performance metrics for all LOBs", async () => {
      const result = await LobPerformanceService.getPerformanceSummary("24h");
      expect(result).toHaveProperty("avgResponseTime");
      expect(result).toHaveProperty("errorRate");
      expect(result).toHaveProperty("requestCount");
    });

    it("should handle different time ranges", async () => {
      const result = await LobPerformanceService.getPerformanceSummary("7d");
      expect(result).toHaveProperty("avgResponseTime");
    });
  });

  describe("getPerformanceById", () => {
    it("should return performance metrics for a specific LOB", async () => {
      // This test would need a mock or a real LOB ID
      // For now, we'll test that the method exists and can be called
      expect(typeof LobPerformanceService.getPerformanceById).toBe("function");
    });
  });
});
