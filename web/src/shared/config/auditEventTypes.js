// Event type labels for audit history display
export const EVENT_TYPE_LABELS = {
  // Fee events
  fee_created: 'Fee Created',
  fee_updated: 'Fee Updated',
  fee_disabled: 'Fee Disabled',

  // Application fee events
  application_fee_created: 'Application Fee Created',
  application_fee_updated: 'Application Fee Updated',
  application_fee_disabled: 'Application Fee Disabled',

  // Conditional fee events
  conditional_fee_created: 'Conditional Fee Created',
  conditional_fee_updated: 'Conditional Fee Updated',
  conditional_fee_disabled: 'Conditional Fee Disabled',

  // Variable fee rule events
  variable_fee_rule_created: 'Variable Fee Rule Created',
  variable_fee_rule_updated: 'Variable Fee Rule Updated',
  variable_fee_rule_disabled: 'Variable Fee Rule Disabled',

  // Variable events
  variable_created: 'Variable Created',
  variable_updated: 'Variable Updated',
  variable_disabled: 'Variable Disabled',
  variable_calculation_updated: 'Variable Calculation Updated',

  // Claimable document fee events
  claimable_document_fee_created: 'Claimable Document Fee Created',
  claimable_document_fee_updated: 'Claimable Document Fee Updated',
  claimable_document_fee_disabled: 'Claimable Document Fee Disabled',

  // Penalty rule events
  penalty_rule_created: 'Penalty Rule Created',
  penalty_rule_updated: 'Penalty Rule Updated',
  penalty_rule_published: 'Penalty Rule Published',
  penalty_rule_disabled: 'Penalty Rule Disabled',

  // LOB events
  lob_created: 'LOB Created',
  lob_updated: 'LOB Updated',

  // Requirement events
  requirement_created: 'Requirement Created',
  requirement_updated: 'Requirement Updated',
  requirement_published: 'Requirement Published',
  requirement_disabled: 'Requirement Disabled',

  // Post-requirement events
  post_requirement_created: 'Post-Requirement Created',
  post_requirement_updated: 'Post-Requirement Updated',
  post_requirement_disabled: 'Post-Requirement Disabled',

  // Violation events
  violation_created: 'Violation Created',
  violation_updated: 'Violation Updated',
  violation_disabled: 'Violation Disabled',

  // Permit form events
  permit_form_created: 'Permit Form Created',
  permit_form_updated: 'Permit Form Updated',
  permit_form_disabled: 'Permit Form Disabled',
  permit_form_status_changed: 'Permit Form Status Changed',

  // Inspection item events
  inspection_item_created: 'Inspection Item Created',
  inspection_item_updated: 'Inspection Item Updated',
  inspection_item_disabled: 'Inspection Item Disabled',

  // Checklist events
  checklist_created: 'Checklist Created',
  checklist_updated: 'Checklist Updated',
  checklist_disabled: 'Checklist Disabled',

  // Requirement group events
  requirement_group_created: 'Requirement Group Created',
  requirement_group_updated: 'Requirement Group Updated',
  requirement_group_published: 'Requirement Group Published',
  requirement_group_disabled: 'Requirement Group Disabled',

  // Application events
  application_submitted: 'Application Submitted',
  application_rejected: 'Application Rejected',
  application_returned: 'Application Returned',
  application_claimed: 'Application Claimed',
  application_released: 'Application Released',
  application_transferred: 'Application Transferred',
  review_completed: 'Review Completed',
  decision_revoked: 'Decision Revoked',
  walkin_application_created: 'Walk-in Application Created',

  // Appeal events
  appeal_submitted: 'Appeal Submitted',
  appeal_resolved: 'Appeal Resolved',
  appeal_rejected: 'Appeal Rejected',

  // Edit request events
  edit_request_submitted: 'Edit Request Submitted',
  edit_request_applied: 'Edit Request Applied',

  // Field review events
  field_reviewed: 'Field Reviewed',
  field_decisions_updated: 'Field Decisions Updated',

  // Pending action events
  pending_action_created: 'Pending Action Created',
  pending_action_cancelled: 'Pending Action Cancelled',

  // Payment events
  payment_recorded: 'Payment Recorded',
  mock_payment_recorded: 'Mock Payment Recorded',
  payment_webhook_received: 'Payment Webhook Received',

  // Help request events
  claim: 'Help Request Claimed',
  release: 'Help Request Released',
  status_update: 'Status Updated',
  priority_update: 'Priority Updated',

  // Business owner events
  business_owner_registered: 'Business Owner Registered',
  business_owner_linked: 'Business Owner Linked',
  account_status_changed: 'Account Status Changed',
  account_deleted: 'Account Deleted',
  account_activated: 'Account Activated',
  account_locked: 'Account Locked',
  account_unlocked: 'Account Unlocked',
  personal_info_updated: 'Personal Information Updated',
  address_updated: 'Address Updated',
  contact_info_updated: 'Contact Information Updated',
  email_update_requested: 'Email Update Requested',
  email_updated: 'Email Updated',
  password_reset: 'Password Reset',
  mfa_changed: 'MFA Changed',
  business_owner_bookmarked: 'Business Owner Bookmarked',
  business_owner_unbookmarked: 'Business Owner Unbookmarked',
  business_owner_viewed: 'Business Owner Viewed',
  name_updated: 'Name Updated',
  pis_updated: 'PIS Updated',

  // Permit processing events
  permit_request_created: 'Permit Request Created',
  permit_claimed: 'Permit Claimed',
  permit_released: 'Permit Released',
  permit_printing_started: 'Printing Started',
  permit_printed: 'Permits Printed',
  owner_notified: 'Owner Notified',
  owner_claimed: 'Owner Claimed Permit',
  permit_completed: 'Permit Processing Completed',

  // CMS events
  faq_updated: 'FAQ Updated',
  instruction_updated: 'Instruction Updated',

  // Default: convert underscore_case to Title Case
}

