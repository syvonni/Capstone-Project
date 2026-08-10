const PostRequirementPerformanceService = require("../../../../services/business-service/src/services/admin/postRequirementPerformance.service");

// Mock the dependencies
jest.mock(
  "../../../../services/business-service/src/lib/performanceHelpers/postRequirementPerformanceHelper",
);

const PostRequirementPerformanceHelper = require("../../../../services/business-service/src/lib/performanceHelpers/postRequirementPerformanceHelper");

describe("PostRequirementPerformanceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPerformanceSummary", () => {
    it("should return performance summary for post requirements", async () => {
      const mockResult = {
        avgResponseTime: 145,
        errorRate: 0.02,
        errorCount: 2,
        requestCount: 100,
        operations: [
          {
            operation: "GET",
            endpoint: "/api/business/admin/post-requirements",
            avgResponseTime: 120,
            count: 50,
          },
        ],
        slowestOperations: [
          {
            operation: "POST",
            responseTime: 300,
            endpoint: "/api/business/admin/post-requirements",
          },
        ],
        status: "good",
      };

      PostRequirementPerformanceHelper.getPerformanceSummary = jest.fn().mockResolvedValue(mockResult);

      const result = await PostRequirementPerformanceService.getPerformanceSummary("24h");

      expect(PostRequirementPerformanceHelper.getPerformanceSummary).toHaveBeenCalledWith("24h");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should return performance metrics for post requirements", async () => {
      const mockResult = {
        avgResponseTime: 150,
        errorRate: 0.01,
        errorCount: 1,
        requestCount: 50,
      };

      PostRequirementPerformanceHelper.getPerformanceMetrics = jest.fn().mockResolvedValue(mockResult);

      const result = await PostRequirementPerformanceService.getPerformanceMetrics("7d");

      expect(PostRequirementPerformanceHelper.getPerformanceMetrics).toHaveBeenCalledWith("7d");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getMetricsByOperation", () => {
    it("should return performance metrics by operation", async () => {
      const mockResult = [
        {
          operation: "GET",
          avgResponseTime: 120,
          count: 50,
        },
        {
          operation: "POST",
          avgResponseTime: 200,
          count: 25,
        },
      ];

      PostRequirementPerformanceHelper.getMetricsByOperation = jest.fn().mockResolvedValue(mockResult);

      const result = await PostRequirementPerformanceService.getMetricsByOperation("24h");

      expect(PostRequirementPerformanceHelper.getMetricsByOperation).toHaveBeenCalledWith("24h");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getSlowestOperations", () => {
    it("should return slowest operations", async () => {
      const mockResult = [
        {
          operation: "POST",
          responseTime: 300,
          endpoint: "/api/business/admin/post-requirements",
        },
        {
          operation: "PUT",
          responseTime: 250,
          endpoint: "/api/business/admin/post-requirements/123",
        },
      ];

      PostRequirementPerformanceHelper.getSlowestOperations = jest.fn().mockResolvedValue(mockResult);

      const result = await PostRequirementPerformanceService.getSlowestOperations(10, "24h");

      expect(PostRequirementPerformanceHelper.getSlowestOperations).toHaveBeenCalledWith(10, "24h");
      expect(result).toEqual(mockResult);
    });
  });
});
