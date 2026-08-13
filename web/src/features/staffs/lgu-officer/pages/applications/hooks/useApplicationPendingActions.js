import { App } from 'antd'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'
import { getAppealsByBusiness } from '../../../services/appealsService'
import { useStepUp } from '@/shared/hooks/useStepUp'

export function useApplicationPendingActions(
  application,
  loadApplicationDetails,
  onReviewComplete,
  // Values
  rejectReason,
  rejectAppealReason,
  completeReviewComment,
  returnRequestOther,
  // Setters
  setRejectReason,
  setRejectModalOpen,
  setRejectAppealReason,
  setRejectAppealModalOpen,
  setCompleteReviewComment,
  setCompleteReviewModalOpen,
  setReturnRequestOther,
  setReturnModalOpen
) {
  const { message } = App.useApp()
  const { runWithStepUp, stepUpModal: pendingActionsStepUpModal } = useStepUp()
  const permitService = new PermitApplicationService()

  const handleReturnConfirm = async () => {
    const appId = application?.applicationId || application?.businessId || application?._id
    try {
      await runWithStepUp(async (stepUpToken) => {
        await permitService.createPendingAction(appId, null, 'return', {
          requestOther: returnRequestOther,
        }, 10, { stepUpToken })
      })
      setReturnModalOpen(false)
      message.success('Return scheduled. You can undo until the deadline.')
      await loadApplicationDetails()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        message.error(error?.message || 'Failed to schedule return')
      }
    }
  }

  const handleRejectClick = () => {
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason?.trim()) {
      message.error('Please provide a rejection reason')
      return
    }
    const appId = application?.applicationId || application?.businessId || application?._id
    try {
      await runWithStepUp(async (stepUpToken) => {
        await permitService.createPendingAction(appId, null, 'reject', {
          rejectionReason: rejectReason,
        }, 10, { stepUpToken })
      })
      setRejectModalOpen(false)
      message.success('Rejection scheduled. You can undo until the deadline.')
      await loadApplicationDetails()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        message.error(error?.message || 'Failed to schedule rejection')
      }
    }
  }

  const handleRejectAppealClick = async () => {
    setRejectAppealReason('')
    const businessId = application?.businessId || application?.applicationId
    if (!businessId) {
      message.error('Unable to find appeal information')
      return
    }
    try {
      const res = await getAppealsByBusiness(businessId)
      const appeals = res || []
      const activeAppeal = appeals.find(a => a.status === 'submitted' || a.status === 'under_review')
      if (!activeAppeal) {
        message.error('No active appeal found for this application')
        return
      }
      setRejectAppealModalOpen(true)
    } catch {
      message.error('Failed to fetch appeal information')
    }
  }

  const handleRejectAppealConfirm = async () => {
    if (!rejectAppealReason?.trim()) {
      message.error('Please provide a rejection reason')
      return
    }
    const appId = application?.applicationId || application?.businessId || application?._id
    const businessId = application?.businessId || application?.applicationId
    try {
      const res = await getAppealsByBusiness(businessId)
      const appeals = res || []
      const activeAppeal = appeals.find(a => a.status === 'submitted' || a.status === 'under_review')
      if (!activeAppeal) {
        message.error('No active appeal found for this application')
        return
      }
      await runWithStepUp(async (stepUpToken) => {
        await permitService.createPendingAction(appId, activeAppeal._id, 'reject_appeal', {
          appealId: activeAppeal._id,
          rejectionReason: rejectAppealReason,
        }, 10, { stepUpToken })
      })
      setRejectAppealModalOpen(false)
      message.success('Appeal rejection scheduled. You can undo until the deadline.')
      await loadApplicationDetails()
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error(err?.message || 'Failed to schedule appeal rejection')
      }
    }
  }

  const handleCompleteReviewClick = () => {
    setCompleteReviewComment('')
    setCompleteReviewModalOpen(true)
  }

  const handleCompleteReviewConfirm = async () => {
    const appId = application?.applicationId || application?.businessId || application?._id
    try {
      await runWithStepUp(async (stepUpToken) => {
        await permitService.createPendingAction(appId, null, 'complete_review', {
          comments: completeReviewComment,
        }, 10, { stepUpToken })
      })
      setCompleteReviewModalOpen(false)
      message.success('Review completion scheduled. You can undo until the deadline.')
      await loadApplicationDetails()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        message.error(error?.message || 'Failed to schedule review completion')
      }
    }
  }

  const handleReturnClick = () => {
    setReturnRequestOther('')
    setReturnModalOpen(true)
  }

  const handleUndoPendingAction = async () => {
    const appId = application?.applicationId || application?.businessId || application?._id
    try {
      await permitService.cancelPendingAction(appId)
      message.success('Pending action cancelled')
      await loadApplicationDetails()
    } catch (error) {
      message.error(error?.message || 'Failed to cancel pending action')
    }
  }

  const handleExecutePendingActionNow = async () => {
    const appId = application?.applicationId || application?.businessId || application?._id
    try {
      await runWithStepUp(async (stepUpToken) => {
        await permitService.executePendingActionNow(appId, { stepUpToken })
      })
      message.success('Pending action executed immediately')
      await loadApplicationDetails()
      onReviewComplete?.()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        message.error(error?.message || 'Failed to execute pending action')
      }
    }
  }

  return {
    handleReturnConfirm,
    handleRejectClick,
    handleRejectConfirm,
    handleRejectAppealClick,
    handleRejectAppealConfirm,
    handleCompleteReviewClick,
    handleCompleteReviewConfirm,
    handleReturnClick,
    handleUndoPendingAction,
    handleExecutePendingActionNow,
    stepUpModal: pendingActionsStepUpModal,
  }
}
