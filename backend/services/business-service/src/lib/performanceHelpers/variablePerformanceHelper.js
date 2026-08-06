/**
 * Variable Performance Helper
 *
 * PURPOSE: Provides centralized performance monitoring for Variable entities using the generic performance infrastructure.
 * This follows the SOLID principles by separating performance logic from route handlers and using
 * the generic performance monitor for consistent monitoring.
 *
 * USAGE EXAMPLE:
 * const { VariablePerformanceHelper } = require('../lib/performanceHelpers/variablePerformanceHelper');
 * const metrics = await VariablePerformanceHelper.getPerformanceMetrics('24h');
 * // Returns: { avgResponseTime: 145, errorRate: 0.02, requestCount: 100, ... }
 */

const {
  getAggregatedMetrics,
  getMetricsByOperation,
  getSlowestOperations,
} = require("../../../../../shared/lib/performanceMonitor");
const { calculateStatus } = require("../../../../../shared/lib/entityPerformanceConfig");

/**
 * Variable Performance Helper Class
 *
 * Provides static methods for monitoring variable performance
 */
class VariablePerformanceHelper {
  /**
   * Gets aggregated performance metrics for variables
   *
   * USAGE:
   * await VariablePerformanceHelper.getPerformanceMetrics('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Object with aggregated metrics
   */
  static async getPerformanceMetrics(timeRange = "24h") {
    return await getAggregatedMetrics("variable", timeRange);
  }

  /**
   * Gets performance metrics broken down by operation
   *
   * USAGE:
   * await VariablePerformanceHelper.getMetricsByOperation('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of metrics grouped by operation
   */
  static async getMetricsByOperation(timeRange = "24h") {
    return await getMetricsByOperation("variable", timeRange);
  }

  /**
   * Gets the slowest variable operations
   *
   * USAGE:
   * await VariablePerformanceHelper.getSlowestOperations(10, '24h')
   *
   * @param {number} limit - Maximum number of results
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of slowest operations
   */
  static async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await getSlowestOperations("variable", limit, timeRange);
  }

  /**
   * Gets performance summary formatted for display in stats panel
   *
   * USAGE:
   * await VariablePerformanceHelper.getPerformanceSummary('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Formatted performance summary
   */
  static async getPerformanceSummary(timeRange = "24h") {
    const metrics = await this.getPerformanceMetrics(timeRange);
    const byOperation = await this.getMetricsByOperation(timeRange);
    const slowest = await this.getSlowestOperations(5, timeRange);

    const status = calculateStatus("variable", {
      avgResponseTime: metrics.avgResponseTime,
      errorRate: metrics.errorRate,
    });

    return {
      avgResponseTime: metrics.avgResponseTime,
      errorRate: metrics.errorRate,
      requestCount: metrics.requestCount,
      operations: byOperation,
      slowestOperations: slowest,
      status,
    };
  }
}

module.exports = VariablePerformanceHelper;
