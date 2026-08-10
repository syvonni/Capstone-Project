import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckSquareOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { getPostRequirements, getAllPostRequirementAudits } from '@/features/admin/services/postRequirementService'
import { useDataQuality } from '@/shared/monitoring/hooks/useDataQuality'
import { usePerformance } from '@/shared/monitoring/hooks/usePerformance'
import { ISSUE_TYPE_LABELS } from '@/shared/config/dataQualityIssueTypes'

export default function PostRequirementsDashboardCard() {
  const [postRequirements, setPostRequirements] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [lastActivity, setLastActivity] = useState('No activity')
  const [loading, setLoading] = useState(true)

  // Use data quality hook to fetch issues
  const { issues: dataQualityIssues } = useDataQuality('postRequirement')
  
  // Use performance hook to fetch metrics
  const { metrics: performanceMetrics } = usePerformance('postRequirement')

  const fetchPostRequirements = useCallback(async () => {
    try {
      const postRequirementsData = await getPostRequirements()
      setPostRequirements(postRequirementsData)
    } catch (error) {
      console.error('Error fetching post requirements:', error)
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const auditData = await getAllPostRequirementAudits({ page: 1, limit: 20 })
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
        fetchPostRequirements(),
        fetchAuditLogs()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchPostRequirements, fetchAuditLogs])

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
    const activePostRequirements = postRequirements.filter(p => p.isActive).length
    const disabledPostRequirements = postRequirements.filter(p => !p.isActive).length

    // Calculate new post requirements added this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newPostRequirementsThisWeek = postRequirements.filter(p => {
      const createdAt = new Date(p.createdAt)
      return createdAt >= oneWeekAgo
    }).length

    const links = [
      {
        count: activePostRequirements,
        text: 'Active',
        linkColor: activePostRequirements > 0 ? 'success' : 'gray',
        modalContent: activePostRequirements > 0 ? {
          title: 'Active Post Requirements',
          items: postRequirements.filter(p => p.isActive).map(p => ({
            text: p.name,
            to: `/admin/post-requirements?selectedId=${p._id}`
          }))
        } : null
      },
      {
        count: disabledPostRequirements,
        text: 'Disabled',
        linkColor: disabledPostRequirements > 0 ? 'warning' : 'gray',
        modalContent: disabledPostRequirements > 0 ? {
          title: 'Disabled Post Requirements',
          items: postRequirements.filter(p => !p.isActive).map(p => ({
            text: p.name,
            to: `/admin/post-requirements?selectedId=${p._id}`
          }))
        } : null
      }
    ]

    // Add new post requirements this week
    links.push({
      count: newPostRequirementsThisWeek,
      text: 'Newly Added',
      linkColor: newPostRequirementsThisWeek > 0 ? 'warning' : 'gray',
      modalContent: newPostRequirementsThisWeek > 0 ? {
        title: 'New Post Requirements This Week',
        items: postRequirements.filter(p => {
          const createdAt = new Date(p.createdAt)
          return createdAt >= oneWeekAgo
        }).map(p => ({
          text: p.name,
          to: `/admin/post-requirements?selectedId=${p._id}`
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
  }, [postRequirements, lastActivity])

  // Issues link - single link with detailed modal
  const issuesLink = useMemo(() => {
    const totalIssues = dataQualityIssues.reduce((sum, issue) => sum + (issue.count || 0), 0)
    
    // Build modal content with grouped issue types and their post requirements
    const modalGroups = dataQualityIssues
      .filter(issue => issue.count > 0)
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      .map(issue => ({
        title: `${issue.count} ${ISSUE_TYPE_LABELS[issue.type] || issue.type}`,
        items: issue.entityIds.map(entity => ({
          text: entity.name || 'Unknown',
          to: `/admin/post-requirements?selectedId=${entity.id}`,
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
  }, [statusLinks, issuesLink, performanceLink, lastActivity])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  return (
    <SplitCard
      title="Post Requirements"
      icon={CheckSquareOutlined}
      leftPanelWidth="20%"
      rightPanelWidth="80%"
      links={allLinks}
      to="/admin/post-requirements"
      loading={loading}
    />
  )
}
