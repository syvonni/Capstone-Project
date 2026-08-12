import { useState, useEffect, useCallback, useMemo } from 'react'
import { Typography } from 'antd'
import { WarningOutlined, InfoCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { getAllLobAudits } from '@/features/admin/services/lobService'
import { getLobs } from '@/shared/services/lobService'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import { useDataQuality } from '@/shared/monitoring/hooks/useDataQuality'
import PerformanceStatsPanel from '@/shared/monitoring/components/PerformanceStatsPanel'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { ISSUE_TYPE_LABELS } from '@/shared/config/dataQualityIssueTypes'

const { Text } = Typography

const filterAuditLogsBySearch = (logs, searchTerm) => {
  if (!searchTerm) return logs
  const lowerSearch = searchTerm.toLowerCase()
  return logs.filter((log) => {
    return (
      log.metadata?.userName?.toLowerCase().includes(lowerSearch) ||
      log.metadata?.name?.toLowerCase().includes(lowerSearch) ||
      log.metadata?.updatedByName?.toLowerCase().includes(lowerSearch) ||
      log.metadata?.createdByName?.toLowerCase().includes(lowerSearch) ||
      log.metadata?.deletedByName?.toLowerCase().includes(lowerSearch) ||
      log.eventType?.toLowerCase().includes(lowerSearch)
    )
  })
}

export default function LobsStatsPanel() {
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [lobsLoading, setLobsLoading] = useState(false)
  const [activeLobs, setActiveLobs] = useState(0)
  const [disabledLobs, setDisabledLobs] = useState(0)
  const [lastActivity, setLastActivity] = useState('No activity')
  const [searchTerm, setSearchTerm] = useState('')
  const [lobs, setLobs] = useState([])
  const [dataQualityError, setDataQualityError] = useState(null)

  // Use data quality hook to fetch issues - only fetch if no previous error
  const { issues: dataQualityIssues, error: dataQualityHookError } = useDataQuality('lob', !dataQualityError)

  // Store data quality error to prevent infinite retries
  useEffect(() => {
    if (dataQualityHookError && !dataQualityError) {
      setDataQualityError(dataQualityHookError)
    }
  }, [dataQualityHookError, dataQualityError])

  const filteredAuditLogs = useMemo(() => {
    return filterAuditLogsBySearch(auditLogs, searchTerm)
  }, [auditLogs, searchTerm])

  const LOB_EVENT_INFO = AUDIT_EVENT_INFO.filter(info =>
    ['lob_created', 'lob_updated', 'lob_disabled'].includes(info.event)
  )

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const auditData = await getAllLobAudits({ page: 1, limit: 20 })
      setAuditLogs(auditData.logs || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setAuditLogs([])
    } finally {
      setAuditLoading(false)
    }
  }, [])

  const fetchMonitoringData = useCallback(async () => {
    // Fetch audit logs immediately
    fetchAuditLogs()

    setLobsLoading(true)
    try {
      const lobsData = await getLobs()
      setLobs(lobsData)

      // Calculate overview stats
      const activeLobsCount = lobsData.filter(l => l.isActive).length
      const disabledLobsCount = lobsData.filter(l => !l.isActive).length
      setActiveLobs(activeLobsCount)
      setDisabledLobs(disabledLobsCount)
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLobsLoading(false)
    }
  }, [fetchAuditLogs])

  // Calculate last activity from audit logs separately to prevent infinite loop
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

  const statusLinks = useMemo(() => {
    // Calculate new LOBs added this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newLobsThisWeek = lobs.filter(l => {
      const createdAt = new Date(l.createdAt)
      return createdAt >= oneWeekAgo
    }).length

    // Calculate unused LOBs (without variables and documents)
    const unusedLobs = lobs.filter(l => (!l.variables || l.variables.length === 0) && (!l.documents || l.documents.length === 0)).length

    const links = [
      {
        count: activeLobs,
        text: 'Active',
        linkColor: activeLobs > 0 ? 'success' : 'gray',
        modalContent: activeLobs > 0 ? {
          title: 'Active LOBs',
          items: lobs.filter(l => l.isActive).map(l => ({
            text: l.name,
            to: `/admin/lob?selectedId=${l._id}`
          }))
        } : null
      },
      {
        count: disabledLobs,
        text: 'Disabled',
        linkColor: 'gray',
        modalContent: disabledLobs > 0 ? {
          title: 'Disabled LOBs',
          items: lobs.filter(l => !l.isActive).map(l => ({
            text: l.name,
            to: `/admin/lob?selectedId=${l._id}`
          }))
        } : null
      },
      {
        count: unusedLobs,
        text: 'Unused',
        linkColor: unusedLobs > 0 ? 'warning' : 'gray',
        modalContent: unusedLobs > 0 ? {
          title: 'Unused LOBs',
          items: lobs.filter(l => (!l.variables || l.variables.length === 0) && (!l.documents || l.documents.length === 0)).map(l => ({
            text: l.name,
            to: `/admin/lob?selectedId=${l._id}`
          }))
        } : null
      }
    ]

    // Add new LOBs this week
    links.push({
      count: newLobsThisWeek,
      text: 'Newly Added',
      linkColor: newLobsThisWeek > 0 ? 'warning' : 'gray',
      modalContent: newLobsThisWeek > 0 ? {
        title: 'New LOBs This Week',
        items: lobs.filter(l => {
          const createdAt = new Date(l.createdAt)
          return createdAt >= oneWeekAgo
        }).map(l => ({
          text: l.name,
          to: `/admin/lob?selectedId=${l._id}`
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
      modalContent: {}
    })

    return links
  }, [activeLobs, disabledLobs, lobs, lastActivity])

  const issuesLinks = useMemo(() => {
    const allLinks = Object.entries(ISSUE_TYPE_LABELS)
      .map(([type, label]) => {
        const issue = dataQualityIssues.find((i) => i.type === type)
        const count = issue ? issue.count : 0
        const entityIds = issue ? issue.entityIds : []

        return {
          count,
          text: label,
          linkColor: count > 0 ? 'error' : 'gray',
          modalContent: count > 0 ? {
            title: label,
            items: entityIds.map((entity) => ({
              text: entity.name || 'Unknown',
              to: `/admin/lob?selectedId=${entity.id}`,
            })),
          } : null,
        }
      })

    const issuesWithCount = allLinks.filter(link => link.count > 0)
    const issuesWithoutCount = allLinks.filter(link => link.count === 0)

    // Sort issues with count by count descending, then alphabetically
    issuesWithCount.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count
      }
      return a.text.localeCompare(b.text)
    })

    // Sort issues without count alphabetically
    issuesWithoutCount.sort((a, b) => a.text.localeCompare(b.text))

    // Add summary item for issues with no count
    if (issuesWithoutCount.length > 0) {
      issuesWithCount.push({
        count: issuesWithoutCount.length,
        text: 'checks passed',
        linkColor: 'gray',
        modalContent: {
          title: 'Data Quality Checks Passed',
          items: issuesWithoutCount.map(link => ({
            text: link.text,
          })),
        },
      })
    }

    return issuesWithCount
  }, [dataQualityIssues])

  useEffect(() => {
    fetchMonitoringData()
  }, [fetchMonitoringData])

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SplitCard
          title="Status"
          icon={InfoCircleOutlined}
          leftPanelWidth="20%"
          rightPanelWidth="80%"
          links={statusLinks}
          loading={lobsLoading}
          disableBorderBehavior={true}
        />
        <SplitCard
          title="Issues"
          icon={WarningOutlined}
          leftPanelWidth="20%"
          rightPanelWidth="80%"
          linkColor="error"
          links={issuesLinks}
          loading={lobsLoading}
          disableBorderBehavior={true}
        />
        <PerformanceStatsPanel entityType="lob" />
        <SplitCard
          title="History"
          icon={HistoryOutlined}
          leftPanelWidth="20%"
          rightPanelWidth="80%"
          noRightPanelPadding={true}
          disableBorderBehavior={true}
        >
          <AuditHistoryModal
            inline={true}
            auditLogs={filteredAuditLogs}
            eventDescriptions={LOB_EVENT_INFO}
            loading={auditLoading}
            onRefresh={fetchAuditLogs}
            search={searchTerm}
            onSearchChange={setSearchTerm}
            DetailPanelComponent={AuditEventDetails}
            subtitle={lastActivity}
            hideHeader={true}
            hideBorder={true}
          />
        </SplitCard>
      </div>
    </div>
  )
}
