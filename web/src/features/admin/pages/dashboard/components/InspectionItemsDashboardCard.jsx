import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircleOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { getInspectionItems, getAllInspectionItemAudits } from '@/features/admin/services/inspectionItemService'
import { useDataQuality } from '@/shared/monitoring/hooks/useDataQuality'
import { usePerformance } from '@/shared/monitoring/hooks/usePerformance'
import { ISSUE_TYPE_LABELS } from '@/shared/config/dataQualityIssueTypes'

export default function InspectionItemsDashboardCard() {
  const [inspectionItems, setInspectionItems] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [lastActivity, setLastActivity] = useState('No activity')
  const [loading, setLoading] = useState(true)

  // Use data quality hook to fetch issues
  const { issues: dataQualityIssues } = useDataQuality('inspectionItem')
  
  // Use performance hook to fetch metrics
  const { metrics: performanceMetrics } = usePerformance('inspectionItem')

  const fetchInspectionItems = useCallback(async () => {
    try {
      const inspectionItemsData = await getInspectionItems()
      setInspectionItems(inspectionItemsData)
    } catch (error) {
      console.error('Error fetching inspection items:', error)
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const auditData = await getAllInspectionItemAudits({ page: 1, limit: 20 })
      setAuditLogs(auditData.logs || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setAuditLogs([])
    }
  }, [])

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchInspectionItems(),
        fetchAuditLogs()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchInspectionItems, fetchAuditLogs])

  // Calculate last activity from audit logs
  useEffect(() => {
    if (auditLogs.length > 0) {
      const latestAudit = auditLogs[0]
      const timestamp = new Date(latestAudit.createdAt)
      const now = new Date()
      const diffMs = now - timestamp
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) {
        setLastActivity('Just now')
      } else if (diffMins < 60) {
        setLastActivity(`${diffMins} minute${diffMins > 1 ? 's' : ''} ago`)
      } else if (diffHours < 24) {
        setLastActivity(`${diffHours} hour${diffHours > 1 ? 's' : ''} ago`)
      } else {
        setLastActivity(`${diffDays} day${diffDays > 1 ? 's' : ''} ago`)
      }
    }
  }, [auditLogs])

  // Status links
  const statusLinks = useMemo(() => {
    const activeInspectionItems = inspectionItems.filter(i => i.isActive).length
    const disabledInspectionItems = inspectionItems.filter(i => !i.isActive).length

    // Calculate new inspection items added this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newInspectionItemsThisWeek = inspectionItems.filter(i => {
      const createdAt = new Date(i.createdAt)
      return createdAt >= oneWeekAgo
    }).length

    const links = [
      {
        count: activeInspectionItems,
        text: 'Active',
        linkColor: activeInspectionItems > 0 ? 'success' : 'gray',
        modalContent: activeInspectionItems > 0 ? {
          title: 'Active Inspection Items',
          items: inspectionItems.filter(i => i.isActive).map(i => ({
            text: i.name,
            to: `/admin/inspections?selectedId=${i._id}&tab=inspection_items`
          }))
        } : null
      },
      {
        count: disabledInspectionItems,
        text: 'Disabled',
        linkColor: 'gray',
        modalContent: disabledInspectionItems > 0 ? {
          title: 'Disabled Inspection Items',
          items: inspectionItems.filter(i => !i.isActive).map(i => ({
            text: i.name,
            to: `/admin/inspections?selectedId=${i._id}&tab=inspection_items`
          }))
        } : null
      }
    ]

    // Add new inspection items this week
    links.push({
      count: newInspectionItemsThisWeek,
      text: 'Newly Added',
      linkColor: newInspectionItemsThisWeek > 0 ? 'warning' : 'gray',
      modalContent: newInspectionItemsThisWeek > 0 ? {
        title: 'New Inspection Items This Week',
        items: inspectionItems.filter(i => {
          const createdAt = new Date(i.createdAt)
          return createdAt >= oneWeekAgo
        }).map(i => ({
          text: i.name,
          to: `/admin/inspections?selectedId=${i._id}&tab=inspection_items`
        }))
      } : null
    })

    // Add last update as a link
    const daysMatch = lastActivity.match(/(\d+)\s*days?/)
    const days = daysMatch ? parseInt(daysMatch[1]) : 0
    const isRecent = !lastActivity.includes('day') || days < 7
    links.push({
      count: `Last update: ${lastActivity}`,
      text: "",
      linkColor: isRecent ? 'warning' : 'gray',
      modalContent: null
    })

    return links
  }, [inspectionItems, lastActivity])

  // Issues link - single link with detailed modal
  const issuesLink = useMemo(() => {
    // Exclude without_violation since it's shown as a status link
    const filteredIssues = dataQualityIssues.filter(issue => issue.type !== 'without_violation')
    const totalIssues = filteredIssues.reduce((sum, issue) => sum + (issue.count || 0), 0)
    
    // Build modal content with grouped issue types and their inspection items
    const modalGroups = filteredIssues
      .filter(issue => issue.count > 0)
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      .map(issue => ({
        title: `${issue.count} ${ISSUE_TYPE_LABELS[issue.type] || issue.type}`,
        items: issue.entityIds.map(entity => ({
          text: entity.name || 'Unknown',
          to: `/admin/inspections?selectedId=${entity.id}&tab=inspection_items`,
        }))
      }))
    
    return {
      count: totalIssues,
      text: 'issues',
      linkColor: totalIssues > 0 ? 'error' : 'gray',
      modalContent: totalIssues > 0 ? {
        title: 'Data Quality Issues',
        groups: modalGroups
      } : {
        title: 'Data Quality Issues',
        items: [{ text: 'No issues found' }]
      }
    }
  }, [dataQualityIssues])

  // Performance link
  const performanceLink = useMemo(() => {
    if (!performanceMetrics) {
      return null
    }

    const { avgResponseTime = 0, errorRate = 0 } = performanceMetrics
    
    // Determine status using same thresholds as backend
    let status = 'Good'
    let linkColor = 'success'
    
    if (avgResponseTime >= 1000 || errorRate >= 0.05) {
      status = 'Critical'
      linkColor = 'error'
    } else if (avgResponseTime >= 500 || errorRate >= 0.025) {
      status = 'Warning'
      linkColor = 'warning'
    }

    return {
      count: `${status} Performance`,
      text: "",
      linkColor,
      modalContent: {
        title: 'Performance Metrics in the last 24 hours',
        items: [
          { text: `Average Response Time: ${Math.round(avgResponseTime)}ms` },
          { text: `Error Rate: ${Math.round(errorRate * 100)}%` },
          { text: `Total Requests: ${performanceMetrics.requestCount || 0}` },
          { text: `Total Errors: ${performanceMetrics.errorCount || 0}` },
          ...(performanceMetrics.slowestOperations && performanceMetrics.slowestOperations.length > 0 ? [
            { text: `Slowest Operation: ${performanceMetrics.slowestOperations[0].responseTime}ms` }
          ] : [])
        ]
      }
    }
  }, [performanceMetrics])

  // Combine all links
  const allLinks = useMemo(() => {
    const links = [...statusLinks]
    if (issuesLink) {
      links.push(issuesLink)
    }
    if (performanceLink) {
      links.push(performanceLink)
    }
    return links
  }, [statusLinks, issuesLink, performanceLink])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  return (
    <SplitCard
      title="Inspection Items"
      icon={CheckCircleOutlined}
      leftPanelWidth="20%"
      rightPanelWidth="80%"
      links={allLinks}
      to="/admin/inspections?tab=inspection_items"
      loading={loading}
    />
  )
}
