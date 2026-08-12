import { Steps } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { formatDate } from '@/features/business-owner/pages/applications/utils/formatters.js'
import { isApprovedStatus, isRejectedStatus } from '@/features/business-owner/pages/applications/utils/statusUtils'
import { useState, useEffect, useMemo } from 'react'
import { getAppealById } from '@/features/business-owner/services/appealsService.js'
import { getAppealsByBusiness } from '@/features/staffs/lgu-officer/services/appealsService.js'
import { useAudit } from '@/shared/audit/hooks/useAudit'

/**
 * Build a human-readable progress timeline from the application's audit log.
 * This is the primary source of truth for the application history, so it can
 * show repeated returned/resubmitted/review/approved/rejected cycles.
 */
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
      return { title: 'Returned to Applicant', content, status: 'error' }
    case 'reject':
      return { title: 'Application Rejected', content, status: 'error' }
    case 'complete_review':
      return { title: 'Approved', content, status: 'finish' }
    case 'reject_appeal':
      return { title: 'Appeal Rejected', content, status: 'error' }
    default:
      return null
  }
}

function getEventDate(log) {
  return log?.createdAt || log?.timestamp || null
}

function buildAuditSteps(auditLogs, application) {
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
          steps.push({
            title: 'Created by Officer',
            content,
            status: 'finish',
          })
        }
        const draftIndex = steps.findIndex((s) => s.title === 'Draft in Progress')
        if (draftIndex === -1) {
          steps.push({ title: 'Draft in Progress', content, status: 'finish' })
        } else {
          steps[draftIndex].content = content
        }
        lastStepTitle = 'Draft in Progress'
        break
      }
      case 'application_submitted': {
        const title = meta.isResubmit ? 'Resubmitted' : 'Submitted'
        steps.push({ title, content, status: 'finish' })
        lastStepTitle = title
        break
      }
      case 'application_resubmitted': {
        steps.push({ title: 'Resubmitted', content, status: 'finish' })
        lastStepTitle = 'Resubmitted'
        break
      }
      case 'application_claimed': {
        if (lastStepTitle === 'Under Review') {
          steps[steps.length - 1].content = content
        } else {
          steps.push({ title: 'Under Review', content, status: 'finish' })
        }
        lastStepTitle = 'Under Review'
        break
      }
      case 'application_released':
        // Officer releases are not a milestone for the applicant timeline.
        break
      case 'field_reviewed':
      case 'field_decisions_updated': {
        if (lastStepTitle === 'Review in Progress') {
          steps[steps.length - 1].content = content
        } else {
          steps.push({ title: 'Review in Progress', content, status: 'finish' })
        }
        lastStepTitle = 'Review in Progress'
        break
      }
      case 'pending_action_created': {
        const pendingTitle = getPendingActionTitle(meta.actionType)
        const existingIndex = steps.findIndex(
          (s) => s.title === pendingTitle && s.status === 'process',
        )
        if (existingIndex !== -1) {
          steps[existingIndex].content = content
        } else {
          steps.push({ title: pendingTitle, content, status: 'process' })
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
          steps.push(finalStep)
          lastStepTitle = finalStep.title
        }
        break
      }
      case 'application_approved':
      case 'review_completed': {
        steps.push({ title: 'Approved', content, status: 'finish' })
        lastStepTitle = 'Approved'
        break
      }
      case 'application_rejected': {
        steps.push({ title: 'Application Rejected', content, status: 'error' })
        lastStepTitle = 'Application Rejected'
        break
      }
      case 'application_returned': {
        steps.push({ title: 'Returned to Applicant', content, status: 'error' })
        lastStepTitle = 'Returned to Applicant'
        break
      }
      case 'appeal_submitted': {
        steps.push({ title: 'Appeal Filed', content, status: 'finish' })
        lastStepTitle = 'Appeal Filed'
        break
      }
      case 'appeal_resolved': {
        if (
          meta.outcome === 'approved' ||
          meta.granted ||
          meta.status === 'approved'
        ) {
          steps.push({ title: 'Appeal Granted', content, status: 'finish' })
          lastStepTitle = 'Appeal Granted'
        } else {
          steps.push({ title: 'Appeal Rejected', content, status: 'error' })
          lastStepTitle = 'Appeal Rejected'
        }
        break
      }
      case 'appeal_rejected': {
        steps.push({ title: 'Appeal Rejected', content, status: 'error' })
        lastStepTitle = 'Appeal Rejected'
        break
      }
      default:
        break
    }
  }

  return steps
}

