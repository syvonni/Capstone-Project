import { Typography, Tag, Descriptions, Empty } from 'antd'

const { Text } = Typography

const STATUS_CONFIG = {
  active: { color: 'green', label: 'Active' },
  inactive: { color: 'default', label: 'Inactive' },
  pending_deletion: { color: 'volcano', label: 'Pending Deletion' },
  locked: { color: 'red', label: 'Locked' },
}

export default function BusinessOwnerAuditDetailPanel({ audit }) {
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
        {(metadata.officerName || metadata.updatedByName || metadata.registeredByName || metadata.deletedByName) && (
          <Descriptions.Item label="User">
            {metadata.officerName || metadata.updatedByName || metadata.registeredByName || metadata.deletedByName || 'Unknown'}
          </Descriptions.Item>
        )}

        {/* Entity Information */}
        {metadata.businessOwnerId && (
          <Descriptions.Item label="Business Owner ID">
            <Text code>{metadata.businessOwnerId}</Text>
          </Descriptions.Item>
        )}

        {/* Status Information */}
        {metadata.accountStatus && (
          <Descriptions.Item label="Account Status">
            <Tag color={STATUS_CONFIG[metadata.accountStatus]?.color || 'default'}>
              {STATUS_CONFIG[metadata.accountStatus]?.label || metadata.accountStatus}
            </Tag>
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

        {/* Email Information */}
        {metadata.email && (
          <Descriptions.Item label="Email Change">
            <Text code>{metadata.email.from || 'N/A'}</Text>
            {' → '}
            <Text code>{metadata.email.to || 'N/A'}</Text>
          </Descriptions.Item>
        )}

        {/* Field Information */}
        {metadata.fieldChanged && (
          <Descriptions.Item label="Field Changed">
            <Text code>{metadata.fieldChanged}</Text>
          </Descriptions.Item>
        )}
        {metadata.oldValue && (
          <Descriptions.Item label="Old Value">
            <Text code>{metadata.oldValue}</Text>
          </Descriptions.Item>
        )}
        {metadata.newValue && (
          <Descriptions.Item label="New Value">
            <Text code>{metadata.newValue}</Text>
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
