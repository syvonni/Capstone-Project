import { get } from '@/lib/http.js'

const BASE_PATH = '/api/business/appeals'

/**
 * Get appeals for LGU officer review
 * @param {object} params - Query parameters
 * @param {number} [params.limit] - Items per page
 * @param {string} [params.role] - Role filter (staff)
 */
export async function getAppealsForReview({ limit, role = 'staff' } = {}) {
  const qs = new URLSearchParams()
  if (limit) qs.set('limit', String(limit))
  qs.set('role', role)

  const res = await get(`${BASE_PATH}?${qs.toString()}`, { skipAutoLogout: true })
  return res || []
}

/**
 * Get appeals for a specific business
 * @param {string} businessId - Business ID
 */
export async function getAppealsByBusiness(businessId) {
  const res = await get(`${BASE_PATH}/by-business/${businessId}`)
  return res || []
}
