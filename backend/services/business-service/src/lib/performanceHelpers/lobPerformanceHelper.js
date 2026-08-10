/**
 * LOB Performance Helper
 *
 * PURPOSE: Provides centralized performance metrics calculation for LOB entities using the generic performance infrastructure.
 * This follows the SOLID principles by separating performance logic from route handlers and using
 * the generic performance monitor for consistent metrics collection.
 *
 * USAGE EXAMPLE:
 * const { LobPerformanceHelper } = require('../lib/performanceHelpers/lobPerformanceHelper');
 * const result = await LobPerformanceHelper.getPerformanceSummary('24h');
 * // Returns: { avgResponseTime: 150, errorRate: 0.02, requestCount: 1000, ... }
 */

const {
  getAggregatedMetrics,
  getErrorsByType,
} = require("../../../../../shared/lib/performanceMonitor");
const PerformanceMetric = require("../../models/PerformanceMetric");

/**
 * LOB Performance Helper Class
 *
 * Provides static methods for calculating LOB performance metrics
 */
class LobPerformanceHelper {
  /**
   * Gets performance summary for all LOBs
   *
   * USAGE:
   * await LobPerformanceHelper.getPerformanceSummary('24h')
   *
   * @param {string} timeRange - Time range for metrics (e.g., '24h', '7d', '30d')
   * @returns {Promise<object>} - Object with performance metrics
   */
  static async getPerformanceSummary(timeRange = "24h") {
    const metrics = await getAggregatedMetrics("lob", timeRange);
    const errorDetails = await this.getErrorsByType(timeRange);
    
    return {
      ...metrics,
      errorDetails,
    };
  }

  /**
   * Gets errors grouped by type
   *
   * USAGE:
   * await LobPerformanceHelper.getErrorsByType('24h')
   *
   * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>} - Array of error groups
   */
  static async getErrorsByType(timeRange = "24h") {
    return await getErrorsByType("lob", timeRange);
  }

  /**
   * Gets performance metrics for a specific LOB
   *
   * USAGE:
   * await LobPerformanceHelper.getPerformanceById(lobId, '24h')
   *
   * @param {string} lobId - The ID of the LOB
   * @param {string} timeRange - Time range for metrics (e.g., '24h', '7d', '30d')
   * @returns {Promise<object>} - Object with performance metrics
   */
  static async getPerformanceById(lobId, timeRange = "24h") {
    const metrics = await getAggregatedMetrics("lob", timeRange, { entityId: lobId });
    return metrics;
  }
}

module.exports = LobPerformanceHelper;
