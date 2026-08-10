import { useMemo } from 'react'
import { ThunderboltOutlined } from '@ant-design/icons'
import { Collapse, Typography } from 'antd'
import SplitCard from '@/shared/components/SplitCard'
import { usePerformance } from '../hooks/usePerformance'

const { Text } = Typography

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

    // Handle operations being either an object or array for backwards compatibility
    const operationsArray = Array.isArray(performanceMetrics.operations)
      ? performanceMetrics.operations
      : Object.keys(performanceMetrics.operations || {}).map((op) => ({
          operation: op,
          ...performanceMetrics.operations[op],
        }))

    // Average response time
    let responseTimeColor = 'gray'
    if (performanceMetrics.avgResponseTime > 0) {
      if (performanceMetrics.avgResponseTime >= 1000) {
        responseTimeColor = 'error'
      } else if (performanceMetrics.avgResponseTime >= 500) {
        responseTimeColor = 'warning'
      } else {
        responseTimeColor = 'success'
      }
    }

    links.push({
      count: performanceMetrics.avgResponseTime,
      text: 'ms avg response time',
      linkColor: responseTimeColor,
      modalContent: performanceMetrics.avgResponseTime > 0 ? {
        title: 'Response time by operation in the last 24 hours',
        items: operationsArray.map(op => ({
          text: `${op.operation} ${op.endpoint || ''}: ${Math.round(op.avgResponseTime)}ms avg (${op.count} requests)`,
        })),
      } : null
    })

    // Error rate
    let errorRateColor = 'gray'
    if (performanceMetrics.errorRate > 0) {
      if (performanceMetrics.errorRate < 0.01) {
        errorRateColor = 'success' // Good
      } else if (performanceMetrics.errorRate < 0.05) {
        errorRateColor = 'warning'
      } else {
        errorRateColor = 'error'
      }
    }

    const errorDetailsItems = [
      { text: `Total errors: ${performanceMetrics.errorCount || 0}` },
      { text: `Total requests: ${performanceMetrics.requestCount || 0}` },
    ]

    // Add error details if available
    if (performanceMetrics.errorDetails && performanceMetrics.errorDetails.length > 0) {
      performanceMetrics.errorDetails.forEach((errorGroup) => {
        const firstOccurrence = new Date(errorGroup.firstOccurrence).toLocaleString()
        const lastOccurrence = new Date(errorGroup.lastOccurrence).toLocaleString()
        
        errorDetailsItems.push({
          text: `${errorGroup.errorName}: ${errorGroup.count} occurrences`,
          subItems: [
            { text: `Message: ${errorGroup.errorMessage}` },
            { text: `First seen: ${firstOccurrence}` },
            { text: `Last seen: ${lastOccurrence}` },
            ...(errorGroup.sampleEndpoints.length > 0 ? [{ text: `Endpoints: ${errorGroup.sampleEndpoints.join(', ')}` }] : []),
          ],
        })
      })
    }

    links.push({
      count: `${Math.round(performanceMetrics.errorRate * 100)}%`,
      text: 'error rate',
      linkColor: errorRateColor,
      modalContent: performanceMetrics.errorRate > 0 ? {
        title: 'Error details in the last 24 hours',
        items: errorDetailsItems,
      } : null
    })

    // Request volume
    links.push({
      count: performanceMetrics.requestCount,
      text: 'requests',
      linkColor: performanceMetrics.requestCount > 0 ? 'success' : 'gray',
      modalContent: performanceMetrics.requestCount > 0 ? {
        title: 'Request volume in the last 24 hours',
        items: operationsArray.map(op => ({
          text: `${op.operation} ${op.endpoint || ''}: ${op.count} requests`,
        })),
      } : null
    })

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
      disableBorderBehavior={true}
    />
  )
}
