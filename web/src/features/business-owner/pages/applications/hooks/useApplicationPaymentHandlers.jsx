import { createPaymentRecord, getPayments } from '@/features/business-owner/services/paymentService.js'
import { useApplicationViewReceipt } from '@/shared/hooks/useApplicationViewReceipt'
import { isApplicationEditable } from './useApplicationStatus'

/**
 * Hook for managing payment-related handlers
 * @param {Object} params
 * @param {Object} application - Current application/application
 * @param {Object} formRef - Form ref for submission
 * @param {Function} setReceiptData - Function to set receipt data
 * @param {Function} setShowReceiptModal - Function to show receipt modal
 * @param {Object} feeData - Fee data for fallback
 * @param {Object} dashboardState - Dashboard state for refreshing data
 * @param {Object} message - Ant Design message API
 * @returns {Object} Payment handlers
 */
export function useApplicationPaymentHandlers({
  application,
  formRef,
  setReceiptData,
  setShowReceiptModal,
  feeData,
  dashboardState,
  message,
}) {
  const handlePaymentSuccess = async (receiptInfo) => {
    try {
      if (!formRef.current?.submitApplication) {
        message.error('Form not ready. Please try again.')
        return
      }
      
      const response = await formRef.current.submitApplication()
      
      // Verify submission succeeded
      if (!response) {
        message.error('Failed to submit application. No response from server.')
        return
      }
      
      // Check if the response contains the updated application with a non-editable status
      const updatedApplication = response?.applicationes?.[0] || response?.application
      if (!updatedApplication) {
        message.error('Failed to submit application. Invalid response format.')
        return
      }

      const submittedStatus = updatedApplication.applicationStatus || application?.applicationStatus
      if (isApplicationEditable(submittedStatus)) {
        message.error(`Failed to submit application. Status is still editable: ${submittedStatus}`)
        return
      }

      // Surface any non-blocking email warnings without blocking payment
      if (response?.warnings?.length) {
        response.warnings.forEach((warning) => message.warning(warning))
      }

      // Submission succeeded, proceed with payment creation
      let backendReceiptNumber = null
      let backendPaymentId = null
      try {
        const applicationId = updatedApplication?.applicationId || updatedApplication?._id
        if (applicationId) {
          const paymentResponse = await createPaymentRecord({
            businessId: applicationId,
            amount: receiptInfo.totalAmount,
            fees: receiptInfo.fees,
            transactionName: receiptInfo.transactionName,
            paymentType: 'registration_fee',
            receiptNumber: receiptInfo.receiptId,
            paymentId: receiptInfo.receiptId,
          })
          backendReceiptNumber = paymentResponse?.receiptNumber
          backendPaymentId = paymentResponse?.paymentId
        }
      } catch (err) {
        console.error('Failed to create mock payment record:', err)
        // Continue anyway since submission succeeded
      }

      // Refresh the full applicationes list BEFORE showing receipt modal
      // This ensures the header re-renders with the updated status
      await dashboardState.fetchApplications()

      const finalReceiptId = backendReceiptNumber || backendPaymentId || receiptInfo.receiptId

      const updatedReceiptInfo = {
        ...receiptInfo,
        receiptId: finalReceiptId,
        receiptNumber: backendReceiptNumber,
        applicationReferenceNumber:
          updatedApplication.applicationReferenceNumber ||
          receiptInfo.applicationReferenceNumber,
      }
      setReceiptData(updatedReceiptInfo)
      setShowReceiptModal(true)
    } catch (err) {
      console.error('Error during submission:', err)
      message.error(err?.message || 'Failed to submit application. Please try again.')
    }
  }

  const handleReceiptModalClose = () => {
    setShowReceiptModal(false)
    // Navigate to overview tab after payment completion
    if (formRef.current?.handleTabChange) {
      formRef.current.handleTabChange('overview')
    }
    // Don't close the detail panel - keep the application selected so user can view it
    // Just refresh the applicationes list to get updated status
    dashboardState.fetchApplications()
  }

  const { handleViewReceipt } = useApplicationViewReceipt({
    application,
    paymentType: 'registration_fee',
    feeData,
    getPayments,
    setReceiptData,
    setShowReceiptModal,
    transactionName: 'Business Permit Application',
  })

  return {
    handlePaymentSuccess,
    handleReceiptModalClose,
    handleViewReceipt,
  }
}
