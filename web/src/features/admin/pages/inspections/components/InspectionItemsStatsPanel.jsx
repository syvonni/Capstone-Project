import { useState, useEffect, useCallback, useMemo } from 'react'
import { Typography } from 'antd'
import { WarningOutlined, InfoCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { getInspectionItems, getAllInspectionItemAudits } from '@/features/admin/services/inspectionItemService'
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

export default function InspectionItemsStatsPanel() {
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [inspectionItemsLoading, setInspectionItemsLoading] = useState(false)
  const [activeInspectionItems, setActiveInspectionItems] = useState(0)
  const [disabledInspectionItems, setDisabledInspectionItems] = useState(0)
  const [lastActivity, setLastActivity] = useState('No activity')
  const [searchTerm, setSearchTerm] = useState('')
  const [inspectionItems, setInspectionItems] = useState([])

  // Use data quality hook to fetch issues
  const { issues: dataQualityIssues } = useDataQuality('inspectionItem')

  const filteredAuditLogs = useMemo(() => {
    return filterAuditLogsBySearch(auditLogs, searchTerm)
  }, [auditLogs, searchTerm])

  const INSPECTION_ITEM_EVENT_INFO = AUDIT_EVENT_INFO.filter(info =>
    ['inspection_item_created', 'inspection_item_updated', 'inspection_item_disabled'].includes(info.event)
  )

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const auditData = await getAllInspectionItemAudits({ page: 1, limit: 20 })
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

    setInspectionItemsLoading(true)
    try {
      const inspectionItemsData = await getInspectionItems()
      setInspectionItems(inspectionItemsData)

      // Calculate overview stats
      const activeItems = inspectionItemsData.filter(i => i.isActive).length
      const disabledItems = inspectionItemsData.filter(i => !i.isActive).length
      setActiveInspectionItems(activeItems)
      setDisabledInspectionItems(disabledItems)
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setInspectionItemsLoading(false)
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
        linkColor: disabledInspectionItems > 0 ? 'warning' : 'gray',
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
      modalContent: {}
    })

    return links
  }, [activeInspectionItems, disabledInspectionItems, inspectionItems, lastActivity])

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
              to: `/admin/inspections?selectedId=${entity.id}&tab=inspection_items`,
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
          loading={inspectionItemsLoading}
          disableBorderBehavior={true}
        />
        <SplitCard
          title="Issues"
          icon={WarningOutlined}
          leftPanelWidth="20%"
          rightPanelWidth="80%"
          linkColor="error"
          links={issuesLinks}
          loading={inspectionItemsLoading}
          disableBorderBehavior={true}
        />
        <PerformanceStatsPanel entityType="inspectionItem" />
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
            eventDescriptions={INSPECTION_ITEM_EVENT_INFO}
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
