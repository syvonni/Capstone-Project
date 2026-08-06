import { Typography, Tag, Descriptions, Empty } from 'antd'

const { Text } = Typography

const STATUS_CONFIG = {
  open: { color: 'blue', label: 'Open' },
  in_progress: { color: 'gold', label: 'In Progress' },
  needs_response: { color: 'volcano', label: 'Needs Response' },
  waiting_for_business_owner: { color: 'cyan', label: 'Waiting for Owner' },
  closed: { color: 'green', label: 'Closed' },
  invalid: { color: 'default', label: 'Invalid' },
}

const PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export default function HelpRequestAuditDetailPanel({ audit }) {
  if (!audit) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Select an audit log to view details" />
      </div>
    )
  }

  const metadata = audit.metadata || {}

  return (
    <div style={{ padding: 16 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Event Type">
          {audit.eventType || 'Unknown Event'}
        </Descriptions.Item>
        <Descriptions.Item label="Timestamp">
          {new Date(audit.createdAt).toLocaleString()}
        </Descriptions.Item>
        {metadata.claimedByName && (
          <Descriptions.Item label="Claimed By">{metadata.claimedByName}</Descriptions.Item>
        )}
        {metadata.releasedByName && (
          <Descriptions.Item label="Released By">{metadata.releasedByName}</Descriptions.Item>
        )}
        {metadata.override && (
          <Descriptions.Item label="Override">
            Overrode claim by {metadata.override.fromName || metadata.override.from}
          </Descriptions.Item>
        )}
        {metadata.status && (
          <Descriptions.Item label="Status Change">
            <Tag color={STATUS_CONFIG[metadata.status.from]?.color || 'default'}>
              {STATUS_CONFIG[metadata.status.from]?.label || metadata.status.from}
            </Tag>
            {' → '}
            <Tag color={STATUS_CONFIG[metadata.status.to]?.color || 'default'}>
              {STATUS_CONFIG[metadata.status.to]?.label || metadata.status.to}
            </Tag>
          </Descriptions.Item>
        )}
        {metadata.priority && (
          <Descriptions.Item label="Priority Change">
            <Tag>{PRIORITY_LABELS[metadata.priority.from] || metadata.priority.from}</Tag>
            {' → '}
            <Tag color="orange">
              {PRIORITY_LABELS[metadata.priority.to] || metadata.priority.to}
            </Tag>
          </Descriptions.Item>
        )}
        {metadata.updatedByName && (
          <Descriptions.Item label="Changed By">{metadata.updatedByName}</Descriptions.Item>
        )}
      </Descriptions>
    </div>
  )
}
