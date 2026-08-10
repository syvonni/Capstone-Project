import { get } from '@/lib/http.js'

const BASE_PATH = '/api/admin/announcements'

/**
 * Get announcements for business owners
 * @returns {Promise<object>} Announcements data
 */
export async function getAnnouncements() {
  const res = await get(BASE_PATH, { skipAuth: true })
  return res || []
}
