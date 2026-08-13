import { formatDate } from '@/features/business-owner/pages/applications/utils/formatters.js'
import { isApprovedStatus, isRejectedStatus } from '@/shared/utils/statusUtils'

const STEP_TITLES = {
  draftInProgress: 'Draft in Progress',
  submitted: 'Submitted',
  resubmitted: 'Resubmitted',
  underReview: 'Under Review',
  reviewInProgress: 'Review in Progress',
  returnedToApplicant: 'Returned to Applicant',
  resubmitToReview: 'Resubmit to Review',
  waitingForReview: 'Waiting for Review',
  approved: 'Approved',
  applicationRejected: 'Application Rejected',
  appealFiled: 'Appeal Filed',
  appealUnderReview: 'Appeal Under Review',
  appealGranted: 'Appeal Granted',
  appealRejected: 'Appeal Rejected',
  approvedAfterAppeal: 'Approved After Appeal',
  createdByOfficer: 'Created by Officer',
}

function getPendingActionTitle(actionType) {
  switch (actionType) {
    case 'return':
      return 'Return to Applicant (Pending)'
    case 'reject':
      return 'Reject Application (Pending)'
    case 'complete_review':
      return 'Approve Application (Pending)'
    case 'reject_appeal':
      return 'Reject Appeal (Pending)'
    default:
      return 'Decision Pending'
  }
}

function getFinalStep(actionType, content) {
  switch (actionType) {
    case 'return':
      return { title: STEP_TITLES.returnedToApplicant, content, status: 'finish' }
    case 'reject':
      return { title: STEP_TITLES.applicationRejected, content, status: 'error' }
    case 'complete_review':
      return { title: STEP_TITLES.approved, content, status: 'finish' }
    case 'reject_appeal':
      return { title: STEP_TITLES.appealRejected, content, status: 'error' }
    default:
      return null
  }
}

function clearPendingStep(steps, actionType) {
  const pendingTitle = getPendingActionTitle(actionType)
  const existingIndex = steps.findIndex(
    (s) => s.title === pendingTitle && s.status === 'process',
  )
  if (existingIndex !== -1) {
    steps.splice(existingIndex, 1)
  }
}

function getEventDate(log) {
  return log?.createdAt || log?.timestamp || null
}

function makeStep(title, log, status) {
  const date = getEventDate(log)
  const content = date ? `Finished on: ${formatDate(date)}` : 'Unknown'
  return { title, content, status, _timestamp: date }
}

function getOutcome(log) {
  const meta = log?.metadata || {}
  if (meta.outcome === 'approved' || meta.status === 'approved' || meta.granted) {
    return 'approved'
  }
  if (
    meta.outcome === 'rejected' ||
    meta.status === 'rejected' ||
    meta.granted === false
  ) {
    return 'rejected'
  }
  return null
}

/**
 * Build chronological steps from audit logs.
 * Appeal events are treated as first-class lifecycle events and inserted
 * at their event timestamp.
 */
