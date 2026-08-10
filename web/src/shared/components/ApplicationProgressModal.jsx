import { Steps } from 'antd'
import ResponsiveModal from './ResponsiveModal'
import { formatDate } from '@/features/business-owner/pages/applications/utils/formatters.js'
import { isApprovedStatus, isRejectedStatus } from '@/features/business-owner/pages/applications/utils/statusUtils'
import { useState, useEffect } from 'react'
import { getAppealById } from '@/features/business-owner/services/appealsService.js'
import { getAppealsByBusiness } from '@/features/staffs/lgu-officer/services/appealsService.js'

export default function ApplicationProgressModal({ open, onClose, application, status, statusLower, latestAppeal: propLatestAppeal }) {
  const [fetchedAppeal, setFetchedAppeal] = useState(null)
  const [loadingAppeal, setLoadingAppeal] = useState(false)

  // Fetch appeal details if not provided but appealId exists or hadAppealGranted
  useEffect(() => {
    const fetchAppeal = async () => {
      if (!propLatestAppeal && (application?.appealId || application?.hadAppealGranted) && !loadingAppeal) {
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
  }, [application?.appealId, application?.hadAppealGranted, application?.businessId, propLatestAppeal, loadingAppeal])

  const latestAppeal = propLatestAppeal || fetchedAppeal
  const isRejected = isRejectedStatus(statusLower) || statusLower === 'appeal_pending' || statusLower === 'appeal_rejected'
  const isApproved = isApprovedStatus(statusLower)
  const isAppealPending = statusLower === 'appeal_pending'
  const isAppealRejected = statusLower === 'appeal_rejected'
  const isReturned = statusLower === 'needs_revision' || statusLower === 'returned' || statusLower === 'resubmit'
  const hasActiveAppeal = application.hasActiveAppeal || isAppealPending
  const appealExhausted = application.appealExhausted
  const hasAppeal = hasActiveAppeal || appealExhausted || latestAppeal
  const createdByOfficer = application?.createdByOfficer === true
  const isOfficerDraft = statusLower === 'officer_draft'

  const steps = []

  // Officer draft flow: direct transition to approved (no submitted/under_review phase)
  if (isOfficerDraft) {
    steps.push({
      title: 'Created by Officer',
      description: application.createdAt ? `Created on: ${formatDate(application.createdAt)}` : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Draft in Progress',
      description: 'Officer is completing the application',
      status: isApproved ? 'finish' : 'process'
    })
    if (isApproved) {
      steps.push({
        title: 'Approved',
        description: application.reviewedAt ? `Finished on: ${formatDate(application.reviewedAt)}` : 'Pending',
        status: 'finish'
      })
    } else {
      steps.push({
        title: 'Pending Approval',
        description: 'Waiting for officer to finish and approve',
        status: 'wait'
      })
    }
  } else {
    // Standard flow for business-owner created applications
    if (createdByOfficer) {
      steps.push({
        title: 'Created by Officer',
        description: application.createdAt ? `Created on: ${formatDate(application.createdAt)}` : 'Unknown',
        status: 'finish'
      })
    }

    steps.push({
      title: 'Draft in Progress',
      description: statusLower === 'draft' ? 'In progress' : (application.createdAt ? `Finished on: ${formatDate(application.createdAt)}` : 'Not started'),
      status: statusLower === 'draft' ? 'process' : 'finish'
    })

    steps.push({
      title: 'Submitted',
      description: application.submittedAt ? `Finished on: ${formatDate(application.submittedAt)}` : 'Not submitted',
      status: ['submitted', 'under_review', 'needs_revision', 'returned', 'resubmit', 'approved', 'rejected', 'appeal_pending', 'appeal_rejected'].includes(statusLower) ? 'finish' : 'wait'
    })
  }

  // Standard flow (not officer draft): add Under Review and Decision steps
  if (!isOfficerDraft) {
    steps.push({
      title: isReturned ? 'Review Completed' : 'Under Review',
      description: statusLower === 'submitted' ? 'Expected within 24 hours'
                  : statusLower === 'under_review' ? (application.reviewedAt
                      ? `Started on: ${formatDate(application.reviewedAt)}`
                      : 'In Review')
                  : isReturned ? (application.updatedAt ? `Finished on: ${formatDate(application.updatedAt)}` : 'Completed')
                  : application.reviewedAt ? `Finished on: ${formatDate(application.reviewedAt)}`
                  : 'Pending',
      status: statusLower === 'under_review' ? 'process'
           : isReturned ? 'finish'
           : ['approved', 'rejected', 'appeal_pending', 'appeal_rejected'].includes(statusLower) ? 'finish'
           : 'wait'
    })

    steps.push({
      title: isReturned ? 'Returned to Applicant'
           : (isRejected || isAppealPending || isAppealRejected) ? 'Rejected'
           : isApproved ? 'Approved'
           : 'Decision Pending',
      description: isReturned ? (application.updatedAt ? `Returned on: ${formatDate(application.updatedAt)}` : 'Pending')
                  : statusLower === 'approved' ? `Finished on: ${formatDate(application.reviewedAt)}`
                  : (statusLower === 'rejected' || isAppealPending || isAppealRejected) ? `Finished on: ${formatDate(application.reviewedAt)}`
                  : 'Pending',
      status: isReturned ? 'finish'
           : (isRejected || isAppealPending || isAppealRejected) ? 'error'
           : isApproved ? 'finish'
           : 'wait'
    })
  }

  // Add resubmitted step if the application was returned and then resubmitted
  if (isReturned && statusLower === 'resubmit') {
    steps.push({
      title: 'Resubmitted',
      description: application.updatedAt ? `Resubmitted on: ${formatDate(application.updatedAt)}` : 'Pending',
      status: 'finish'
    })
    steps.push({
      title: 'Waiting for Review',
      description: 'Application is under review',
      status: 'process'
    })
  } else if (isReturned) {
    steps.push({
      title: 'Resubmit to Review',
      description: 'Waiting for business owner to resubmit',
      status: 'process'
    })
  }

  // Handle approved after resubmit flow
  if (isApproved && application?.returnCount > 0) {
    // Remove the default "Approved" step since we're showing the full resubmit history
    const stepIndex = steps.findIndex(s => s.title === 'Approved')
    if (stepIndex !== -1) {
      steps.splice(stepIndex, 1)
    }

    // Add the complete resubmit flow
    steps.push({
      title: 'Returned for Revision',
      description: application.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'error'
    })
    steps.push({
      title: 'Resubmitted',
      description: application.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Re-review Completed',
      description: application.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Approved',
      description: application.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish'
    })
  }

  // Handle rejected after resubmit flow
  if (isRejected && application?.returnCount > 0) {
    // Remove the default "Rejected" step since we're showing the full resubmit history
    const stepIndex = steps.findIndex(s => s.title === 'Rejected')
    if (stepIndex !== -1) {
      steps.splice(stepIndex, 1)
    }

    // Add the complete resubmit flow
    steps.push({
      title: 'Returned for Revision',
      description: application.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'error'
    })
    steps.push({
      title: 'Resubmitted',
      description: application.updatedAt ? formatDate(application.updatedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Re-review Completed',
      description: application.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Rejected',
      description: application.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
      status: 'error'
    })
  }

  // Handle appeal flow
  if (hasAppeal) {
    // Remove the default "Rejected" step if it exists, since we're showing the appeal flow
    const rejectedStepIndex = steps.findIndex(s => s.title === 'Rejected')
    if (rejectedStepIndex !== -1) {
      steps.splice(rejectedStepIndex, 1)
    }

    // Add appeal steps
    if (latestAppeal) {
      steps.push({
        title: 'Appeal Filed',
        description: latestAppeal.createdAt ? formatDate(latestAppeal.createdAt) : 'Unknown',
        status: 'finish'
      })

      if (isAppealPending) {
        steps.push({
          title: 'Appeal Under Review',
          description: 'Appeal is being reviewed',
          status: 'process'
        })
      } else if (isAppealRejected) {
        steps.push({
          title: 'Appeal Rejected',
          description: latestAppeal.updatedAt ? formatDate(latestAppeal.updatedAt) : 'Unknown',
          status: 'error'
        })
      } else if (application?.hadAppealGranted) {
        // Appeal was granted - show the original rejection and then approval
        steps.push({
          title: 'Appeal Granted',
          description: latestAppeal.updatedAt ? formatDate(latestAppeal.updatedAt) : 'Unknown',
          status: 'finish'
        })

        if (isApproved) {
          steps.push({
            title: 'Approved After Appeal',
            description: application.reviewedAt ? formatDate(application.reviewedAt) : 'Unknown',
            status: 'finish'
          })
        }
      }
    } else if (appealExhausted) {
      steps.push({
        title: 'Appeal Exhausted',
        description: 'No more appeals available',
        status: 'error'
      })
    }
  }

  return (
    <ResponsiveModal
      title="Application Progress"
      open={open}
      onCancel={onClose}
      width={600}
    >
      <div style={{ padding: 24 }}>
        <Steps
          direction="vertical"
          current={steps.findIndex(s => s.status === 'process')}
          items={steps}
        />
      </div>
    </ResponsiveModal>
  )
}
