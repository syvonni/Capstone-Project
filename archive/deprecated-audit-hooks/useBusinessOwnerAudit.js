import { useState, useEffect, useCallback } from 'react'
import { get } from '@/lib/http.js'

/**
 * Manages audit-related state and operations for business owners
 * Handles fetching audit logs from the audit-service
 */
export function useBusinessOwnerAudit(businessOwner, shouldFetch = true) {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const ownerId = businessOwner?._id || businessOwner?.id

  /**
   * Fetch audit logs for this business owner
   */
  const fetchAuditLogs = useCallback(async () => {
    if (!ownerId || !shouldFetch) {
      setAuditLogs([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await get(`/api/audit/business-owner/${ownerId}`)
      setAuditLogs(res.logs || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setError(err.message || 'Failed to fetch audit logs')
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }, [ownerId, shouldFetch])

  // Fetch on mount and when ownerId changes
  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  /**
   * Refresh audit logs
   */
  const refresh = useCallback(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  return {
    auditLogs,
    loading,
    error,
    refresh
  }
}
