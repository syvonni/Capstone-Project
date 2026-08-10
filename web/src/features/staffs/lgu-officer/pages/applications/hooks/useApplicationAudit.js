import { useState, useEffect, useCallback } from 'react'
import { getAppealsByBusiness } from '../../../services/appealsService'

/**
 * Manages audit-related state and operations for applications
 * Handles fetching audit logs from the audit-service
 */
export function useApplicationAudit(application, shouldFetch = true) {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch audit logs for this application
   */
  useEffect(() => {
    if (!shouldFetch) return

    const applicationId = application?.businessId || application?.applicationId || application?._id
    if (!applicationId) {
      setAuditLogs([])
      return
    }

    const fetchAuditLogs = async () => {
      setLoading(true)
      setError(null)
      try {
        const { get } = await import('@/lib/http')
        const res = await get(`/api/audit/application/${applicationId}`)
        const logs = res?.logs || []
        setAuditLogs(logs)
      } catch (err) {
        console.error('Failed to fetch audit logs:', err)
        setError(err.message || 'Failed to fetch audit logs')
        setAuditLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchAuditLogs()
  }, [application?.businessId, application?.applicationId, application?._id, shouldFetch])

  /**
   * Refresh audit logs
   */
  const refresh = useCallback(() => {
    const applicationId = application?.businessId || application?.applicationId || application?._id
    if (!applicationId) return

    setLoading(true)
    setError(null)
    const fetchAuditLogs = async () => {
      try {
        const { get } = await import('@/lib/http')
        const res = await get(`/api/audit/application/${applicationId}`)
        const logs = res?.logs || []
        setAuditLogs(logs)
      } catch (err) {
        console.error('Failed to fetch audit logs:', err)
        setError(err.message || 'Failed to fetch audit logs')
        setAuditLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchAuditLogs()
  }, [application?.businessId, application?.applicationId, application?._id])

  return {
    auditLogs,
    loading,
    error,
    refresh,
  }
}

/**
 * Manages appeal-related state for applications
 * Handles fetching appeal data
 */
export function useApplicationAppeals(application) {
  const [latestAppeal, setLatestAppeal] = useState(null)

  /**
   * Fetch latest appeal data when status is appeal_pending, appeal_rejected, or hadAppealGranted
   */
  useEffect(() => {
    const status = application?.status || application?.applicationStatus
    const isAppealPending = status === 'appeal_pending'
    const isAppealRejected = status === 'appeal_rejected'
    const hadAppealGranted = application?.hadAppealGranted
    const hasActiveAppeal = application?.hasActiveAppeal
    const appealId = application?.appealId
    const businessId = application?.businessId || application?.applicationId

    if (!businessId || (!isAppealPending && !isAppealRejected && !hadAppealGranted && !hasActiveAppeal && !appealId)) {
      setLatestAppeal(null)
      return
    }

    const fetchAppeal = async () => {
      try {
        const res = await getAppealsByBusiness(businessId)
        const appeals = res || []
        const activeAppeal = appeals[0] || null
        setLatestAppeal(activeAppeal)
      } catch (err) {
        console.error('Failed to fetch appeal:', err)
        setLatestAppeal(null)
      }
    }

    fetchAppeal()
  }, [application?.status, application?.applicationStatus, application?.hadAppealGranted, application?.hasActiveAppeal, application?.appealId, application?.businessId, application?.applicationId])

  /**
   * Get active appeal for this application
   */
  const getActiveAppeal = useCallback(async () => {
    const businessId = application?.businessId || application?.applicationId
    if (!businessId) return null

    try {
      const res = await getAppealsByBusiness(businessId)
      const appeals = res || []
      const activeAppeal = appeals.find(a => a.status === 'submitted' || a.status === 'under_review')
      return activeAppeal || null
    } catch (err) {
      console.error('Failed to fetch active appeal:', err)
      return null
    }
  }, [application?.businessId, application?.applicationId])

  return {
    latestAppeal,
    getActiveAppeal,
  }
}
