import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

// Request deduplication cache to prevent duplicate simultaneous requests
const pendingRequests = new Map()

export const getLob = async (id) => {
  const cacheKey = `lob:${id}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`/api/business/admin/lobs/${id}`)
    .then(res => res?.data)
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export const createLob = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/lobs', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}

export const updateLob = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/lobs/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}

export const getLobAuditHistory = async (id, params = {}) => {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, value)
  })
  const res = await get(`/api/business/admin/lobs/${id}/audit?${queryParams.toString()}`)
  return res?.data
}

export const getPostRequirements = async () => {
  const res = await get('/api/business/admin/lobs/post-requirements')
  return res?.data || []
}
