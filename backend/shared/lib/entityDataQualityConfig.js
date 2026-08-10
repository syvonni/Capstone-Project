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

  // Violations configuration
  violation: {
    validationRules: [
      // Required field issues
      {
        type: "missing_name",
        label: "Missing Name",
        severity: "critical",
        validator: (v) => !v.name || v.name.trim() === "",
      },
      {
        type: "missing_severity",
        label: "Missing Severity",
        severity: "critical",
        validator: (v) => !v.severity,
      },
      {
        type: "missing_description",
        label: "Missing Description",
        severity: "high",
        validator: (v) => !v.description || v.description.trim() === "",
      },

      // Severity validation
      {
        type: "invalid_severity",
        label: "Invalid Severity",
        severity: "critical",
        validator: (v) => !["minor", "major", "critical"].includes(v.severity),
      },

      // Documentation checks
      {
        type: "without_legal_basis",
        label: "Without Legal Basis",
        severity: "high",
        validator: (v) => !v.legalBasis || v.legalBasis.length === 0,
      },
      {
        type: "without_corrective_action",
        label: "Without Corrective Action",
        severity: "high",
        validator: (v) => !v.correctiveAction || v.correctiveAction.trim() === "",
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

      // Association issues
      {
        type: "without_fee_association",
        label: "Without Fee Association",
        severity: "medium",
        validator: (v) => !v.feeId,
      },
      {
        type: "without_inspection_items",
        label: "Without Inspection Items",
        severity: "low",
        validator: () => false, // Handled separately in helper due to cross-collection query
      },
    ],
  },

  // Inspection Items configuration
  inspectionItem: {
    validationRules: [
      // Required field issues (schema-enforced but useful for monitoring data integrity)
      {
        type: "missing_name",
        label: "Missing Name",
        severity: "critical",
        validator: (i) => !i.name || i.name.trim() === "",
      },
      {
        type: "missing_question",
        label: "Missing Question",
        severity: "critical",
        validator: (i) => !i.question || i.question.trim() === "",
      },

      // Association issues (schema-enforced but monitors for orphaned records)
      {
        type: "without_violation",
        label: "Without Violation",
        severity: "critical",
        validator: (i) => !i.violationId,
      },

      // Documentation checks (optional but important for compliance tracking)
      {
        type: "without_legal_basis",
        label: "Without Legal Basis",
        severity: "high",
        validator: (i) => !i.legalBasis || i.legalBasis.length === 0,
      },

      // Data consistency issues
      {
        type: "invalid_legal_basis_urls",
        label: "Invalid Legal Basis URLs",
        severity: "medium",
        validator: (i) => {
          if (!i.legalBasis || i.legalBasis.length === 0) return false;
          return i.legalBasis.some((lb) => {
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

  // Checklists configuration
  checklist: {
    validationRules: [
      // Required field issues (schema-enforced but useful for monitoring data integrity)
      {
        type: "missing_name",
        label: "Missing Name",
        severity: "critical",
        validator: (c) => !c.name || c.name.trim() === "",
      },

      // Association issues
      {
        type: "missing_items",
        label: "Missing Items",
        severity: "critical",
        validator: (c) => !c.items || c.items.length === 0,
      },
      {
        type: "without_inspection_items",
        label: "Without Inspection Items",
        severity: "high",
        validator: (c) => !c.items || c.items.length === 0,
      },

      // Documentation checks (optional but important for compliance tracking)
      {
        type: "without_legal_basis",
        label: "Without Legal Basis",
        severity: "high",
        validator: (c) => !c.legalBasis || c.legalBasis.length === 0,
      },

      // Data consistency issues
      {
        type: "invalid_legal_basis_urls",
        label: "Invalid Legal Basis URLs",
        severity: "medium",
        validator: (c) => {
          if (!c.legalBasis || c.legalBasis.length === 0) return false;
          return c.legalBasis.some((lb) => {
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

      // Optional association checks (included for comprehensive visibility)
      {
        type: "without_post_requirement",
        label: "Without Post Requirement",
        severity: "low",
        validator: (c) => !c.postRequirementId,
      },
      {
        type: "without_variable",
        label: "Without Variable",
        severity: "low",
        validator: (c) => !c.variableId,
      },
      {
        type: "without_document",
        label: "Without Document",
        severity: "low",
        validator: (c) => !c.documentId,
      },
    ],
  },

  // Post Requirements configuration
  postRequirement: {
    validationRules: [
      // Required field issues (schema-enforced but useful for monitoring data integrity)
      {
        type: "missing_name",
        label: "Missing Name",
        severity: "critical",
        validator: (p) => !p.name || p.name.trim() === "",
      },
      {
        type: "missing_code",
        label: "Missing Code",
        severity: "critical",
        validator: (p) => !p.code || p.code.trim() === "",
      },

      // Association checks (optional but important for proper configuration)
      {
        type: "without_checklist",
        label: "Without Checklist",
        severity: "medium",
        validator: (p) => !p.checklistId,
      },

      // Documentation checks (optional but important for compliance tracking)
      {
        type: "without_legal_basis",
        label: "Without Legal Basis",
        severity: "high",
        validator: (p) => !p.legalBasis || p.legalBasis.length === 0,
      },

      // Data consistency issues
      {
        type: "invalid_legal_basis_urls",
        label: "Invalid Legal Basis URLs",
        severity: "medium",
        validator: (p) => {
          if (!p.legalBasis || p.legalBasis.length === 0) return false;
          return p.legalBasis.some((lb) => {
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

      // Optional configuration checks
      {
        type: "without_custom_fields",
        label: "Without Custom Fields",
        severity: "low",
        validator: (p) => !p.customFields || p.customFields.length === 0,
      },
    ],
  },

  // Post Requirements configuration
  postRequirement: {
    validationRules: [
      // Required field issues (schema-enforced but useful for monitoring data integrity)
      {
        type: "missing_name",
        label: "Missing Name",
        severity: "critical",
        validator: (p) => !p.name || p.name.trim() === "",
      },
      {
        type: "missing_code",
        label: "Missing Code",
        severity: "critical",
        validator: (p) => !p.code || p.code.trim() === "",
      },

      // Association checks (optional but important for proper configuration)
      {
        type: "without_checklist",
        label: "Without Checklist",
        severity: "medium",
        validator: (p) => !p.checklistId,
      },

      // Documentation checks (optional but important for compliance tracking)
      {
        type: "without_legal_basis",
        label: "Without Legal Basis",
        severity: "high",
        validator: (p) => !p.legalBasis || p.legalBasis.length === 0,
      },

      // Data consistency issues
      {
        type: "invalid_legal_basis_urls",
        label: "Invalid Legal Basis URLs",
        severity: "medium",
        validator: (p) => {
          if (!p.legalBasis || p.legalBasis.length === 0) return false;
          return p.legalBasis.some((lb) => {
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

      // Optional configuration checks
      {
        type: "without_custom_fields",
        label: "Without Custom Fields",
        severity: "low",
        validator: (p) => !p.customFields || p.customFields.length === 0,
      },
    ],
  },

  // LOB configuration
  lob: {
    validationRules: [
      // Required field issues
      {
        type: "missing_code",
        label: "Missing Code",
        severity: "critical",
        validator: (l) => !l.code || l.code.trim() === "",
      },
      {
        type: "missing_name",
        label: "Missing Name",
        severity: "critical",
        validator: (l) => !l.name || l.name.trim() === "",
      },
      {
        type: "missing_description",
        label: "Missing Description",
        severity: "high",
        validator: (l) => !l.description || l.description.trim() === "",
      },
      {
        type: "missing_category",
        label: "Missing Category",
        severity: "high",
        validator: (l) => !l.category || l.category.trim() === "",
      },

      // Association issues
      {
        type: "without_variables",
        label: "Without Variables",
        severity: "medium",
        validator: (l) => !l.variables || l.variables.length === 0,
      },
      {
        type: "without_documents",
        label: "Without Documents",
        severity: "medium",
        validator: (l) => !l.documents || l.documents.length === 0,
      },
      {
        type: "essential_commodity_without_post_requirements",
        label: "Essential Commodity Without Post Requirements",
        severity: "high",
        validator: (l) =>
          l.essentialCommodity &&
          (!l.postRequirements ||
           !l.postRequirements.required ||
           l.postRequirements.required.length === 0),
      },

      // Data consistency issues
      {
        type: "invalid_status",
        label: "Invalid Status",
        severity: "critical",
        validator: (l) => !["active", "inactive"].includes(l.status),
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
