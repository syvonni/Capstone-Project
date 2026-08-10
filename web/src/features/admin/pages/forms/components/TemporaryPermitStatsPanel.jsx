import { useState, useEffect, useCallback } from 'react'
import { Typography } from 'antd'
import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { getPublicPermitForms } from '@/shared/services/permitFormService'

const { Text } = Typography

export default function TemporaryPermitStatsPanel() {
  const [loading, setLoading] = useState(false)
  const [activePermits, setActivePermits] = useState(0)
  const [disabledPermits, setDisabledPermits] = useState(0)
  const [lastActivity, setLastActivity] = useState('No activity')
  const [forms, setForms] = useState([])

  const fetchMonitoringData = useCallback(async () => {
    setLoading(true)
    try {
      const formsData = await getPublicPermitForms()
      // Filter out unified-business-permit to show only temporary permits
      const temporaryPermits = formsData.filter(form => form.formId !== 'unified-business-permit')
      setForms(temporaryPermits)

      // Calculate overview stats
      const activePermitsCount = temporaryPermits.filter(f => f.isActive).length
      const disabledPermitsCount = temporaryPermits.filter(f => !f.isActive).length
      setActivePermits(activePermitsCount)
      setDisabledPermits(disabledPermitsCount)

      // Calculate last activity from updated dates
      if (temporaryPermits.length > 0) {
        const latestUpdate = temporaryPermits
          .map(f => f.updatedAt ? new Date(f.updatedAt) : null)
          .filter(date => date !== null)
          .sort((a, b) => b - a)[0]

        if (latestUpdate) {
          const now = new Date()
          const diffMs = now - latestUpdate
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
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMonitoringData()
  }, [fetchMonitoringData])

  const statusLinks = [
    {
      count: activePermits,
      text: 'Active',
      modalContent: activePermits > 0 ? {
        title: 'Active Temporary Permits',
        items: forms.filter(f => f.isActive).map(f => ({
          text: f.name,
          to: `/admin/forms/temporary-permits?selectedId=${f.formId}`
        }))
      } : null
    },
    {
      count: disabledPermits,
      text: 'Disabled',
      linkColor: disabledPermits > 0 ? 'warning' : 'success',
      modalContent: disabledPermits > 0 ? {
        title: 'Disabled Temporary Permits',
        items: forms.filter(f => !f.isActive).map(f => ({
          text: f.name,
          to: `/admin/forms/temporary-permits?selectedId=${f.formId}`
        }))
      } : null
    }
  ]

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600 }}>Temporary Permit Overview</Text>
      </div>

      <SplitCard
        icon={FileTextOutlined}
        title="Temporary Permits"
        loading={loading}
        links={statusLinks}
        lastActivity={lastActivity}
        disableBorderBehavior={true}
      />

      <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoCircleOutlined />
          <Text type="secondary">
            Select a temporary permit form from the list to view its details, or add a new temporary permit form.
          </Text>
        </div>
      </div>
    </div>
  )
}
