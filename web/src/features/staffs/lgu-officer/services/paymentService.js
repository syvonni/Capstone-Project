import { get } from '@/lib/http.js'

const BASE_PATH = '/api/lgu-officer/payments'

/**
 * Get payments with pagination and filters
 * @param {object} params - Query parameters
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @param {string} [params.search] - Search query
 * @param {string} [params.status] - Status filter
 * @param {string} [params.type] - Payment type filter
 */
export async function getPayments({ page = 1, limit = 20, search, status, type, paymentType, applicationId, businessId } = {}) {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('limit', String(limit))
  if (search) qs.set('search', search)
  if (status) qs.set('status', status)
  if (paymentType || type) qs.set('paymentType', paymentType || type)
  if (applicationId) qs.set('applicationId', applicationId)
  if (businessId) qs.set('businessId', businessId)

  const res = await get(`${BASE_PATH}?${qs.toString()}`)
  return res || []
}
