import { useMemo } from 'react'
import { ThunderboltOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { usePerformance } from '../hooks/usePerformance'

/**
 * Generic Performance Stats Panel Component
 *
 * PURPOSE: Displays performance metrics for any entity type using the generic
 * performance monitoring infrastructure. Can be used across all admin pages.
 *
 * USAGE EXAMPLE:
 * <PerformanceStatsPanel entityType="variable" />
 * <PerformanceStatsPanel entityType="fee" />
 */

export default function PerformanceStatsPanel({ entityType }) {
  const { metrics: performanceMetrics, loading, error } = usePerformance(entityType)

  const performanceLinks = useMemo(() => {
    if (!performanceMetrics) {
      return []
    }

    const links = []
    const status = performanceMetrics?.status || 'good'

    // Average response time
    if (performanceMetrics.avgResponseTime > 0) {
      let linkColor = 'success'
      if (status === 'critical') {
        linkColor = 'error'
      } else if (status === 'warning') {
        linkColor = 'warning'
      }

      links.push({
        count: performanceMetrics.avgResponseTime,
        text: 'ms avg response time',
        linkColor,
        modalContent: {
          title: 'Response time by operation in the last 24 hours',
          items: performanceMetrics.operations ? performanceMetrics.operations.map(op => ({
            text: `${op.operation} ${op.endpoint}: ${Math.round(op.avgResponseTime)}ms avg (${op.count} requests)`,
          })) : [],
        },
      })
    }

    // Error rate
    if (performanceMetrics.errorRate > 0) {
      let linkColor = 'success'
      if (performanceMetrics.errorRate < 0.01) {
        linkColor = 'success' // Good
      } else if (performanceMetrics.errorRate < 0.05) {
        linkColor = 'warning'
      } else {
        linkColor = 'error'
      }

      links.push({
        count: `${Math.round(performanceMetrics.errorRate * 100)}%`,
        text: 'error rate',
        linkColor,
        modalContent: {
          title: 'Error details in the last 24 hours',
          items: [
            { text: `Total errors: ${performanceMetrics.errorCount || 0}` },
            { text: `Total requests: ${performanceMetrics.requestCount || 0}` },
          ],
        },
      })
    }

    // Request volume
    if (performanceMetrics.requestCount > 0) {
      links.push({
        count: performanceMetrics.requestCount,
        text: 'requests (24h)',
        linkColor: 'success',
        modalContent: {
          title: 'Request volume in the last 24 hours',
          items: performanceMetrics.operations ? performanceMetrics.operations.map(op => ({
            text: `${op.operation} ${op.endpoint}: ${op.count} requests`,
          })) : [],
        },
      })
    }

    // Slowest operation
    if (performanceMetrics.slowestOperations && performanceMetrics.slowestOperations.length > 0) {
      const slowest = performanceMetrics.slowestOperations[0]
      let linkColor = 'success'
      if (slowest.responseTime >= 1000) {
        linkColor = 'error'
      } else if (slowest.responseTime >= 500) {
        linkColor = 'warning'
      }

      links.push({
        count: slowest.responseTime,
        text: 'ms slowest',
        linkColor,
        modalContent: {
          title: 'Slowest operations in the last 24 hours',
          items: performanceMetrics.slowestOperations.map(op => ({
            text: `${op.operation}: ${op.responseTime}ms - ${op.endpoint}`,
          })),
        },
      })
    }

    return links
  }, [performanceMetrics])

  if (error) {
    return null // Or show error state
  }

  return (
    <SplitCard
      title="Performance"
      icon={ThunderboltOutlined}
      leftPanelWidth="20%"
      rightPanelWidth="80%"
      links={performanceLinks}
      loading={loading}
    />
  )
}
