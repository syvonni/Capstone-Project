import { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal, Typography } from 'antd'
import { CheckCircleOutlined, StopOutlined, ClockCircleOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons'
import InfoGrid from '@/shared/components/InfoGrid'
import { getVariables, getAllVariableAudits } from '@/features/admin/services/variableService'
import ActivityTrendChart from '@/shared/components/charts/ActivityTrendChart'
import AuditHistoryModal from '@/shared/components/AuditHistoryModal'
import GenericAuditDetailPanel from '@/shared/components/GenericAuditDetailPanel'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

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

const getModalDetails = (type, healthData, recentActivity) => {
  const { missingUnitFields, missingContextFields, withoutFees, withoutChecklists } = healthData

  const details = {
    test_coverage: {
      title: 'Test Coverage',
      content: [
        { label: 'Backend Coverage', value: '0%' },
        { label: 'Frontend Coverage', value: '0%' },
        { label: 'Target Coverage', value: '80%' },
        { label: 'Unit Tests', value: '0' },
        { label: 'Integration Tests', value: '0' },
        { label: 'E2E Tests', value: '0' },
        { label: 'Accessibility Tests', value: '0' },
        { label: 'Overall Status', value: 'FAIL' },
      ],
      notes: 'Zero test coverage for variables feature. Create backend/__tests__/features/variables/variables.test.js and web/src/features/admin/pages/variables/__tests__/VariablesView.test.jsx',
    },
    security_status: {
      title: 'Security Status',
      content: [
        { label: 'Security Critique', value: 'DONE' },
        { label: 'Automated Tests', value: '0' },
        { label: 'Critical Vulnerabilities', value: '3' },
        { label: 'High Vulnerabilities', value: '3' },
        { label: 'Medium Vulnerabilities', value: '2' },
        { label: 'Rate Limiting', value: 'MISSING' },
        { label: 'CSRF Protection', value: 'MISSING' },
      ],
      notes: 'Critical issues: No rate limiting, incomplete validation, mass assignment vulnerability, missing role checks on GET endpoints. Implement rate limiting, comprehensive validation, field allowlisting on PUT, CSRF protection.',
    },
    performance: {
      title: 'Performance',
      content: [
        { label: 'API Response Time', value: '45ms' },
        { label: 'Target Response Time', value: '< 200ms' },
        { label: 'Database Query Time', value: '12ms' },
        { label: 'Target Query Time', value: '< 50ms' },
        { label: 'Performance Tests', value: '0' },
        { label: 'Load Tests', value: '0' },
        { label: 'Status', value: 'PASS' },
      ],
      notes: 'API and DB performance are good, but no automated performance tests exist. Target: API response < 200ms, detail view < 100ms',
    },
    data_health: {
      title: 'Data Health Issues',
      content: [
        { label: 'Variables Missing Unit Fields', value: missingUnitFields.length },
        { label: 'Variables Missing Context Fields', value: missingContextFields.length },
        { label: 'Variables Without Fees', value: withoutFees.length },
        { label: 'Variables Without Checklists', value: withoutChecklists.length },
      ],
      notes: 'Some variables are missing required associations. Review and update variable configurations.',
    },
    recent_activity: {
      title: 'Recent Activities',
      content: recentActivity.map(a => ({ label: a.action, value: `${a.who} - ${a.when}` })),
      notes: 'Shows recent variable updates. Currently using mock data - integrate with audit logs for real activity tracking.',
    },
  }
  return details[type] || { title: 'Details', content: [], notes: '' }
}

export default function VariablesStatsPanel() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [healthData, setHealthData] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [activeVariables, setActiveVariables] = useState(0)
  const [disabledVariables, setDisabledVariables] = useState(0)
  const [unusedVariables, setUnusedVariables] = useState(0)
  const [lastActivity, setLastActivity] = useState('No activity')
  const [searchTerm, setSearchTerm] = useState('')
  const [variables, setVariables] = useState([])

  const filteredAuditLogs = useMemo(() => {
    return filterAuditLogsBySearch(auditLogs, searchTerm)
  }, [auditLogs, searchTerm])

  const VARIABLE_EVENT_INFO = AUDIT_EVENT_INFO.filter(info =>
    ['variable_created', 'variable_updated', 'variable_disabled'].includes(info.event)
  )

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const auditData = await getAllVariableAudits({ page: 1, limit: 20 })
      setAuditLogs(auditData.logs || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setAuditLogs([])
    } finally {
      setAuditLoading(false)
    }
  }, [])

  const handleItemClick = useCallback((type) => {
    const details = getModalDetails(type, healthData, recentActivity)
    setModalData(details)
    setModalOpen(true)
  }, [healthData, recentActivity])

  const fetchMonitoringData = useCallback(async () => {
    // Fetch audit logs immediately
    fetchAuditLogs()

    try {
      const variablesData = await getVariables()
      console.log('Variables fetched:', variablesData.length, variablesData)
      setVariables(variablesData)

      // Calculate overview stats
      const activeVars = variablesData.filter(v => v.isActive).length
      const disabledVars = variablesData.filter(v => !v.isActive).length
      console.log('Active vars:', activeVars, 'Disabled vars:', disabledVars)
      setActiveVariables(activeVars)
      setDisabledVariables(disabledVars)

      // Health issues
      const missingUnitFields = variablesData.filter(v => !v.unit || !v.unitSingular || !v.unitPlural)
      const missingContextFields = variablesData.filter(v => !v.unitContextSingular || !v.unitContextPlural)
      const withoutFees = variablesData.filter(v => !v.feeId)
      const withoutChecklists = variablesData.filter(v => !v.checklistId)

      // Calculate unused variables (no fee association)
      const unusedVars = withoutFees.length
      setUnusedVariables(unusedVars)

      // Store health data for modal
      setHealthData({
        missingUnitFields,
        missingContextFields,
        withoutFees,
        withoutChecklists,
      })

      // Recent activity (mock data for now - would come from audit logs)
      const recentActivity = variablesData.slice(0, 5).map(v => ({
        action: `Variable "${v.name}" updated`,
        who: 'Admin',
        when: new Date(v.updatedAt).toLocaleDateString(),
      }))
      setRecentActivity(recentActivity)
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
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

  const items = useMemo(() => [
    {
      label: 'Active Variables',
      value: `${activeVariables}`,
      icon: <CheckCircleOutlined />,
      ...(activeVariables > 0 ? {
        type: 'modalContent',
        content: {
          title: 'Active Variables',
          items: variables.filter(v => v.isActive).map(v => ({
            text: v.name,
            to: `/admin/variables?selectedId=${v._id}`
          }))
        }
      } : {})
    },
    {
      label: 'Disabled Variables',
      value: `${disabledVariables}`,
      icon: <StopOutlined />,
      ...(disabledVariables > 0 ? {
        type: 'modalContent',
        content: {
          title: 'Disabled Variables',
          items: variables.filter(v => !v.isActive).map(v => ({
            text: v.name,
            to: `/admin/variables?selectedId=${v._id}`
          }))
        }
      } : {})
    },
    {
      label: 'Unused Variables',
      value: `${unusedVariables}`,
      icon: <DeleteOutlined />,
      ...(unusedVariables > 0 ? {
        type: 'modalContent',
        content: {
          title: 'Unused Variables',
          items: variables.filter(v => !v.feeId).map(v => ({
            text: v.name,
            to: `/admin/variables?selectedId=${v._id}`
          }))
        }
      } : {})
    },
    { label: 'Last Activity', value: lastActivity, icon: <ClockCircleOutlined /> },
    { label: 'Issues', value: `2`, icon: <WarningOutlined /> },
    { type: 'divider' },
    {
      type: 'custom',
      fullWidth: true,
      content: (
        <AuditHistoryModal
          inline={true}
          auditLogs={filteredAuditLogs}
          eventDescriptions={VARIABLE_EVENT_INFO}
          loading={auditLoading}
          onRefresh={fetchAuditLogs}
          search={searchTerm}
          onSearchChange={setSearchTerm}
          DetailPanelComponent={(props) => (
            <GenericAuditDetailPanel
              {...props}
              priorityFields={[
                'eventType',
                'name',
                'createdAt',
                'userName',
                'changes',
                'version',
                'updatedByName',
                'createdByName',
                'deletedByName',
              ]}
            />
          )}
        />
      ),
    },
    {
      type: 'custom',
      fullWidth: true,
      content: (
        <ActivityTrendChart
          data={[
            { date: '2024-01', value: 5 },
            { date: '2024-02', value: 8 },
            { date: '2024-03', value: 12 },
            { date: '2024-04', value: 10 },
            { date: '2024-05', value: 15 },
            { date: '2024-06', value: 18 },
            { date: '2024-07', value: 22 },
          ]}
          height={200}
        />
      ),
    },
  ], [activeVariables, disabledVariables, unusedVariables, lastActivity, filteredAuditLogs, auditLoading, VARIABLE_EVENT_INFO, fetchAuditLogs, searchTerm, variables])

  useEffect(() => {
    fetchMonitoringData()
  }, [fetchMonitoringData])

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <InfoGrid items={items} noPadding={true}/>
      <Modal
        title={modalData?.title || 'Details'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        {modalData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {modalData.content.map((item, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                  <Text strong style={{ fontSize: 14 }}>{item.value}</Text>
                </div>
              ))}
            </div>
            {modalData.notes && (
              <div style={{
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 6,
                marginTop: 8
              }}>
                <Text type="secondary" style={{ fontSize: 13 }}>{modalData.notes}</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
