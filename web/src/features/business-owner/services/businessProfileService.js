import { get, post, put, patch, del, fetchWithFallback } from '@/lib/http.js'

const BASE_PATH = '/api/business'

/**
 * Get the current user's business profile
 */
export async function getProfile() {
  const res = await get(`${BASE_PATH}/profile`)
  return res
}

/**
 * Update business profile step
 * @param {number} step - Step number
 * @param {object} data - Step data
 */
export async function updateProfileStep(step, data) {
  const res = await post(`${BASE_PATH}/profile`, { step, data })
  return res
}

/**
 * Upload owner ID image
 * @param {File} file - Image file
 * @param {'front' | 'back'} side - Which side of the ID
 */
export async function uploadOwnerId(file, side = 'front') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('side', side)

  const response = await fetchWithFallback(`${BASE_PATH}/profile/owner-id/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Failed to upload ID')
  }

  const json = await response.json()
  return json
}

/**
 * Get all businesses for the current user
 */
export async function getBusinesses() {
  const res = await get(`${BASE_PATH}/businesses`)
  return res?.businesses || []
}

/**
 * Get businesses with pagination and filtering
 * @param {object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.search - Search term
 * @param {string} options.status - Filter by status
 * @param {string} options.sort - Sort field
 * @param {string} options.order - Sort order (asc/desc)
 */
export async function getBusinessesPaginated(options = {}) {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    sort = 'updatedAt',
    order = 'desc'
  } = options

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(status && { status }),
    sort,
    order
  })

  const res = await get(`${BASE_PATH}/businesses?${params}`)
  return {
    businesses: res?.businesses || [],
    pagination: {
      currentPage: res?.pagination?.currentPage || page,
      totalPages: res?.pagination?.totalPages || 1,
      totalItems: res?.pagination?.totalItems || 0,
      hasNext: res?.pagination?.hasNext || false,
      hasPrev: res?.pagination?.hasPrev || false
    }
  }
}

/**
 * Get primary business
 */
export async function getPrimaryBusiness() {
  const res = await get(`${BASE_PATH}/businesses/primary`)
  return res?.business || null
}

/**
 * Add a new business
 * @param {object} businessData - Business data
 */
export async function addBusiness(businessData) {
  const res = await post(`${BASE_PATH}/businesses`, businessData)
  return res
}

/**
 * Update a business
 * @param {string} businessId - Business ID
 * @param {object} businessData - Updated business data
 */
export async function updateBusiness(businessId, businessData) {
  const res = await put(`${BASE_PATH}/businesses/${businessId}`, businessData)
  return res
}

/**
 * Update business status only
 * @param {string} businessId - Business ID
 * @param {'active' | 'inactive' | 'closed'} businessStatus - New status
 */
export async function updateBusinessStatus(businessId, businessStatus) {
  const res = await patch(`${BASE_PATH}/businesses/${businessId}`, { businessStatus })
  return res
}

/**
 * Delete a business
 * @param {string} businessId - Business ID
 */
export async function deleteBusiness(businessId) {
  const res = await del(`${BASE_PATH}/businesses/${businessId}`)
  return res
}



/**
 * Set a business as primary
 * @param {string} businessId - Business ID
 */
export async function setPrimaryBusiness(businessId) {
  const res = await post(`${BASE_PATH}/businesses/${businessId}/primary`)
  return res
}

/**
 * Update business risk profile
 * @param {string} businessId - Business ID
 * @param {object} riskProfileData - Risk profile data
 */
export async function updateRiskProfile(businessId, riskProfileData) {
  const res = await put(`${BASE_PATH}/businesses/${businessId}/risk-profile`, riskProfileData)
  return res
}

export async function createWalkInApplication(ownerId, businessData) {
  const res = await post('/api/lgu-officer/walk-in-applications', { ownerId, businessData })
  return res
}


