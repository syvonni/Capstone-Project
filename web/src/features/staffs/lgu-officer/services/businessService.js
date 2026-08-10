/**
 * Infrastructure Service: BusinessService
 * Handles API calls for business-related operations
 */
import { get } from '@/lib/http.js'

const BASE_PATH = '/api/lgu-officer/businesses'

/**
 * Get businesses with filters
 * @param {object} params - Query parameters
 * @param {number} [params.limit] - Items per page
 * @param {object} [params.options] - Additional options (e.g., skipAutoLogout)
 */
export async function getBusinesses({ limit, options = {} } = {}) {
  const qs = new URLSearchParams()
  if (limit) qs.set('limit', String(limit))

  const res = await get(`${BASE_PATH}?${qs.toString()}`, { skipAutoLogout: true, ...options })
  return res || []
}
