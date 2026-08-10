import { mockPayment } from '../../../services/paymentService'

/**
 * Hook for managing payment flow for permit applications
 * @param {Object} params
 * @param {Function} setShowPaymentModal - Function to show/hide payment modal
 * @param {Function} setIsSubmittingPayment - Function to set submitting payment state
 * @param {Function} setReceiptData - Function to set receipt data
 * @param {Function} setShowReceiptModal - Function to show/hide receipt modal
 * @param {Object} feeData - Fee data from application modals
 * @param {Object} editingApplication - Current editing application
 * @param {Function} handleSubmit - Function to handle form submission
 * @param {Object} form - Form instance
 * @param {Object} message - Ant Design message API
 * @returns {Object} Payment flow handlers
 */
export function useApplicationPaymentFlow({
  setShowPaymentModal,
  setIsSubmittingPayment,
  setReceiptData,
  setShowReceiptModal,
  feeData,
  editingApplication,
  handleSubmit,
  form,
  message,
}) {
  const handleSubmitAndPay = () => {
    const currentApplicationStatus = (editingApplication?.applicationStatus || '').toLowerCase()
    const isReturned = currentApplicationStatus === 'returned'

    if (isReturned) {
      // For returned applications, show confirmation modal via the component
      // This is handled by the parent component (ApplicationHeader or ApplicationPermitForm)
      // which will call handleSubmit directly after confirmation
      setShowPaymentModal(false)
    } else {
      setShowPaymentModal(true)
    }
  }

  const handlePaymentSuccess = async (receiptId) => {
    setShowPaymentModal(false)
    setIsSubmittingPayment(true)
    // Store receipt data to show after submission
    const receiptInfo = {
      receiptId,
      transactionDate: new Date().toLocaleString(),
      transactionName: 'Business Permit Application',
      fees: feeData?.fees || [],
      totalAmount: feeData?.total || 0,
      applicationReferenceNumber: editingApplication?.applicationReferenceNumber || 'N/A',
    }
    setReceiptData(receiptInfo)
    // Submit application after successful payment
    try {
      const values = await form.validateFields()
      await handleSubmit(values, true)

      // Create mock payment record in backend
      let backendReceiptNumber = null
      try {
        const businessId = editingApplication?.businessId || editingApplication?._id
        const paymentResponse = await mockPayment({
          businessId,
          amount: receiptInfo.totalAmount,
          fees: receiptInfo.fees,
          transactionName: receiptInfo.transactionName,
          paymentType: 'registration_fee',
        })
        backendReceiptNumber = paymentResponse?.receiptNumber
      } catch (err) {
        console.error('Failed to create mock payment record:', err)
        // Continue anyway - payment record creation is non-blocking
      }

      // Update receipt data with backend receipt number
      setReceiptData((prev) => ({ ...prev, receiptNumber: backendReceiptNumber }))

      // Show receipt modal after successful submission
      setShowReceiptModal(true)
    } catch {
      // Form validation or submission error - let the existing error handling work
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const handlePaymentFail = () => {
    setShowPaymentModal(false)
    message.error('Payment cancelled. Application was not submitted.')
  }

  return {
    handleSubmitAndPay,
    handlePaymentSuccess,
    handlePaymentFail,
  }
}