export function buildAuditSteps(auditLogs, application) {
  const sorted = [...(auditLogs || [])]
    .filter((log) => log?.eventType)
    .sort((a, b) => new Date(getEventDate(a)) - new Date(getEventDate(b)))

  const steps = []
  let lastStepTitle = null

  for (const log of sorted) {
    const date = getEventDate(log)
    const content = date ? `Finished on: ${formatDate(date)}` : 'Unknown'
    const meta = log.metadata || {}
    const event = log.eventType

    switch (event) {
      case 'application_created':
      case 'walkin_application_created': {
        if (application?.createdByOfficer) {
          steps.push(makeStep(STEP_TITLES.createdByOfficer, log, 'finish'))
        }
        const draftIndex = steps.findIndex(
          (s) => s.title === STEP_TITLES.draftInProgress,
        )
        if (draftIndex === -1) {
          steps.push(makeStep(STEP_TITLES.draftInProgress, log, 'finish'))
        } else {
          steps[draftIndex].content = content
          steps[draftIndex]._timestamp = date
        }
        lastStepTitle = STEP_TITLES.draftInProgress
        break
      }
      case 'application_submitted': {
        const title = meta.isResubmit
          ? STEP_TITLES.resubmitted
          : STEP_TITLES.submitted
        steps.push(makeStep(title, log, 'finish'))
        lastStepTitle = title
        break
      }
      case 'application_resubmitted': {
        steps.push(makeStep(STEP_TITLES.resubmitted, log, 'finish'))
        lastStepTitle = STEP_TITLES.resubmitted
        break
      }
      case 'application_claimed': {
        if (lastStepTitle === STEP_TITLES.underReview) {
          steps[steps.length - 1].content = content
          steps[steps.length - 1]._timestamp = date
        } else {
          steps.push(makeStep(STEP_TITLES.underReview, log, 'finish'))
        }
        lastStepTitle = STEP_TITLES.underReview
        break
      }
      case 'application_released':
        // Officer releases are not a milestone for the applicant timeline.
        break
      case 'field_reviewed': {
        if (lastStepTitle === STEP_TITLES.reviewInProgress) {
          steps[steps.length - 1].content = content
          steps[steps.length - 1]._timestamp = date
        } else {
          steps.push(makeStep(STEP_TITLES.reviewInProgress, log, 'finish'))
        }
        lastStepTitle = STEP_TITLES.reviewInProgress
        break
      }
      case 'pending_action_created': {
        const pendingTitle = getPendingActionTitle(meta.actionType)
        const existingIndex = steps.findIndex(
          (s) => s.title === pendingTitle && s.status === 'process',
        )
        if (existingIndex !== -1) {
          steps[existingIndex].content = content
          steps[existingIndex]._timestamp = date
        } else {
          steps.push(makeStep(pendingTitle, log, 'process'))
        }
        lastStepTitle = pendingTitle
        break
      }
      case 'pending_action_cancelled': {
        const pendingTitle = getPendingActionTitle(meta.actionType)
        const existingIndex = steps.findIndex(
          (s) => s.title === pendingTitle && s.status === 'process',
        )
        if (existingIndex !== -1) {
          steps.splice(existingIndex, 1)
        }
        break
      }
      case 'pending_action_executed': {
        const pendingTitle = getPendingActionTitle(meta.actionType)
        const existingIndex = steps.findIndex(
          (s) => s.title === pendingTitle && s.status === 'process',
        )
        if (existingIndex !== -1) {
          steps.splice(existingIndex, 1)
        }
        const finalStep = getFinalStep(meta.actionType, content)
        if (finalStep) {
          steps.push({ ...finalStep, _timestamp: date })
          lastStepTitle = finalStep.title
        }
        break
      }
      case 'application_approved':
      case 'review_completed': {
        clearPendingStep(steps, 'complete_review')
        const approvedTitle =
          application?.hadAppealGranted ||
          lastStepTitle === STEP_TITLES.appealGranted
            ? STEP_TITLES.approvedAfterAppeal
            : STEP_TITLES.approved
        steps.push(makeStep(approvedTitle, log, 'finish'))
        lastStepTitle = approvedTitle
        break
      }
      case 'application_rejected': {
        clearPendingStep(steps, 'reject')
        steps.push(makeStep(STEP_TITLES.applicationRejected, log, 'error'))
        lastStepTitle = STEP_TITLES.applicationRejected
        break
      }
      case 'application_returned': {
        clearPendingStep(steps, 'return')
        steps.push(makeStep(STEP_TITLES.returnedToApplicant, log, 'finish'))
        lastStepTitle = STEP_TITLES.returnedToApplicant
        break
      }
      case 'appeal_submitted': {
        steps.push(makeStep(STEP_TITLES.appealFiled, log, 'finish'))
        lastStepTitle = STEP_TITLES.appealFiled
        break
      }
      case 'appeal_resolved': {
        const outcome = getOutcome(log)
        if (outcome === 'approved') {
          steps.push(makeStep(STEP_TITLES.appealGranted, log, 'finish'))
          lastStepTitle = STEP_TITLES.appealGranted
        } else if (outcome === 'rejected') {
          steps.push(makeStep(STEP_TITLES.appealRejected, log, 'error'))
          lastStepTitle = STEP_TITLES.appealRejected
        }
        break
      }
      case 'appeal_rejected': {
        clearPendingStep(steps, 'reject_appeal')
        steps.push(makeStep(STEP_TITLES.appealRejected, log, 'error'))
        lastStepTitle = STEP_TITLES.appealRejected
        break
      }
      default:
        break
    }
  }

  return steps
}

