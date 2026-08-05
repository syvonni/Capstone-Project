import { useState, useEffect, useCallback } from 'react'
import { Modal, Typography } from 'antd'
import { CalculatorOutlined } from '@ant-design/icons'
import InfoGrid from '@/shared/components/InfoGrid'
import { getVariables } from '@/features/admin/services/variableService'

const { Text } = Typography

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

export default function VariablesMonitoring() {
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [healthData, setHealthData] = useState({
    missingUnitFields: [],
    missingContextFields: [],
    withoutFees: [],
    withoutChecklists: [],
  })
  const [recentActivity, setRecentActivity] = useState([])

  const handleItemClick = useCallback((type) => {
    const details = getModalDetails(type, healthData, recentActivity)
    setModalData(details)
    setModalOpen(true)
  }, [healthData, recentActivity])

  const fetchMonitoringData = useCallback(async () => {
    try {
      const response = await getVariables()
      const variables = response.data || []

      // Calculate overview stats
      const activeVariables = variables.filter(v => v.isActive).length

      // Health issues
      const healthIssues = []
      const missingUnitFields = variables.filter(v => !v.unit || !v.unitSingular || !v.unitPlural)
      if (missingUnitFields.length > 0) {
        healthIssues.push(`${missingUnitFields.length} variables missing required unit fields`)
      }

      const missingContextFields = variables.filter(v => !v.unitContextSingular || !v.unitContextPlural)
      if (missingContextFields.length > 0) {
        healthIssues.push(`${missingContextFields.length} variables missing context unit fields`)
      }

      const withoutFees = variables.filter(v => !v.feeId)
      if (withoutFees.length > 0) {
        healthIssues.push(`${withoutFees.length} variables without associated fees`)
      }

      const withoutChecklists = variables.filter(v => !v.checklistId)
      if (withoutChecklists.length > 0) {
        healthIssues.push(`${withoutChecklists.length} variables without associated checklists`)
      }

      // Store health data for modal
      setHealthData({
        missingUnitFields,
        missingContextFields,
        withoutFees,
        withoutChecklists,
      })

      // Recent activity (mock data for now - would come from audit logs)
      const recentActivity = variables.slice(0, 5).map(v => ({
        action: `Variable "${v.name}" updated`,
        who: 'Admin',
        when: new Date(v.updatedAt).toLocaleDateString(),
      }))
      setRecentActivity(recentActivity)

      // Build InfoGrid items with grouped metrics (max 6 items)
      const gridItems = [
        { label: 'Active Variables', value: `${activeVariables}` },
        { label: 'Test Coverage', value: '0%', onClick: () => handleItemClick('test_coverage') },
        { label: 'Security Status', value: '3 Critical', onClick: () => handleItemClick('security_status') },
        { label: 'Performance', value: '45ms', onClick: () => handleItemClick('performance') },
        { label: 'Data Issues', value: healthIssues.length > 0 ? healthIssues.length : '0', onClick: () => handleItemClick('data_health') },
        { label: 'Recent Activities', value: recentActivity.length, onClick: () => handleItemClick('recent_activity') },
      ]

      setItems(gridItems)
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchMonitoringData()
  }, [fetchMonitoringData])

  return (
    <>
      <InfoGrid items={items} noPadding={true} title={"Variables"} titleTo="/admin/variables" titleIcon={<CalculatorOutlined />}/>
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
    </>
  )
}
