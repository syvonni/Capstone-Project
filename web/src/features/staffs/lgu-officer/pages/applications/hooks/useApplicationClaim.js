import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { App } from 'antd'
import { put } from '@/lib/http.js'
import { useStepUp } from '@/shared/hooks/useStepUp'

export function useApplicationClaim(application, loadApplicationDetails, onReviewComplete, isClaimedByMe) {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const { runWithStepUp, stepUpModal } = useStepUp()
  const isClaimed = application?.reviewedBy

  const handleClaim = useCallback(async () => {
    const appId = application?.applicationId || application?._id || application?.businessId
    if (!appId) return

    if (isClaimed && !isClaimedByMe) {
      modal.confirm({
        title: 'Override Claim',
        content: `This application is already claimed by ${application.reviewedByName || 'another officer'}. Are you sure you want to override their claim?`,
        okText: 'Override',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await runWithStepUp(async (stepUpToken) => {
              await put(`/api/lgu-officer/permit-applications/${appId}/claim?force=true`, {}, { headers: { 'X-Step-Up-Token': stepUpToken } })
            })
            message.success('Application claimed')
            await loadApplicationDetails()
            onReviewComplete?.()
            navigate('/staff/to-review')
          } catch (err) {
            if (err?.message !== 'Step-up cancelled') {
              message.error(err?.error?.message || 'Failed to claim')
            }
          }
        },
      })
    } else {
      modal.confirm({
        title: 'Claim Application',
        content: `Are you sure you want to claim this application?`,
        okText: 'Claim',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await runWithStepUp(async (stepUpToken) => {
              await put(`/api/lgu-officer/permit-applications/${appId}/claim`, {}, { headers: { 'X-Step-Up-Token': stepUpToken } })
            })
            message.success('Application claimed')
            await loadApplicationDetails()
            onReviewComplete?.()
            navigate('/staff/to-review')
          } catch (err) {
            if (err?.message !== 'Step-up cancelled') {
              message.error(err?.error?.message || 'Failed to claim')
            }
          }
        },
      })
    }
  }, [application, isClaimed, isClaimedByMe, loadApplicationDetails, onReviewComplete, navigate, message, modal, runWithStepUp])

  const handleRelease = useCallback(async () => {
    const appId = application?.applicationId || application?._id || application?.businessId
    if (!appId) return

    modal.confirm({
      title: 'Release Application',
      content: `Are you sure you want to release this application? It will become available for other officers.`,
      okText: 'Release',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await runWithStepUp(async (stepUpToken) => {
            await put(`/api/lgu-officer/permit-applications/${appId}/release`, {}, { headers: { 'X-Step-Up-Token': stepUpToken } })
          })
          message.success('Application released')
          await loadApplicationDetails()
          onReviewComplete?.()
        } catch (err) {
          if (err?.message !== 'Step-up cancelled') {
            message.error(err?.error?.message || 'Failed to release')
          }
        }
      },
    })
  }, [application, loadApplicationDetails, onReviewComplete, message, modal, runWithStepUp])

  return { handleClaim, handleRelease, isClaimed, stepUpModal }
}
