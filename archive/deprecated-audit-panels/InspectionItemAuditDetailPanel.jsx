/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { Typography, Descriptions, Empty, Tag } from 'antd'

const { Text } = Typography

// Helper to combine name and email into "Name (email)" format
function formatAuthor(name, email) {
  if (!name && !email) return null
  if (!email) return name
  if (!name) return email
  return `${name} (${email})`
}

export default function InspectionItemAuditDetailPanel({ audit }) {
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

        {/* User Information */}
        {(metadata.userName || metadata.userEmail || metadata.updatedByName || metadata.updatedByEmail ||
          metadata.createdByName || metadata.createdByEmail ||
          metadata.deletedByName || metadata.deletedByEmail) && (
          <Descriptions.Item label="Author">
            {formatAuthor(
              metadata.userName || metadata.updatedByName || metadata.createdByName ||
              metadata.deletedByName,
              metadata.userEmail || metadata.updatedByEmail || metadata.createdByEmail ||
              metadata.deletedByEmail
            ) || 'Unknown'}
          </Descriptions.Item>
        )}

        {/* Inspection Item Information */}
        {metadata.name && <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>}
        {metadata.question && <Descriptions.Item label="Question">{metadata.question}</Descriptions.Item>}
        {metadata.notes && <Descriptions.Item label="Notes">{metadata.notes}</Descriptions.Item>}
        {metadata.version && <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>}
        {metadata.violationId && <Descriptions.Item label="Violation ID">{metadata.violationId}</Descriptions.Item>}
        {metadata.violationName && <Descriptions.Item label="Violation Name">{metadata.violationName}</Descriptions.Item>}

        {/* Status */}
        {metadata.isActive !== undefined && (
          <Descriptions.Item label="Status">
            <Tag color={metadata.isActive ? 'green' : 'red'}>
              {metadata.isActive ? 'Active' : 'Disabled'}
            </Tag>
          </Descriptions.Item>
        )}
      </Descriptions>
    </div>
  )
}