function ensureStep(steps, title, status, content) {
  const existing = steps.find((s) => s.title === title)
  if (existing) {
    existing.status = status
    if (content) existing.content = content
    return
  }
  steps.push({ title, content: content || 'Pending', status })
}

function lastStepTitle(steps) {
  return steps[steps.length - 1]?.title
}

/**
 * Adjust the timeline to reflect the application status and append the
 * appropriate pending/current step when the audit log is not fully caught up.
 */
export function applyCurrentStatus(steps, statusLower, application) {
  if (!statusLower) return

  // Draft-related states: the draft step should be active if not yet submitted.
  if (
    [
      'draft',
      'officer_draft',
      'requirements_viewed',
      'form_completed',
      'documents_uploaded',
      'bir_registered',
      'agencies_registered',
    ].includes(statusLower)
  ) {
    const draft = steps.find((s) => s.title === STEP_TITLES.draftInProgress)
    if (draft) {
      draft.status = 'process'
      if (statusLower === 'officer_draft') {
        draft.content = 'Officer is completing the application'
      } else if (draft._timestamp) {
        draft.content = `Started on: ${formatDate(draft._timestamp)}`
      } else {
        draft.content = 'In progress'
      }
    }
    return
  }

  const hasProcess = steps.some((s) => s.status === 'process')

  // Terminal states: make sure the final step exists and is final.
  if (statusLower === 'approved') {
    const existingApproved = steps.find(
      (s) =>
        s.title === STEP_TITLES.approved ||
        s.title === STEP_TITLES.approvedAfterAppeal,
    )
    if (existingApproved) {
      existingApproved.status = 'finish'
    } else if (application?.hadAppealGranted) {
      steps.push({
        title: STEP_TITLES.approvedAfterAppeal,
        content: 'Approved on: Unknown',
        status: 'finish',
      })
    } else {
      ensureStep(steps, STEP_TITLES.approved, 'finish')
    }
    return
  }

  if (statusLower === 'rejected') {
    ensureStep(steps, STEP_TITLES.applicationRejected, 'error')
    return
  }

  if (statusLower === 'appeal_rejected') {
    ensureStep(steps, STEP_TITLES.appealRejected, 'error')
    return
  }

  // Submitted: mark submitted finish and show review as the active step.
  if (statusLower === 'submitted') {
    const submitted = steps.find((s) => s.title === STEP_TITLES.submitted)
    if (submitted) submitted.status = 'finish'
    const existingReview = steps.find(
      (s) =>
        s.title === STEP_TITLES.underReview ||
        s.title === STEP_TITLES.reviewInProgress,
    )
    if (existingReview) {
      existingReview.status = 'process'
    } else {
      steps.push({
        title: STEP_TITLES.underReview,
        content: 'Expected within 24 hours',
        status: 'process',
      })
    }
    return
  }

  // Under review: mark the most recent review step active, or add one after
  // an appeal grant.
  if (statusLower === 'under_review') {
    const last = lastStepTitle(steps)
    const isAfterAppeal =
      last === STEP_TITLES.appealGranted || last === STEP_TITLES.appealRejected
    if (isAfterAppeal) {
      steps.push({
        title: STEP_TITLES.underReview,
        content: 'Appeal granted; application is under re-review',
        status: 'process',
      })
      return
    }

    const reviewStep = steps
      .slice()
      .reverse()
      .find(
        (s) =>
          s.title === STEP_TITLES.underReview ||
          s.title === STEP_TITLES.reviewInProgress,
      )
    if (reviewStep) {
      reviewStep.status = 'process'
    } else if (!hasProcess) {
      steps.push({
        title: STEP_TITLES.underReview,
        content: 'In Review',
        status: 'process',
      })
    }
    return
  }

  // Returned / needs_revision: ensure return step is marked and add resubmit.
  if (statusLower === 'needs_revision' || statusLower === 'returned') {
    const returned = steps
      .slice()
      .reverse()
      .find((s) => s.title === STEP_TITLES.returnedToApplicant)
    if (returned) returned.status = 'finish'
    if (!steps.some((s) => s.title === STEP_TITLES.resubmitToReview)) {
      steps.push({
        title: STEP_TITLES.resubmitToReview,
        content: 'Waiting for business owner to resubmit',
        status: 'process',
      })
    }
    return
  }

  // Resubmit: mark resubmitted and queue review.
  if (statusLower === 'resubmit') {
    const resubmitted = steps.find((s) => s.title === STEP_TITLES.resubmitted)
    if (resubmitted) resubmitted.status = 'finish'
    if (!hasProcess && !steps.some((s) => s.title === STEP_TITLES.waitingForReview)) {
      steps.push({
        title: STEP_TITLES.waitingForReview,
        content: 'Application is under review',
        status: 'process',
      })
    }
    return
  }

  // Appeal pending: ensure appeal filed is finish and add appeal under review.
  if (statusLower === 'appeal_pending') {
    const filed = steps.find((s) => s.title === STEP_TITLES.appealFiled)
    if (filed) filed.status = 'finish'
    if (!steps.some((s) => s.title === STEP_TITLES.appealUnderReview)) {
      steps.push({
        title: STEP_TITLES.appealUnderReview,
        content: 'Appeal is being reviewed',
        status: 'process',
      })
    }
    return
  }
}

