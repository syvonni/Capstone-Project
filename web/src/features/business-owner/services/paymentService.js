import { get, post } from '@/lib/http.js'

const BASE_PATH = '/api/business/payments'

/**
 * Mock payment for testing purposes
 * @param {object} paymentData - Payment data
 * @returns {Promise<object>} Mock payment response
 */
export async function mockPayment(paymentData) {
  const res = await post(`${BASE_PATH}/mock`, paymentData)
  return res
}

/**
 * Get payments for a business
 * @param {object} params - Query parameters
 * @param {string} params.businessId - Business ID
 * @param {string} [params.paymentType] - Filter by payment type
 * @param {string} [params.status] - Filter by status
 * @param {number} [params.limit] - Limit results
 */
/**
 * Create a payment record for an application or appeal.
 * @param {Object} params
 * @param {string} params.businessId - Business ID
 * @param {number} params.amount - Payment amount
 * @param {Array} [params.fees] - Fee breakdown
 * @param {string} [params.transactionName] - Transaction name
 * @param {string} [params.paymentType] - Payment type
 * @returns {Promise<Object>} Payment response
 */
export async function createPaymentRecord({ businessId, applicationId, amount, fees = [], transactionName = 'Business Permit Application', paymentType = 'registration_fee', receiptNumber, paymentId }) {
  const entityId = businessId || applicationId
  const res = await mockPayment({
    businessId: entityId,
    amount,
    fees,
    transactionName,
    paymentType,
    receiptNumber,
    paymentId,
  })
  return res
}

export async function getPayments({ businessId, applicationId, paymentType, status, limit } = {}) {
  const qs = new URLSearchParams()
  const entityId = businessId || applicationId
  if (entityId) qs.set('businessId', entityId)
  if (paymentType) qs.set('paymentType', paymentType)
  if (status) qs.set('status', status)
  if (limit) qs.set('limit', String(limit))

  const res = await get(`${BASE_PATH}?${qs.toString()}`)
  return res || []
}
