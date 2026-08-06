import { Typography, Descriptions, Empty, theme, Button, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { DEFAULT_PRIORITY_FIELDS } from '../constants'

const { Text } = Typography

const FIELD_LABELS = {
  userName: 'Performed By',
  updatedByName: 'Updated By',
  createdByName: 'Created By',
  deletedByName: 'Deleted By',
  createdAt: 'Timestamp',
  version: 'Version',
  name: 'Name',
  eventType: 'Event Type',
  changes: 'Changes',
  changedFields: 'Changed Fields',
  changeCount: 'Number of Changes',
  changeSummary: 'Change Summary',
}

// Helper to combine name and email into "Name (email)" format
function formatAuthor(name, email) {
  if (!name && !email) return null
  if (!email) return name
  if (!name) return email
  return `${name} (${email})`
}

export default function AuditEventDetails({ audit, priorityFields = DEFAULT_PRIORITY_FIELDS }) {
  const { token } = theme.useToken()

  if (!audit) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Select an audit log to view details" />
      </div>
    )
  }

  const metadata = audit.metadata || {}

  // Map of name field to corresponding email field
  const nameToEmailMap = {
    userName: 'userEmail',
    updatedByName: 'updatedByEmail',
    createdByName: 'createdByEmail',
    deletedByName: 'deletedByEmail',
  }

  // Get priority field values
  const priorityItems = priorityFields
    .map(field => {
      // Skip email fields if they have a corresponding name field in priorityFields
      if (field.endsWith('Email') && priorityFields.includes(field.replace('Email', 'Name'))) {
        return null
      }

      const value = metadata[field] || audit[field]
      if (value === undefined || value === null || value === '') return null

      // Combine name and email if this is a name field with corresponding email
      let displayValue = value
      if (nameToEmailMap[field]) {
        const emailField = nameToEmailMap[field]
        const emailValue = metadata[emailField] || audit[emailField]
        displayValue = formatAuthor(value, emailValue)
      }

      return {
        field,
        label: FIELD_LABELS[field] || field,
        value: field === 'createdAt' ? new Date(value).toLocaleString() :
               field === 'changes' ? value :
               typeof value === 'object' ? JSON.stringify(value, null, 2) : displayValue,
      }
    })
    .filter(Boolean)

  // Get all metadata keys that are not in priority fields
  const remainingKeys = Object.keys(metadata).filter(
    key => !priorityFields.includes(key)
  )

  // Build remaining metadata object, parsing JSON strings
  const remainingMetadata = remainingKeys.reduce((acc, key) => {
    const value = metadata[key]
    // Try to parse JSON strings for better display
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        acc[key] = JSON.parse(value)
      } catch {
        acc[key] = value
      }
    } else {
      acc[key] = value
    }
    return acc
  }, {})

  const handleCopyAuditEvent = () => {
    // Include all metadata (priority fields + remaining metadata)
    const fullMetadata = {
      ...metadata,
    }
    const fullAuditEvent = {
      ...audit,
      metadata: fullMetadata,
    }
    navigator.clipboard.writeText(JSON.stringify(fullAuditEvent, null, 2))
    message.success('Audit event copied to clipboard')
  }

  return (
    <div style={{ padding: 14 }}>
      <Button
        icon={<CopyOutlined />}
        onClick={handleCopyAuditEvent}
        style={{ marginBottom: 14 }}
        block
      >
        Copy Audit Event
      </Button>
      <Descriptions column={1} size="small" bordered >
        {priorityItems.map((item, idx) => (
          <Descriptions.Item key={idx} label={item.label}>
            {item.field === 'changes' && typeof item.value === 'object' ? (
              <div
                style={{
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    background: token.colorFillQuaternary,
                    padding: 8,
                    borderRadius: token.borderRadius,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}
                >
                  {JSON.stringify(item.value, null, 2)}
                </pre>
              </div>
            ) : (
              item.value
            )}
          </Descriptions.Item>
        ))}
        {remainingKeys.length > 0 && (
          <Descriptions.Item label="Full Metadata" contentStyle={{ width: '100%', overflow: 'hidden' }}>
              <div
                style={{
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
              >              <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    background: token.colorFillQuaternary,
                    padding: 8,
                    borderRadius: token.borderRadius,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}
                >
                {JSON.stringify(remainingMetadata, null, 2)}
              </pre>
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>
    </div>
  )
}
