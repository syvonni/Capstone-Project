/**
 * Performance Monitor
 *
 * PURPOSE: Generic performance monitoring system that records and aggregates
 * performance metrics for API operations. Uses the entity configuration from
 * entityPerformanceConfig.js to determine which entities and operations to track.
 *
 * USAGE EXAMPLE:
 * const { recordMetric, getAggregatedMetrics } = require('./performanceMonitor');
 * await recordMetric('variable', 'GET', 150, true, '/api/variables');
 * const metrics = await getAggregatedMetrics('variable', '1h');
 * // Returns: { avgResponseTime: 145, errorRate: 0.02, requestCount: 100 }
 */

const { getEntityConfig } = require("./entityPerformanceConfig");

/**
 * Records a performance metric
 *
 * USAGE:
 * recordMetric('variable', 'GET', 150, true, '/api/variables', userId)
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {string} operation - The HTTP operation (GET, POST, PUT, DELETE, PATCH)
 * @param {number} responseTime - Response time in milliseconds
 * @param {boolean} success - Whether the request was successful
 * @param {string} endpoint - The API endpoint path
 * @param {string} userId - Optional user ID who made the request
 * @returns {Promise<object>} - The saved metric document
 */
async function recordMetric(
  entityType,
  operation,
  responseTime,
  success,
  endpoint,
  userId = null,
) {
  const config = getEntityConfig(entityType);
  if (!config) {
    // If entity not configured, still record but log warning
    console.warn(
      `Entity type '${entityType}' not configured for performance monitoring`,
    );
  }

  const PerformanceMetric = require("../../services/business-service/src/models/PerformanceMetric");

  const metric = new PerformanceMetric({
    entityType,
    operation,
    responseTime,
    success,
    error: success ? null : "Request failed",
    endpoint,
    userId,
  });

  try {
    await metric.save();
    return metric;
  } catch (err) {
    console.error("Failed to record performance metric:", err);
    throw err;
  }
}

/**
 * Gets aggregated performance metrics for an entity
 *
 * USAGE:
 * getAggregatedMetrics('variable', '1h')
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
 * @returns {Promise<object>} - Aggregated metrics object
 */
async function getAggregatedMetrics(entityType, timeRange = "24h") {
  const PerformanceMetric = require("../../services/business-service/src/models/PerformanceMetric");

  const timeRangeMap = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const startTime = new Date(
    Date.now() - (timeRangeMap[timeRange] || timeRangeMap["24h"]),
  );

  const metrics = await PerformanceMetric.find({
    entityType,
    createdAt: { $gte: startTime },
  });

  if (metrics.length === 0) {
    return {
      avgResponseTime: 0,
      errorRate: 0,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      operations: {},
    };
  }

  const successCount = metrics.filter((m) => m.success).length;
  const errorCount = metrics.length - successCount;
  const avgResponseTime =
    metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
  const errorRate = errorCount / metrics.length;

  // Group by operation
  const operations = {};
  metrics.forEach((m) => {
    if (!operations[m.operation]) {
      operations[m.operation] = {
        count: 0,
        avgResponseTime: 0,
        errorRate: 0,
      };
    }
    operations[m.operation].count++;
    operations[m.operation].avgResponseTime += m.responseTime;
    if (!m.success) {
      operations[m.operation].errorRate++;
    }
  });

  // Calculate averages for each operation
  Object.keys(operations).forEach((op) => {
    operations[op].avgResponseTime =
      operations[op].avgResponseTime / operations[op].count;
    operations[op].errorRate = operations[op].errorRate / operations[op].count;
  });

  return {
    avgResponseTime: Math.round(avgResponseTime),
    errorRate: Math.round(errorRate * 100) / 100,
    requestCount: metrics.length,
    successCount,
    errorCount,
    operations,
  };
}

/**
 * Gets performance metrics broken down by operation
 *
 * USAGE:
 * getMetricsByOperation('variable', '24h')
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
 * @returns {Promise<object>} - Metrics grouped by operation
 */
async function getMetricsByOperation(entityType, timeRange = "24h") {
  const PerformanceMetric = require("../../services/business-service/src/models/PerformanceMetric");

  const timeRangeMap = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const startTime = new Date(
    Date.now() - (timeRangeMap[timeRange] || timeRangeMap["24h"]),
  );

  const metrics = await PerformanceMetric.aggregate([
    {
      $match: {
        entityType,
        createdAt: { $gte: startTime },
      },
    },
    {
      $group: {
        _id: {
          operation: "$operation",
          endpoint: "$endpoint",
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        maxResponseTime: { $max: "$responseTime" },
        minResponseTime: { $min: "$responseTime" },
        errorCount: {
          $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return metrics.map((m) => ({
    operation: m._id.operation,
    endpoint: m._id.endpoint,
    count: m.count,
    avgResponseTime: Math.round(m.avgResponseTime),
    maxResponseTime: m.maxResponseTime,
    minResponseTime: m.minResponseTime,
    errorRate: Math.round((m.errorCount / m.count) * 100) / 100,
  }));
}

/**
 * Gets the slowest operations for an entity
 *
 * USAGE:
 * getSlowestOperations('variable', 10, '24h')
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {number} limit - Maximum number of results
 * @param {string} timeRange - Time range: '1h', '24h', '7d', '30d'
 * @returns {Promise<Array>} - Array of slowest operations
 */
async function getSlowestOperations(entityType, limit = 10, timeRange = "24h") {
  const PerformanceMetric = require("../../services/business-service/src/models/PerformanceMetric");

  const timeRangeMap = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const startTime = new Date(
    Date.now() - (timeRangeMap[timeRange] || timeRangeMap["24h"]),
  );

  const metrics = await PerformanceMetric.find({
    entityType,
    createdAt: { $gte: startTime },
  })
    .sort({ responseTime: -1 })
    .limit(limit)
    .lean();

  return metrics.map((m) => ({
    operation: m.operation,
    responseTime: m.responseTime,
    endpoint: m.endpoint,
    success: m.success,
    timestamp: m.createdAt,
  }));
}

module.exports = {
  recordMetric,
  getAggregatedMetrics,
  getMetricsByOperation,
  getSlowestOperations,
};
