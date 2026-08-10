/**
 * Infrastructure Service: AuditService
 * Handles API calls for audit log operations
 */
import { get } from '@/lib/http.js'

const BASE_PATH = '/api/auth/audit'

/**
 * Get personal action history
 * @param {object} params - Query parameters
 * @param {number} [params.limit] - Items per page
 * @param {object} [params.options] - Additional options (e.g., skipAutoLogout)
 */
export async function getMyActions({ limit, options = {} } = {}) {
  const qs = new URLSearchParams()
  if (limit) qs.set('limit', String(limit))

  const res = await get(`${BASE_PATH}/my-actions?${qs.toString()}`, { skipAutoLogout: true, ...options })
  return res
}

/**
 * Get audit logs for a specific application
 * @param {string} applicationId - Application ID
 * @param {object} [params] - Query parameters
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 */
export async function getApplicationAudit(applicationId, { page, limit } = {}) {
  const qs = new URLSearchParams()
  if (page) qs.set('page', String(page))
  if (limit) qs.set('limit', String(limit))

  const res = await get(`${BASE_PATH}/application/${applicationId}?${qs.toString()}`)
  return res
}

/**
 * Get audit logs for a specific help request
 * @param {string} requestId - Help request ID
 * @param {object} [params] - Query parameters
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 */
export async function getHelpRequestAudit(requestId, { page, limit } = {}) {
  const qs = new URLSearchParams()
  if (page) qs.set('page', String(page))
  if (limit) qs.set('limit', String(limit))

  const res = await get(`${BASE_PATH}/help-request/${requestId}?${qs.toString()}`)
  return res
}
