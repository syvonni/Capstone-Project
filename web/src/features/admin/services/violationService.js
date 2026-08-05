import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

export const getViolations = async (params = {}) => {
  const { category, severity, isActive } = params
  const queryParams = new URLSearchParams()
  if (category) queryParams.append('category', category)
  if (severity) queryParams.append('severity', severity)
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  
  const res = await get(`/api/business/admin/violations?${queryParams.toString()}`)
  return res?.data || []
}

export const getViolation = async (id) => {
  const res = await get(`/api/business/admin/violations/${id}`)
  return res?.data
}

export const createViolation = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/violations', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}

export const updateViolation = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/violations/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}

export const disableViolation = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/violations/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res?.data
}

export const getViolationAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/violations/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}

export const getViolationsByFee = async (feeId) => {
  const res = await get(`/api/business/admin/violations?feeId=${feeId}`)
  return res?.data || []
}
