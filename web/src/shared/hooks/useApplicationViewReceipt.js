import { useCallback } from 'react'

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

export function useApplicationViewReceipt({
  application,
  paymentType,
  feeData,
  fallbackData,
  getPayments,
  setReceiptData,
  setShowReceiptModal,
  transactionName = 'Business Permit Application',
}) {
  const handleViewReceipt = useCallback(async () => {
    const applicationId = application?.applicationId || application?._id
    if (!applicationId) return

    try {
      const res = await getPayments({ applicationId, paymentType, status: 'paid', limit: 1 })
      const payments = Array.isArray(res) ? res : res?.payments || []
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
  }, [application, paymentType, feeData, fallbackData, getPayments, setReceiptData, setShowReceiptModal, transactionName])

  return { handleViewReceipt }
}
