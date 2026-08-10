import { authHeaders, fetchJsonWithFallback } from '@/lib/http.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

/**
 * Get approval requests with optional filters.
 * @param {{ status?: string, userId?: string, requestType?: string }} params
 * @returns {Promise<{ approvals: Array }>}
 */
export async function getApprovals(params = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin')
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.userId) qs.set('userId', params.userId)
  if (params.requestType) qs.set('requestType', params.requestType)
  const queryString = qs.toString()
  const url = queryString ? `/api/admin/approvals?${queryString}` : '/api/admin/approvals'
  const data = await fetchJsonWithFallback(url, { method: 'GET', headers })
  const payload = data
  return { approvals: payload?.approvals ?? [] }
}

/**
 * Get a single approval by approvalId.
 * @param {string} approvalId
 * @returns {Promise<{ approval: object }>}
 */
export async function getApproval(approvalId) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin')
  const data = await fetchJsonWithFallback(`/api/admin/approvals/${approvalId}`, {
    method: 'GET',
    headers,
  })
  const payload = data
  return { approval: payload?.approval ?? null }
}

/**
 * Approve or reject an approval request.
 * @param {string} approvalId
 * @param {{ approved: boolean, comment?: string }} payload
 * @param {{ stepUpToken?: string }} options - optional step-up token for sensitive action
 * @returns {Promise<object>}
 */
export async function approveRequest(approvalId, { approved, comment = '' }, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  return fetchJsonWithFallback(`/api/admin/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ approved, comment }),
  })
}

/** Human-readable labels for requestType enum */
export const REQUEST_TYPE_LABELS = {
  email_change: 'Email change',
  password_change: 'Password change',
  personal_info_change: 'Personal info',
  account_status_change: 'Account status',
  role_change: 'Role change',
  maintenance_mode: 'Maintenance',
  form_definition: 'Form definition',
  password_reset: 'Password reset',
  other: 'Other',
}

export function getRequestTypeLabel(requestType) {
  return REQUEST_TYPE_LABELS[requestType] ?? requestType ?? '—'
}
