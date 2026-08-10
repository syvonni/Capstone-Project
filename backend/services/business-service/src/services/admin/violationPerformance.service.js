const ViolationPerformanceHelper = require("../../lib/performanceHelpers/violationPerformanceHelper");

class ViolationPerformanceService {
  /**
   * Get performance summary for all violations
   */
  async getPerformanceSummary(timeRange = "24h") {
    return await ViolationPerformanceHelper.getPerformanceSummary(timeRange);
  }

  /**
   * Get performance metrics for a specific violation
   */
  async getViolationPerformance(id, timeRange = "24h") {
    return await ViolationPerformanceHelper.getViolationPerformance(id, timeRange);
  }

  /**
   * Get performance metrics with filters
   */
  async getMetrics(filters) {
    return await ViolationPerformanceHelper.getMetrics(filters);
  }
}

module.exports = new ViolationPerformanceService();