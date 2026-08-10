/**
 * Business Performance Service
 *
 * PURPOSE: Monitors business performance metrics using generic performance infrastructure.
 * Follows the same pattern as variablePerformanceHelper.
 *
 * USAGE EXAMPLE:
 * const businessPerformanceService = require('../services/lgu-officer/businessPerformance.service');
 * const metrics = await businessPerformanceService.getPerformanceSummary('24h');
 */

const {
  getAggregatedMetrics,
  getMetricsByOperation,
  getSlowestOperations,
} = require("../../../../../shared/lib/performanceMonitor");
const {
  calculateStatus,
} = require("../../../../../shared/lib/entityPerformanceConfig");

class BusinessPerformanceService {
  /**
   * Gets aggregated performance metrics for businesses
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Object with aggregated metrics
   */
  async getPerformanceMetrics(timeRange = "24h") {
    return await getAggregatedMetrics("business", timeRange);
  }

  /**
   * Gets performance metrics broken down by operation
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of metrics grouped by operation
   */
  async getMetricsByOperation(timeRange = "24h") {
    return await getMetricsByOperation("business", timeRange);
  }

  /**
   * Gets the slowest business operations
   *
   * @param {number} limit - Maximum number of results
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of slowest operations
   */
  async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await getSlowestOperations("business", limit, timeRange);
  }

  /**
   * Gets performance summary formatted for display in stats panel
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Formatted performance summary
   */
  async getPerformanceSummary(timeRange = "24h") {
    const metrics = await this.getPerformanceMetrics(timeRange);
    const byOperation = await this.getMetricsByOperation(timeRange);
    const slowest = await this.getSlowestOperations(5, timeRange);

    const status = calculateStatus("business", {
      avgResponseTime: metrics.avgResponseTime,
      errorRate: metrics.errorRate,
    });

    return {
      avgResponseTime: metrics.avgResponseTime,
      errorRate: metrics.errorRate,
      errorCount: metrics.errorCount,
      requestCount: metrics.requestCount,
      operations: byOperation,
      slowestOperations: slowest,
      status,
    };
  }
}

module.exports = new BusinessPerformanceService();
