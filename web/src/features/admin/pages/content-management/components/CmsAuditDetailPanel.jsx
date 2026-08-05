import { Typography, Tag, Descriptions, theme, Empty } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { CMS_AUDIT_FIELD_LABELS } from '../constants/cmsAudit.constants'

const { Text } = Typography

function userName(user) {
  if (!user) return '—'
  if (typeof user === 'object') {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
    return name || user.email || user._id || '—'
  }
  return '—'
}

function userEmail(user) {
  if (!user || typeof user !== 'object') return ''
  return user.email || ''
}

export default function CmsAuditDetailPanel({ audit, token: tokenProp }) {
  const { token } = theme.useToken()
  const t = tokenProp ?? token

  if (!audit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <Empty
          image={<HistoryOutlined style={{ fontSize: 48, color: t.colorTextQuaternary }} />}
          styles={{ image: { height: 60 } }}
          description={<Text type="secondary">Select a record to view details</Text>}
        />
      </div>
    )
  }

  const contentType = audit.metadata?.contentType || 'unknown'
  const actionLabel = contentType === 'faq' ? 'FAQ Updated' : 'Instruction Updated'
  const changedFields = audit.metadata?.changedFields || []
  const fieldLabels = changedFields.map((f) => CMS_AUDIT_FIELD_LABELS[f] || f).join(', ')

  let previousValue = null
  let newValue = null
  try {
    previousValue = audit.oldValue ? JSON.parse(audit.oldValue) : null
    newValue = audit.newValue ? JSON.parse(audit.newValue) : null
  } catch {
    // JSON parse failed, keep as string
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          flexShrink: 0,
          padding: '16px 16px',
          borderBottom: `1px solid ${t.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: t.borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: t.colorFillTertiary,
            color: t.colorPrimary,
            flexShrink: 0,
          }}
        >
          <HistoryOutlined style={{ fontSize: 16 }} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ fontSize: 14, lineHeight: 1.3 }}>
            {actionLabel}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {userName(audit.userId)} {userEmail(audit.userId) ? `(${userEmail(audit.userId)})` : ''}
          </Text>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 20px' }}>
        <Descriptions
          column={1}
          size="small"
          styles={{
            label: { color: t.colorTextSecondary, fontSize: 12, paddingBottom: 2 },
            content: { fontSize: 13, paddingBottom: 12 },
          }}
        >
          <Descriptions.Item label="Event Type">
            <Tag color="blue">{actionLabel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Slot ID">{audit.metadata?.slotId || '—'}</Descriptions.Item>
          <Descriptions.Item label="Changed By">
            {userName(audit.userId)}
            {userEmail(audit.userId) && (
              <Text type="secondary" style={{ marginLeft: 8 }}>({userEmail(audit.userId)})</Text>
            )}
          </Descriptions.Item>
          {audit.createdAt && (
            <Descriptions.Item label="Timestamp">
              {dayjs(audit.createdAt).format('MMMM D, YYYY HH:mm:ss')}
            </Descriptions.Item>
          )}
          {fieldLabels && (
            <Descriptions.Item label="Changed Fields">{fieldLabels}</Descriptions.Item>
          )}
        </Descriptions>

        {previousValue && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Previous Value</Text>
            <pre
              style={{
                padding: 12,
                background: t.colorFillQuaternary,
                borderRadius: t.borderRadius,
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 200,
                margin: 0,
              }}
            >
              {typeof previousValue === 'object' ? JSON.stringify(previousValue, null, 2) : previousValue}
            </pre>
          </div>
        )}

        {newValue && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>New Value</Text>
            <pre
              style={{
                padding: 12,
                background: t.colorFillQuaternary,
                borderRadius: t.borderRadius,
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 200,
                margin: 0,
              }}
            >
              {typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : newValue}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