/**
 * Adjust the timeline to reflect the application's current status, and append
 * the next expected step when the application is still in progress.
 */
function applyCurrentStatus(steps, statusLower) {
  if (!statusLower) return

  const hasProcess = steps.some((s) => s.status === 'process')

  switch (statusLower) {
    case 'draft': {
      const draft = steps.find((s) => s.title === 'Draft in Progress')
      if (draft) draft.status = 'process'
      break
    }
    case 'submitted': {
      const submitted = steps.find((s) => s.title === 'Submitted')
      if (submitted) submitted.status = 'finish'
      if (!hasProcess && !steps.some((s) => s.title === 'Under Review')) {
        steps.push({
          title: 'Under Review',
          content: 'Expected within 24 hours',
          status: 'wait',
        })
      }
      break
    }
    case 'under_review': {
      if (!hasProcess) {
        const reviewStep = steps
          .slice()
          .reverse()
          .find((s) => s.title === 'Under Review' || s.title === 'Review in Progress')
        if (reviewStep) reviewStep.status = 'process'
      }
      break
    }
    case 'needs_revision':
    case 'returned': {
      const returned = steps
        .slice()
        .reverse()
        .find((s) => s.title === 'Returned to Applicant')
      if (returned) returned.status = 'error'
      if (!steps.some((s) => s.title === 'Resubmit to Review')) {
        steps.push({
          title: 'Resubmit to Review',
          content: 'Waiting for business owner to resubmit',
          status: 'process',
        })
      }
      break
    }
    case 'resubmit': {
      const resubmitted = steps.find((s) => s.title === 'Resubmitted')
      if (resubmitted) resubmitted.status = 'finish'
      if (!hasProcess && !steps.some((s) => s.title === 'Waiting for Review')) {
        steps.push({
          title: 'Waiting for Review',
          content: 'Application is under review',
          status: 'process',
        })
      }
      break
    }
    case 'approved': {
      const approved = steps.find((s) => s.title === 'Approved')
      if (approved) approved.status = 'finish'
      break
    }
    case 'rejected': {
      const rejected = steps.find((s) => s.title === 'Application Rejected')
      if (rejected) rejected.status = 'error'
      break
    }
    default:
      break
  }
}

/**
 * Append appeal steps from the appeal record. The audit log may already contain
 * some appeal events (e.g. reject_appeal via pending action), but most appeal
 * events live on the Appeal entity, so we use the latestAppeal prop to fill them.
 */
