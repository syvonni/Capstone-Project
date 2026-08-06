/**
 * Entity Performance Configuration Schema
 *
 * PURPOSE: This file defines the configuration for each entity type in the performance monitoring system.
 * It centralizes all entity-specific performance monitoring rules, making it easy to add new entities
 * without modifying the core monitoring logic.
 *
 * USAGE EXAMPLE (for adding a new entity):
 * 1. Add a new key to ENTITY_CONFIG with the entity name (singular, lowercase)
 * 2. Define the configuration object with monitoring rules
 * 3. The entity will automatically work with the performance monitor
 *
 * CONFIGURATION FIELDS:
 * - enabled: Whether monitoring is enabled for this entity
 * - operations: Array of HTTP operations to track (GET, POST, PUT, DELETE, PATCH)
 * - thresholds: Performance thresholds for alerting
 *   - warning: Response time threshold for warnings (ms)
 *   - critical: Response time threshold for critical alerts (ms)
 *   - errorRate: Error rate threshold for alerts (0-1)
 */

// Central configuration for each entity type
// This is the single source of truth for entity-specific performance monitoring rules
const ENTITY_CONFIG = {
  // Variables configuration
  variable: {
    enabled: true,
    operations: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    thresholds: {
      warning: 500, // Warn if response time > 500ms
      critical: 1000, // Critical if response time > 1000ms
      errorRate: 0.05, // Warn if error rate > 5%
    },
  },
  // Fees configuration
  fee: {
    enabled: true,
    operations: ["GET", "POST", "PUT", "DELETE"],
    thresholds: {
      warning: 500,
      critical: 1000,
      errorRate: 0.05,
    },
  },
  // Applications configuration
  application: {
    enabled: true,
    operations: ["GET", "POST", "PUT", "DELETE"],
    thresholds: {
      warning: 500,
      critical: 1000,
      errorRate: 0.05,
    },
  },
  // Checklists configuration
  checklist: {
    enabled: true,
    operations: ["GET", "POST", "PUT", "DELETE"],
    thresholds: {
      warning: 500,
      critical: 1000,
      errorRate: 0.05,
    },
  },
  // LOBs configuration
  lob: {
    enabled: true,
    operations: ["GET", "POST", "PUT", "DELETE"],
    thresholds: {
      warning: 500,
      critical: 1000,
      errorRate: 0.05,
    },
  },
  // Violations configuration
  violation: {
    enabled: true,
    operations: ["GET", "POST", "PUT", "DELETE"],
    thresholds: {
      warning: 500,
      critical: 1000,
      errorRate: 0.05,
    },
  },
};

/**
 * Gets the configuration for a specific entity
 *
 * USAGE:
 * getEntityConfig('variable') // returns variable configuration object
 * getEntityConfig('unknown') // returns null
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @returns {object|null} - Configuration object for the entity, or null if not found
 */
function getEntityConfig(entityType) {
  return ENTITY_CONFIG[entityType] || null;
}

/**
 * Gets all entity configurations
 *
 * USAGE:
 * getAllEntityConfigs() // returns object with all entity configurations
 *
 * @returns {object} - Object containing all entity configurations
 */
function getAllEntityConfigs() {
  return ENTITY_CONFIG;
}

/**
 * Gets all entity type names that have configurations
 *
 * USAGE:
 * getConfiguredEntityTypes() // returns ['variable', 'fee', 'application', ...]
 *
 * @returns {string[]} - Array of entity type names
 */
function getConfiguredEntityTypes() {
  return Object.keys(ENTITY_CONFIG);
}

/**
 * Checks if an entity type is enabled for monitoring
 *
 * USAGE:
 * isEntityEnabled('variable') // returns true
 * isEntityEnabled('unknown') // returns false
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @returns {boolean} - Whether the entity is enabled for monitoring
 */
function isEntityEnabled(entityType) {
  const config = getEntityConfig(entityType);
  return config ? config.enabled : false;
}

/**
 * Checks if an operation should be tracked for an entity
 *
 * USAGE:
 * shouldTrackOperation('variable', 'GET') // returns true
 * shouldTrackOperation('variable', 'PATCH') // returns false (if not in operations array)
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {string} operation - The HTTP operation
 * @returns {boolean} - Whether the operation should be tracked
 */
function shouldTrackOperation(entityType, operation) {
  const config = getEntityConfig(entityType);
  if (!config || !config.enabled) {
    return false;
  }
  return config.operations.includes(operation);
}

/**
 * Calculates the status of performance metrics based on thresholds
 *
 * USAGE:
 * calculateStatus('variable', { avgResponseTime: 600, errorRate: 0.03 })
 * // returns 'warning'
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {object} metrics - Performance metrics object
 * @param {number} metrics.avgResponseTime - Average response time in ms
 * @param {number} metrics.errorRate - Error rate (0-1)
 * @returns {string} - Status: 'good', 'warning', or 'critical'
 */
function calculateStatus(entityType, metrics) {
  const config = getEntityConfig(entityType);
  if (!config || !config.enabled) {
    return "good";
  }

  const { avgResponseTime = 0, errorRate = 0 } = metrics;
  const {
    warning,
    critical,
    errorRate: errorRateThreshold,
  } = config.thresholds;

  // Check critical conditions
  if (avgResponseTime >= critical || errorRate >= errorRateThreshold) {
    return "critical";
  }

  // Check warning conditions
  if (avgResponseTime >= warning || errorRate >= errorRateThreshold * 0.5) {
    return "warning";
  }

  return "good";
}

module.exports = {
  ENTITY_CONFIG,
  getEntityConfig,
  getAllEntityConfigs,
  getConfiguredEntityTypes,
  isEntityEnabled,
  shouldTrackOperation,
  calculateStatus,
};
