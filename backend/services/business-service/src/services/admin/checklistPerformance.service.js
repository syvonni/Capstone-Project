const ChecklistPerformanceHelper = require("../../lib/performanceHelpers/checklistPerformanceHelper");

class ChecklistPerformanceService {
  /**
   * Get performance summary for all checklists
   */
  async getPerformanceSummary(timeRange = "24h") {
    return await ChecklistPerformanceHelper.getPerformanceSummary(timeRange);
  }

  /**
   * Get performance metrics for all checklists
   */
  async getPerformanceMetrics(timeRange = "24h") {
    return await ChecklistPerformanceHelper.getPerformanceMetrics(timeRange);
  }

  /**
   * Get performance metrics by operation for all checklists
   */
  async getMetricsByOperation(timeRange = "24h") {
    return await ChecklistPerformanceHelper.getMetricsByOperation(timeRange);
  }

  /**
   * Get slowest operations for checklists
   */
  async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await ChecklistPerformanceHelper.getSlowestOperations(limit, timeRange);
  }
}

module.exports = new ChecklistPerformanceService();