/**
 * Fallback timeline for legacy applications without audit data.
 */
export function buildFallbackSteps(application, statusLower, latestAppeal) {
  const isRejected =
    isRejectedStatus(statusLower) ||
    statusLower === 'appeal_pending' ||
    statusLower === 'appeal_rejected'
  const isApproved = isApprovedStatus(statusLower)
  const isAppealPending = statusLower === 'appeal_pending'
  const isAppealRejected = statusLower === 'appeal_rejected'
  const isReturned =
    statusLower === 'needs_revision' ||
    statusLower === 'returned' ||
    statusLower === 'resubmit'
  const hasActiveAppeal = application?.hasActiveAppeal || isAppealPending
  const appealExhausted = application?.appealExhausted
  const hasAppeal =
    hasActiveAppeal || appealExhausted || latestAppeal
  const createdByOfficer = application?.createdByOfficer === true
  const isOfficerDraft = statusLower === 'officer_draft'

  const steps = []

  if (isOfficerDraft) {
    steps.push({
      title: STEP_TITLES.createdByOfficer,
      content: application?.createdAt
        ? `Created on: ${formatDate(application.createdAt)}`
        : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: STEP_TITLES.draftInProgress,
      content: 'Officer is completing the application',
      status: isApproved ? 'finish' : 'process',
    })
    if (isApproved) {
      steps.push({
        title: STEP_TITLES.approved,
        content: application?.reviewedAt
          ? `Finished on: ${formatDate(application.reviewedAt)}`
          : 'Pending',
        status: 'finish',
      })
    } else {
      steps.push({
        title: 'Pending Approval',
        content: 'Waiting for officer to finish and approve',
        status: 'wait',
      })
    }
  } else {
    if (createdByOfficer) {
      steps.push({
        title: STEP_TITLES.createdByOfficer,
        content: application?.createdAt
          ? `Created on: ${formatDate(application.createdAt)}`
          : 'Unknown',
        status: 'finish',
      })
    }

    steps.push({
      title: STEP_TITLES.draftInProgress,
      content:
        statusLower === 'draft'
          ? 'In progress'
          : application?.createdAt
            ? `Finished on: ${formatDate(application.createdAt)}`
            : 'Not started',
      status: statusLower === 'draft' ? 'process' : 'finish',
    })

    steps.push({
      title: STEP_TITLES.submitted,
      content: application?.submittedAt
        ? `Finished on: ${formatDate(application.submittedAt)}`
        : 'Not submitted',
      status: [
        'submitted',
        'under_review',
        'needs_revision',
        'returned',
        'resubmit',
        'approved',
        'rejected',
        'appeal_pending',
        'appeal_rejected',
      ].includes(statusLower)
        ? 'finish'
        : 'wait',
    })
  }

  if (!isOfficerDraft) {
    steps.push({
      title: isReturned ? 'Review Completed' : STEP_TITLES.underReview,
      content:
        statusLower === 'submitted'
          ? 'Expected within 24 hours'
          : statusLower === 'under_review'
            ? application?.reviewedAt
              ? `Started on: ${formatDate(application.reviewedAt)}`
              : 'In Review'
            : isReturned
              ? application?.updatedAt
                ? `Finished on: ${formatDate(application.updatedAt)}`
                : 'Completed'
              : application?.reviewedAt
                ? `Finished on: ${formatDate(application.reviewedAt)}`
                : 'Pending',
      status:
        statusLower === 'under_review'
          ? 'process'
          : isReturned
            ? 'finish'
            : ['approved', 'rejected', 'appeal_pending', 'appeal_rejected'].includes(
                statusLower,
              )
              ? 'finish'
              : 'wait',
    })

    steps.push({
      title: isReturned
        ? STEP_TITLES.returnedToApplicant
        : isRejected || isAppealPending || isAppealRejected
          ? STEP_TITLES.applicationRejected
          : isApproved
            ? STEP_TITLES.approved
            : 'Decision Pending',
      content: isReturned
        ? application?.updatedAt
          ? `Returned on: ${formatDate(application.updatedAt)}`
          : 'Pending'
        : statusLower === 'approved'
          ? `Finished on: ${formatDate(application.reviewedAt)}`
          : statusLower === 'rejected' || isAppealPending || isAppealRejected
            ? `Finished on: ${formatDate(application.reviewedAt)}`
            : 'Pending',
      status: isReturned
        ? 'finish'
        : isRejected || isAppealPending || isAppealRejected
          ? 'error'
          : isApproved
            ? 'finish'
            : 'wait',
    })
  }

  if (isReturned && statusLower === 'resubmit') {
    steps.push({
      title: STEP_TITLES.resubmitted,
      content: application?.updatedAt
        ? `Resubmitted on: ${formatDate(application.updatedAt)}`
        : 'Pending',
      status: 'finish',
    })
    steps.push({
      title: STEP_TITLES.waitingForReview,
      content: 'Application is under review',
      status: 'process',
    })
  } else if (isReturned) {
    steps.push({
      title: STEP_TITLES.resubmitToReview,
      content: 'Waiting for business owner to resubmit',
      status: 'process',
    })
  }

  if (isApproved && application?.returnCount > 0) {
    const stepIndex = steps.findIndex((s) => s.title === STEP_TITLES.approved)
    if (stepIndex !== -1) steps.splice(stepIndex, 1)

    steps.push({
      title: 'Returned for Revision',
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'error',
    })
    steps.push({
      title: STEP_TITLES.resubmitted,
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: 'Re-review Completed',
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: STEP_TITLES.approved,
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish',
    })
  }

  if (isRejected && application?.returnCount > 0) {
    const stepIndex = steps.findIndex((s) => s.title === STEP_TITLES.applicationRejected)
    if (stepIndex !== -1) steps.splice(stepIndex, 1)

    steps.push({
      title: 'Returned for Revision',
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'error',
    })
    steps.push({
      title: STEP_TITLES.resubmitted,
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: 'Re-review Completed',
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: STEP_TITLES.applicationRejected,
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'error',
    })
  }

  if (hasAppeal) {
    const rejectedStepIndex = steps.findIndex((s) => s.title === STEP_TITLES.applicationRejected)
    if (rejectedStepIndex !== -1) steps.splice(rejectedStepIndex, 1)

    if (latestAppeal) {
      steps.push({
        title: STEP_TITLES.appealFiled,
        content: latestAppeal.createdAt
          ? formatDate(latestAppeal.createdAt)
          : 'Unknown',
        status: 'finish',
      })

      if (isAppealPending) {
        steps.push({
          title: STEP_TITLES.appealUnderReview,
          content: 'Appeal is being reviewed',
          status: 'process',
        })
      } else if (isAppealRejected) {
        steps.push({
          title: STEP_TITLES.appealRejected,
          content: latestAppeal.updatedAt
            ? formatDate(latestAppeal.updatedAt)
            : 'Unknown',
          status: 'error',
        })
      } else if (application?.hadAppealGranted) {
        steps.push({
          title: STEP_TITLES.appealGranted,
          content: latestAppeal.updatedAt
            ? formatDate(latestAppeal.updatedAt)
            : 'Unknown',
          status: 'finish',
        })

        if (isApproved) {
          steps.push({
            title: STEP_TITLES.approvedAfterAppeal,
            content: application?.reviewedAt
              ? formatDate(application.reviewedAt)
              : 'Unknown',
            status: 'finish',
          })
        }
      }
    } else if (appealExhausted) {
      steps.push({
        title: 'Appeal Exhausted',
        content: 'No more appeals available',
        status: 'error',
      })
    }
  }

  const current = steps.findIndex((s) => s.status === 'process')
  return { steps, current }
}

