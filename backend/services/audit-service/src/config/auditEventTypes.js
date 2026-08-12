/**
 * Central Event Type Registry
 * 
 * PURPOSE: This file serves as the single source of truth for all audit event types
 * across the entire system. It eliminates the need to hardcode event type arrays
 * in multiple router files, reducing duplication and ensuring consistency.
 * 
 * USAGE EXAMPLE (for adding new event types):
 * 1. Add the event type to the appropriate entity array below
 * 2. The event type will automatically be available for validation
 * 3. No need to modify individual router files
 * 
 * HOW TO ADD A NEW ENTITY:
 * 1. Add a new key to EVENT_TYPES object with the entity name (plural)
 * 2. Add an array of event type strings for that entity
 * 3. Event types should follow the pattern: {entity}_{action}
 *    Examples: variable_created, fee_updated, application_submitted
 * 
 * VALIDATION:
 * Use validateEventType(eventType, entityType) to check if an event type is valid
 * before logging it. This prevents typos and ensures only known event types are used.
 */

// Central registry of all event types by entity
// This is the single source of truth for audit event types in the system
const EVENT_TYPES = {
  // Variable events - used when variables are created, updated, or disabled
  variables: [
    'variable_created',
    'variable_updated',
    'variable_disabled',
    'variable_calculation_updated',
  ],

  // Fee events - used when fees are created, updated, or disabled
  fees: [
    'fee_created',
    'fee_updated',
    'fee_disabled',
  ],

  // Application fee events - used when application fees are managed
  application_fees: [
    'application_fee_created',
    'application_fee_updated',
    'application_fee_disabled',
  ],

  // Conditional fee events - used when conditional fees are managed
  conditional_fees: [
    'conditional_fee_created',
    'conditional_fee_updated',
    'conditional_fee_disabled',
  ],

  // Variable fee rule events - used when variable fee rules are managed
  variable_fee_rules: [
    'variable_fee_rule_created',
    'variable_fee_rule_updated',
    'variable_fee_rule_disabled',
  ],

  // Claimable document fee events - used when claimable document fees are managed
  claimable_document_fees: [
    'claimable_document_fee_created',
    'claimable_document_fee_updated',
    'claimable_document_fee_disabled',
  ],

  // Penalty rule events - used when penalty rules are managed
  penalty_rules: [
    'penalty_rule_created',
    'penalty_rule_updated',
    'penalty_rule_published',
    'penalty_rule_disabled',
  ],

  // LOB (Line of Business) events - used when LOBs are updated
  lobs: [
    'lob_created',
    'lob_updated',
  ],

  // Requirement events - used when requirements are managed
  requirements: [
    'requirement_created',
    'requirement_updated',
    'requirement_published',
    'requirement_disabled',
  ],

  // Post-requirement events - used when post-requirements are managed
  post_requirements: [
    'post_requirement_created',
    'post_requirement_updated',
    'post_requirement_disabled',
  ],

  // Violation events - used when violations are managed
  violations: [
    'violation_created',
    'violation_updated',
    'violation_disabled',
  ],

  // Permit form events - used when permit forms are managed
  permit_forms: [
    'permit_form_created',
    'permit_form_updated',
    'permit_form_disabled',
    'permit_form_status_changed',
  ],

  // Inspection item events - used when inspection items are managed
  inspection_items: [
    'inspection_item_created',
    'inspection_item_updated',
    'inspection_item_disabled',
  ],

  // Checklist events - used when checklists are managed
  checklists: [
    'checklist_created',
    'checklist_updated',
    'checklist_disabled',
  ],

  // Requirement group events - used when requirement groups are managed
  requirement_groups: [
    'requirement_group_created',
    'requirement_group_updated',
    'requirement_group_published',
    'requirement_group_disabled',
  ],

  // Application events - used when applications are submitted, reviewed, etc.
  applications: [
    'application_created',
    'walkin_application_created',
    'officer_draft_finished',
    'application_autosaved',
    'application_submitted',
    'application_resubmitted',
    'application_updated',
    'application_claimed',
    'application_released',
    'application_transferred',
    'field_reviewed',
    'field_decisions_updated',
    'pending_action_created',
    'pending_action_cancelled',
    'pending_action_executed',
    'application_returned',
    'application_rejected',
    'application_approved',
    'application_status_reset',
    'application_deleted',
    'application_email_resent',
    'application_email_status_reset',
    'review_completed',
    'decision_revoked',
  ],

  // Appeal events - used when appeals are submitted and resolved
  appeals: [
    'appeal_submitted',
    'appeal_resolved',
    'appeal_rejected',
  ],

  // Field review events - used when fields are reviewed
  field_reviews: [
    'field_reviewed',
    'field_decisions_updated',
  ],

  // Pending action events - used when pending actions are managed
  pending_actions: [
    'pending_action_created',
    'pending_action_cancelled',
    'pending_action_executed',
  ],

  // Payment events - used when payments are recorded
  payments: [
    'payment_recorded',
    'mock_payment_recorded',
    'payment_webhook_received',
  ],

  // Help request events - used when help requests are managed
  help_requests: [
    'claim',
    'release',
    'status_update',
    'priority_update',
  ],

  // Business owner events - used when business owner accounts are managed
  business_owners: [
    'business_owner_registered',
    'business_owner_linked',
    'account_status_changed',
    'account_deleted',
    'account_activated',
    'account_locked',
    'account_unlocked',
    'personal_info_updated',
    'address_updated',
    'contact_info_updated',
    'email_update_requested',
    'email_updated',
    'password_reset',
    'mfa_changed',
    'business_owner_bookmarked',
    'business_owner_unbookmarked',
    'business_owner_viewed',
    'name_updated',
    'pis_updated',
  ],

  // Permit processing events - used when permits are processed
  permits: [
    'permit_request_created',
    'permit_claimed',
    'permit_released',
    'permit_printing_started',
    'permit_printed',
    'owner_notified',
    'owner_claimed',
    'permit_completed',
  ],

  // CMS events - used when CMS content is updated
  cms: [
    'faq_updated',
    'instruction_updated',
  ],

  // Tax bracket events - used when tax brackets are managed
  tax_brackets: [
    'tax_bracket_created',
    'tax_bracket_updated',
    'tax_bracket_deleted',
  ],
};

