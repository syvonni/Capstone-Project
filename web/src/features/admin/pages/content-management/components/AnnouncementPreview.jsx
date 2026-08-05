import { Modal, Drawer, Typography, Tag, Card, Alert, theme } from 'antd'
import dayjs from 'dayjs'

const { Text, Paragraph } = Typography

export function AnnouncementPreviewModal({ open, onClose, formValues, previewAnnouncements = [], previewMaintenance = false }) {
  const { token } = theme.useToken()

  const priorityColors = {
    urgent: 'red',
    high: 'orange',
    normal: 'blue',
    low: 'default',
  }

  const allAnnouncements = formValues 
    ? [formValues, ...previewAnnouncements.filter(a => a._id !== formValues._id)]
    : previewAnnouncements

  return (
    <Modal
      title="Announcement Preview"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {previewMaintenance && (
          <Alert
            message="Maintenance Mode Active"
            description="System is currently under maintenance. Some features may be unavailable."
            type="warning"
            showIcon
          />
        )}
        
        <div style={{ background: token.colorBgLayout, padding: 24, borderRadius: 8 }}>
          <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
            Hero Section Preview
          </Text>
          
          {allAnnouncements.length === 0 ? (
            <Text type="secondary">No announcements to display</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allAnnouncements.slice(0, 3).map((announcement, idx) => (
                <Card
                  key={announcement._id || idx}
                  size="small"
                  style={{
                    borderLeft: `4px solid ${priorityColors[announcement.priority] || token.colorBorder}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {announcement.title || 'Untitled Announcement'}
                    </Text>
                    <Tag color={priorityColors[announcement.priority]} style={{ fontSize: 11 }}>
                      {(announcement.priority || 'normal').toUpperCase()}
                    </Tag>
                  </div>
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 8 }}
                  >
                    {announcement.body || 'No content'}
                  </Paragraph>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {announcement.expiresAt 
                      ? `Expires: ${dayjs(announcement.expiresAt).format('MMM D, YYYY')}`
                      : 'No expiration date'
                    }
                  </Text>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: token.colorBgLayout, padding: 24, borderRadius: 8 }}>
          <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
            Full Announcement Card Preview
          </Text>
          
          {formValues ? (
            <Card
              size="small"
              style={{
                borderLeft: `4px solid ${priorityColors[formValues.priority] || token.colorBorder}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                    {formValues.title || 'Untitled Announcement'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formValues.createdAt 
                      ? `Created: ${dayjs(formValues.createdAt).format('MMM D, YYYY')}`
                      : 'New announcement'
                    }
                  </Text>
                </div>
                <Tag color={priorityColors[formValues.priority]} style={{ fontSize: 11 }}>
                  {(formValues.priority || 'normal').toUpperCase()}
                </Tag>
              </div>
              <Paragraph style={{ fontSize: 14, marginBottom: 12 }}>
                {formValues.body || 'No content'}
              </Paragraph>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {formValues.publishAt && (
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    Publish: {dayjs(formValues.publishAt).format('MMM D, HH:mm')}
                  </Tag>
                )}
                {formValues.expiresAt && (
                  <Tag color="orange" style={{ fontSize: 11 }}>
                    Expires: {dayjs(formValues.expiresAt).format('MMM D, YYYY')}
                  </Tag>
                )}
              </div>
            </Card>
          ) : (
            <Text type="secondary">No announcement selected for preview</Text>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function AnnouncementPreviewDrawer({ open, onClose, formValues, previewAnnouncements = [], previewMaintenance = false }) {
  const { token } = theme.useToken()

  const priorityColors = {
    urgent: 'red',
    high: 'orange',
    normal: 'blue',
    low: 'default',
  }

  const allAnnouncements = formValues 
    ? [formValues, ...previewAnnouncements.filter(a => a._id !== formValues._id)]
    : previewAnnouncements

  return (
    <Drawer
      title="Announcement Preview"
      open={open}
      onClose={onClose}
      placement="bottom"
      height="80%"
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {previewMaintenance && (
          <Alert
            message="Maintenance Mode Active"
            description="System is currently under maintenance. Some features may be unavailable."
            type="warning"
            showIcon
          />
        )}
        
        <div style={{ background: token.colorBgLayout, padding: 16, borderRadius: 8 }}>
          <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>
            Hero Section Preview
          </Text>
          
          {allAnnouncements.length === 0 ? (
            <Text type="secondary">No announcements to display</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allAnnouncements.slice(0, 3).map((announcement, idx) => (
                <Card
                  key={announcement._id || idx}
                  size="small"
                  style={{
                    borderLeft: `4px solid ${priorityColors[announcement.priority] || token.colorBorder}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {announcement.title || 'Untitled Announcement'}
                    </Text>
                    <Tag color={priorityColors[announcement.priority]} style={{ fontSize: 11 }}>
                      {(announcement.priority || 'normal').toUpperCase()}
                    </Tag>
                  </div>
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 8 }}
                  >
                    {announcement.body || 'No content'}
                  </Paragraph>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {announcement.expiresAt 
                      ? `Expires: ${dayjs(announcement.expiresAt).format('MMM D, YYYY')}`
                      : 'No expiration date'
                    }
                  </Text>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: token.colorBgLayout, padding: 16, borderRadius: 8 }}>
          <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>
            Full Announcement Card Preview
          </Text>
          
          {formValues ? (
            <Card
              size="small"
              style={{
                borderLeft: `4px solid ${priorityColors[formValues.priority] || token.colorBorder}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                    {formValues.title || 'Untitled Announcement'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formValues.createdAt 
                      ? `Created: ${dayjs(formValues.createdAt).format('MMM D, YYYY')}`
                      : 'New announcement'
                    }
                  </Text>
                </div>
                <Tag color={priorityColors[formValues.priority]} style={{ fontSize: 11 }}>
                  {(formValues.priority || 'normal').toUpperCase()}
                </Tag>
              </div>
              <Paragraph style={{ fontSize: 14, marginBottom: 12 }}>
                {formValues.body || 'No content'}
              </Paragraph>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {formValues.publishAt && (
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    Publish: {dayjs(formValues.publishAt).format('MMM D, HH:mm')}
                  </Tag>
                )}
                {formValues.expiresAt && (
                  <Tag color="orange" style={{ fontSize: 11 }}>
                    Expires: {dayjs(formValues.expiresAt).format('MMM D, YYYY')}
                  </Tag>
                )}
              </div>
            </Card>
          ) : (
            <Text type="secondary">No announcement selected for preview</Text>
          )}
        </div>
      </div>
    </Drawer>
  )
}