// Event type descriptions for documentation
export const AUDIT_EVENT_INFO = [
  // Fee events
  { event: 'fee_created', description: 'When an admin creates a new fee' },
  { event: 'fee_updated', description: 'When an admin updates an existing fee' },
  { event: 'fee_disabled', description: 'When an admin disables a fee (soft-delete)' },

  // Application fee events
  { event: 'application_fee_created', description: 'When an application fee is created (automatically when a permit form is created)' },
  { event: 'application_fee_updated', description: 'When an application fee is updated (e.g., amount, name)' },
  { event: 'application_fee_disabled', description: 'When an application fee is disabled (synced with permit form status)' },

  // Conditional fee events
  { event: 'conditional_fee_created', description: 'When an admin creates a new conditional fee' },
  { event: 'conditional_fee_updated', description: 'When an admin updates an existing conditional fee' },
  { event: 'conditional_fee_disabled', description: 'When an admin disables a conditional fee (soft-delete)' },

  // Variable fee rule events
  { event: 'variable_fee_rule_created', description: 'When an admin creates a new variable fee rule' },
  { event: 'variable_fee_rule_updated', description: 'When an admin updates an existing variable fee rule' },
  { event: 'variable_fee_rule_disabled', description: 'When an admin disables a variable fee rule (soft-delete)' },

  // Variable events
  { event: 'variable_created', description: 'When an admin creates a new variable' },
  { event: 'variable_updated', description: 'When an admin updates an existing variable' },
  { event: 'variable_disabled', description: 'When an admin disables a variable (soft-delete)' },
  { event: 'variable_calculation_updated', description: 'When an admin updates variable calculation fields (calculation method, brackets, classifications, rates)' },

  // Tax bracket events
  { event: 'tax_bracket_created', description: 'When an admin creates a new tax bracket' },
  { event: 'tax_bracket_updated', description: 'When an admin updates an existing tax bracket' },
  { event: 'tax_bracket_deleted', description: 'When an admin deletes a tax bracket (soft-delete)' },

  // LOB events
  { event: 'lob_updated', description: 'When an admin updates an existing LOB' },

  // Claimable document fee events
  { event: 'claimable_document_fee_created', description: 'When an admin creates a new claimable document fee' },
  { event: 'claimable_document_fee_updated', description: 'When an admin updates an existing claimable document fee' },
  { event: 'claimable_document_fee_disabled', description: 'When an admin disables a claimable document fee (soft-delete)' },

  // Penalty rule events
  { event: 'penalty_rule_created', description: 'When an admin creates a new penalty rule' },
  { event: 'penalty_rule_updated', description: 'When an admin updates an existing penalty rule' },
  { event: 'penalty_rule_published', description: 'When an admin publishes a penalty rule draft' },
  { event: 'penalty_rule_disabled', description: 'When an admin disables a penalty rule (soft-delete)' },

  // Requirement events
  { event: 'requirement_created', description: 'When an admin creates a new requirement' },
  { event: 'requirement_updated', description: 'When an admin updates an existing requirement' },
  { event: 'requirement_published', description: 'When an admin publishes a requirement draft' },
  { event: 'requirement_disabled', description: 'When an admin disables a requirement (soft-delete)' },

  // Post-requirement events
  { event: 'post_requirement_created', description: 'When an admin creates a new post-requirement' },
  { event: 'post_requirement_updated', description: 'When an admin updates an existing post-requirement' },
  { event: 'post_requirement_disabled', description: 'When an admin disables a post-requirement (soft-delete)' },

  // Violation events
  { event: 'violation_created', description: 'When an admin creates a new violation' },
  { event: 'violation_updated', description: 'When an admin updates an existing violation' },
  { event: 'violation_disabled', description: 'When an admin disables a violation (soft-delete)' },

  // Permit form events
  { event: 'permit_form_created', description: 'When an admin creates a new permit form' },
  { event: 'permit_form_updated', description: 'When an admin updates an existing permit form' },
  { event: 'permit_form_disabled', description: 'When an admin disables a permit form (soft-delete)' },
  { event: 'permit_form_status_changed', description: 'When an admin changes the status of a permit form' },

  // Inspection item events
  { event: 'inspection_item_created', description: 'When an admin creates a new inspection item' },
  { event: 'inspection_item_updated', description: 'When an admin updates an existing inspection item' },
  { event: 'inspection_item_disabled', description: 'When an admin disables an inspection item (soft-delete)' },

  // Checklist events
  { event: 'checklist_created', description: 'When an admin creates a new checklist' },
  { event: 'checklist_updated', description: 'When an admin updates an existing checklist' },
  { event: 'checklist_disabled', description: 'When an admin disables a checklist (soft-delete)' },

  // Requirement group events
  { event: 'requirement_group_created', description: 'When an admin creates a new requirement group' },
  { event: 'requirement_group_updated', description: 'When an admin updates an existing requirement group' },
  { event: 'requirement_group_published', description: 'When an admin publishes a requirement group draft' },
  { event: 'requirement_group_disabled', description: 'When an admin disables a requirement group (soft-delete)' },

  // Application events
  { event: 'application_submitted', description: 'When a business owner submits a new permit application' },
  { event: 'application_rejected', description: 'When an LGU officer rejects an application' },
  { event: 'application_returned', description: 'When an application is returned to the business owner for revisions' },
  { event: 'review_completed', description: 'When an officer completes the review process for an application' },
  { event: 'decision_revoked', description: 'When an officer revokes a previous decision on an application' },
  { event: 'walkin_application_created', description: 'When an LGU officer creates a walk-in application on behalf of a business owner' },
  { event: 'application_claimed', description: 'When an LGU officer claims an application for review' },
  { event: 'application_released', description: 'When an LGU officer releases an application back to the pool' },
  { event: 'application_transferred', description: 'When an LGU officer transfers an application to another officer' },

  // Appeal events
  { event: 'appeal_submitted', description: 'When a business owner submits an appeal for a rejected application' },
  { event: 'appeal_resolved', description: 'When an LGU officer approves an appeal' },
  { event: 'appeal_rejected', description: 'When an LGU officer rejects an appeal' },

  // Edit request events
  { event: 'edit_request_submitted', description: 'When a business owner submits an edit request' },
  { event: 'edit_request_applied', description: 'When an LGU officer applies an edit request' },

  // Field review events
  { event: 'field_reviewed', description: 'When an officer reviews and approves/rejects specific form fields' },
  { event: 'field_decisions_updated', description: 'When field review decisions are updated' },

  // Pending action events
  { event: 'pending_action_created', description: 'When a pending action is scheduled' },
  { event: 'pending_action_cancelled', description: 'When a pending action is cancelled' },

  // Payment events
  { event: 'payment_recorded', description: 'When a payment is successfully recorded' },
  { event: 'mock_payment_recorded', description: 'When a mock payment is recorded for testing' },
  { event: 'payment_webhook_received', description: 'When a payment webhook is received from payment gateway' },

  // Help request events
  { event: 'claim', description: 'When an LGU officer claims a help request' },
  { event: 'release', description: 'When an LGU officer releases a help request' },
  { event: 'status_update', description: 'When the status of a help request is updated' },
  { event: 'priority_update', description: 'When the priority of a help request is updated' },

  // Business owner events
  { event: 'business_owner_registered', description: 'When a new business owner account is registered' },
  { event: 'business_owner_linked', description: 'When a business owner is linked to a business' },
  { event: 'account_status_changed', description: 'When the account status is changed' },
  { event: 'account_deleted', description: 'When a business owner account is deleted' },
  { event: 'account_activated', description: 'When a business owner account is activated' },
  { event: 'account_locked', description: 'When a business owner account is locked' },
  { event: 'account_unlocked', description: 'When a business owner account is unlocked' },
  { event: 'personal_info_updated', description: 'When personal information is updated' },
  { event: 'address_updated', description: 'When address information is updated' },
  { event: 'contact_info_updated', description: 'When contact information is updated' },
  { event: 'email_update_requested', description: 'When an email update is requested' },
  { event: 'email_updated', description: 'When the email is updated' },
  { event: 'password_reset', description: 'When the password is reset' },
  { event: 'mfa_changed', description: 'When multi-factor authentication settings are changed' },
  { event: 'business_owner_bookmarked', description: 'When a business owner is bookmarked by an officer' },
  { event: 'business_owner_unbookmarked', description: 'When a business owner is unbookmarked' },
  { event: 'business_owner_viewed', description: 'When a business owner profile is viewed' },
  { event: 'name_updated', description: 'When the business owner name is updated' },
  { event: 'pis_updated', description: 'When the PIS (Permit ID System) is updated' },

  // Permit processing events
  { event: 'permit_request_created', description: 'When a permit processing request is created' },
  { event: 'permit_claimed', description: 'When an officer claims a permit request' },
  { event: 'permit_released', description: 'When an officer releases a permit request' },
  { event: 'permit_printing_started', description: 'When permit printing is started' },
  { event: 'permit_printed', description: 'When permits are successfully printed' },
  { event: 'owner_notified', description: 'When the business owner is notified' },
  { event: 'owner_claimed', description: 'When the business owner claims the permit' },
  { event: 'permit_completed', description: 'When permit processing is completed' },

  // CMS events
  { event: 'faq_updated', description: 'When FAQ content is updated' },
  { event: 'instruction_updated', description: 'When instruction content is updated' },
]

// Helper function to get event type label
export function getEventTypeLabel(eventType) {
  return EVENT_TYPE_LABELS[eventType] || eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
