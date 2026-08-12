import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircleOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { getChecklists, getAllChecklistAudits } from '@/features/admin/services/checklistService'
import { useDataQuality } from '@/shared/monitoring/hooks/useDataQuality'
import { usePerformance } from '@/shared/monitoring/hooks/usePerformance'
import { ISSUE_TYPE_LABELS } from '@/shared/config/dataQualityIssueTypes'

export default function ChecklistsDashboardCard() {
  const [checklists, setChecklists] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [lastActivity, setLastActivity] = useState('No activity')
  const [loading, setLoading] = useState(true)

  // Use data quality hook to fetch issues
  const { issues: dataQualityIssues } = useDataQuality('checklist')
  
  // Use performance hook to fetch metrics
  const { metrics: performanceMetrics } = usePerformance('checklist')

  const fetchChecklists = useCallback(async () => {
    try {
      const checklistsData = await getChecklists()
      setChecklists(checklistsData)
    } catch (error) {
      console.error('Error fetching checklists:', error)
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const auditData = await getAllChecklistAudits({ page: 1, limit: 20 })
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
        fetchChecklists(),
        fetchAuditLogs()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchChecklists, fetchAuditLogs])

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
    const activeChecklists = checklists.filter(c => c.isActive).length
    const disabledChecklists = checklists.filter(c => !c.isActive).length

    // Calculate new checklists added this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newChecklistsThisWeek = checklists.filter(c => {
      const createdAt = new Date(c.createdAt)
      return createdAt >= oneWeekAgo
    }).length

    const links = [
      {
        count: activeChecklists,
        text: 'Active',
        linkColor: activeChecklists > 0 ? 'success' : 'gray',
        modalContent: activeChecklists > 0 ? {
          title: 'Active Checklists',
          items: checklists.filter(c => c.isActive).map(c => ({
            text: c.name,
            to: `/admin/inspections?selectedId=${c._id}&tab=checklists`
          }))
        } : null
      },
      {
        count: disabledChecklists,
        text: 'Disabled',
        linkColor: 'gray',
        modalContent: disabledChecklists > 0 ? {
          title: 'Disabled Checklists',
          items: checklists.filter(c => !c.isActive).map(c => ({
            text: c.name,
            to: `/admin/inspections?selectedId=${c._id}&tab=checklists`
          }))
        } : null
      }
    ]

    // Add new checklists this week
    links.push({
      count: newChecklistsThisWeek,
      text: 'Newly Added',
      linkColor: newChecklistsThisWeek > 0 ? 'warning' : 'gray',
      modalContent: newChecklistsThisWeek > 0 ? {
        title: 'New Checklists This Week',
        items: checklists.filter(c => {
          const createdAt = new Date(c.createdAt)
          return createdAt >= oneWeekAgo
        }).map(c => ({
          text: c.name,
          to: `/admin/inspections?selectedId=${c._id}&tab=checklists`
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
  }, [checklists, lastActivity])

  // Issues link - single link with detailed modal
  const issuesLink = useMemo(() => {
    // Exclude missing_items since it's shown as a status link
    const filteredIssues = dataQualityIssues.filter(issue => issue.type !== 'missing_items')
    const totalIssues = filteredIssues.reduce((sum, issue) => sum + (issue.count || 0), 0)
    
    // Build modal content with grouped issue types and their checklists
    const modalGroups = filteredIssues
      .filter(issue => issue.count > 0)
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      .map(issue => ({
        title: `${issue.count} ${ISSUE_TYPE_LABELS[issue.type] || issue.type}`,
        items: issue.entityIds.map(entity => ({
          text: entity.name || 'Unknown',
          to: `/admin/inspections?selectedId=${entity.id}&tab=checklists`,
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
      title="Checklists"
      icon={CheckCircleOutlined}
      leftPanelWidth="20%"
      rightPanelWidth="80%"
      links={allLinks}
      to="/admin/inspections?tab=checklists"
      loading={loading}
    />
  )
}
