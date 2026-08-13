import { get, post, put } from '@/lib/http.js'

const BASE_PATH = '/api/business/appeals'

/**
 * Get appeals for the current user
 * @param {object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=20] - Items per page
 * @param {string} [params.status] - Filter by status
 * @param {string} [params.businessId] - Filter by business/application id
 * @param {string} [params.applicationId] - Filter by business/application id (legacy alias)
 */
export async function getAppeals({ page = 1, limit = 20, status, businessId, applicationId } = {}) {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('limit', String(limit))
  if (status) qs.set('status', status)
  const entityId = businessId || applicationId
  if (entityId) qs.set('businessId', entityId)

  const res = await get(`${BASE_PATH}?${qs.toString()}`)
  // Backend returns paginated results as { data, meta }
  const appeals = res?.data || res || []
  return appeals
}

/**
 * Submit a new appeal
 * @param {object} appealData - Appeal data
 * @param {string} appealData.businessId - Business ID
 * @param {string} appealData.appealType - Type of appeal (wrong_fees, wrong_violations, wrong_assessment, other)
 * @param {string} appealData.description - Description of the appeal
 * @param {string[]} [appealData.evidence] - Evidence URLs
 * @param {string} [appealData.violationId] - Related violation ID
 * @param {string} [appealData.inspectionId] - Related inspection ID
 */
export async function submitAppeal(appealData) {
  const res = await post(BASE_PATH, appealData)
  return res
}

/**
 * Update an appeal (for staff to resolve)
 * @param {string} appealId - Appeal ID
 * @param {object} updateData - Update data
 * @param {string} updateData.status - New status (under_review, approved, rejected)
 * @param {string} [updateData.resolution] - Resolution notes
 */
export async function updateAppeal(appealId, updateData) {
  const res = await put(`${BASE_PATH}/${appealId}`, updateData)
  return res
}

/**
 * Get a specific appeal by ID
 * @param {string} appealId - Appeal ID
 */
export async function getAppealById(appealId) {
  const res = await get(`${BASE_PATH}/${appealId}`)
  return res
}

export const APPEAL_TYPES = {
  wrong_fees: 'Wrong Fees',
  wrong_violations: 'Wrong Violations',
  wrong_assessment: 'Wrong Assessment',
  other: 'Other'
}

export const APPEAL_STATUSES = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected'
}

export function getAppealTypeLabel(type) {
  return APPEAL_TYPES[type] || type || '—'
}

export function getAppealStatusLabel(status) {
  return APPEAL_STATUSES[status] || status || '—'
}
