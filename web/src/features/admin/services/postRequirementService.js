import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

const API_BASE = '/api/business/admin/post-requirements'
const PUBLIC_API_BASE = '/api/public/business/post-requirements'

// Request deduplication cache to prevent duplicate simultaneous requests
const pendingRequests = new Map()

export async function getPostRequirements(filters = {}) {
  const queryParams = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, value)
  })
  const queryString = queryParams.toString()
  const cacheKey = `post-requirements:${queryString}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`${API_BASE}?${queryString}`)
    .then(res => res || [])
    .finally(() => {
      // Remove from cache when complete (success or failure)
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export async function getPostRequirement(id) {
  const cacheKey = `post-requirement:${id}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`${API_BASE}/${id}`)
    .then(res => res)
    .finally(() => {
      // Remove from cache when complete (success or failure)
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export async function createPostRequirement(data, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export async function updatePostRequirement(id, data, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export async function getPostRequirementAudit(id) {
  const res = await get(`${API_BASE}/${id}/audit`)
  return res
}

export async function disablePostRequirement(id, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res
}

export async function getDataQuality() {
  const res = await get(`${API_BASE}/data-quality`)
  return res
}

export const getAllPostRequirementAudits = async (params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/audit/post-requirements?page=${page}&limit=${limit}`)
  return res
}

export async function getPostRequirementPerformance() {
  const res = await get(`${API_BASE}/performance`)
  return res
}
