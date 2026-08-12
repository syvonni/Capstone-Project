const LobPerformanceService = require("../../../../../services/business-service/src/services/admin/lobPerformance.service");

// Mock the dependencies
jest.mock(
  "../../../../../services/business-service/src/lib/performanceHelpers/lobPerformanceHelper",
);

const LobPerformanceHelper = require("../../../../../services/business-service/src/lib/performanceHelpers/lobPerformanceHelper");

describe("LobPerformanceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPerformanceSummary", () => {
    it("should return performance metrics for all LOBs", async () => {
      LobPerformanceHelper.getPerformanceSummary.mockResolvedValue({
        avgResponseTime: 145,
        errorRate: 0.02,
        requestCount: 100,
      });

      const result = await LobPerformanceService.getPerformanceSummary("24h");

      expect(result).toHaveProperty("avgResponseTime");
      expect(result).toHaveProperty("errorRate");
      expect(result).toHaveProperty("requestCount");
      expect(LobPerformanceHelper.getPerformanceSummary).toHaveBeenCalledWith("24h");
    });

    it("should handle different time ranges", async () => {
      LobPerformanceHelper.getPerformanceSummary.mockResolvedValue({
        avgResponseTime: 200,
      });

      const result = await LobPerformanceService.getPerformanceSummary("7d");

      expect(result).toHaveProperty("avgResponseTime");
      expect(LobPerformanceHelper.getPerformanceSummary).toHaveBeenCalledWith("7d");
    });
  });

  describe("getPerformanceById", () => {
    it("should return performance metrics for a specific LOB", async () => {
      LobPerformanceHelper.getPerformanceById.mockResolvedValue({
        avgResponseTime: 100,
        errorRate: 0.01,
        requestCount: 50,
      });

      const result = await LobPerformanceService.getPerformanceById(
        "507f1f77bcf86cd799439011",
        "24h",
      );

      expect(result).toHaveProperty("avgResponseTime");
      expect(LobPerformanceHelper.getPerformanceById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        "24h",
      );
    });
  });
});