function appendAppealSteps(steps, statusLower, latestAppeal, application) {
  if (!latestAppeal) return

  const hasFiled = steps.some((s) => s.title === 'Appeal Filed')
  if (!hasFiled) {
    steps.push({
      title: 'Appeal Filed',
      content: latestAppeal.createdAt
        ? `Filed on: ${formatDate(latestAppeal.createdAt)}`
        : 'Unknown',
      status: 'finish',
    })
  }

  if (statusLower === 'appeal_pending') {
    if (!steps.some((s) => s.title === 'Appeal Under Review')) {
      steps.push({
        title: 'Appeal Under Review',
        content: 'Appeal is being reviewed',
        status: 'process',
      })
    }
  } else if (
    statusLower === 'appeal_rejected' ||
    latestAppeal.status === 'rejected'
  ) {
    if (!steps.some((s) => s.title === 'Appeal Rejected')) {
      steps.push({
        title: 'Appeal Rejected',
        content: latestAppeal.updatedAt
          ? `Rejected on: ${formatDate(latestAppeal.updatedAt)}`
          : 'Unknown',
        status: 'error',
      })
    }
  } else if (
    application?.hadAppealGranted ||
    latestAppeal.status === 'approved'
  ) {
    if (!steps.some((s) => s.title === 'Appeal Granted')) {
      steps.push({
        title: 'Appeal Granted',
        content: latestAppeal.updatedAt
          ? `Granted on: ${formatDate(latestAppeal.updatedAt)}`
          : 'Unknown',
        status: 'finish',
      })
    }
    if (
      (statusLower === 'approved' || isApprovedStatus(statusLower)) &&
      !steps.some((s) => s.title === 'Approved After Appeal')
    ) {
      steps.push({
        title: 'Approved After Appeal',
        content: application?.reviewedAt
          ? `Finished on: ${formatDate(application.reviewedAt)}`
          : 'Unknown',
        status: 'finish',
      })
    }
  }
}

/**
 * Fallback timeline built from application fields when audit data is not yet
 * available. This preserves the original behavior for legacy applications.
 */
