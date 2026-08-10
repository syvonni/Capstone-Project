/**
 * Infrastructure Service: EditRequestService
 * Handles API calls for edit requests
 */
import { get } from '@/lib/http.js'

const BASE_PATH = '/api/business/edit-requests'

/**
 * Get edit requests with filters
 * @param {object} params - Query parameters
 * @param {string} [params.role] - Role filter (staff)
 * @param {number} [params.limit] - Items per page
 * @param {object} [params.options] - Additional options (e.g., skipAutoLogout)
 */
export async function getEditRequests({ role, limit, options = {} } = {}) {
  const qs = new URLSearchParams()
  if (role) qs.set('role', role)
  if (limit) qs.set('limit', String(limit))

  const res = await get(`${BASE_PATH}?${qs.toString()}`, { skipAutoLogout: true, ...options })
  return res || []
}

/**
 * Get edit requests for a specific business
 * @param {string} businessId - Business ID
 */
export async function getEditRequestsByBusiness(businessId) {
  const res = await get(`${BASE_PATH}/by-business/${businessId}`)
  return res || []
}
