import { useState, useEffect } from 'react'
import { Typography, theme } from 'antd'
import { NotificationOutlined } from '@ant-design/icons'
import { get } from '@/lib/http.js'
import { getMaintenanceStatus } from '@/features/public/services/maintenanceService.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Paragraph, Text } = Typography
const { useToken } = theme

export default function useLandingData() {
  const { token } = useToken()
  const [announcements, setAnnouncements] = useState([])
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    active: false,
    scheduled: false,
    message: '',
    expectedResumeAt: null,
    scheduledStartAt: null,
  })
  const [publicStats, setPublicStats] = useState(null)

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const [res, maintenance] = await Promise.all([
          get('/api/admin/announcements', { skipAuth: true }),
          getMaintenanceStatus().catch(() => ({ active: false, scheduled: false })),
        ])

        const rawAnnouncements = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.announcements)
              ? res.announcements
              : []

        const published = rawAnnouncements.filter((a) => {
          const isPublished = a?.status ? a.status === 'published' : true
          const isActive = a?.isActive !== false
          return isPublished && isActive
        })

        const publishedFallback = rawAnnouncements.filter((a) => {
          const isPublished = a?.status ? a.status === 'published' : true
          return isPublished
        })

        setAnnouncements(published.length > 0 ? published : publishedFallback)
        setMaintenanceStatus({
          active: !!maintenance?.active,
          scheduled: !!maintenance?.scheduled,
          message: maintenance?.message || '',
          expectedResumeAt: maintenance?.expectedResumeAt || null,
          scheduledStartAt: maintenance?.scheduledStartAt || null,
        })
      } catch (err) {
        console.error('[useLandingData] fetchLandingData error:', err)
        setAnnouncements([])
        setMaintenanceStatus({ active: false, scheduled: false })
      }
    }
    fetchLandingData()
  }, [])

  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await get('/api/public/business/stats', { skipAuth: true }).catch(() => null)
        const stats = res?.data ?? res ?? null
        setPublicStats(stats)
      } catch {
        setPublicStats(null)
      }
    }
    fetchPublicStats()
  }, [])

  // Derived state
  const hasMaintenanceNotice = maintenanceStatus.active

  const announcementItems = announcements.map((ann, idx) => ({
    key: `announcement-${idx + 1}`,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NotificationOutlined />
        <span>{ann.title}</span>
      </div>
    ),
    children: (
      <div>
        <Paragraph style={{ marginBottom: 0 }}>
          {ann.body}
        </Paragraph>
        {ann.metadata?.scheduledStartAt && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            Starting at: {dayjs(ann.metadata.scheduledStartAt).format('MMM D, YYYY h:mm A')}
          </Text>
        )}
        {ann.metadata?.expectedResumeAt && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Back online at: {dayjs(ann.metadata.expectedResumeAt).format('MMM D, YYYY h:mm A')}
          </Text>
        )}
        <div style={{ borderTop: `1px solid ${token.colorBorder}`, margin: '12px 0' }} />
        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          Posted on {ann.createdAt ? dayjs(ann.createdAt).format('MMM D, YYYY h:mm A') : '-'}
        </Text>
      </div>
    ),
  }))

  const hasAnnouncementPanel = announcementItems.length > 0 || hasMaintenanceNotice
  const defaultOpenKey = hasAnnouncementPanel && announcementItems.length > 0 ? ['announcement-1'] : []

  return {
    announcements,
    maintenanceStatus,
    publicStats,
    hasMaintenanceNotice,
    announcementItems,
    hasAnnouncementPanel,
    defaultOpenKey,
  }
}
