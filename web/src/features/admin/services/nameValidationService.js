import { get } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

/**
 * Validate if a name already exists across entity types
 * @param {string} name - The name to validate
 * @param {string} entityType - The entity type being created (optional)
 * @param {string} excludeId - Exclude current entity ID for updates (optional)
 * @returns {Promise<{ok: boolean, valid: boolean, conflicts: Array}>}
 */
export const validateName = async (name, entityType, excludeId) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin')

  const queryParams = new URLSearchParams()
  queryParams.append('name', name)
  if (entityType) queryParams.append('entityType', entityType)
  if (excludeId) queryParams.append('excludeId', excludeId)

  const res = await get(`/api/business/admin/validate-name?${queryParams.toString()}`, {
    headers,
  })

  return {
    ok: res.ok,
    valid: res.valid,
    conflicts: res.conflicts || [],
  }
}
