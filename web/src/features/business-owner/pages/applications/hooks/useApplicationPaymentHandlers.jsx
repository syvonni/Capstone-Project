import { mockPayment, getPayments } from '@/features/business-owner/services/paymentService.js'

/**
 * Hook for managing payment-related handlers
 * @param {Object} params
 * @param {Object} business - Current business/application
 * @param {Object} formRef - Form ref for submission
 * @param {Function} setReceiptData - Function to set receipt data
 * @param {Function} setShowReceiptModal - Function to show receipt modal
 * @param {Object} feeData - Fee data for fallback
 * @param {Object} dashboardState - Dashboard state for refreshing data
 * @param {Object} message - Ant Design message API
 * @returns {Object} Payment handlers
 */
export function useApplicationPaymentHandlers({
  business,
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
      
      // Check if the response contains the updated application with submitted status
      const updatedApplication = response?.businesses?.[0] || response?.business
      if (!updatedApplication) {
        message.error('Failed to submit application. Invalid response format.')
        return
      }

      // Accept both 'submitted' and 'resubmit' as valid statuses
      const validStatuses = ['submitted', 'resubmit']
      if (!validStatuses.includes(updatedApplication.applicationStatus)) {
        message.error(`Failed to submit application. Status is: ${updatedApplication.applicationStatus}`)
        return
      }
      
      // Submission succeeded, proceed with payment creation
      let backendReceiptNumber = null
      try {
        const businessId = business?.businessId || business?._id
        const paymentResponse = await mockPayment({
          businessId,
          amount: receiptInfo.totalAmount,
          fees: receiptInfo.fees,
          transactionName: receiptInfo.transactionName,
          paymentType: 'registration_fee',
        })
        backendReceiptNumber = paymentResponse?.data?.receiptNumber
      } catch (err) {
        console.error('Failed to create mock payment record:', err)
        // Continue anyway since submission succeeded
      }
      
      // Refresh the full businesses list BEFORE showing receipt modal
      // This ensures the header re-renders with the updated status
      await dashboardState.fetchBusinesses()
      
      const updatedReceiptInfo = {
        ...receiptInfo,
        receiptNumber: backendReceiptNumber,
        applicationReferenceNumber: updatedApplication.applicationReferenceNumber || 
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
    // Just refresh the businesses list to get updated status
    dashboardState.fetchBusinesses()
  }

  const handleViewReceipt = async () => {
    const businessId = business.businessId || business._id
    try {
      const res = await getPayments({ businessId, paymentType: 'registration_fee', status: 'paid', limit: 1 })
      const payments = res?.data || res?.payments || []
      if (payments.length > 0) {
        const payment = payments[0]
        const fees = payment.feeBreakdown || []
        setReceiptData({
          receiptId: payment.receiptNumber || payment.paymentId,
          receiptNumber: payment.receiptNumber,
          transactionDate: payment.paidAt || payment.createdAt,
          transactionName: payment.description || 'Business Permit Application',
          fees,
          totalAmount: payment.amount || 0,
          applicationReferenceNumber: business.applicationReferenceNumber || 'N/A',
          paymentType: payment.paymentType || 'registration_fee',
        })
        setShowReceiptModal(true)
        return
      }
    } catch (err) {
      console.error('Failed to fetch payment data:', err)
    }

    // Fallback
    const submittedDate = business.submittedAt ? new Date(business.submittedAt) : new Date()
    setReceiptData({
      receiptId: 'MOCK-NOT-FOUND',
      transactionDate: submittedDate.toLocaleString(),
      transactionName: 'Business Permit Application',
      fees: feeData?.fees || [],
      totalAmount: feeData?.total || 0,
      applicationReferenceNumber: business.applicationReferenceNumber || 'N/A',
    })
    setShowReceiptModal(true)
  }

  return {
    handlePaymentSuccess,
    handleReceiptModalClose,
    handleViewReceipt,
  }
}
