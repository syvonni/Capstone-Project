import { useEffect, useState } from 'react'
import { List, Typography, Collapse, Divider } from 'antd'
import SessionCard from './SessionCard.jsx'
import InvalidateSessionsButton from './InvalidateSessionsButton.jsx'
import { getActiveSessions, getSessionHistory } from '@/features/authentication/services/sessionService.js'
import { useNotifier } from '@/shared/notifications.js'

const { Text, Title } = Typography

export default function ActiveSessions() {
  const [sessions, setSessions] = useState([])
  const [sessionHistory, setSessionHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const { error } = useNotifier()

  const load = async () => {
    try {
      setLoading(true)
      const res = await getActiveSessions()
      setSessions(res?.sessions || [])
    } catch (err) {
      console.error('load sessions failed', err)
      error(err, 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const res = await getSessionHistory()
      setSessionHistory(res?.sessions || [])
    } catch (err) {
      console.error('load session history failed', err)
      error(err, 'Failed to load session history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleToggleHistory = () => {
    if (!showHistory && sessionHistory.length === 0) {
      loadHistory()
    }
    setShowHistory(!showHistory)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show maximum 2 sessions before making it scrollable
  // Each SessionCard is approximately 160-180px tall, so 2 sessions ≈ 360px
  const maxHeight = sessions.length > 2 ? '360px' : 'auto'
  const shouldScroll = sessions.length > 2

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <Title level={5} style={{ marginBottom: 4, textAlign: 'center' }}>
          Active Sessions
        </Title>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div
          style={{
            maxHeight: maxHeight,
            overflowY: shouldScroll ? 'auto' : 'visible',
            overflowX: 'hidden',
            paddingRight: shouldScroll ? '8px' : '0',
            scrollBehavior: 'smooth',
          }}
          className={shouldScroll ? 'active-sessions-scrollable' : ''}
        >
          <List
            loading={loading}
            dataSource={sessions}
            locale={{ emptyText: 'No active sessions' }}
            renderItem={(session) => (
              <List.Item style={{ paddingBottom: 12 }}>
                <SessionCard session={session} onInvalidated={load} />
              </List.Item>
            )}
          />
        </div>
        
        <InvalidateSessionsButton onDone={load} />
        
        <Divider style={{ margin: '16px 0 12px 0' }} />
        
        <Collapse 
          ghost 
          onChange={handleToggleHistory}
          style={{ border: 'none' }}
          items={[
            {
              key: 'history',
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>Session History</span>
                  <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {sessionHistory.length} expired sessions
                  </span>
                </div>
              ),
              children: (
                <List
                  loading={historyLoading}
                  dataSource={sessionHistory}
                  locale={{ emptyText: 'No session history available' }}
                  renderItem={(session) => (
                    <List.Item style={{ paddingBottom: 8, opacity: 0.7 }}>
                      <SessionCard session={session} readonly />
                    </List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </div>
    </div>
  )
}
