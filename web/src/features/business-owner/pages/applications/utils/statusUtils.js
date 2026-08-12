/**
 * Centralized status utilities for business applications
 * Single source of truth for status labels, colors, and configurations
 * Re-exports from shared utils for backward compatibility
 */

export * from '@/shared/utils/statusUtils'

/**
 * Get save status tag text and color from autosave state
 * @param {object} status - Autosave status object
 * @param {boolean} status.isAutosaving - Whether an autosave is in progress
 * @param {boolean} status.hasUnsavedChanges - Whether there are unsaved changes
 * @param {Error|null} status.saveError - Save error, if any
 * @returns {{text: string, color: string}} Tag text and color
 */
export function getSaveStatus({ isAutosaving, hasUnsavedChanges, saveError }) {
  return {
    text: saveError
      ? 'Could not save — will retry'
      : isAutosaving
      ? 'Saving your changes...'
      : hasUnsavedChanges
      ? 'Saves 15s after you stop typing'
      : 'All changes saved.',
    color: saveError
      ? 'error'
      : isAutosaving
      ? 'processing'
      : hasUnsavedChanges
      ? 'warning'
      : 'success',
  }
}

/**
 * Get the FAQ slot ID for an application status
 * @param {string} applicationStatus - Application status
 * @returns {string} FAQ slot ID
 */
export function getApplicationFaqSlotId(applicationStatus) {
  const status = (applicationStatus || '').toLowerCase()

  if (status === 'returned') return 'business-owner-returned-faq'
  if (status === 'draft') return 'business-owner-draft-faq'
  if (status === 'pending' || status === 'submitted') return 'business-owner-pending-faq'
  if (status === 'approved') return 'business-owner-approved-faq'
  if (status === 'needs_revision' || status === 'needs revision' || status === 'resubmit') return 'business-owner-needs-revision-faq'
  if (status === 'appeal_pending' || status === 'appeal pending') return 'business-owner-appeal-pending-faq'
  if (status === 'appeal_rejected' || status === 'appeal rejected') return 'business-owner-appeal-rejected-faq'
  if (status === 'rejected') return 'business-owner-rejected-faq'

  return 'business-owner-application-faq'
}
