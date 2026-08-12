import { useEffect } from 'react'
import { submitAppeal, getAppeals } from '@/features/business-owner/services/appealsService.js'
import { useApplicationViewReceipt } from './useApplicationViewReceipt'

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
  // Auto-fetch appeal details when application is in appeal_rejected status
  useEffect(() => {
    const fetchAppealDetailsIfNeeded = async () => {
      const statusLower = application?.applicationStatus?.toLowerCase()
      if (statusLower === 'appeal_rejected' && !appealDetails && !loadingAppealDetails) {
        setLoadingAppealDetails(true)
        try {
          const applicationId = application.applicationId || application._id
          const res = await getAppeals({ applicationId: applicationId, limit: 1 })
          const appeals = res || []
          if (appeals.length > 0) {
            setAppealDetails(appeals[0])
          }
        } catch (err) {
          console.error('Failed to fetch appeal details:', err)
        } finally {
          setLoadingAppealDetails(false)
        }
      }
    }
    fetchAppealDetailsIfNeeded()
  }, [application?.applicationStatus, application?.applicationId, application?._id, appealDetails, loadingAppealDetails, setAppealDetails, setLoadingAppealDetails])

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
        applicationId: applicationId,
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
    setLoadingAppealDetails(true)
    setShowAppealDetailsModal(true)
    try {
      const applicationId = application.applicationId || application._id
      const res = await getAppeals({ applicationId: applicationId, limit: 1 })
      const appeals = res || []
      if (appeals.length > 0) {
        setAppealDetails(appeals[0])
      }
    } catch (err) {
      console.error('Failed to fetch appeal details:', err)
    } finally {
      setLoadingAppealDetails(false)
    }
  }

  const { handleViewReceipt: handleViewAppealReceipt } = useApplicationViewReceipt({
    application,
    paymentType: 'appeal_fee',
    feeData,
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
