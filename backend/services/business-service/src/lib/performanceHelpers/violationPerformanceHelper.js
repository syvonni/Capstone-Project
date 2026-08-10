/**
 * Violation Performance Helper
 *
 * PURPOSE: Provides centralized performance monitoring for Violation entities using the generic performance infrastructure.
 * This follows the SOLID principles by separating performance logic from route handlers and using
 * the generic performance monitor for consistent monitoring.
 *
 * USAGE EXAMPLE:
 * const { ViolationPerformanceHelper } = require('../lib/performanceHelpers/violationPerformanceHelper');
 * const metrics = await ViolationPerformanceHelper.getPerformanceMetrics('24h');
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
 * Violation Performance Helper Class
 *
 * Provides static methods for monitoring violation performance
 */
class ViolationPerformanceHelper {
  /**
   * Gets aggregated performance metrics for violations
   *
   * USAGE:
   * await ViolationPerformanceHelper.getPerformanceMetrics('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Object with aggregated metrics
   */
  static async getPerformanceMetrics(timeRange = "24h") {
    return await getAggregatedMetrics("violation", timeRange);
  }

  /**
   * Gets performance metrics broken down by operation
   *
   * USAGE:
   * await ViolationPerformanceHelper.getMetricsByOperation('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of metrics grouped by operation
   */
  static async getMetricsByOperation(timeRange = "24h") {
    return await getMetricsByOperation("violation", timeRange);
  }

  /**
   * Gets the slowest violation operations
   *
   * USAGE:
   * await ViolationPerformanceHelper.getSlowestOperations(10, '24h')
   *
   * @param {number} limit - Maximum number of results
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of slowest operations
   */
  static async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await getSlowestOperations("violation", limit, timeRange);
  }

  /**
   * Gets errors grouped by type
   *
   * USAGE:
   * await ViolationPerformanceHelper.getErrorsByType('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of error groups
   */
  static async getErrorsByType(timeRange = "24h") {
    return await getErrorsByType("violation", timeRange);
  }

  /**
   * Gets performance summary formatted for display in stats panel
   *
   * USAGE:
   * await ViolationPerformanceHelper.getPerformanceSummary('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Formatted performance summary
   */
  static async getPerformanceSummary(timeRange = "24h") {
    const metrics = await this.getPerformanceMetrics(timeRange);
    const byOperation = await this.getMetricsByOperation(timeRange);
    const slowest = await this.getSlowestOperations(5, timeRange);
    const errorDetails = await this.getErrorsByType(timeRange);

    const status = calculateStatus("violation", {
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

  /**
   * Gets performance metrics for a specific violation
   *
   * USAGE:
   * await ViolationPerformanceHelper.getViolationPerformance(violationId, '24h')
   *
   * @param {string} violationId - The ID of the violation
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Object with performance metrics for the specific violation
   */
  static async getViolationPerformance(violationId, timeRange = "24h") {
    // For entity-specific performance, we would need to implement entity-specific tracking
    // For now, return the overall violation performance metrics
    return await this.getPerformanceSummary(timeRange);
  }
}

module.exports = ViolationPerformanceHelper;