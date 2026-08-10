const ViolationPerformanceService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/violationPerformance.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/performanceHelpers/violationPerformanceHelper",
);

const ViolationPerformanceHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/performanceHelpers/violationPerformanceHelper");

describe("ViolationPerformanceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPerformanceSummary", () => {
    it("should return performance summary for violations", async () => {
      const mockResult = {
        avgResponseTime: 145,
        errorRate: 0.02,
        errorCount: 2,
        requestCount: 100,
        operations: [
          {
            operation: "GET",
            endpoint: "/api/business/admin/violations",
            avgResponseTime: 120,
            count: 50,
          },
        ],
        slowestOperations: [
          {
            operation: "POST",
            responseTime: 300,
            endpoint: "/api/business/admin/violations",
          },
        ],
        status: "good",
      };

      ViolationPerformanceHelper.getPerformanceSummary = jest.fn().mockResolvedValue(mockResult);

      const result = await ViolationPerformanceService.getPerformanceSummary("24h");

      expect(ViolationPerformanceHelper.getPerformanceSummary).toHaveBeenCalledWith("24h");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getViolationPerformance", () => {
    it("should return performance metrics for a specific violation", async () => {
      const mockResult = {
        avgResponseTime: 150,
        errorRate: 0.01,
        errorCount: 1,
        requestCount: 50,
        operations: [],
        slowestOperations: [],
        status: "good",
      };

      ViolationPerformanceHelper.getViolationPerformance = jest.fn().mockResolvedValue(mockResult);

      const result = await ViolationPerformanceService.getViolationPerformance("violationId123", "7d");

      expect(ViolationPerformanceHelper.getViolationPerformance).toHaveBeenCalledWith("violationId123", "7d");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getMetrics", () => {
    it("should return performance metrics with filters", async () => {
      const mockResult = {
        avgResponseTime: 200,
        errorRate: 0.03,
        errorCount: 3,
        requestCount: 100,
      };

      ViolationPerformanceHelper.getMetrics = jest.fn().mockResolvedValue(mockResult);

      const filters = { operation: "GET", timeRange: "1h" };
      const result = await ViolationPerformanceService.getMetrics(filters);

      expect(ViolationPerformanceHelper.getMetrics).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResult);
    });
  });
});