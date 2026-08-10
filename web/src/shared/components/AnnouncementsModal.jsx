import { Modal, Drawer, Collapse, Tag } from 'antd'

/**
 * Shared AnnouncementsModal component
 * Supports both read tracking (for business owners) and simple display (for landing page)
 * readAnnouncements and handleCollapseChange are optional - when not provided, no "New" tags are shown
 */
export default function AnnouncementsModal({ open, onCancel, announcementItems, readAnnouncements = {}, defaultOpenKey, handleCollapseChange, token, screens }) {
  const hasReadTracking = readAnnouncements && Object.keys(readAnnouncements).length > 0
  
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {announcementItems.length > 0 && (
        <Collapse
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
          style={{ background: token.colorBgContainer }}
        />
      )}
    </div>
  )

  if (screens.lg) {
    return (
      <Modal
        title="All Announcements"
        open={open}
        onCancel={onCancel}
        footer={null}
        width={600}
        styles={{
          body: { maxHeight: '70vh', overflowY: 'auto', background: token.colorBgContainer },
          header: { background: token.colorBgContainer },
          content: { background: token.colorBgContainer },
          container: { background: token.colorBgContainer }
        }}
      >
        <div style={{ padding: 16 }}>
          {content}
        </div>
      </Modal>
    )
  }

  return (
    <Drawer
      title="All Announcements"
      placement="bottom"
      open={open}
      onClose={onCancel}
      height="100%"
      styles={{
        body: { paddingTop: 12, background: token.colorBgContainer },
        header: { background: token.colorBgContainer }
      }}
    >
      {content}
    </Drawer>
  )
}
