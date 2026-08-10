import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

// Request deduplication cache to prevent duplicate simultaneous requests
const pendingRequests = new Map()

export const getInspectionItems = async (params = {}) => {
  const { isActive, violationId } = params
  const queryParams = new URLSearchParams()
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  if (violationId) queryParams.append('violationId', violationId)
  const queryString = queryParams.toString()
  const cacheKey = `inspection-items:${queryString}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`/api/business/admin/inspection-items?${queryString}`)
    .then(res => res || [])
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export const getInspectionItemsByViolation = async (violationId) => {
  const res = await get(`/api/business/admin/inspection-items/by-violation/${violationId}`)
  return res || []
}

export const getInspectionItem = async (id) => {
  const cacheKey = `inspection-item:${id}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`/api/business/admin/inspection-items/${id}`)
    .then(res => res)
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export const createInspectionItem = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/inspection-items', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const updateInspectionItem = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/inspection-items/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const disableInspectionItem = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/inspection-items/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res
}

export const getInspectionItemAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/inspection-items/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}

export const getInspectionItemDataQuality = async () => {
  const res = await get('/api/business/admin/inspection-items/data-quality')
  return res
}

export const getAllInspectionItemAudits = async (params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/audit/inspection-items?page=${page}&limit=${limit}`)
  return res
}
