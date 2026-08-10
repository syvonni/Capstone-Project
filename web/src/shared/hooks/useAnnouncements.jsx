import { useState, useEffect } from 'react'
import { Typography, theme } from 'antd'
import { get } from '@/lib/http.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Paragraph, Text } = Typography
const { useToken } = theme

export function useAnnouncements({ skipAuth = true } = {}) {
  const { token } = useToken()
  const [announcements, setAnnouncements] = useState([])
  const [announcementItems, setAnnouncementItems] = useState([])
  const [defaultOpenKey, setDefaultOpenKey] = useState([])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await get('/api/admin/announcements', { skipAuth })

        const rawAnnouncements = Array.isArray(res) ? res : []

        const published = rawAnnouncements.filter((a) => {
          const isPublished = a?.status ? a.status === 'published' : true
          const isActive = a?.isActive !== false
          return isPublished && isActive
        })

        setAnnouncements(published)

        // Build announcement items for collapse with rich format
        const items = published.map((ann, idx) => {
          // Use stable ID if available, fallback to index
          const stableKey = ann._id || ann.id || `announcement-${idx + 1}`
          
          return {
            key: stableKey,
            label: ann.title,
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
          }
        })
        
        setAnnouncementItems(items)
        setDefaultOpenKey(items.length > 0 ? [items[0].key] : [])
      } catch (err) {
        console.error('[useAnnouncements] Failed to fetch announcements:', err)
        setAnnouncements([])
        setAnnouncementItems([])
      }
    }
    fetchAnnouncements()
  }, [skipAuth, token])

  return {
    announcements,
    announcementItems,
    defaultOpenKey,
  }
}