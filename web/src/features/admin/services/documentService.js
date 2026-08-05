import { get, post, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

// Document API
export const getDocuments = async (params = {}) => {
  const { category, isActive, includeDrafts } = params
  const queryParams = new URLSearchParams()
  if (category) queryParams.append('category', category)
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  if (includeDrafts) queryParams.append('includeDrafts', 'true')
  
  const res = await get(`/api/business/admin/documents?${queryParams.toString()}`)
  return res?.data || []
}

export const getDocument = async (id) => {
  const res = await get(`/api/business/admin/documents/${id}`)
  return res?.data
}

export const getDocumentDraft = async (id) => {
  const res = await get(`/api/business/admin/documents/${id}/draft`)
  return res?.data
}

export const saveDocumentDraft = async (id, data, options = {}) => {
  const res = await post(`/api/business/admin/documents/${id}/draft`, data, options)
  return res?.data
}

export const publishDocumentDraft = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/documents/${id}/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
  return res?.data
}

export const createDocument = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/documents', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}

export const updateDocument = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/documents/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}

export const disableDocument = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/documents/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res?.data
}

// Audit History API
export const getDocumentAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/documents/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}
