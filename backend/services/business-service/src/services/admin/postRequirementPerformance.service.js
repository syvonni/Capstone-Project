const PostRequirementPerformanceHelper = require("../../lib/performanceHelpers/postRequirementPerformanceHelper");

class PostRequirementPerformanceService {
  /**
   * Get performance summary for all post requirements
   */
  async getPerformanceSummary(timeRange = "24h") {
    return await PostRequirementPerformanceHelper.getPerformanceSummary(timeRange);
  }

  /**
   * Get performance metrics for all post requirements
   */
  async getPerformanceMetrics(timeRange = "24h") {
    return await PostRequirementPerformanceHelper.getPerformanceMetrics(timeRange);
  }

  /**
   * Get performance metrics by operation for all post requirements
   */
  async getMetricsByOperation(timeRange = "24h") {
    return await PostRequirementPerformanceHelper.getMetricsByOperation(timeRange);
  }

  /**
   * Get slowest operations for post requirements
   */
  async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await PostRequirementPerformanceHelper.getSlowestOperations(limit, timeRange);
  }
}

module.exports = new PostRequirementPerformanceService();
