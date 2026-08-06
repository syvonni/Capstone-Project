/**
 * Data Quality Validator
 *
 * PURPOSE: Generic validator that checks entities for data quality issues.
 * Uses the entity configuration from entityDataQualityConfig.js to validate
 * entities and return structured issue reports.
 *
 * USAGE EXAMPLE:
 * const { validateEntities } = require('./dataQualityValidator');
 * const issues = validateEntities('variable', variables);
 * // Returns: { issues: [{ type: 'missing_name', count: 5, entityIds: [...] }] }
 */

const { getEntityConfig } = require("./entityDataQualityConfig");

/**
 * Validates an array of entities for data quality issues
 *
 * USAGE:
 * validateEntities('variable', variables)
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {Array} entities - Array of entity objects to validate
 * @returns {object} - Object with issues array containing type, count, and entityIds
 */
function validateEntities(entityType, entities) {
  const config = getEntityConfig(entityType);
  if (!config) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  if (!Array.isArray(entities)) {
    throw new Error("entities must be an array");
  }

  const validationRules = config.validationRules || [];
  const issues = {};

  // Initialize issues object with empty arrays for each rule type
  validationRules.forEach((rule) => {
    issues[rule.type] = {
      type: rule.type,
      label: rule.label,
      severity: rule.severity || "medium",
      count: 0,
      entityIds: [],
    };
  });

  // Validate each entity
  entities.forEach((entity) => {
    const entityId = String(entity._id || entity.id);
    if (!entityId) return;

    validationRules.forEach((rule) => {
      try {
        const hasIssue = rule.validator(entity);
        if (hasIssue) {
          issues[rule.type].count++;
          issues[rule.type].entityIds.push(entityId);
        }
      } catch (err) {
        console.error(
          `Error validating ${rule.type} for entity ${entityId}:`,
          err,
        );
      }
    });
  });

  // Convert to array format, filtering out issues with zero count
  const issuesArray = Object.values(issues).filter((issue) => issue.count > 0);

  return {
    issues: issuesArray,
    totalEntities: entities.length,
    totalIssues: issuesArray.reduce((sum, issue) => sum + issue.count, 0),
  };
}

/**
 * Validates a single entity for data quality issues
 *
 * USAGE:
 * validateEntity('variable', variable)
 *
 * @param {string} entityType - The entity type (singular, lowercase)
 * @param {object} entity - Single entity object to validate
 * @returns {object} - Object with issues array containing type and label
 */
function validateEntity(entityType, entity) {
  const config = getEntityConfig(entityType);
  if (!config) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  if (!entity) {
    throw new Error("entity is required");
  }

  const validationRules = config.validationRules || [];
  const issues = [];

  validationRules.forEach((rule) => {
    try {
      const hasIssue = rule.validator(entity);
      if (hasIssue) {
        issues.push({
          type: rule.type,
          label: rule.label,
          severity: rule.severity || "medium",
        });
      }
    } catch (err) {
      console.error(`Error validating ${rule.type}:`, err);
    }
  });

  return {
    issues,
    totalIssues: issues.length,
  };
}

module.exports = {
  validateEntities,
  validateEntity,
};
