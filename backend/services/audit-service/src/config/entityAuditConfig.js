/**
 * Entity Audit Configuration Schema
 * 
 * PURPOSE: This file defines the configuration for each entity type in the audit system.
 * It centralizes all entity-specific settings like event types, metadata field mappings,
 * permissions, search fields, and response format preferences. This eliminates the need
 * to hardcode these values in individual router files.
 * 
 * USAGE EXAMPLE (for adding a new entity):
 * 1. Add a new key to ENTITY_CONFIG with the entity name (singular, lowercase)
 * 2. Define the configuration object with the required fields
 * 3. The entity will automatically work with the audit router factory
 * 
 * CONFIGURATION FIELDS:
 * - eventTypes: Array of event type strings for this entity (from auditEventTypes.js)
 * - metadataFields: Array of metadata field names to search for entity ID
 *   Examples: ['variableId', 'entityId'] for variables
 *   Examples: ['applicationId', 'entityId', 'businessId'] for applications
 * - permissions: Array of roles allowed to access audit logs for this entity
 *   Examples: ['admin'] for admin-only entities
 *   Examples: ['lgu_officer', 'staff', 'admin'] for shared entities
 * - searchFields: Array of metadata fields to search across in global audit view
 *   Examples: ['userName', 'name', 'updatedByName'] for variables
 * - responseFormat: String indicating response format preference
 *   'standard': { logs, pagination: { page, limit, total, totalPages } }
 * - globalEndpoint: String for the global audit endpoint path
 *   Examples: 'variables' for /api/audit/variables
 * - singularEndpoint: String for the singular audit endpoint path
 *   Examples: 'variable' for /api/audit/variable/:id
 */

const { getEventTypesByEntity } = require('./auditEventTypes');

// Central configuration for each entity type
// This is the single source of truth for entity-specific audit settings
const ENTITY_CONFIG = {
  // Variables configuration
  // Used for variable audit logs (created, updated, disabled, calculation updated)
  variable: {
    eventTypes: getEventTypesByEntity('variables'),
    // Metadata fields where entity ID might be stored
    // The filter builder will search across all these fields
    metadataFields: ['variableId', 'entityId'],
    // Roles allowed to access variable audit logs
    permissions: ['admin'],
    // Fields to search across in global audit view
    searchFields: ['userName', 'name', 'updatedByName', 'createdByName', 'deletedByName'],
    // Response format preference
    responseFormat: 'standard',
    // Endpoint path for global audit view
    globalEndpoint: 'variables',
    // Endpoint path for singular audit view
    singularEndpoint: 'variable',
  },

  // Fees configuration
  // Used for fee audit logs (created, updated, disabled)
  fee: {
    eventTypes: getEventTypesByEntity('fees'),
    metadataFields: ['feeId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name', 'updatedByName', 'createdByName'],
    responseFormat: 'standard',
    globalEndpoint: 'fees',
    singularEndpoint: 'fee',
  },

  // Application fees configuration
  application_fee: {
    eventTypes: getEventTypesByEntity('application_fees'),
    metadataFields: ['applicationFeeId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'application-fees',
    singularEndpoint: 'application-fee',
  },

  // Conditional fees configuration
  conditional_fee: {
    eventTypes: getEventTypesByEntity('conditional_fees'),
    metadataFields: ['conditionalFeeId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'conditional-fees',
    singularEndpoint: 'conditional-fee',
  },

  // Variable fee rules configuration
  variable_fee_rule: {
    eventTypes: getEventTypesByEntity('variable_fee_rules'),
    metadataFields: ['variableFeeRuleId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'variable-fee-rules',
    singularEndpoint: 'variable-fee-rule',
  },

  // Claimable document fees configuration
  claimable_document_fee: {
    eventTypes: getEventTypesByEntity('claimable_document_fees'),
    metadataFields: ['claimableDocumentFeeId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'claimable-document-fees',
    singularEndpoint: 'claimable-document-fee',
  },

  // Penalty rules configuration
  penalty_rule: {
    eventTypes: getEventTypesByEntity('penalty_rules'),
    metadataFields: ['penaltyRuleId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'penalty-rules',
    singularEndpoint: 'penalty-rule',
  },

  // LOB (Line of Business) configuration
  lob: {
    eventTypes: getEventTypesByEntity('lobs'),
    metadataFields: ['lobId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'lobs',
    singularEndpoint: 'lob',
  },

  // Requirements configuration
  requirement: {
    eventTypes: getEventTypesByEntity('requirements'),
    metadataFields: ['requirementId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'requirements',
    singularEndpoint: 'requirement',
  },

  // Post-requirements configuration
  post_requirement: {
    eventTypes: getEventTypesByEntity('post_requirements'),
    metadataFields: ['postRequirementId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'post-requirements',
    singularEndpoint: 'post-requirement',
  },

  // Violations configuration
  violation: {
    eventTypes: getEventTypesByEntity('violations'),
    metadataFields: ['violationId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'violations',
    singularEndpoint: 'violation',
  },

  // Permit forms configuration
  permit_form: {
    eventTypes: getEventTypesByEntity('permit_forms'),
    metadataFields: ['permitFormId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'permit-forms',
    singularEndpoint: 'permit-form',
  },

  // Inspection items configuration
  inspection_item: {
    eventTypes: getEventTypesByEntity('inspection_items'),
    metadataFields: ['inspectionItemId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'inspection-items',
    singularEndpoint: 'inspection-item',
  },

  // Checklists configuration
  checklist: {
    eventTypes: getEventTypesByEntity('checklists'),
    metadataFields: ['checklistId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'checklists',
    singularEndpoint: 'checklist',
  },

  // Requirement groups configuration
  requirement_group: {
    eventTypes: getEventTypesByEntity('requirement_groups'),
    metadataFields: ['requirementGroupId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'requirement-groups',
    singularEndpoint: 'requirement-group',
  },

  // Applications configuration
  // Note: Applications have broader access (officers, staff, admin)
  application: {
    eventTypes: getEventTypesByEntity('applications'),
    // Applications can be found in multiple metadata fields
    metadataFields: ['applicationId', 'entityId', 'businessId'],
    // Broader permissions for applications
    permissions: ['lgu_officer', 'staff', 'admin'],
    searchFields: ['userName', 'businessName', 'updatedByName'],
    responseFormat: 'standard',
    globalEndpoint: 'applications',
    singularEndpoint: 'application',
  },

  // Tax brackets configuration
  tax_bracket: {
    eventTypes: getEventTypesByEntity('tax_brackets'),
    metadataFields: ['taxBracketId', 'entityId'],
    permissions: ['admin'],
    searchFields: ['userName', 'name'],
    responseFormat: 'standard',
    globalEndpoint: 'tax-brackets',
    singularEndpoint: 'tax-bracket',
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
