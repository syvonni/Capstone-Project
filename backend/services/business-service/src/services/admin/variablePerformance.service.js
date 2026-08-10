const VariablePerformanceHelper = require("../../lib/performanceHelpers/variablePerformanceHelper");

class VariablePerformanceService {
  /**
   * Get performance summary for all variables
   */
  async getPerformanceSummary(timeRange) {
    return await VariablePerformanceHelper.getPerformanceSummary(timeRange);
  }

  /**
   * Get performance metrics for a specific variable
   */
  async getVariablePerformance(id, timeRange) {
    return await VariablePerformanceHelper.getVariablePerformance(id, timeRange);
  }

  /**
   * Get performance metrics with filters
   */
  async getMetrics(filters) {
    return await VariablePerformanceHelper.getMetrics(filters);
  }
}

module.exports = new VariablePerformanceService();
