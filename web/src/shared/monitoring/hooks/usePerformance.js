import { useState, useEffect, useCallback } from 'react'

/**
 * Performance Monitoring Hook
 *
 * PURPOSE: Provides a reusable hook for fetching performance metrics for entities.
 * Similar to the data quality hook pattern for consistency.
 *
 * USAGE EXAMPLE:
 * const { metrics, loading, error, refetch } = usePerformance('variable')
 */

const ENDPOINT_MAP = {
  variable: '/api/business/admin/variables/performance',
  fee: '/api/business/admin/fees/performance',
  application: '/api/business/admin/applications/performance',
  checklist: '/api/business/admin/checklists/performance',
  lob: '/api/business/admin/lobs/performance',
  violation: '/api/business/admin/violations/performance',
}

export function usePerformance(entityType) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { get } = await import('@/lib/http')

      const endpoint = ENDPOINT_MAP[entityType]

      if (!endpoint) {
        throw new Error(`Unsupported entity type: ${entityType}`)
      }

      const res = await get(endpoint)
      setMetrics(res)
    } catch (err) {
      console.error(`Failed to fetch performance metrics for ${entityType}:`, err)
      setError(err.message || 'Failed to fetch performance metrics')
    } finally {
      setLoading(false)
    }
  }, [entityType])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  }
}
