/**
 * Centralized status utilities for business applications
 * Single source of truth for status labels, colors, and configurations
 */

/**
 * Status label mappings
 */
export const STATUS_LABELS = {
  draft: 'Draft',
  officer_draft: 'Officer Draft',
  submitted: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Active',
  active: 'Active',
  needs_revision: 'Action Required',
  returned: 'Returned',
  resubmit: 'Resubmitted',
  rejected: 'Rejected',
  expired: 'Expired',
  suspended: 'Suspended',
  appeal_pending: 'Appeal Pending',
  appeal_rejected: 'Appeal Rejected',
  unknown: 'Unknown'
}

/**
 * Status color/tag mappings for Ant Design
 */
export const STATUS_COLORS = {
  draft: 'default',
  officer_draft: 'cyan',
  submitted: 'blue',
  under_review: 'gold',
  approved: 'green',
  active: 'green',
  needs_revision: 'volcano',
  returned: 'volcano',
  resubmit: 'cyan',
  rejected: 'red',
  expired: 'red',
  suspended: 'magenta',
  appeal_pending: 'purple',
  appeal_rejected: 'red',
  unknown: 'default'
}

/**
 * Normalize status string to match our status keys
 * Handles: camelCase, PascalCase, all caps, no separators, hyphens, underscores, spaces
 * @param {string} status - Raw status from API
 * @returns {string} Normalized status key
 */
function normalizeStatus(status) {
  if (!status) return 'unknown'
  
  // Convert to lowercase
  let normalized = status.toLowerCase()
  
  // Handle camelCase/PascalCase: insert underscore before uppercase letters
  normalized = normalized.replace(/([a-z])([A-Z])/g, '$1_$2')
  
  // Replace hyphens and spaces with underscores
  normalized = normalized.replace(/[-\s]/g, '_')
  
  // Remove any non-alphanumeric/underscore characters
  normalized = normalized.replace(/[^a-z0-9_]/g, '')
  
  return normalized
}

/**
 * Get human-readable status label
 * @param {string} status - Raw status from API
 * @returns {string} Human-readable label
 */
export function getStatusLabel(status) {
  if (!status) return STATUS_LABELS.unknown
  const normalized = normalizeStatus(status)
  const label = STATUS_LABELS[normalized]
  
  if (!label) {
    console.warn(`[statusUtils] Unknown status: "${status}" (normalized: "${normalized}")`)
  }
  
  return label || STATUS_LABELS.unknown
}

/**
 * Get Ant Design tag color for status
 * @param {string} status - Raw status from API
 * @returns {string} Ant Design color name
 */
export function getStatusTagColor(status) {
  if (!status) return STATUS_COLORS.unknown
  const normalized = normalizeStatus(status)
  return STATUS_COLORS[normalized] || STATUS_COLORS.unknown
}

/**
 * Check if status is a draft
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isDraftStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'draft'
}

/**
 * Check if status is approved/active
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isApprovedStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'approved' || normalized === 'active'
}

/**
 * Check if status needs revision
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isNeedsRevisionStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'needs_revision'
}

/**
 * Check if status is resubmitted
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isResubmittedStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'resubmit'
}

/**
 * Check if status is returned
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isReturnedStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'returned'
}

/**
 * Check if status is rejected
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isRejectedStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'rejected' || normalized === 'appeal_pending'
}

/**
 * Check if status is appeal pending
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isAppealPendingStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'appeal_pending'
}

/**
 * Check if status is appeal rejected
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isAppealRejectedStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'appeal_rejected'
}

/**
 * Check if status is pending (any form of pending)
 * @param {string} status - Raw status from API
 * @returns {boolean}
 */
export function isPendingStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'submitted' || 
         normalized === 'under_review' || 
         normalized.includes('pending') ||
         normalized.includes('review')
}

/**
 * Get application display name from various possible fields
 * @param {object} application - Application object
 * @returns {string} Display name
 */
export function getApplicationDisplayName(application) {
  if (!application) return 'Unnamed Application'
  return application.businessName ||
         application.tradeName ||
         application.registeredBusinessName ||
         application.formData?.businessName ||
         application.formData?.['Business / trade name'] ||
         application.formData?.['Business Name'] ||
         application.formData?.['Trade Name'] ||
         application.formData?.tradeName ||
         'Unnamed Application'
}

/**
 * Get application reference number
 * @param {object} application - Application object
 * @returns {string|null} Reference number or null
 */
export function getApplicationReferenceNumber(application) {
  if (!application) return null
  return application.applicationReferenceNumber ||
         application.registrationNumber ||
         null
}

/**
 * Get application ID (handles both applicationId and _id)
 * @param {object} application - Application object
 * @returns {string|null} Application ID or null
 */
export function getApplicationId(application) {
  if (!application) return null
  return application.applicationId || application._id || null
}

/**
 * Format kebab-case string to Title Case
 * @param {string} str - Kebab-case string (e.g., "unified-business-permit")
 * @returns {string} Title Case string (e.g., "Unified Business Permit")
 */
export function formatKebabCaseToTitleCase(str) {
  if (!str) return ''
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
