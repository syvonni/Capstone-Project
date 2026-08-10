import { fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'

/**
 * Security Service
 * Handles security-related API operations for user settings
 * Note: Session management is handled by authentication service
 */

export const securityService = {
  /**
   * Get pending approvals for current user
   * @param {object} currentUser - Current user object
   * @param {object} role - User role object
   * @returns {Promise<object>} Pending approvals data
   */
  async getPendingApprovals(currentUser, role) {
    const headers = authHeaders(currentUser, role)
    return fetchJsonWithFallback('/api/auth/profile/approvals/pending', {
      method: 'GET',
      headers,
    })
  }
}