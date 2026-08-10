/**
 * Infrastructure Service: UserService
 * Handles API calls for user-related operations
 */
import { get } from '@/lib/http.js'

const BASE_PATH = '/api/auth/users'

/**
 * Search users with filters
 * @param {object} params - Query parameters
 * @param {string} [params.q] - Search query
 * @param {string} [params.role] - Role filter (e.g., business_owner)
 * @param {object} [params.options] - Additional options (e.g., skipAutoLogout)
 */
export async function searchUsers({ q, role, options = {} } = {}) {
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  if (role) qs.set('role', role)

  const res = await get(`${BASE_PATH}/search?${qs.toString()}`, { skipAutoLogout: true, ...options })
  return res || []
}
