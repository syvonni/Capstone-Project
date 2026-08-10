import { get, post, put, del } from '@/lib/http.js'

export async function getAnnouncements(audience) {
  const query = audience ? `?audience=${audience}` : ''
  const res = await get(`/api/admin/announcements${query}`)
  return res || []
}

export async function createAnnouncement(payload) {
  const res = await post('/api/admin/announcements', payload)
  return res
}

export async function updateAnnouncement(id, payload) {
  const res = await put(`/api/admin/announcements/${id}`, payload)
  return res
}

export async function deleteAnnouncement(id) {
  const res = await del(`/api/admin/announcements/${id}`)
  return res
}
