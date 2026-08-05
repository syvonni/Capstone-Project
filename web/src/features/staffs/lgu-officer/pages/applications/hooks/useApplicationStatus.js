export function useApplicationStatus(application, currentUser) {
  const status = application?.status || application?.applicationStatus
  const reviewableStatuses = ['submitted', 'resubmit', 'under_review', 'pending_review', 'appeal_pending']
  const canReview = reviewableStatuses.includes(status)
  const isFinalDecision = status === 'approved' || status === 'rejected' || status === 'needs_revision' || status === 'appeal_rejected'
  const isWaitingForApplicant = status === 'needs_revision'
  const isDraft = ['draft', 'officer_draft', 'requirements_viewed', 'form_completed', 'documents_uploaded', 'bir_registered', 'agencies_registered'].includes(status)
  const isOfficerDraft = status === 'officer_draft' && application?.createdByOfficer === true

  // Check if current user is the one who claimed the application
  const claimedById = application?.reviewedBy && typeof application.reviewedBy === 'object'
    ? application.reviewedBy._id || application.reviewedBy.id
    : application?.reviewedBy
  const isClaimedByMe = claimedById && String(claimedById) === String(currentUser?.id || currentUser?._id)

  return {
    canReview,
    isFinalDecision,
    isWaitingForApplicant,
    isActiveReviewState: canReview && isClaimedByMe,
    isDraft,
    isOfficerDraft,
    isClaimedByMe,
  }
}