/**
 * Validates if an event type is valid for a given entity
 * 
 * USAGE:
 * validateEventType('variable_created', 'variables') // returns true
 * validateEventType('invalid_event', 'variables') // returns false
 * 
 * @param {string} eventType - The event type to validate
 * @param {string} entityType - The entity type (e.g., 'variables', 'fees')
 * @returns {boolean} - True if event type is valid for the entity, false otherwise
 */
function validateEventType(eventType, entityType) {
  const validTypes = EVENT_TYPES[entityType] || [];
  return validTypes.includes(eventType);
}

/**
 * Gets all event types for a given entity
 * 
 * USAGE:
 * getEventTypesByEntity('variables') // returns ['variable_created', 'variable_updated', ...]
 * 
 * @param {string} entityType - The entity type (e.g., 'variables', 'fees')
 * @returns {string[]} - Array of event types for the entity, or empty array if entity not found
 */
function getEventTypesByEntity(entityType) {
  return EVENT_TYPES[entityType] || [];
}

/**
 * Gets all event types across all entities
 * 
 * USAGE:
 * getAllEventTypes() // returns flat array of all event types
 * 
 * @returns {string[]} - Flat array of all event types
 */
function getAllEventTypes() {
  const allTypes = [];
  for (const entityTypes of Object.values(EVENT_TYPES)) {
    allTypes.push(...entityTypes);
  }
  return allTypes;
}

/**
 * Gets all entity types that have event types defined
 * 
 * USAGE:
 * getAllEntityTypes() // returns ['variables', 'fees', 'applications', ...]
 * 
 * @returns {string[]} - Array of entity type names
 */
function getAllEntityTypes() {
  return Object.keys(EVENT_TYPES);
}

module.exports = {
  EVENT_TYPES,
  validateEventType,
  getEventTypesByEntity,
  getAllEventTypes,
  getAllEntityTypes,
};