function buildFallbackSteps(application, statusLower, latestAppeal) {
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
      title: 'Created by Officer',
      content: application?.createdAt
        ? `Created on: ${formatDate(application.createdAt)}`
        : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: 'Draft in Progress',
      content: 'Officer is completing the application',
      status: isApproved ? 'finish' : 'process',
    })
    if (isApproved) {
      steps.push({
        title: 'Approved',
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
        title: 'Created by Officer',
        content: application?.createdAt
          ? `Created on: ${formatDate(application.createdAt)}`
          : 'Unknown',
        status: 'finish',
      })
    }

    steps.push({
      title: 'Draft in Progress',
      content:
        statusLower === 'draft'
          ? 'In progress'
          : application?.createdAt
            ? `Finished on: ${formatDate(application.createdAt)}`
            : 'Not started',
      status: statusLower === 'draft' ? 'process' : 'finish',
    })

    steps.push({
      title: 'Submitted',
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
      title: isReturned ? 'Review Completed' : 'Under Review',
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
            : ['approved', 'rejected', 'appeal_pending', 'appeal_rejected'].includes(statusLower)
              ? 'finish'
              : 'wait',
    })

    steps.push({
      title: isReturned
        ? 'Returned to Applicant'
        : isRejected || isAppealPending || isAppealRejected
          ? 'Rejected'
          : isApproved
            ? 'Approved'
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
      title: 'Resubmitted',
      content: application?.updatedAt
        ? `Resubmitted on: ${formatDate(application.updatedAt)}`
        : 'Pending',
      status: 'finish',
    })
    steps.push({
      title: 'Waiting for Review',
      content: 'Application is under review',
      status: 'process',
    })
  } else if (isReturned) {
    steps.push({
      title: 'Resubmit to Review',
      content: 'Waiting for business owner to resubmit',
      status: 'process',
    })
  }

  if (isApproved && application?.returnCount > 0) {
    const stepIndex = steps.findIndex((s) => s.title === 'Approved')
    if (stepIndex !== -1) steps.splice(stepIndex, 1)

    steps.push({
      title: 'Returned for Revision',
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'error',
    })
    steps.push({
      title: 'Resubmitted',
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: 'Re-review Completed',
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: 'Approved',
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish',
    })
  }

  if (isRejected && application?.returnCount > 0) {
    const stepIndex = steps.findIndex((s) => s.title === 'Rejected')
    if (stepIndex !== -1) steps.splice(stepIndex, 1)

    steps.push({
      title: 'Returned for Revision',
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'error',
    })
    steps.push({
      title: 'Resubmitted',
      content: application?.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: 'Re-review Completed',
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish',
    })
    steps.push({
      title: 'Rejected',
      content: application?.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'error',
    })
  }

  if (hasAppeal) {
    const rejectedStepIndex = steps.findIndex((s) => s.title === 'Rejected')
    if (rejectedStepIndex !== -1) steps.splice(rejectedStepIndex, 1)

    if (latestAppeal) {
      steps.push({
        title: 'Appeal Filed',
        content: latestAppeal.createdAt
          ? formatDate(latestAppeal.createdAt)
          : 'Unknown',
        status: 'finish',
      })

      if (isAppealPending) {
        steps.push({
          title: 'Appeal Under Review',
          content: 'Appeal is being reviewed',
          status: 'process',
        })
      } else if (isAppealRejected) {
        steps.push({
          title: 'Appeal Rejected',
          content: latestAppeal.updatedAt
            ? formatDate(latestAppeal.updatedAt)
            : 'Unknown',
          status: 'error',
        })
      } else if (application?.hadAppealGranted) {
        steps.push({
          title: 'Appeal Granted',
          content: latestAppeal.updatedAt
            ? formatDate(latestAppeal.updatedAt)
            : 'Unknown',
          status: 'finish',
        })

        if (isApproved) {
          steps.push({
            title: 'Approved After Appeal',
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

function buildProgressSteps(auditLogs, application, statusLower, latestAppeal) {
  if (auditLogs?.length) {
    const steps = buildAuditSteps(auditLogs, application)
    applyCurrentStatus(steps, statusLower)
    appendAppealSteps(steps, statusLower, latestAppeal, application)

    const currentIndex = steps.findIndex((s) => s.status === 'process')
    const current = currentIndex !== -1 ? currentIndex : steps.length

    return { steps, current }
  }

  // Fallback for applications without audit logs.
  return buildFallbackSteps(application, statusLower, latestAppeal)
}

export default function ApplicationProgressModal({
  open,
  onClose,
  application,
  statusLower,
  latestAppeal: propLatestAppeal,
}) {
  const [fetchedAppeal, setFetchedAppeal] = useState(null)
  const [loadingAppeal, setLoadingAppeal] = useState(false)

  useEffect(() => {
    const fetchAppeal = async () => {
      if (
        !propLatestAppeal &&
        (application?.appealId || application?.hadAppealGranted) &&
        !loadingAppeal
      ) {
        setLoadingAppeal(true)
        try {
          let res
          if (application?.appealId) {
            res = await getAppealById(application.appealId)
          } else if (application?.hadAppealGranted && application?.businessId) {
            res = await getAppealsByBusiness(application.businessId)
          }
          const appealData = res
          setFetchedAppeal(Array.isArray(appealData) ? appealData[0] : appealData)
        } catch (err) {
          console.error('Failed to fetch appeal for timeline:', err)
        } finally {
          setLoadingAppeal(false)
        }
      }
    }
    fetchAppeal()
  }, [
    application?.appealId,
    application?.hadAppealGranted,
    application?.businessId,
    propLatestAppeal,
    loadingAppeal,
  ])

  const latestAppeal = propLatestAppeal || fetchedAppeal
  const effectiveStatusLower =
    statusLower || (application?.applicationStatus || '').toLowerCase()
  const appId =
    application?.applicationId || application?.businessId || application?._id

  const { auditLogs, loading: auditLoading } = useAudit(
    'application',
    appId,
    open && !!appId,
  )

  const { steps, current } = useMemo(() => {
    return buildProgressSteps(
      auditLogs,
      application,
      effectiveStatusLower,
      latestAppeal,
    )
  }, [auditLogs, application, effectiveStatusLower, latestAppeal])

  const loading = auditLoading || loadingAppeal

  const loadingSteps = [
    {
      title: 'Loading application history',
      description: 'Please wait...',
      status: 'process',
    },
  ]

  return (
    <ResponsiveModal
      title="Application Progress"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ padding: 24 }}>
        <Steps
          orientation="vertical"
          current={loading ? 0 : current}
          items={loading ? loadingSteps : steps}
          size="small"
        />
      </div>
    </ResponsiveModal>
  )
}
