import { Button, Popconfirm } from 'antd'
import { invalidateAllSessions } from '@/features/authentication/services/sessionService.js'
import { useAuthNotification, useNotifier } from '@/shared/notifications.js'

export default function InvalidateSessionsButton({ onDone }) {
  const { notificationSuccess } = useAuthNotification()
  const { error } = useNotifier()

  const handleInvalidateAll = async () => {
    try {
      await invalidateAllSessions()
      notificationSuccess('Other sessions invalidated', 'All other devices have been signed out.')
      onDone?.()
    } catch (err) {
      console.error('invalidate all failed', err)
      error(err, 'Could not invalidate sessions')
    }
  }

  return (
    <div style={{ marginBottom: 12, width: '100%' }}>
      <Popconfirm
        title="Invalidate all other sessions?"
        description="This will sign out your other devices."
        onConfirm={handleInvalidateAll}
      >
        <Button danger block>Invalidate All Other Sessions</Button>
      </Popconfirm>
    </div>
  )
}
