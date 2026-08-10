const InspectionItemPerformanceHelper = require("../../lib/performanceHelpers/inspectionItemPerformanceHelper");

class InspectionItemPerformanceService {
  /**
   * Get performance summary for all inspection items
   */
  async getPerformanceSummary(timeRange = "24h") {
    return await InspectionItemPerformanceHelper.getPerformanceSummary(timeRange);
  }

  /**
   * Get performance metrics for all inspection items
   */
  async getPerformanceMetrics(timeRange = "24h") {
    return await InspectionItemPerformanceHelper.getPerformanceMetrics(timeRange);
  }

  /**
   * Get performance metrics by operation for all inspection items
   */
  async getMetricsByOperation(timeRange = "24h") {
    return await InspectionItemPerformanceHelper.getMetricsByOperation(timeRange);
  }

  /**
   * Get slowest operations for inspection items
   */
  async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await InspectionItemPerformanceHelper.getSlowestOperations(limit, timeRange);
  }
}

module.exports = new InspectionItemPerformanceService();
