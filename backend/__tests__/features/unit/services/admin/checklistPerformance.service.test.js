const ChecklistPerformanceService = require("../../../../services/business-service/src/services/admin/checklistPerformance.service");

// Mock the dependencies
jest.mock(
  "../../../../services/business-service/src/lib/performanceHelpers/checklistPerformanceHelper",
);

const ChecklistPerformanceHelper = require("../../../../services/business-service/src/lib/performanceHelpers/checklistPerformanceHelper");

describe("ChecklistPerformanceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPerformanceSummary", () => {
    it("should return performance summary for checklists", async () => {
      const mockResult = {
        avgResponseTime: 145,
        errorRate: 0.02,
        errorCount: 2,
        requestCount: 100,
        operations: [
          {
            operation: "GET",
            endpoint: "/api/business/admin/checklists",
            avgResponseTime: 120,
            count: 50,
          },
        ],
        slowestOperations: [
          {
            operation: "POST",
            responseTime: 300,
            endpoint: "/api/business/admin/checklists",
          },
        ],
        status: "good",
      };

      ChecklistPerformanceHelper.getPerformanceSummary = jest.fn().mockResolvedValue(mockResult);

      const result = await ChecklistPerformanceService.getPerformanceSummary("24h");

      expect(ChecklistPerformanceHelper.getPerformanceSummary).toHaveBeenCalledWith("24h");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should return performance metrics for checklists", async () => {
      const mockResult = {
        avgResponseTime: 150,
        errorRate: 0.01,
        errorCount: 1,
        requestCount: 50,
      };

      ChecklistPerformanceHelper.getPerformanceMetrics = jest.fn().mockResolvedValue(mockResult);

      const result = await ChecklistPerformanceService.getPerformanceMetrics("7d");

      expect(ChecklistPerformanceHelper.getPerformanceMetrics).toHaveBeenCalledWith("7d");
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

      ChecklistPerformanceHelper.getMetricsByOperation = jest.fn().mockResolvedValue(mockResult);

      const result = await ChecklistPerformanceService.getMetricsByOperation("24h");

      expect(ChecklistPerformanceHelper.getMetricsByOperation).toHaveBeenCalledWith("24h");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getSlowestOperations", () => {
    it("should return slowest operations", async () => {
      const mockResult = [
        {
          operation: "POST",
          responseTime: 300,
          endpoint: "/api/business/admin/checklists",
        },
        {
          operation: "PUT",
          responseTime: 250,
          endpoint: "/api/business/admin/checklists/123",
        },
      ];

      ChecklistPerformanceHelper.getSlowestOperations = jest.fn().mockResolvedValue(mockResult);

      const result = await ChecklistPerformanceService.getSlowestOperations(10, "24h");

      expect(ChecklistPerformanceHelper.getSlowestOperations).toHaveBeenCalledWith(10, "24h");
      expect(result).toEqual(mockResult);
    });
  });
});
