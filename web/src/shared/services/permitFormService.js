import { get } from '@/lib/http'

/**
 * Public permit form service - for use by business-owner, staffs, and public features
 */

export async function getPublicPermitForms() {
  const res = await get('/api/public/permit-forms')
  return res?.forms || res?.data || []
}

export async function getPublicPermitForm(id) {
  return get(`/api/public/permit-forms/${id}`)
}

export async function getPublicPermitFormByFormId(formId) {
  return get(`/api/public/permit-forms/by-formId/${formId}`)
}
