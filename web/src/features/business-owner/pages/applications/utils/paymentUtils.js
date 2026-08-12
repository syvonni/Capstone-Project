/**
 * Build a receipt info object for a payment or resubmission.
 * @param {Object} params
 * @param {string} params.receiptId - Receipt or transaction id
 * @param {Object} [params.application] - Application object
 * @param {Object} [params.feeData] - Fee data with fees and total
 * @param {string} params.transactionName - Transaction name
 * @param {Array} [params.fees] - Explicit fee breakdown (overrides feeData.fees)
 * @param {number} [params.totalAmount] - Explicit total amount (overrides feeData.total)
 * @returns {Object} Receipt info
 */
export function buildReceiptInfo({
  receiptId,
  application,
  feeData,
  transactionName,
  fees,
  totalAmount,
}) {
  return {
    receiptId,
    transactionDate: new Date().toLocaleString(),
    transactionName,
    fees: fees ?? feeData?.fees ?? [],
    totalAmount: totalAmount ?? feeData?.total ?? 0,
    applicationReferenceNumber: application?.applicationReferenceNumber ?? 'N/A',
  }
}
