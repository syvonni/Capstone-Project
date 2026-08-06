import { useState, useEffect, useCallback } from 'react'

/**
 * Generic hook for fetching audit logs for any entity type
 * @param {string} entityType - The type of entity (e.g., 'fee', 'penalty-rule', 'application')
 * @param {string} entityId - The ID of the entity
 * @param {boolean} shouldFetch - Whether to fetch audit logs (default: true)
 */
export function useAudit(entityType, entityId, shouldFetch = true) {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch audit logs for this entity
   */
  useEffect(() => {
    if (!shouldFetch || !entityType || !entityId) {
      setAuditLogs([])
      return
    }

    const fetchAuditLogs = async () => {
      setLoading(true)
      setError(null)
      try {
        const { get } = await import('@/lib/http')
        
        // Map entity types to API endpoints
        const endpointMap = {
          'fee': `/api/audit/fee/${entityId}`,
          'conditional-fee': `/api/audit/conditional-fee/${entityId}`,
          'variable-fee-rule': `/api/audit/variable-fee-rule/${entityId}`,
          'variable': `/api/audit/variable/${entityId}`,
          'penalty-rule': `/api/audit/penalty-rule/${entityId}`,
          'tax-bracket': `/api/audit/tax-bracket/${entityId}`,
          'lob': `/api/audit/lob/${entityId}`,
          'application': `/api/audit/application/${entityId}`,
          'requirement': `/api/audit/requirement/${entityId}`,
          'requirement-group': `/api/audit/requirement-group/${entityId}`,
          'help-request': `/api/audit/help-request/${entityId}`,
          'business-owner': `/api/audit/business-owner/${entityId}`,
          'permit': `/api/audit/permit/${entityId}`,
          'cms': `/api/audit/cms/${entityId}`,
          'post-requirement': `/api/audit/post-requirement/${entityId}`,
          'violation': `/api/audit/violation/${entityId}`,
          'inspection-item': `/api/audit/inspection-item/${entityId}`,
          'checklist': `/api/audit/checklist/${entityId}`,
          'permit-form': `/api/audit/permit-form/${entityId}`,
        }
        
        const endpoint = endpointMap[entityType]
        if (!endpoint) {
          throw new Error(`Unknown entity type: ${entityType}`)
        }

        const res = await get(endpoint)
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
  }, [entityType, entityId, shouldFetch])

  /**
   * Refresh audit logs
   */
  const refresh = useCallback(() => {
    if (!entityType || !entityId) return

    setLoading(true)
    setError(null)
    const fetchAuditLogs = async () => {
      try {
        const { get } = await import('@/lib/http')
        
        const endpointMap = {
          'fee': `/api/audit/fee/${entityId}`,
          'conditional-fee': `/api/audit/conditional-fee/${entityId}`,
          'variable-fee-rule': `/api/audit/variable-fee-rule/${entityId}`,
          'variable': `/api/audit/variable/${entityId}`,
          'penalty-rule': `/api/audit/penalty-rule/${entityId}`,
          'tax-bracket': `/api/audit/tax-bracket/${entityId}`,
          'lob': `/api/audit/lob/${entityId}`,
          'application': `/api/audit/application/${entityId}`,
          'requirement': `/api/audit/requirement/${entityId}`,
          'requirement-group': `/api/audit/requirement-group/${entityId}`,
          'help-request': `/api/audit/help-request/${entityId}`,
          'business-owner': `/api/audit/business-owner/${entityId}`,
          'permit': `/api/audit/permit/${entityId}`,
          'cms': `/api/audit/cms/${entityId}`,
          'post-requirement': `/api/audit/post-requirement/${entityId}`,
          'violation': `/api/audit/violation/${entityId}`,
          'inspection-item': `/api/audit/inspection-item/${entityId}`,
          'checklist': `/api/audit/checklist/${entityId}`,
          'permit-form': `/api/audit/permit-form/${entityId}`,
        }
        
        const endpoint = endpointMap[entityType]
        if (!endpoint) {
          throw new Error(`Unknown entity type: ${entityType}`)
        }

        const res = await get(endpoint)
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
  }, [entityType, entityId])

  return {
    auditLogs,
    loading,
    error,
    refresh,
  }
}
