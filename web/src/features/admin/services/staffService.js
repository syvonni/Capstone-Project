import { fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

function authOpts(extra) {
  const current = getCurrentUser()
  return authHeaders(current, 'admin', { 'Content-Type': 'application/json', ...(extra || {}) })
}

export async function getStaffList() {
  const data = await fetchJsonWithFallback('/api/auth/staff', { method: 'GET' })
  const payload = data
  return Array.isArray(payload) ? payload : (payload?.staff || [])
}

export async function createStaff(payload, options = {}) {
  const data = await fetchJsonWithFallback('/api/auth/staff', {
    method: 'POST',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateStaff(staffId, payload, options = {}) {
  const data = await fetchJsonWithFallback(`/api/auth/admin/staff/${staffId}`, {
    method: 'PATCH',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function resetStaffPassword(staffId, payload, options = {}) {
  const data = await fetchJsonWithFallback(`/api/auth/admin/staff/${staffId}/reset-password`, {
    method: 'POST',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function getOffices() {
  const data = await fetchJsonWithFallback('/api/auth/admin/offices', { method: 'GET' })
  const payload = data
  return Array.isArray(payload) ? payload : (payload?.offices || [])
}

export async function createOffice(payload, options = {}) {
  const data = await fetchJsonWithFallback('/api/auth/admin/offices', {
    method: 'POST',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateOffice(officeId, payload, options = {}) {
  const data = await fetchJsonWithFallback(`/api/auth/admin/offices/${officeId}`, {
    method: 'PATCH',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function deleteOffice(officeId, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', options.stepUpToken && { stepUpToken: options.stepUpToken })
  const data = await fetchJsonWithFallback(`/api/auth/admin/offices/${officeId}`, {
    method: 'DELETE',
    headers,
  })
  return data
}

export async function getStaffRoles() {
  const data = await fetchJsonWithFallback('/api/auth/admin/staff-roles', { method: 'GET' })
  const payload = data
  return Array.isArray(payload) ? payload : (payload?.roles || [])
}

export async function createStaffRole(payload, options = {}) {
  const data = await fetchJsonWithFallback('/api/auth/admin/staff-roles', {
    method: 'POST',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateStaffRole(roleId, payload, options = {}) {
  const data = await fetchJsonWithFallback(`/api/auth/admin/staff-roles/${roleId}`, {
    method: 'PATCH',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function deleteStaffRole(roleId, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', options.stepUpToken && { stepUpToken: options.stepUpToken })
  const data = await fetchJsonWithFallback(`/api/auth/admin/staff-roles/${roleId}`, {
    method: 'DELETE',
    headers,
  })
  return data
}

// ─── Admin Account Management ───

export async function getAdminList() {
  const data = await fetchJsonWithFallback('/api/auth/admin/admins', { method: 'GET' })
  const payload = data
  return Array.isArray(payload) ? payload : (payload?.admins || [])
}

export async function requestAdminChange(adminId, payload, options = {}) {
  const data = await fetchJsonWithFallback(`/api/auth/admin/admins/${adminId}/request-change`, {
    method: 'POST',
    headers: authOpts(options?.stepUpToken ? { stepUpToken: options.stepUpToken } : null),
    body: JSON.stringify(payload),
  })
  return data
}

export async function getAdminPendingApprovals(adminId) {
  const data = await fetchJsonWithFallback(`/api/auth/admin/admins/${adminId}/pending-approvals`, { method: 'GET' })
  const payload = data
  return payload?.approvals || []
}