function hasAppealEvent(auditLogs) {
  return (auditLogs || []).some((log) =>
    ['appeal_submitted', 'appeal_resolved', 'appeal_rejected'].includes(
      log?.eventType,
    ),
  )
}

function makeSyntheticAppealLogs(latestAppeal) {
  if (!latestAppeal) return []
  const logs = []

  if (latestAppeal.createdAt) {
    logs.push({
      eventType: 'appeal_submitted',
      createdAt: latestAppeal.createdAt,
      metadata: {
        appealId:
          typeof latestAppeal._id === 'string'
            ? latestAppeal._id
            : latestAppeal._id?.toString?.(),
        appealType: latestAppeal.appealType,
        status: 'submitted',
      },
    })
  }

  if (latestAppeal.updatedAt && ['approved', 'rejected'].includes(latestAppeal.status)) {
    logs.push({
      eventType: 'appeal_resolved',
      createdAt: latestAppeal.updatedAt,
      metadata: {
        appealId:
          typeof latestAppeal._id === 'string'
            ? latestAppeal._id
            : latestAppeal._id?.toString?.(),
        appealType: latestAppeal.appealType,
        outcome: latestAppeal.status,
        granted: latestAppeal.status === 'approved',
        status: latestAppeal.status,
      },
    })
  }

  return logs
}

