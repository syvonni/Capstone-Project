import { Typography, Descriptions, Empty } from 'antd'

const { Text } = Typography

const getCategoryName = (categoryCode) => {
  return categoryCode ? categoryCode.charAt(0).toUpperCase() + categoryCode.slice(1).replace('_', ' ') : categoryCode
}

// Helper to combine name and email into "Name (email)" format
function formatAuthor(name, email) {
  if (!name && !email) return null
  if (!email) return name
  if (!name) return email
  return `${name} (${email})`
}

export default function LobAuditDetailPanel({ audit }) {
  if (!audit) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Select an audit log to view details" />
      </div>
    )
  }

  const metadata = audit.metadata || {}

  // Determine entity type from event type
  const isLob = audit.eventType?.startsWith('lob_')

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
          metadata.createdByName || metadata.createdByEmail) && (
          <Descriptions.Item label="Author">
            {formatAuthor(
              metadata.userName || metadata.updatedByName || metadata.createdByName,
              metadata.userEmail || metadata.updatedByEmail || metadata.createdByEmail
            ) || 'Unknown'}
          </Descriptions.Item>
        )}

        {/* LOB Information */}
        {isLob && (
          <>
            <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>
            <Descriptions.Item label="Category">{getCategoryName(metadata.category)}</Descriptions.Item>
            <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>

            {/* Variable Fee Rules */}
            <Descriptions.Item label="Variable Fee Rules">
              {metadata.variableFeeRules && metadata.variableFeeRules.length > 0 ? (
                <div style={{ maxHeight: 150, overflow: 'auto' }}>
                  {metadata.variableFeeRules.map((rule, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                      <Text strong>{rule.name || rule}</Text>
                      {rule.baseRate && <Text type="secondary"> - ₱{rule.baseRate.toLocaleString()} {rule.unit}</Text>}
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">None</Text>
              )}
            </Descriptions.Item>

            {/* Licenses */}
            <Descriptions.Item label="Licenses">
              {metadata.licenses && metadata.licenses.length > 0 ? (
                <div style={{ maxHeight: 150, overflow: 'auto' }}>
                  {metadata.licenses.map((license, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                      <Text>{license}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">None</Text>
              )}
            </Descriptions.Item>
          </>
        )}
      </Descriptions>
    </div>
  )
}
