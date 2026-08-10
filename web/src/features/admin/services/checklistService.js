import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

// Request deduplication cache to prevent duplicate simultaneous requests
const pendingRequests = new Map()

export const getChecklists = async (params = {}) => {
  const { isActive } = params
  const queryParams = new URLSearchParams()
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  const queryString = queryParams.toString()
  const cacheKey = `checklists:${queryString}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`/api/business/admin/checklists?${queryString}`)
    .then(res => res || [])
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export const getChecklist = async (id) => {
  const cacheKey = `checklist:${id}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`/api/business/admin/checklists/${id}`)
    .then(res => res)
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export const getChecklistsByInspectionItem = async (inspectionItemId) => {
  const res = await get(`/api/business/admin/inspection-items/${inspectionItemId}/checklists`)
  return res || []
}

export const createChecklist = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/checklists', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const updateChecklist = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/checklists/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const disableChecklist = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/checklists/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res
}

export const getChecklistAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/checklists/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}

export const getChecklistDataQuality = async () => {
  const res = await get('/api/business/admin/checklists/data-quality')
  return res
}

export const getAllChecklistAudits = async (params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/audit/checklists?page=${page}&limit=${limit}`)
  return res
}