function applyStepStyles(steps, styleTokens) {
  if (!styleTokens) return
  for (const step of steps) {
    if (step.title === STEP_TITLES.returnedToApplicant) {
      step.styles = {
        itemIcon: {
          backgroundColor: styleTokens.colorVolcano,
          borderColor: styleTokens.colorVolcano,
          color: '#fff',
        },
        itemTitle: { color: styleTokens.colorVolcano },
      }
    } else if (step.title === STEP_TITLES.appealFiled) {
      step.styles = {
        itemIcon: {
          backgroundColor: styleTokens.colorPurple,
          borderColor: styleTokens.colorPurple,
          color: '#fff',
        },
        itemTitle: { color: styleTokens.colorPurple },
      }
    }
  }
}

/**
 * Build the full progress timeline.
 *
 * If audit logs exist, appeal events that are missing are reconstructed from
 * `latestAppeal` and merged into the audit stream so the timeline is
 * chronologically correct. If no audit logs exist, a best-effort fallback is
 * built from the application and appeal fields.
 */
export function buildProgressSteps(
  auditLogs,
  application,
  statusLower,
  latestAppeal,
  styleTokens,
) {
  let result
  if (auditLogs?.length) {
    let merged = [...auditLogs]

    if (latestAppeal && !hasAppealEvent(auditLogs)) {
      const synthetic = makeSyntheticAppealLogs(latestAppeal)
      merged = [...merged, ...synthetic].sort(
        (a, b) => new Date(getEventDate(a)) - new Date(getEventDate(b)),
      )
    }

    const steps = buildAuditSteps(merged, application)
    applyCurrentStatus(steps, statusLower, application)

    const currentIndex = steps.findIndex((s) => s.status === 'process')
    const current = currentIndex !== -1 ? currentIndex : steps.length

    // Strip internal sorting key before returning to the UI.
    const displaySteps = steps.map(({ _timestamp, ...rest }) => rest)

    result = { steps: displaySteps, current }
  } else {
    result = buildFallbackSteps(application, statusLower, latestAppeal)
  }

  applyStepStyles(result.steps, styleTokens)
  return result
}

export default buildProgressSteps
