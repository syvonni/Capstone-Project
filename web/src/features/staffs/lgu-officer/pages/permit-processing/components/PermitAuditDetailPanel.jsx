import { Typography, Tag, Descriptions, Empty } from 'antd'

const { Text } = Typography

export default function PermitAuditDetailPanel({ audit }) {
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

        {/* User/Officer Information */}
        {(metadata.officerName || metadata.claimedByName || metadata.releasedByName ||
          metadata.printedByName || metadata.notifiedByName || metadata.completedByName) && (
          <Descriptions.Item label="User">
            {metadata.officerName || metadata.claimedByName || metadata.releasedByName ||
             metadata.printedByName || metadata.notifiedByName || metadata.completedByName || 'Unknown'}
          </Descriptions.Item>
        )}

        {/* Permit Information */}
        {metadata.permitId && (
          <Descriptions.Item label="Permit ID">
            <Text code>{metadata.permitId}</Text>
          </Descriptions.Item>
        )}
        {metadata.permitCount && (
          <Descriptions.Item label="Permit Count">
            {metadata.permitCount}
          </Descriptions.Item>
        )}

        {/* Status Information */}
        {metadata.status && (
          <Descriptions.Item label="Status Change">
            <Tag>{metadata.status.from || 'N/A'}</Tag>
            {' → '}
            <Tag color="blue">{metadata.status.to || 'N/A'}</Tag>
          </Descriptions.Item>
        )}

        {/* Additional metadata */}
        {metadata.reason && (
          <Descriptions.Item label="Reason">{metadata.reason}</Descriptions.Item>
        )}
        {metadata.comments && (
          <Descriptions.Item label="Comments">{metadata.comments}</Descriptions.Item>
        )}
      </Descriptions>
    </div>
  )
}
