export function useBusinessOwnerApplicationStatus(business) {
  const status = business?.applicationStatus || business?.permitStatus || ''
  const statusLower = status?.toLowerCase() || ''

  // Draft statuses - editable form with autosave
  const draftStatuses = ['draft', 'requirements_viewed', 'form_completed', 'documents_uploaded', 'bir_registered', 'agencies_registered']
  const isDraft = draftStatuses.includes(statusLower)

  // Pending/under review statuses - read-only form
  const pendingStatuses = ['submitted', 'under_review', 'pending_review']
  const isPending = pendingStatuses.includes(statusLower)

  // Approved status - read-only form
  const isApproved = statusLower === 'approved'

  // Needs revision - editable form with locked fields
  const isNeedsRevision = statusLower === 'needs_revision'

  // Returned - editable form with locked fields + payment (includes needs_revision)
  const isReturned = statusLower === 'returned' || statusLower === 'needs_revision'

  // Rejected - read-only form with appeal option
  const isRejected = statusLower === 'rejected'

  // Appeal statuses
  const isAppealPending = statusLower === 'appeal_pending'
  const isAppealRejected = statusLower === 'appeal_rejected'

  // Resubmitted - treated like pending but with resubmit context
  const isResubmitted = statusLower === 'resubmit'

  // Whether form should be editable
  const isEditable = isDraft || isNeedsRevision || isReturned

  // Whether form should be read-only
  const isReadOnly = !isEditable

  // Whether application is in a final state (no more changes possible)
  const isFinalState = isApproved || isRejected || isAppealRejected

  // Whether locked fields should be applied (from fieldReviewDecisions)
  const hasLockedFields = isNeedsRevision || isReturned

  return {
    status,
    statusLower,
    isDraft,
    isPending,
    isApproved,
    isNeedsRevision,
    isReturned,
    isRejected,
    isAppealPending,
    isAppealRejected,
    isResubmitted,
    isEditable,
    isReadOnly,
    isFinalState,
    hasLockedFields,
  }
}
