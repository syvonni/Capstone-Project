import { useEffect, useRef } from 'react'
import { submitAppeal, getAppeals } from '@/features/business-owner/services/appealsService.js'
import { getPayments } from '@/features/business-owner/services/paymentService.js'
import { useApplicationViewReceipt } from '@/shared/hooks/useApplicationViewReceipt'
import { useAuthSession } from '@/features/authentication'

/**
 * Hook for managing appeal-related handlers
 * @param {Object} params
 * @param {Object} application - Current application/application
 * @param {Function} setAppealModalOpen - Function to set appeal modal open state
 * @param {Function} setSubmittingAppeal - Function to set submitting appeal state
 * @param {Function} setShowAppealDetailsModal - Function to show appeal details modal
 * @param {Function} setAppealDetails - Function to set appeal details
 * @param {Function} setLoadingAppealDetails - Function to set loading appeal details state
 * @param {Function} setReceiptData - Function to set receipt data
 * @param {Function} setShowReceiptModal - Function to show receipt modal
 * @param {Object} appealDetails - Current appeal details
 * @param {boolean} loadingAppealDetails - Whether loading appeal details
 * @param {Object} appealReceiptData - Appeal receipt data
 * @param {Object} feeData - Fee data for fallback
 * @param {Object} dashboardState - Dashboard state for refreshing data
 * @returns {Object} Appeal handlers
 */
export function useApplicationAppealHandlers({
  application,
  setAppealModalOpen,
  setSubmittingAppeal,
  setShowAppealDetailsModal,
  setAppealDetails,
  setLoadingAppealDetails,
  setReceiptData,
  setShowReceiptModal,
  appealDetails,
  loadingAppealDetails,
  appealReceiptData,
  feeData,
  dashboardState,
}) {
  const { currentUser, isLoading: authLoading } = useAuthSession()
  const fetchAttemptedRef = useRef({ userId: null, appId: null, attempted: false })

  // Auto-fetch appeal details once when application is in appeal_rejected status.
  // Track per-(user, app) attempt to avoid the request loop that made the
  // "View Details" link flicker and hammer the API.
  useEffect(() => {
    if (authLoading) return

    const userId = currentUser?.id || currentUser?._id
    const statusLower = application?.applicationStatus?.toLowerCase()
    const appId = application?._id
    console.log('[useApplicationAppealHandlers] effect', {
      authLoading,
      userId,
      statusLower,
      appId,
      appealDetails: !!appealDetails,
      loadingAppealDetails,
      ref: fetchAttemptedRef.current,
    })

    if (!userId) {
      console.log('[useApplicationAppealHandlers] no userId, clearing appealDetails')
      setAppealDetails(null)
      return
    }

    if (statusLower !== 'appeal_rejected' || !appId) {
      console.log('[useApplicationAppealHandlers] status not appeal_rejected or no appId')
      setAppealDetails(null)
      return
    }

    const ref = fetchAttemptedRef.current
    if (ref.userId !== userId || ref.appId !== appId) {
      fetchAttemptedRef.current = { userId, appId, attempted: false }
      // If we still have details from a previous app, clear them and let the
      // next effect run do the fetch; otherwise continue to fetch now.
      if (appealDetails != null) {
        console.log('[useApplicationAppealHandlers] app changed, clearing stale appealDetails')
        setAppealDetails(null)
        return
      }
    }

    if (ref.attempted || loadingAppealDetails) {
      console.log('[useApplicationAppealHandlers] already attempted or loading, skip')
      return
    }

    const fetchAppealDetailsIfNeeded = async () => {
      if (loadingAppealDetails) return
      console.log('[useApplicationAppealHandlers] fetching appeals', { appId })
      setLoadingAppealDetails(true)
      try {
        const res = await getAppeals({ businessId: appId, limit: 1 })
        console.log('[useApplicationAppealHandlers] getAppeals res', res)
        const appeals = res || []
        const next = appeals[0] || null
        console.log('[useApplicationAppealHandlers] setting appealDetails', next)
        setAppealDetails(next)
      } catch (err) {
        console.error('[useApplicationAppealHandlers] getAppeals failed', err)
        setAppealDetails(null)
      } finally {
        fetchAttemptedRef.current.attempted = true
        setLoadingAppealDetails(false)
      }
    }

    fetchAppealDetailsIfNeeded()
  }, [application?.applicationStatus, application?._id, appealDetails, currentUser?.id, currentUser?._id, authLoading, setAppealDetails, setLoadingAppealDetails, loadingAppealDetails])

  const handleAppealClick = () => {
    setAppealModalOpen(true)
  }

  const handleAppealSubmit = async (values) => {
    setSubmittingAppeal(true)
    try {
      const { uploadFile } = await import('@/features/business-owner/services/businessRegistrationService')
      const applicationId = application.applicationId || application._id

      // Handle file uploads for evidence - upload to IPFS first
      const evidence = values.evidence || []
      const uploadedEvidence = []
      for (const file of evidence) {
        if (file.originFileObj) {
          // Upload to IPFS
          try {
            const res = await uploadFile(applicationId, file.originFileObj, 'appeal_evidence')
            const cid = res?.cid || res?.ipfsCid
            uploadedEvidence.push({
              name: file.name,
              url: cid,
              size: file.size,
            })
          } catch (uploadErr) {
            console.error('Failed to upload evidence file:', uploadErr)
            // Fall back to filename if upload fails
            uploadedEvidence.push({
              name: file.name,
              url: file.name,
              size: file.size,
            })
          }
        } else if (file.url) {
          // Already has a URL (CID), use as-is
          uploadedEvidence.push({
            name: file.name,
            url: file.url,
            size: file.size,
          })
        }
      }

      const res = await submitAppeal({
        businessId: applicationId,
        applicationId,
        appealType: values.appealType,
        description: values.description,
        evidence: uploadedEvidence,
      })

      // Refresh the applicationes data
      if (res) {
        dashboardState.fetchApplications()
      }

      setAppealModalOpen(false)
    } catch (err) {
      console.error('Failed to submit appeal:', err)
    } finally {
      setSubmittingAppeal(false)
    }
  }

  const handleViewAppealDetails = async () => {
    console.log('[useApplicationAppealHandlers] handleViewAppealDetails clicked', { appId: application?._id })
    setLoadingAppealDetails(true)
    setShowAppealDetailsModal(true)
    try {
      const res = await getAppeals({ businessId: application._id, limit: 1 })
      console.log('[useApplicationAppealHandlers] handleViewAppealDetails getAppeals res', res)
      const appeals = res || []
      if (appeals.length > 0) {
        setAppealDetails(appeals[0])
      } else {
        console.log('[useApplicationAppealHandlers] no appeals found, setting null')
        setAppealDetails(null)
      }
    } catch (err) {
      console.error('[useApplicationAppealHandlers] handleViewAppealDetails failed', err)
      setAppealDetails(null)
    } finally {
      setLoadingAppealDetails(false)
    }
  }

  const { handleViewReceipt: handleViewAppealReceipt } = useApplicationViewReceipt({
    application,
    paymentType: 'appeal_fee',
    feeData,
    getPayments,
    fallbackData: appealReceiptData,
    setReceiptData,
    setShowReceiptModal,
    transactionName: 'Appeal Payment',
  })

  return {
    handleAppealClick,
    handleAppealSubmit,
    handleViewAppealDetails,
    handleViewAppealReceipt,
  }
}
