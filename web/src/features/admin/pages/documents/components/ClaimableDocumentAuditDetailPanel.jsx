import { Typography, Tag, Descriptions, Empty } from 'antd'

const { Text } = Typography

// Helper to combine name and email into "Name (email)" format
function formatAuthor(name, email) {
  if (!name && !email) return null
  if (!email) return name
  if (!name) return email
  return `${name} (${email})`
}

export default function DocumentAuditDetailPanel({ audit }) {
  if (!audit) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Select an audit log to view details" />
      </div>
    )
  }

  const metadata = audit.metadata || {}

  // Determine entity type from event type
  const isRequirement = audit.eventType?.startsWith('requirement_') && !audit.eventType?.startsWith('requirement_group_')
  const isRequirementGroup = audit.eventType?.startsWith('requirement_group_')

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
          metadata.deletedByName || metadata.deletedByEmail || metadata.publishedByName) && (
          <Descriptions.Item label="Author">
            {formatAuthor(
              metadata.userName || metadata.updatedByName || metadata.createdByName ||
              metadata.deletedByName || metadata.publishedByName,
              metadata.userEmail || metadata.updatedByEmail || metadata.createdByEmail ||
              metadata.deletedByEmail
            ) || 'Unknown'}
          </Descriptions.Item>
        )}

        {/* Requirement Information */}
        {isRequirement && (
          <>
            <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>
            <Descriptions.Item label="Description">{metadata.description}</Descriptions.Item>
            <Descriptions.Item label="Has Template">
              {metadata.templateHtml ? 'Yes' : 'No'}
            </Descriptions.Item>
            <Descriptions.Item label="Template Images">
              {metadata.templateImages && Array.isArray(metadata.templateImages) ? `${metadata.templateImages.length} image(s)` : '0 images'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={metadata.isActive ? 'green' : 'red'}>
                {metadata.isActive ? 'Active' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>
          </>
        )}

        {/* Requirement Group Information */}
        {isRequirementGroup && (
          <>
            <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>
            <Descriptions.Item label="Description">{metadata.description}</Descriptions.Item>
            <Descriptions.Item label="Requirements">
              {metadata.requirements && Array.isArray(metadata.requirements) ? `${metadata.requirements.length} requirement(s)` : '0 requirements'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={metadata.isActive ? 'green' : 'red'}>
                {metadata.isActive ? 'Active' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>
          </>
        )}
      </Descriptions>
    </div>
  )
}
