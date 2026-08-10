import { useState } from 'react'
import { theme, Grid, Tag } from 'antd'
import { NotificationOutlined } from '@ant-design/icons'
import BlurFade from './BlurFade.jsx'
import AnnouncementsModal from './AnnouncementsModal'
import ListCard from './ListCard.jsx'

const { useBreakpoint } = Grid

export default function AnnouncementsCard({ 
  announcementItems, 
  announcements, 
  defaultOpenKey, 
  enableUnreadTracking = false,
  readAnnouncements = {},
  onAnnouncementRead,
  ...blurFadeProps 
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false)

  const unreadCount = enableUnreadTracking 
    ? announcementItems.filter(item => !readAnnouncements?.[item.key]).length
    : 0

  const handleCollapseChange = (keys) => {
    if (!enableUnreadTracking) return
    
    keys.forEach(key => {
      // Check if key exists in readAnnouncements (we store timestamps now)
      if (readAnnouncements?.[key] === undefined && onAnnouncementRead) {
        onAnnouncementRead(key)
      }
    })
  }

  return (
    <BlurFade onViewport={true} delay={0} duration={0.5} direction="down" fullHeight={false} {...blurFadeProps}>
      <ListCard
        icon={<NotificationOutlined />}
        title="Announcements"
        items={announcements}
        renderItem={(ann) => (
          <span style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            display: 'block',
            fontSize: 13,
          }}>
            {ann.title}
          </span>
        )}
        onItemClick={() => setAnnouncementsModalOpen(true)}
        onViewAll={() => setAnnouncementsModalOpen(true)}
        viewAllText="View all"
        itemTypeText="announcements"
        headerExtra={enableUnreadTracking && unreadCount > 0 && <Tag color="blue">{unreadCount} unread</Tag>}
        emptyText="No announcements"
        boxedIcon={true}
      />

      <AnnouncementsModal
        open={announcementsModalOpen}
        onCancel={() => setAnnouncementsModalOpen(false)}
        announcementItems={announcementItems}
        readAnnouncements={enableUnreadTracking ? readAnnouncements : {}}
        defaultOpenKey={defaultOpenKey}
        handleCollapseChange={enableUnreadTracking ? handleCollapseChange : () => {}}
        token={token}
        screens={screens}
      />
    </BlurFade>
  )
}