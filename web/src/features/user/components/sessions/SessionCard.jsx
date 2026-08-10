import { Card, Tag, Space, Button, Typography } from 'antd'
import { invalidateSession } from '@/features/authentication/services/sessionService.js'
import { useAuthNotification, useNotifier } from '@/shared/notifications.js'

const { Text } = Typography

export default function SessionCard({ session, onInvalidated, readonly = false }) {
  const { notificationSuccess } = useAuthNotification()
  const { error } = useNotifier()

  if (!session) return null

  const handleInvalidate = async () => {
    try {
      await invalidateSession(session.id)
      notificationSuccess('Session invalidated', 'This device has been signed out.')
      onInvalidated?.()
    } catch (err) {
      console.error('invalidate session failed', err)
      error(err, 'Could not invalidate session')
    }
  }

  // Use IP as the main identifier
  const displayTitle = session.ipAddress || 'Unknown IP'

  return (
    <Card size="small" style={{ width: '100%', opacity: readonly ? 0.6 : 1 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Text strong>
            📍 {displayTitle}
          </Text>
          {session.isCurrentSession ? (
            <Tag color="blue">Current</Tag>
          ) : session.isExpired ? (
            <Tag color="red">Expired</Tag>
          ) : (
            <Tag color="green">Active</Tag>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
          Session ID: {session.id.slice(-8)} | Created: {session.createdAt ? new Date(session.createdAt).toLocaleTimeString() : 'Unknown'}
        </Text>
        <Text type="secondary">Last activity: {session.lastActivityAt ? new Date(session.lastActivityAt).toLocaleString() : '—'}</Text>
        <Text type="secondary">Expires at: {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : '—'}</Text>
        {!readonly && !session.isCurrentSession && !session.isExpired && (
          <Button size="small" danger onClick={handleInvalidate}>
            Invalidate
          </Button>
        )}
        {readonly && session.isExpired && (
          <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
            Session expired - cannot be invalidated
          </Text>
        )}
      </Space>
    </Card>
  )
}
