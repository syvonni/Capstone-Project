import { get } from '@/lib/http'

/**
 * Public permit form service - for use by business-owner, staffs, and public features
 */

export async function getPublicPermitForms() {
  const res = await get('/api/public/permit-forms')
  // Backend now returns data directly (array)
  return Array.isArray(res) ? res : []
}

export async function getPublicPermitForm(id) {
  const res = await get(`/api/public/permit-forms/${id}`)
  return res
}

export async function getPublicPermitFormByFormId(formId) {
  const res = await get(`/api/public/permit-forms/by-formId/${formId}`)
  return res
}

export async function getPublicPermitFormsGrouped() {
  const res = await get('/api/public/permit-forms/grouped')
  return res
}
