/**
 * Post Requirement Performance Helper
 *
 * PURPOSE: Provides centralized performance monitoring for PostRequirement entities using the generic performance infrastructure.
 * This follows the SOLID principles by separating performance logic from route handlers and using
 * the generic performance monitor for consistent monitoring.
 *
 * USAGE EXAMPLE:
 * const { PostRequirementPerformanceHelper } = require('../lib/performanceHelpers/postRequirementPerformanceHelper');
 * const metrics = await PostRequirementPerformanceHelper.getPerformanceMetrics('24h');
 * // Returns: { avgResponseTime: 145, errorRate: 0.02, requestCount: 100, ... }
 */

const {
  getAggregatedMetrics,
  getMetricsByOperation,
  getSlowestOperations,
  getErrorsByType,
} = require("../../../../../shared/lib/performanceMonitor");
const {
  calculateStatus,
} = require("../../../../../shared/lib/entityPerformanceConfig");

/**
 * Post Requirement Performance Helper Class
 *
 * Provides static methods for monitoring post requirement performance
 */
class PostRequirementPerformanceHelper {
  /**
   * Gets aggregated performance metrics for post requirements
   *
   * USAGE:
   * await PostRequirementPerformanceHelper.getPerformanceMetrics('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Object with aggregated metrics
   */
  static async getPerformanceMetrics(timeRange = "24h") {
    return await getAggregatedMetrics("postRequirement", timeRange);
  }

  /**
   * Gets performance metrics broken down by operation
   *
   * USAGE:
   * await PostRequirementPerformanceHelper.getMetricsByOperation('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of metrics grouped by operation
   */
  static async getMetricsByOperation(timeRange = "24h") {
    return await getMetricsByOperation("postRequirement", timeRange);
  }

  /**
   * Gets the slowest post requirement operations
   *
   * USAGE:
   * await PostRequirementPerformanceHelper.getSlowestOperations(10, '24h')
   *
   * @param {number} limit - Maximum number of results
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of slowest operations
   */
  static async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await getSlowestOperations("postRequirement", limit, timeRange);
  }

  /**
   * Gets errors grouped by type
   *
   * USAGE:
   * await PostRequirementPerformanceHelper.getErrorsByType('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of error groups
   */
  static async getErrorsByType(timeRange = "24h") {
    return await getErrorsByType("postRequirement", timeRange);
  }

  /**
   * Gets performance summary formatted for display in stats panel
   *
   * USAGE:
   * await PostRequirementPerformanceHelper.getPerformanceSummary('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Formatted performance summary
   */
  static async getPerformanceSummary(timeRange = "24h") {
    const metrics = await this.getPerformanceMetrics(timeRange);
    const byOperation = await this.getMetricsByOperation(timeRange);
    const slowest = await this.getSlowestOperations(5, timeRange);
    const errorDetails = await this.getErrorsByType(timeRange);

    const status = calculateStatus("postRequirement", {
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
      errorDetails,
      status,
    };
  }
}

module.exports = PostRequirementPerformanceHelper;
