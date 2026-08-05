import { get, put, post } from '@/lib/http.js'

const BASE_PATH = '/api/help-requests'

/**
 * Get help request by ID
 * @param {string} requestId - Help request ID
 */
export async function getHelpRequestById(requestId) {
  return get(`${BASE_PATH}/${requestId}`, { skipAutoLogout: true })
}

/**
 * Claim a help request
 * @param {string} requestId - Help request ID
 * @param {object} options - Additional options (e.g., headers for step-up)
 */
export async function claimHelpRequest(requestId, options = {}) {
  return put(`${BASE_PATH}/${requestId}/claim`, {}, options)
}

/**
 * Release a help request
 * @param {string} requestId - Help request ID
 * @param {object} options - Additional options (e.g., headers for step-up)
 */
export async function releaseHelpRequest(requestId, options = {}) {
  return put(`${BASE_PATH}/${requestId}/release`, {}, options)
}

/**
 * Update help request status
 * @param {string} requestId - Help request ID
 * @param {string} status - New status
 */
export async function updateHelpRequestStatus(requestId, status) {
  return put(`${BASE_PATH}/${requestId}/status`, { status })
}

/**
 * Update help request priority
 * @param {string} requestId - Help request ID
 * @param {string} priority - New priority
 */
export async function updateHelpRequestPriority(requestId, priority) {
  return put(`${BASE_PATH}/${requestId}/priority`, { priority })
}

/**
 * Add message to help request conversation
 * @param {string} requestId - Help request ID
 * @param {object} messageData - Message data
 * @param {object} options - Additional options (e.g., headers for step-up)
 */
export async function addHelpRequestMessage(requestId, messageData, options = {}) {
  return post(`${BASE_PATH}/${requestId}/messages`, messageData, options)
}

/**
 * Add internal note to help request
 * @param {string} requestId - Help request ID
 * @param {object} noteData - Note data
 * @param {object} options - Additional options (e.g., headers for step-up)
 */
export async function addHelpRequestInternalNote(requestId, noteData, options = {}) {
  return post(`${BASE_PATH}/${requestId}/internal-notes`, noteData, options)
}

/**
 * Get help requests with filters
 * @param {object} params - Query parameters
 * @param {number} [params.limit] - Items per page
 * @param {object} [params.options] - Additional options (e.g., skipAutoLogout)
 */
export async function getHelpRequests({ limit, options = {} } = {}) {
  const qs = new URLSearchParams()
  if (limit) qs.set('limit', String(limit))

  return get(`${BASE_PATH}?${qs.toString()}`, { skipAutoLogout: true, ...options })
}
