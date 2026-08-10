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
  return res || []
}

export const getDocument = async (id) => {
  const res = await get(`/api/business/admin/documents/${id}`)
  return res
}

export const getDocumentDraft = async (id) => {
  const res = await get(`/api/business/admin/documents/${id}/draft`)
  return res
}

export const saveDocumentDraft = async (id, data, options = {}) => {
  const res = await post(`/api/business/admin/documents/${id}/draft`, data, options)
  return res
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
  return res
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
  return res
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
  return res
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
  return res
}

// Audit History API
export const getDocumentAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/documents/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}
