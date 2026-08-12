import { get, post, put, del, patch } from '@/lib/http.js'

const BASE_PATH = '/api/business'

/**
 * Create a new application
 * @param {object} applicationData - Application data
 * @param {object} options - HTTP options (e.g. signal)
 */
export async function createApplication(applicationData, options = {}) {
  const res = await post(`${BASE_PATH}/applications`, applicationData, options)
  return res
}

/**
 * Get all applications for current user
 * @param {object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {string} options.search - Search term
 */
export async function getApplications(options = {}) {
  const { status, search } = options
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (search) params.append('search', search)
  
  const res = await get(`${BASE_PATH}/applications${params.toString() ? `?${params}` : ''}`)
  return res?.applications || []
}

/**
 * Get application by ID
 * @param {string} applicationId - Application ID
 */
export async function getApplicationById(applicationId) {
  const res = await get(`${BASE_PATH}/applications/${applicationId}`)
  return res
}

/**
 * Update application
 * @param {string} applicationId - Application ID
 * @param {object} applicationData - Updated application data
 * @param {object} options - HTTP options (e.g. signal)
 */
export async function updateApplication(applicationId, applicationData, options = {}) {
  const res = await put(`${BASE_PATH}/applications/${applicationId}`, applicationData, options)
  return res
}

/**
 * Partial update of application form data (autosave)
 * @param {string} applicationId - Application ID
 * @param {object} patch - Fields to patch (formData, businessName, documentCids)
 * @param {object} options - HTTP options (e.g. signal)
 */
export async function patchApplicationFormData(applicationId, patchData, options = {}) {
  const res = await patch(`${BASE_PATH}/applications/${applicationId}/form-data`, patchData, options)
  return res
}

/**
 * Submit application (draft → submitted)
 * @param {string} applicationId - Application ID
 */
export async function submitApplication(applicationId) {
  const res = await post(`${BASE_PATH}/applications/${applicationId}/submit`)
  return res
}

/**
 * Delete application
 * @param {string} applicationId - Application ID
 */
export async function deleteApplication(applicationId) {
  const res = await del(`${BASE_PATH}/applications/${applicationId}`)
  return res
}

/**
 * Get application fees for a permit form type
 * @param {string} formType - Permit form type
 */
export async function getApplicationFeesByFormType(formType) {
  const res = await get(`${BASE_PATH}/application-fees/by-permit-form/${formType}`)
  return res
}

/**
 * Debug: clear all applications for current user
 */
export async function clearAllApplications() {
  const res = await post(`${BASE_PATH}/debug/clear-applications`)
  return res
}