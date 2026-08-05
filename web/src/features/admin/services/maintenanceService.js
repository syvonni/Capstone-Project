import { authHeaders, fetchJsonWithFallback } from '@/lib/http.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

export async function requestMaintenance(payload, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  return fetchJsonWithFallback('/api/admin/maintenance/request', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function getMaintenanceConflicts(start, end) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin')
  const params = new URLSearchParams({
    start,
    end,
  })
  return fetchJsonWithFallback(`/api/admin/maintenance/conflicts?${params.toString()}`, {
    method: 'GET',
    headers,
  })
}

export async function getMaintenanceCurrent() {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin')
  return fetchJsonWithFallback('/api/maintenance/current', {
    method: 'GET',
    headers,
  })
}

export async function getMaintenancePublicStatus() {
  return fetchJsonWithFallback('/api/maintenance/status', { method: 'GET' })
}

export async function getMaintenanceApprovals() {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin')
  return fetchJsonWithFallback('/api/admin/approvals?requestType=maintenance_mode', {
    method: 'GET',
    headers,
  })
}

export async function undoVote(approvalId) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin')
  return fetchJsonWithFallback(`/api/admin/approvals/${approvalId}/approve`, {
    method: 'DELETE',
    headers,
  })
}

export async function approveMaintenance(approvalId, approved = true, comment = '', options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  return fetchJsonWithFallback(`/api/admin/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ approved, comment }),
  })
}

export async function cancelApprovedMaintenance(approvalId, options = {}) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  return fetchJsonWithFallback(`/api/admin/maintenance/${approvalId}/cancel`, {
    method: 'POST',
    headers,
  })
}
