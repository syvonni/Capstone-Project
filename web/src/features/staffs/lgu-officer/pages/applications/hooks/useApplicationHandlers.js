import { useState, useCallback, useMemo } from 'react'
import { App } from 'antd'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'

export function useApplicationHandlers(application, setApplication, onReview, onReviewStarted, initialApplication, runWithStepUp) {
  const { message } = App.useApp()
  const [reviewing, setReviewing] = useState(false)
  const [startingReview, setStartingReview] = useState(false)
  const [savingLob, setSavingLob] = useState(false)
  const permitService = useMemo(() => new PermitApplicationService(), [])

  const loadApplicationDetails = useCallback(async () => {
    if (!initialApplication?.applicationId) return

    try {
      const details = await permitService.getApplicationById(
        initialApplication.applicationId,
        initialApplication.businessId
      )
      setApplication(details)
    } catch (error) {
      console.error('Failed to load application details:', error)
      message.error('Failed to load application details')
    }
  }, [initialApplication?.applicationId, initialApplication?.businessId, permitService, setApplication, message])

  const handleStartReview = useCallback(async () => {
    if (!initialApplication?.applicationId) return
    if (!['submitted', 'resubmit'].includes(initialApplication?.status)) return

    setStartingReview(true)
    try {
      const result = await permitService.startReview({
        applicationId: initialApplication.applicationId,
        businessId: initialApplication.businessId
      })
      
      if (result?.lockedByOfficer) {
        setApplication(result.application)
        if (onReviewStarted) {
          onReviewStarted(result.application)
        }
      } else {
        await loadApplicationDetails()
      }
    } catch (error) {
      console.error('Failed to start review:', error)
      await loadApplicationDetails()
    } finally {
      setStartingReview(false)
    }
  }, [initialApplication, permitService, setApplication, onReviewStarted, loadApplicationDetails])

  const handleFieldDecision = useCallback(async (fieldKey, payload) => {
    if (!application?.applicationId) return
    try {
      const updated = await permitService.updateFieldDecisions({
        applicationId: application.applicationId,
        businessId: application.businessId,
        fieldKey,
        status: payload.status,
        reasonCode: payload.reasonCode,
        reasonOther: payload.reasonOther,
      })
      if (updated) setApplication(updated)
    } catch (error) {
      console.error('Failed to update field decision:', error)
      message.error(error?.message || 'Failed to update field decision')
    }
  }, [application, permitService, setApplication, message])

  const handleSaveLob = useCallback(async (payload) => {
    if (!application?.applicationId) return
    setSavingLob(true)
    try {
      const updated = await permitService.updateLobFormData({
        applicationId: application.applicationId,
        businessId: application.businessId,
        businessDescriptionText: payload.businessDescriptionText,
        businessActivities: payload.businessActivities,
      })
      if (updated) setApplication(updated)
      message.success('LOB changes saved successfully')
    } catch (error) {
      console.error('Failed to save LOB changes:', error)
      message.error(error?.message || 'Failed to save LOB changes')
    } finally {
      setSavingLob(false)
    }
  }, [application, permitService, setApplication, message])


  const handleReview = useCallback(async (values, decision, canReview, allFieldKeys, allFieldsReviewed, decidedCount) => {
    if (!decision) {
      message.error('Please select a decision')
      return
    }

    if (canReview && allFieldKeys.length > 0 && !allFieldsReviewed) {
      message.error(`Please review all fields before submitting. (${decidedCount} of ${allFieldKeys.length} completed)`)
      return
    }

    if (decision === 'reject') {
      if (!values.rejectionReason?.trim()) {
        message.error('Rejection reason is required when rejecting an application')
        return
      }
    }

    if (decision === 'request_changes') {
      if (!values.requestChanges?.trim()) {
        message.error('Request details are required when requesting changes')
        return
      }
    }

    setReviewing(true)
    try {
      await runWithStepUp(async (stepUpToken) => {
        let reviewComments = ''

        if (decision === 'approve') {
          reviewComments = values.comments?.trim() || ''
        } else if (decision === 'request_changes') {
          reviewComments = values.requestChanges?.trim() || ''
        }

        await onReview({
          applicationId: application.applicationId,
          decision,
          comments: reviewComments,
          rejectionReason: values.rejectionReason?.trim() || '',
          businessId: application.businessId,
          stepUpToken
        })
      })

      message.success('Review submitted successfully')
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to submit review:', error)
        message.error(error?.message || 'Failed to submit review')
      }
    } finally {
      setReviewing(false)
    }
  }, [application, onReview, message, runWithStepUp])

  const handleResendEmail = useCallback(async (emailType) => {
    console.log('[handleResendEmail] START', { emailType })
    const appId = application?.applicationId || application?._id
    console.log('[handleResendEmail] appId:', appId)
    if (!appId) {
      console.log('[handleResendEmail] No appId, returning')
      return
    }

    try {
      console.log('[handleResendEmail] Calling runWithStepUp')
      await runWithStepUp(async (stepUpToken) => {
        console.log('[handleResendEmail] Step-up callback, calling permitService')
        await permitService.resendApplicationEmail(appId, emailType, { stepUpToken })
        console.log('[handleResendEmail] permitService call done')
      })
      console.log('[handleResendEmail] runWithStepUp done')
      message.success('Email sent successfully')
      await loadApplicationDetails()
    } catch (error) {
      console.error('[handleResendEmail] ERROR:', error)
      if (error?.message !== 'Step-up cancelled') {
        message.error(error?.message || 'Failed to resend email')
      }
    }
  }, [application, permitService, runWithStepUp, loadApplicationDetails, message])

  const handleResetEmailStatus = useCallback(async (emailType) => {
    if (!application?.applicationId) return

    try {
      await runWithStepUp(async (stepUpToken) => {
        await permitService.resetApplicationEmailStatus(application.applicationId, emailType, { stepUpToken })
      })
      message.success('Email status reset successfully')
      await loadApplicationDetails()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to reset email status:', error)
        message.error(error?.message || 'Failed to reset email status')
      }
    }
  }, [application, permitService, runWithStepUp, loadApplicationDetails, message])

  const handleResendAppealEmail = useCallback(async (emailType) => {
    const appealId = application?.appealId
    if (!appealId) {
      message.error('No active appeal found for this application')
      return
    }

    try {
      await runWithStepUp(async (stepUpToken) => {
        await permitService.resendAppealEmail(appealId, emailType, { stepUpToken })
      })
      message.success('Appeal email sent successfully')
      await loadApplicationDetails()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to resend appeal email:', error)
        message.error(error?.message || 'Failed to resend appeal email')
      }
    }
  }, [application, permitService, runWithStepUp, loadApplicationDetails, message])

  return {
    reviewing,
    startingReview,
    savingLob,
    loadApplicationDetails,
    handleStartReview,
    handleFieldDecision,
    handleSaveLob,
    handleReview,
    handleResendEmail,
    handleResetEmailStatus,
    handleResendAppealEmail,
  }
}
