import { get, post, put, del } from '@/lib/http.js'

export async function getAnnouncements(audience) {
  const query = audience ? `?audience=${audience}` : ''
  return get(`/api/admin/announcements${query}`)
}

export async function createAnnouncement(payload) {
  return post('/api/admin/announcements', payload)
}

export async function updateAnnouncement(id, payload) {
  return put(`/api/admin/announcements/${id}`, payload)
}

export async function deleteAnnouncement(id) {
  return del(`/api/admin/announcements/${id}`)
}
