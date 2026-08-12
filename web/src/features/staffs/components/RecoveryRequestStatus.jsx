import { useEffect, useState } from 'react'
import { Card, Tag, Typography, Alert, Space } from 'antd'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import { getRecoveryStatus } from '../services/recoveryService.js'
import { useNotifier } from '@/shared/notifications.js'

const { Text } = Typography

export default function RecoveryRequestStatus() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const { error } = useNotifier()

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        setLoading(true)
        const data = await getRecoveryStatus()
        if (!isMounted) return
        setStatus(data)
      } catch (err) {
        console.warn('Recovery status unavailable', err)
        if (err?.status !== 404) error(err, 'Could not load recovery status')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [error])

  if (loading) {
    return <LottieSpinner />
  }

  if (!status) {
    return (
      <Alert
        showIcon
        type="info"
        message="No recovery status available"
        description="Submit a recovery request to see its status."
      />
    )
  }

  const tagColor = status?.status === 'approved' ? 'green' : status?.status === 'pending' ? 'gold' : 'red'

  return (
    <Card title="Recovery Status" size="small" bordered>
      <Space direction="vertical">
        <Text strong>Status: <Tag color={tagColor}>{status?.status || 'unknown'}</Tag></Text>
        {status?.reviewedAt && <Text type="secondary">Reviewed at: {new Date(status.reviewedAt).toLocaleString()}</Text>}
        {status?.reviewNotes && <Text type="secondary">Notes: {status.reviewNotes}</Text>}
        {status?.warning && <Alert type="warning" showIcon message={status.warning} />}
      </Space>
    </Card>
  )
}
