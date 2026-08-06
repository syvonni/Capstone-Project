/**
 * Entity Data Quality Configuration Schema
 *
 * PURPOSE: This file defines the configuration for each entity type in the data quality system.
 * It centralizes all entity-specific validation rules, making it easy to add new entities
 * without modifying the core validator logic.
 *
 * USAGE EXAMPLE (for adding a new entity):
 * 1. Add a new key to ENTITY_CONFIG with the entity name (singular, lowercase)
 * 2. Define the configuration object with validation rules
 * 3. The entity will automatically work with the data quality validator
 *
 * CONFIGURATION FIELDS:
 * - validationRules: Array of validation rule objects
 *   - type: Unique identifier for the issue type (e.g., 'missing_name')
 *   - label: Human-readable label for display (e.g., 'Missing Name')
 *   - validator: Function that accepts an entity and returns true if it has this issue
 *   - severity: 'critical', 'high', 'medium', 'low' (optional, defaults to 'medium')
 */

// Central configuration for each entity type
// This is the single source of truth for entity-specific data quality rules
const ENTITY_CONFIG = {
  // Variables configuration
  variable: {
    validationRules: [
      // Required field issues
      {
        type: "missing_name",
        label: "Missing Name",
        severity: "critical",
        validator: (v) => !v.name || v.name.trim() === "",
      },
      {
        type: "missing_description",
        label: "Missing Description",
        severity: "high",
        validator: (v) => !v.description || v.description.trim() === "",
      },
      {
        type: "missing_question",
        label: "Missing Question",
        severity: "critical",
        validator: (v) => !v.question || v.question.trim() === "",
      },
      {
        type: "missing_calculation_method",
        label: "Missing Calculation Method",
        severity: "critical",
        validator: (v) => !v.calculationMethod,
      },

      // Calculation method consistency issues
      {
        type: "bracketed_without_brackets",
        label: "Bracketed Without Brackets",
        severity: "critical",
        validator: (v) =>
          v.calculationMethod === "bracketed" &&
          (!v.brackets || v.brackets.length === 0),
      },
      {
        type: "classification_without_classifications",
        label: "Classification Without Classifications",
        severity: "critical",
        validator: (v) =>
          v.calculationMethod === "classification" &&
          (!v.classifications || v.classifications.length === 0),
      },
      {
        type: "per_unit_without_base_rate",
        label: "Per-Unit Without Base Rate",
        severity: "critical",
        validator: (v) => v.calculationMethod === "per_unit" && !v.baseRate,
      },
      {
        type: "yes_no_without_fixed_amount",
        label: "Yes/No Without Fixed Amount",
        severity: "critical",
        validator: (v) => v.calculationMethod === "yes_no" && !v.fixedAmount,
      },
      {
        type: "custom_without_calculation_method",
        label: "Custom Without Calculation Method",
        severity: "critical",
        validator: (v) =>
          v.calculationMethod === "custom" && !v.customCalculationMethod,
      },

      // Association issues
      {
        type: "without_checklists",
        label: "Without Checklists",
        severity: "medium",
        validator: (v) => !v.checklistId,
      },
      {
        type: "without_fees",
        label: "Without Fees",
        severity: "medium",
        validator: (v) => !v.feeId,
      },
      {
        type: "without_legal_basis",
        label: "Without Legal Basis",
        severity: "high",
        validator: (v) => !v.legalBasis || v.legalBasis.length === 0,
      },
      {
        type: "without_variable_fee_rule",
        label: "Without Variable Fee Rule",
        severity: "medium",
        validator: (v) => !v.variableFeeRuleId,
      },
      {
        type: "without_lob_associations",
        label: "Without LOB Associations",
        severity: "low",
        validator: () => false, // Handled separately in helper due to cross-collection query
      },

      // Unit field issues
      {
        type: "missing_unit_fields",
        label: "Missing Unit Fields",
        severity: "high",
        validator: (v) => !v.unit || !v.unitSingular || !v.unitPlural,
      },
      {
        type: "missing_context_fields",
        label: "Missing Context Fields",
        severity: "high",
        validator: (v) => !v.unitContextSingular || !v.unitContextPlural,
      },

      // Data consistency issues
      {
        type: "invalid_legal_basis_urls",
        label: "Invalid Legal Basis URLs",
        severity: "medium",
        validator: (v) => {
          if (!v.legalBasis || v.legalBasis.length === 0) return false;
          return v.legalBasis.some((lb) => {
            if (!lb.url) return false;
            try {
              new URL(lb.url);
              return false;
            } catch {
              return true;
            }
          });
        },
      },
    ],
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

module.exports = {
  ENTITY_CONFIG,
  getEntityConfig,
  getAllEntityConfigs,
  getConfiguredEntityTypes,
};
