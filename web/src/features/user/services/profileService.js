import { fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'

// Request deduplication cache to prevent duplicate simultaneous requests
const pendingRequests = new Map()

/**
 * Profile Service
 * Handles all profile-related API operations with proper error handling and request deduplication
 */

export const profileService = {
  /**
   * Get user profile
   * @param {object} currentUser - Current user object
   * @param {object} role - User role object
   * @returns {Promise<object>} User profile data
   */
  async getProfile(currentUser, role) {
    const cacheKey = `profile:${currentUser?._id}`
    
    // If a request is already in flight, return the existing promise
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)
    }

    const headers = authHeaders(currentUser, role)
    
    // Create and cache the request promise
    const requestPromise = fetchJsonWithFallback('/api/auth/me', { headers })
      .finally(() => {
        pendingRequests.delete(cacheKey)
      })

    pendingRequests.set(cacheKey, requestPromise)
    return requestPromise
  },

  /**
   * Update user profile (general fields)
   * @param {object} payload - Profile update data
   * @param {object} currentUser - Current user object
   * @param {object} role - User role object
   * @returns {Promise<object>} Updated profile data
   */
  async updateProfile(payload, currentUser, role) {
    const headers = authHeaders(currentUser, role, { 'Content-Type': 'application/json' })
    return fetchJsonWithFallback('/api/auth/profile', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update business owner profile name fields
   * @param {object} payload - Name update data (firstName, lastName, middleName, suffix, sex, dateOfBirth)
   * @param {object} currentUser - Current user object
   * @param {object} role - User role object
   * @returns {Promise<object>} Updated profile data
   */
  async updateBusinessOwnerProfileName(payload, currentUser, role) {
    const headers = authHeaders(currentUser, role, { 'Content-Type': 'application/json' })
    return fetchJsonWithFallback('/api/auth/profile/name', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update business owner profile contact fields
   * @param {object} payload - Contact update data (phoneNumber)
   * @param {object} currentUser - Current user object
   * @param {object} role - User role object
   * @returns {Promise<object>} Updated profile data
   */
  async updateBusinessOwnerProfileContact(payload, currentUser, role) {
    const headers = authHeaders(currentUser, role, { 'Content-Type': 'application/json' })
    return fetchJsonWithFallback('/api/auth/profile/contact', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update business owner profile PIS fields
   * @param {object} payload - PIS update data (address, maritalStatus, placeOfBirth, nationality, etc.)
   * @param {object} currentUser - Current user object
   * @param {object} role - User role object
   * @returns {Promise<object>} Updated profile data
   */
  async updateBusinessOwnerProfilePis(payload, currentUser, role) {
    const headers = authHeaders(currentUser, role, { 'Content-Type': 'application/json' })
    return fetchJsonWithFallback('/api/auth/profile/pis', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })
  },

  /**
   * Upload user avatar
   * @param {File} file - Avatar file to upload
   * @param {object} currentUser - Current user object
   * @param {object} role - User role object
   * @returns {Promise<object>} Upload result
   */
  async uploadAvatar(file, currentUser, role) {
    const headers = authHeaders(currentUser, role)
    const formData = new FormData()
    formData.append('avatar', file)

    return fetchJsonWithFallback('/api/auth/profile/avatar-file', {
      method: 'POST',
      headers,
      body: formData,
    })
  },

  /**
   * Clear request cache (useful for logout or forced refresh)
   */
  clearCache() {
    pendingRequests.clear()
  }
}