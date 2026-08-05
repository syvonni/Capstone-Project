/**
 * Infrastructure Service: PermitApplicationService
 * Handles API calls for permit applications
 */
import { fetchJsonWithFallback } from '@/lib/http.js'

export class PermitApplicationService {
  /**
   * Start reviewing an application (set status to under_review)
   * @param {object} params - Start review parameters
   * @param {string} params.applicationId - Application ID
   * @param {string} params.businessId - Business ID (optional)
   * @returns {Promise<object>} Updated application
   */
  async startReview({ applicationId, businessId }) {
    if (!applicationId) {
      throw new Error('Application ID is required')
    }

    console.log(`[PermitApplicationService] Starting review for applicationId=${applicationId}, businessId=${businessId || 'N/A'}`)
    
    try {
      const response = await fetchJsonWithFallback(`/api/lgu-officer/permit-applications/${applicationId}/start-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      })
      
      console.log(`[PermitApplicationService] Review started successfully for applicationId=${applicationId}, status=${response?.application?.status || 'N/A'}`)
      return response
    } catch (error) {
      console.error(`[PermitApplicationService] Failed to start review for applicationId=${applicationId}:`, error)
      throw error
    }
  }

  /**
   * Review a permit application
   * @param {object} params - Review parameters
   * @param {string} params.applicationId - Application ID
   * @param {string} params.decision - Decision: 'approve', 'reject', 'request_changes'
   * @param {string} params.comments - Review comments (optional)
   * @param {string} params.rejectionReason - Rejection reason (required if decision is 'reject')
   * @param {string} params.businessId - Business ID (optional)
   * @returns {Promise<object>} Review result
   */
  async review({ applicationId, decision, comments, rejectionReason, businessId }) {
    if (!applicationId) {
      throw new Error('Application ID is required')
    }
    if (!decision) {
      throw new Error('Decision is required')
    }
    if (decision === 'reject' && !rejectionReason) {
      throw new Error('Rejection reason is required when rejecting an application')
    }

    const response = await fetchJsonWithFallback(`/api/lgu-officer/permit-applications/${applicationId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        decision, 
        comments, 
        rejectionReason,
        businessId 
      })
    })
    return response
  }

  /**
   * Get permit applications with filters and pagination
   * @param {object} params - Query parameters
   * @param {object} params.filters - Filter criteria
   * @param {object} params.pagination - Pagination options
   * @param {object} params.options - Additional options (e.g., skipAutoLogout)
   * @returns {Promise<object>} Applications list with pagination
   */
  async getApplications({ filters = {}, pagination = {}, options = {} }) {
    const params = new URLSearchParams()

    // Add filters
    if (filters.status) params.append('status', filters.status)
    if (filters.businessName) params.append('businessName', filters.businessName)
    if (filters.applicationType) params.append('applicationType', filters.applicationType)
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.append('dateTo', filters.dateTo)
    if (filters.applicationReferenceNumber) params.append('applicationReferenceNumber', filters.applicationReferenceNumber)
    if (filters.reviewedBy) params.append('reviewedBy', filters.reviewedBy)

    // Add pagination
    params.append('page', pagination.page || 1)
    params.append('limit', pagination.limit || 10)

    const response = await fetchJsonWithFallback(`/api/lgu-officer/permit-applications?${params}`, options)
    return response
  }

  /**
   * Get single application by ID
   * @param {string} id - Application ID
   * @param {string} businessId - Business ID (optional)
   * @returns {Promise<object>} Application details
   */
  async getApplicationById(id, businessId = null) {
    if (!id) {
      throw new Error('Application ID is required')
    }

    const params = new URLSearchParams()
    if (businessId) params.append('businessId', businessId)

    const url = `/api/lgu-officer/permit-applications/${id}${params.toString() ? `?${params}` : ''}`
    return fetchJsonWithFallback(url)
  }

  /**
   * Get pending applications
   * @param {object} params - Query parameters
   * @param {string} params.status - Status filter (default: 'submitted')
   * @param {object} params.pagination - Pagination options
   * @returns {Promise<object>} Pending applications list
   */
  async getPendingApplications({ status, pagination = {} } = {}) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (pagination.page) params.append('page', pagination.page)
    if (pagination.limit) params.append('limit', pagination.limit)

    const url = `/api/lgu-officer/permit-applications/pending${params.toString() ? `?${params}` : ''}`
    const response = await fetchJsonWithFallback(url)
    return response
  }

  /**
   * Update field-level review decision(s)
   * @param {object} params
   * @param {string} params.applicationId
   * @param {string} [params.businessId]
   * @param {string} [params.fieldKey] - Single update
   * @param {string} [params.status] - 'accepted' | 'rejected'
   * @param {string} [params.reasonCode]
   * @param {string} [params.reasonOther]
   * @param {Array<{ fieldKey, status, reasonCode?, reasonOther? }>} [params.decisions] - Batch update
   * @returns {Promise<object>} Updated application
   */
  async updateFieldDecisions({ applicationId, businessId, fieldKey, status, reasonCode, reasonOther, decisions }) {
    const body = decisions && Array.isArray(decisions)
      ? { businessId, decisions }
      : { businessId, fieldKey, status, reasonCode, reasonOther }
    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/field-decisions`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    return response
  }

  /**
   * Update LOB formData (businessDescriptionText, businessActivities) for officer edit
   * @param {object} params
   * @param {string} params.applicationId
   * @param {string} [params.businessId]
   * @param {string} [params.businessDescriptionText]
   * @param {Array} [params.businessActivities]
   * @returns {Promise<object>} Updated application
   */
  async updateLobFormData({ applicationId, businessId, businessDescriptionText, businessActivities }) {
    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/form-data`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, businessDescriptionText, businessActivities })
      }
    )
    return response
  }

  /**
   * Create a pending action with undo window
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID (optional)
   * @param {string} actionType - 'complete_review' | 'reject' | 'return'
   * @param {object} payload - Action payload
   * @param {number} delayMinutes - Delay before execution (default: 10)
   * @param {object} options - Additional options (e.g., stepUpToken)
   * @returns {Promise<object>} Updated application
   */
  async createPendingAction(applicationId, businessId, actionType, payload, delayMinutes = 10, options = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (options.stepUpToken) {
      headers['X-Step-Up-Token'] = options.stepUpToken
    }
    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/pending-action`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ actionType, payload, delayMinutes })
      }
    )
    return response
  }

  /**
   * Cancel a pending action (undo)
   * @param {string} applicationId - Application ID
   * @param {string} _businessId - Business ID (optional, unused)
   * @returns {Promise<object>} Updated application
   */
  async cancelPendingAction(applicationId, _businessId = null) {
    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/pending-action`,
      { method: 'DELETE' }
    )
    return response
  }

  /**
   * Execute a pending action immediately
   * @param {string} applicationId - Application ID
   * @param {object} options - Additional options (e.g., stepUpToken)
   * @returns {Promise<object>} Updated application
   */
  async executePendingActionNow(applicationId, options = {}) {
    const headers = {}
    if (options.stepUpToken) {
      headers['X-Step-Up-Token'] = options.stepUpToken
    }
    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/execute-pending-action`,
      { method: 'PUT', headers }
    )
    return response
  }

  /**
   * Create a walk-in application for a business owner
   * @param {object} params - Walk-in application parameters
   * @param {string} params.ownerId - Business owner user ID
   * @param {string} params.permitType - Permit type (permit or general_permit)
   * @param {string} params.category - Category for general_permit (optional)
   * @param {string} params.stepUpToken - Step-up authentication token (optional)
   * @returns {Promise<object>} Created application
   */
  async createWalkInApplication({ ownerId, permitType, category, stepUpToken }) {
    if (!ownerId) {
      throw new Error('Owner ID is required')
    }
    if (!permitType) {
      throw new Error('Permit type is required')
    }

    const headers = { 'Content-Type': 'application/json' }
    if (stepUpToken) {
      headers['X-Step-Up-Token'] = stepUpToken
    }

    const response = await fetchJsonWithFallback('/api/lgu-officer/walk-in-applications', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ownerId, permitType, category })
    })
    return response
  }

  /**
   * Finish an officer draft application (transition to approved)
   * @param {string} applicationId - Application ID
   * @param {string} stepUpToken - Step-up authentication token
   * @returns {Promise<object>} Updated application
   */
  async finishApplication(applicationId, stepUpToken) {
    if (!applicationId) {
      throw new Error('Application ID is required')
    }

    const headers = { 'Content-Type': 'application/json' }
    if (stepUpToken) {
      headers['X-Step-Up-Token'] = stepUpToken
    }

    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/finish`,
      {
        method: 'POST',
        headers
      }
    )
    return response
  }

  /**
   * Delete an application
   * @param {string} applicationId - Application ID
   * @returns {Promise<object>} Deletion result
   */
  async deleteApplication(applicationId, stepUpToken) {
    if (!applicationId) {
      throw new Error('Application ID is required')
    }

    const headers = {}
    if (stepUpToken) {
      headers['X-Step-Up-Token'] = stepUpToken
    }

    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}`,
      { method: 'DELETE', headers }
    )
    return response
  }

  /**
   * Update application form data
   * @param {string} applicationId - Application ID
   * @param {object} formData - Form data to update
   * @returns {Promise<object>} Updated application
   */
  async updateFormData(applicationId, formData) {
    if (!applicationId) {
      throw new Error('Application ID is required')
    }

    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/form-data`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }
    )
    return response
  }

  /**
   * Resend application email
   * @param {string} applicationId - Application ID
   * @param {string} emailType - Email type (submitted, approved, rejected, returned)
   * @param {object} options - Additional options (e.g., stepUpToken)
   * @returns {Promise<object>} Resend result
   */
  async resendApplicationEmail(applicationId, emailType, options = {}) {
    console.log('[permitService] resendApplicationEmail CALLED', { applicationId, emailType, hasStepUpToken: !!options.stepUpToken })
    if (!applicationId) {
      throw new Error('Application ID is required')
    }
    if (!emailType) {
      throw new Error('Email type is required')
    }

    const headers = { 'Content-Type': 'application/json' }
    if (options.stepUpToken) {
      headers['X-Step-Up-Token'] = options.stepUpToken
    }

    console.log('[permitService] Making API call')
    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/resend-email`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ emailType })
      }
    )
    console.log('[permitService] API call completed', response)
    return response
  }

  /**
   * Resend appeal email
   * @param {string} appealId - Appeal ID
   * @param {string} emailType - Email type (appeal_approved, appeal_denied)
   * @param {object} options - Additional options (e.g., stepUpToken)
   * @returns {Promise<object>} Resend result
   */
  async resendAppealEmail(appealId, emailType, options = {}) {
    if (!appealId) {
      throw new Error('Appeal ID is required')
    }
    if (!emailType) {
      throw new Error('Email type is required')
    }

    const headers = { 'Content-Type': 'application/json' }
    if (options.stepUpToken) {
      headers['X-Step-Up-Token'] = options.stepUpToken
    }

    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/appeals/${appealId}/resend-email`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ emailType })
      }
    )
    return response
  }

  /**
   * Reset application email status
   * @param {string} applicationId - Application ID
   * @param {string} emailType - Email type (submitted, approved, rejected, returned)
   * @param {object} options - Additional options (e.g., stepUpToken)
   * @returns {Promise<object>} Reset result
   */
  async resetApplicationEmailStatus(applicationId, emailType, options = {}) {
    if (!applicationId) {
      throw new Error('Application ID is required')
    }
    if (!emailType) {
      throw new Error('Email type is required')
    }

    const headers = { 'Content-Type': 'application/json' }
    if (options.stepUpToken) {
      headers['X-Step-Up-Token'] = options.stepUpToken
    }

    const response = await fetchJsonWithFallback(
      `/api/lgu-officer/permit-applications/${applicationId}/reset-email-status`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ emailType })
      }
    )
    return response
  }
}
