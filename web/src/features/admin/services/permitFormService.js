import { post, put, patch, get } from '@/lib/http'

export async function createPermitForm(data, options = {}) {
  const { stepUpToken } = options || {}
  const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
  return post('/api/admin/permit-forms', data, { headers })
}

export async function updatePermitForm(id, data, options = {}) {
  const { stepUpToken } = options || {}
  const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
  return put(`/api/admin/permit-forms/${id}`, data, { headers })
}

export async function updatePermitFormStatus(id, data, options = {}) {
  const { stepUpToken } = options || {}
  const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
  return patch(`/api/admin/permit-forms/${id}/status`, data, { headers })
}

export async function getPermitForms() {
  return get('/api/admin/permit-forms')
}

export async function getPermitForm(id) {
  return get(`/api/admin/permit-forms/${id}`)
}

export async function getPermitFormByFormId(formId) {
  return get(`/api/admin/permit-forms/by-formId/${formId}`)
}

export async function getPermitFormByFeeId(feeId) {
  const res = await get(`/api/admin/permit-forms/by-feeId/${feeId}`)
  return res?.form || res?.data?.form
}

export async function getClaimableDocumentsByPermitFormId(permitFormId) {
  const res = await get(`/api/admin/permit-forms/${permitFormId}/documents`)
  return res?.documents || res?.data?.documents || []
}

export async function createTemporaryPermitForm(data, options = {}) {
  const { fetchJsonWithFallback } = await import('@/lib/http')
  const { getCurrentUser } = await import('@/features/authentication/lib/authEvents')
  const { authHeaders } = await import('@/lib/authHeaders')

  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })

  const res = await fetchJsonWithFallback('/api/admin/permit-forms/temporary', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res?.data
}
