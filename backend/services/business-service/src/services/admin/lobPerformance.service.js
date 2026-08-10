const LobPerformanceHelper = require("../../lib/performanceHelpers/lobPerformanceHelper");

class LobPerformanceService {
  /**
   * Get performance summary for all LOBs
   */
  async getPerformanceSummary(timeRange = "24h") {
    return await LobPerformanceHelper.getPerformanceSummary(timeRange);
  }

  /**
   * Get performance metrics for a specific LOB
   */
  async getPerformanceById(lobId, timeRange = "24h") {
    return await LobPerformanceHelper.getPerformanceById(lobId, timeRange);
  }
}

module.exports = new LobPerformanceService();
