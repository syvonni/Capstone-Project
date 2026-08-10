const InspectionItemPerformanceService = require("../../../../services/business-service/src/services/admin/inspectionItemPerformance.service");

// Mock the dependencies
jest.mock(
  "../../../../services/business-service/src/lib/performanceHelpers/inspectionItemPerformanceHelper",
);

const InspectionItemPerformanceHelper = require("../../../../services/business-service/src/lib/performanceHelpers/inspectionItemPerformanceHelper");

describe("InspectionItemPerformanceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPerformanceSummary", () => {
    it("should return performance summary for inspection items", async () => {
      const mockResult = {
        avgResponseTime: 145,
        errorRate: 0.02,
        errorCount: 2,
        requestCount: 100,
        operations: [
          {
            operation: "GET",
            endpoint: "/api/business/admin/inspection-items",
            avgResponseTime: 120,
            count: 50,
          },
        ],
        slowestOperations: [
          {
            operation: "POST",
            responseTime: 300,
            endpoint: "/api/business/admin/inspection-items",
          },
        ],
        status: "good",
      };

      InspectionItemPerformanceHelper.getPerformanceSummary = jest.fn().mockResolvedValue(mockResult);

      const result = await InspectionItemPerformanceService.getPerformanceSummary("24h");

      expect(InspectionItemPerformanceHelper.getPerformanceSummary).toHaveBeenCalledWith("24h");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should return performance metrics for inspection items", async () => {
      const mockResult = {
        avgResponseTime: 150,
        errorRate: 0.01,
        errorCount: 1,
        requestCount: 50,
      };

      InspectionItemPerformanceHelper.getPerformanceMetrics = jest.fn().mockResolvedValue(mockResult);

      const result = await InspectionItemPerformanceService.getPerformanceMetrics("7d");

      expect(InspectionItemPerformanceHelper.getPerformanceMetrics).toHaveBeenCalledWith("7d");
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

      InspectionItemPerformanceHelper.getMetricsByOperation = jest.fn().mockResolvedValue(mockResult);

      const result = await InspectionItemPerformanceService.getMetricsByOperation("24h");

      expect(InspectionItemPerformanceHelper.getMetricsByOperation).toHaveBeenCalledWith("24h");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getSlowestOperations", () => {
    it("should return slowest operations", async () => {
      const mockResult = [
        {
          operation: "POST",
          responseTime: 300,
          endpoint: "/api/business/admin/inspection-items",
        },
        {
          operation: "PUT",
          responseTime: 250,
          endpoint: "/api/business/admin/inspection-items/123",
        },
      ];

      InspectionItemPerformanceHelper.getSlowestOperations = jest.fn().mockResolvedValue(mockResult);

      const result = await InspectionItemPerformanceService.getSlowestOperations(10, "24h");

      expect(InspectionItemPerformanceHelper.getSlowestOperations).toHaveBeenCalledWith(10, "24h");
      expect(result).toEqual(mockResult);
    });
  });
});
