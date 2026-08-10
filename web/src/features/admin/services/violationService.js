import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

const API_BASE = '/api/business/admin/violations'
const AUDIT_API_BASE = '/api/audit/violations'

export const getViolations = async (params = {}) => {
  const { category, severity, isActive } = params
  const queryParams = new URLSearchParams()
  if (category) queryParams.append('category', category)
  if (severity) queryParams.append('severity', severity)
  if (isActive !== undefined) queryParams.append('isActive', isActive)

  const res = await get(`${API_BASE}?${queryParams.toString()}`)
  return res || []
}

export const getViolation = async (id) => {
  const res = await get(`${API_BASE}/${id}`)
  return res
}

export const createViolation = async (data, options = {}) => {
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

export const updateViolation = async (id, data, options = {}) => {
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

export const disableViolation = async (id, options = {}) => {
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

export const getViolationAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`${API_BASE}/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}

export const getViolationsByFee = async (feeId) => {
  const res = await get(`${API_BASE}?feeId=${feeId}`)
  return res || []
}

export const getAllViolationAudits = async (params = {}) => {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value)
    }
  })
  const queryString = queryParams.toString()

  const res = await get(`${AUDIT_API_BASE}${queryString ? `?${queryString}` : ''}`)
  return res || { logs: [], total: 0, page: 1, limit: 20, totalPages: 0 }
}

export const getDataQualityIssues = async () => {
  const res = await get(`${API_BASE}/data-quality`)
  return res || { issues: [], totalEntities: 0, totalIssues: 0 }
}
