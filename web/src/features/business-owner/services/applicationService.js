import { get, post, put, del } from '@/lib/http.js'

const BASE_PATH = '/api/business'

/**
 * Create a new application
 * @param {object} applicationData - Application data
 */
export async function createApplication(applicationData) {
  const res = await post(`${BASE_PATH}/applications`, applicationData)
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
 */
export async function updateApplication(applicationId, applicationData) {
  const res = await put(`${BASE_PATH}/applications/${applicationId}`, applicationData)
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