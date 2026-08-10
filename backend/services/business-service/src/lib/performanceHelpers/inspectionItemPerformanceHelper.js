/**
 * Inspection Item Performance Helper
 *
 * PURPOSE: Provides centralized performance monitoring for InspectionItem entities using the generic performance infrastructure.
 * This follows the SOLID principles by separating performance logic from route handlers and using
 * the generic performance monitor for consistent monitoring.
 *
 * USAGE EXAMPLE:
 * const { InspectionItemPerformanceHelper } = require('../lib/performanceHelpers/inspectionItemPerformanceHelper');
 * const metrics = await InspectionItemPerformanceHelper.getPerformanceMetrics('24h');
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
 * Inspection Item Performance Helper Class
 *
 * Provides static methods for monitoring inspection item performance
 */
class InspectionItemPerformanceHelper {
  /**
   * Gets aggregated performance metrics for inspection items
   *
   * USAGE:
   * await InspectionItemPerformanceHelper.getPerformanceMetrics('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Object with aggregated metrics
   */
  static async getPerformanceMetrics(timeRange = "24h") {
    return await getAggregatedMetrics("inspectionItem", timeRange);
  }

  /**
   * Gets performance metrics broken down by operation
   *
   * USAGE:
   * await InspectionItemPerformanceHelper.getMetricsByOperation('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of metrics grouped by operation
   */
  static async getMetricsByOperation(timeRange = "24h") {
    return await getMetricsByOperation("inspectionItem", timeRange);
  }

  /**
   * Gets the slowest inspection item operations
   *
   * USAGE:
   * await InspectionItemPerformanceHelper.getSlowestOperations(10, '24h')
   *
   * @param {number} limit - Maximum number of results
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of slowest operations
   */
  static async getSlowestOperations(limit = 10, timeRange = "24h") {
    return await getSlowestOperations("inspectionItem", limit, timeRange);
  }

  /**
   * Gets errors grouped by type
   *
   * USAGE:
   * await InspectionItemPerformanceHelper.getErrorsByType('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of error groups
   */
  static async getErrorsByType(timeRange = "24h") {
    return await getErrorsByType("inspectionItem", timeRange);
  }

  /**
   * Gets performance summary formatted for display in stats panel
   *
   * USAGE:
   * await InspectionItemPerformanceHelper.getPerformanceSummary('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<object>} - Formatted performance summary
   */
  static async getPerformanceSummary(timeRange = "24h") {
    const metrics = await this.getPerformanceMetrics(timeRange);
    const byOperation = await this.getMetricsByOperation(timeRange);
    const slowest = await this.getSlowestOperations(5, timeRange);
    const errorDetails = await this.getErrorsByType(timeRange);

    const status = calculateStatus("inspectionItem", {
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

module.exports = InspectionItemPerformanceHelper;
