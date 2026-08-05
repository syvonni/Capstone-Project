import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

const API_BASE = '/api/business/admin/variables'
const PUBLIC_API_BASE = '/api/public/business/variables'
const AUDIT_API_BASE = '/api/audit/variables'

// Request deduplication cache to prevent duplicate simultaneous requests
const pendingRequests = new Map()

export async function getVariables(filters = {}) {
  const queryParams = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, value)
  })
  const queryString = queryParams.toString()
  const cacheKey = `variables:${queryString}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`${API_BASE}?${queryString}`)
    .then(res => res?.data || [])
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export async function getVariable(id) {
  const cacheKey = `variable:${id}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`${API_BASE}/${id}`)
    .then(res => res?.data)
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export async function createVariable(data, options = {}) {
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
  return res?.data
}

export async function updateVariable(id, data, options = {}) {
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
  return res?.data
}

export async function deleteVariable(id, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res?.data
}

export async function getVariableAudit(id) {
  const res = await get(`${API_BASE}/${id}/audit`)
  return res?.data
}

export async function getVariablesByFeeId(feeId) {
  const res = await get(`${API_BASE}/by-fee/${feeId}?_t=${Date.now()}`)
  return res?.data || []
}

export async function getVariablesByVariableFeeRuleId(variableFeeRuleId) {
  const res = await get(`${API_BASE}/by-variable-fee-rule/${variableFeeRuleId}?_t=${Date.now()}`)
  return res?.data || []
}

// Fees service - for updating variable calculation fields
export async function updateVariableCalculation(id, data, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/fees/variables/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}

// Audit service - get all variable audit logs
export async function getAllVariableAudits(params = {}) {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value)
    }
  })
  const queryString = queryParams.toString()

  const res = await get(`${AUDIT_API_BASE}${queryString ? `?${queryString}` : ''}`)
  const payload = res?.logs ? res : res?.data
  return payload || { logs: [], total: 0, page: 1, limit: 20, totalPages: 0 }
}
