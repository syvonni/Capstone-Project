import { Collapse, Tag } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

/**
 * Shared AnnouncementsModal component
 * Supports both read tracking (for business owners) and simple display (for landing page)
 * readAnnouncements and handleCollapseChange are optional - when not provided, no "New" tags are shown
 */
export default function AnnouncementsModal({ open, onCancel, announcementItems, readAnnouncements = {}, defaultOpenKey, handleCollapseChange, token }) {
  const hasReadTracking = readAnnouncements && Object.keys(readAnnouncements).length > 0
  
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {announcementItems.length > 0 && (
        <Collapse
          style={{ background: token.colorBgContainer }}
          items={announcementItems.map(item => ({
            ...item,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.label}
                {hasReadTracking && readAnnouncements?.[item.key] === undefined && <Tag color="blue" style={{ fontSize: 11 }}>New</Tag>}
              </div>
            )
          }))}
          defaultActiveKey={defaultOpenKey}
          onChange={handleCollapseChange}
        />
      )}
    </div>
  )

  return (
    <ResponsiveModal
      title="All Announcements"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' }
      }}
    >
      {content}
    </ResponsiveModal>
  )
}
