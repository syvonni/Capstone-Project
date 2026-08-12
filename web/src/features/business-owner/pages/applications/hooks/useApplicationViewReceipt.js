import { getPayments } from '@/features/business-owner/services/paymentService'

/**
 * Build a receipt info object from a payment record.
 * @param {Object} payment - Payment record from the backend
 * @param {Object} application - Business/application object
 * @param {string} [fallbackTransactionName] - Fallback transaction name
 * @returns {Object} Receipt info
 */
export function buildReceiptInfoFromPayment(payment, application, fallbackTransactionName = 'Business Permit Application') {
  const fees = payment.feeBreakdown || []
  return {
    receiptId: payment.receiptNumber || payment.paymentId,
    receiptNumber: payment.receiptNumber,
    transactionDate: payment.paidAt || payment.createdAt,
    transactionName: payment.description || fallbackTransactionName,
    fees,
    totalAmount: payment.amount || 0,
    applicationReferenceNumber: application?.applicationReferenceNumber || 'N/A',
    paymentType: payment.paymentType || 'registration_fee',
  }
}

/**
 * Build a fallback receipt info object.
 * @param {Object} application - Business/application object
 * @param {Object} feeData - Fee data
 * @param {string} transactionName - Transaction name
 * @param {string} paymentType - Payment type
 * @returns {Object} Receipt info
 */
export function buildFallbackReceiptInfo(application, feeData, transactionName, paymentType) {
  const submittedDate = application?.submittedAt ? new Date(application.submittedAt) : new Date()
  return {
    receiptId: 'NO-PAYMENT-RECORD',
    transactionDate: submittedDate.toLocaleString(),
    transactionName,
    fees: feeData?.fees || [],
    totalAmount: feeData?.total || 0,
    applicationReferenceNumber: application?.applicationReferenceNumber || 'N/A',
    paymentType,
  }
}

/**
 * Hook for viewing a payment receipt.
 * @param {Object} params
 * @param {Object} params.application - Business/application object
 * @param {string} params.paymentType - Payment type filter
 * @param {Object} [params.feeData] - Fee data for fallback
 * @param {Object} [params.fallbackData] - Specific fallback receipt data
 * @param {Function} params.setReceiptData - Set receipt data state
 * @param {Function} params.setShowReceiptModal - Show receipt modal
 * @param {string} [params.transactionName] - Transaction name for fallback
 * @returns {Object} handleViewReceipt
 */
export function useApplicationViewReceipt({
  application,
  paymentType,
  feeData,
  fallbackData,
  setReceiptData,
  setShowReceiptModal,
  transactionName = 'Business Permit Application',
}) {
  const handleViewReceipt = async () => {
    const applicationId = application?.applicationId || application?._id
    if (!applicationId) return

    try {
      const res = await getPayments({ applicationId: applicationId, paymentType, status: 'paid', limit: 1 })
      const payments = res || []
      if (payments.length > 0) {
        setReceiptData(buildReceiptInfoFromPayment(payments[0], application, transactionName))
        setShowReceiptModal(true)
        return
      }
    } catch (err) {
      console.error(`Failed to fetch payment data for ${paymentType}:`, err)
    }

    if (fallbackData) {
      setReceiptData(fallbackData)
    } else {
      setReceiptData(buildFallbackReceiptInfo(application, feeData, transactionName, paymentType))
    }
    setShowReceiptModal(true)
  }

  return { handleViewReceipt }
}
