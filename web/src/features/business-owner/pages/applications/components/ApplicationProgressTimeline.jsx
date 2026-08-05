import { Steps } from 'antd'
import { formatDate } from '../utils/formatters.js'
import { isApprovedStatus, isRejectedStatus } from '../utils/statusUtils'
import { useState, useEffect } from 'react'
import { getAppealById } from '@/features/business-owner/services/appealsService.js'
import { getAppealsByBusiness } from '@/features/staffs/lgu-officer/services/appealsService.js'

export default function ApplicationProgressTimeline({ business, status: _status, statusLower, latestAppeal: propLatestAppeal }) {
  const [fetchedAppeal, setFetchedAppeal] = useState(null)
  const [loadingAppeal, setLoadingAppeal] = useState(false)

  // Fetch appeal details if not provided but appealId exists or hadAppealGranted
  useEffect(() => {
    const fetchAppeal = async () => {
      if (!propLatestAppeal && (business?.appealId || business?.hadAppealGranted) && !loadingAppeal) {
        setLoadingAppeal(true)
        try {
          let res
          if (business?.appealId) {
            console.log('[ApplicationProgressTimeline] Fetching appeal by ID:', business.appealId)
            res = await getAppealById(business.appealId)
          } else if (business?.hadAppealGranted && business?.businessId) {
            console.log('[ApplicationProgressTimeline] Fetching appeals by business ID:', business.businessId)
            res = await getAppealsByBusiness(business.businessId)
          }
          const appealData = res?.data || res
          console.log('[ApplicationProgressTimeline] Fetched appeal data:', appealData)
          setFetchedAppeal(Array.isArray(appealData) ? appealData[0] : appealData)
        } catch (err) {
          console.error('Failed to fetch appeal for timeline:', err)
        } finally {
          setLoadingAppeal(false)
        }
      }
    }
    fetchAppeal()
  }, [business?.appealId, business?.hadAppealGranted, business?.businessId, propLatestAppeal, loadingAppeal])

  const latestAppeal = propLatestAppeal || fetchedAppeal
  const isRejected = isRejectedStatus(statusLower) || statusLower === 'appeal_pending' || statusLower === 'appeal_rejected'
  const isApproved = isApprovedStatus(statusLower)
  const isAppealPending = statusLower === 'appeal_pending'
  const isAppealRejected = statusLower === 'appeal_rejected'
  const isReturned = statusLower === 'needs_revision' || statusLower === 'returned' || statusLower === 'resubmit'
  const hasActiveAppeal = business.hasActiveAppeal || isAppealPending
  const appealExhausted = business.appealExhausted
  const hasAppeal = hasActiveAppeal || appealExhausted || latestAppeal
  const createdByOfficer = business?.createdByOfficer === true
  const isOfficerDraft = statusLower === 'officer_draft'

  console.log('[ApplicationProgressTimeline] State:', {
    statusLower,
    isApproved,
    isRejected,
    isAppealPending,
    isAppealRejected,
    isReturned,
    hasActiveAppeal,
    appealExhausted,
    hasAppeal,
    hadAppealGranted: business?.hadAppealGranted,
    originalRejectionReason: business?.originalRejectionReason,
    latestAppeal,
    businessId: business?.businessId,
    appealId: business?.appealId,
    createdByOfficer,
    isOfficerDraft
  })

  const steps = []

  // Officer draft flow: direct transition to approved (no submitted/under_review phase)
  if (isOfficerDraft) {
    steps.push({
      title: 'Created by Officer',
      description: business.createdAt ? `Created on: ${formatDate(business.createdAt)}` : 'Unknown',
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
        description: business.reviewedAt ? `Finished on: ${formatDate(business.reviewedAt)}` : 'Pending',
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
        description: business.createdAt ? `Created on: ${formatDate(business.createdAt)}` : 'Unknown',
        status: 'finish'
      })
    }

    steps.push({
      title: 'Draft Completed',
      description: business.createdAt ? `Finished on: ${formatDate(business.createdAt)}` : 'Not started',
      status: 'finish'
    })

    steps.push({
      title: 'Submitted',
      description: business.submittedAt ? `Finished on: ${formatDate(business.submittedAt)}` : 'Not submitted',
      status: ['submitted', 'under_review', 'needs_revision', 'returned', 'resubmit', 'approved', 'rejected', 'appeal_pending', 'appeal_rejected'].includes(statusLower) ? 'finish' : 'wait'
    })
  }

  // Standard flow (not officer draft): add Under Review and Decision steps
  if (!isOfficerDraft) {
    steps.push({
      title: isReturned ? 'Review Completed' : 'Under Review',
      description: statusLower === 'submitted' ? 'Expected within 24 hours'
                  : statusLower === 'under_review' ? (business.reviewedAt
                      ? `Started on: ${formatDate(business.reviewedAt)}`
                      : 'In Review')
                  : isReturned ? (business.updatedAt ? `Finished on: ${formatDate(business.updatedAt)}` : 'Completed')
                  : business.reviewedAt ? `Finished on: ${formatDate(business.reviewedAt)}`
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
      description: isReturned ? (business.updatedAt ? `Returned on: ${formatDate(business.updatedAt)}` : 'Pending')
                  : statusLower === 'approved' ? `Finished on: ${formatDate(business.reviewedAt)}`
                  : (statusLower === 'rejected' || isAppealPending || isAppealRejected) ? `Finished on: ${formatDate(business.reviewedAt)}`
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
      description: business.updatedAt ? `Resubmitted on: ${formatDate(business.updatedAt)}` : 'Pending',
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
  if (isApproved && business?.returnCount > 0) {
    // Remove the default "Approved" step since we're showing the full resubmit history
    const stepIndex = steps.findIndex(s => s.title === 'Approved')
    if (stepIndex !== -1) {
      steps.splice(stepIndex, 1)
    }

    // Add the complete resubmit flow
    steps.push({
      title: 'Returned for Revision',
      description: business.updatedAt ? formatDate(business.updatedAt) : 'Unknown',
      status: 'error'
    })
    steps.push({
      title: 'Resubmitted',
      description: business.updatedAt ? formatDate(business.updatedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Re-review Completed',
      description: business.reviewedAt ? formatDate(business.reviewedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Approved',
      description: business.reviewedAt ? formatDate(business.reviewedAt) : 'Unknown',
      status: 'finish'
    })
  }

  // Handle rejected after resubmit flow
  if (isRejected && business?.returnCount > 0) {
    // Remove the default "Rejected" step since we're showing the full resubmit history
    const stepIndex = steps.findIndex(s => s.title === 'Rejected')
    if (stepIndex !== -1) {
      steps.splice(stepIndex, 1)
    }

    // Add the complete resubmit flow
    steps.push({
      title: 'Returned for Revision',
      description: business.updatedAt ? formatDate(business.updatedAt) : 'Unknown',
      status: 'error'
    })
    steps.push({
      title: 'Resubmitted',
      description: business.updatedAt ? formatDate(business.updatedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Re-review Completed',
      description: business.reviewedAt ? formatDate(business.reviewedAt) : 'Unknown',
      status: 'finish'
    })
    steps.push({
      title: 'Rejected',
      description: business.reviewedAt ? formatDate(business.reviewedAt) : 'Unknown',
      status: 'error'
    })
  }
  
  // Add appeal steps for rejected applications that have filed an appeal
  if ((isRejected || isAppealRejected) && hasAppeal) {
    // Step 5: Appeal Filed
    steps.push({
      title: 'Appeal Filed',
      description: latestAppeal?.createdAt ? `Finished on: ${formatDate(latestAppeal.createdAt)}` : 'Submitted',
      status: 'finish'
    })

    // Step 6: Appeal Decision
    if (latestAppeal?.status === 'approved') {
      steps.push({
        title: 'Appeal Granted',
        description: 'Application returned for re-review',
        status: 'finish'
      })
    } else if (latestAppeal?.status === 'rejected' || appealExhausted || isAppealRejected) {
      steps.push({
        title: 'Appeal Rejected',
        description: latestAppeal?.updatedAt ? `Finished on: ${formatDate(latestAppeal.updatedAt)}` : 'Final decision',
        status: 'error'
      })
    } else {
      // Appeal pending (submitted or under_review)
      steps.push({
        title: 'Appeal Decision',
        description: 'Awaiting review',
        status: 'process'
      })
    }
  }

  // Add appeal history steps for approved/returned applications that had an appeal granted
  if ((isApproved || isReturned) && business?.hadAppealGranted) {
    // Clear the default "Approved" or "Returned" step since we're showing the full appeal history
    const stepToRemove = isApproved ? 'Approved' : 'Returned'
    const stepIndex = steps.findIndex(s => s.title === stepToRemove)
    if (stepIndex !== -1) {
      steps.splice(stepIndex, 1)
    }

    steps.push({
      title: 'Original Rejection',
      description: business.reviewedAt ? formatDate(business.reviewedAt) : 'Unknown',
      status: 'error'
    })
    steps.push({
      title: 'Appeal Filed',
      description: latestAppeal?.createdAt ? formatDate(latestAppeal.createdAt) : 'See appeal details',
      status: 'finish'
    })
    steps.push({
      title: 'Appeal Granted',
      description: 'Application returned for re-review',
      status: 'finish'
    })
    steps.push({
      title: 'Re-review Completed',
      description: business.updatedAt ? formatDate(business.updatedAt) : 'Unknown',
      status: 'finish'
    })
    if (isApproved) {
      steps.push({
        title: 'Approved',
        description: business.updatedAt ? formatDate(business.updatedAt) : 'Unknown',
        status: 'finish'
      })
    } else if (isReturned) {
      steps.push({
        title: 'Returned for Revision',
        description: business.updatedAt ? formatDate(business.updatedAt) : 'Unknown',
        status: 'error'
      })
    }
  }

  const currentStep = steps.findIndex(step => step.status === 'process')
  // If no 'process' step, find first 'wait' step
  const finalCurrentStep = currentStep === -1 ? steps.findIndex(step => step.status === 'wait') : currentStep

  return (
    <Steps
      direction="vertical"
      size="small"
      current={finalCurrentStep}
      items={steps}
      style={{ paddingTop: 8 }}
    />
  )
}
