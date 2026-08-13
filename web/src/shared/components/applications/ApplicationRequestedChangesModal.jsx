import { Typography, Descriptions, Space, Tag, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

const formatDateTime = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}

function groupFieldsBySection(fields = []) {
  return fields.reduce((acc, item) => {
    const parts = item.displayName?.split(' - ')
    const hasSection = parts && parts.length > 1
    const sectionName = hasSection ? parts[0] : 'Other'
    const fieldName = hasSection ? parts.slice(1).join(' - ') : item.displayName
    if (!acc[sectionName]) {
      acc[sectionName] = []
    }
    acc[sectionName].push({ fieldName, reason: item.reason, fieldKey: item.fieldKey })
    return acc
  }, {})
}

function FieldChangeList({ fields }) {
  const groupedBySection = groupFieldsBySection(fields)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(groupedBySection)
        .sort(([a], [b]) => {
          if (a === 'Other') return 1
          if (b === 'Other') return -1
          return a.localeCompare(b)
        })
        .map(([sectionName, sectionFields]) => (
          <div key={sectionName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sectionFields.map((field) => (
              <Descriptions key={field.fieldKey} column={1} bordered size="small" styles={{ label: { width: '120px' } }}>
                <Descriptions.Item label="Section">{sectionName}</Descriptions.Item>
                <Descriptions.Item label="Field Name">{field.fieldName}</Descriptions.Item>
                <Descriptions.Item label="Reason">{field.reason}</Descriptions.Item>
              </Descriptions>
            ))}
          </div>
        ))}
    </div>
  )
}

function ReturnSection({ returnItem }) {
  const { returnNumber, returnedAt, returnedByName, reviewComments, fields = [] } = returnItem
  const { token } = theme.useToken()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Space wrap>
        <Tag color="volcano">Return #{returnNumber}</Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(returnedAt)}</Text>
        {returnedByName && (
          <Text type="secondary" style={{ fontSize: 12 }}>Returned by {returnedByName}</Text>
        )}
      </Space>

      {reviewComments && (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Return Reason</Text>
          <div style={{ marginTop: 4, padding: 12, background: token.colorFillTertiary, borderRadius: token.borderRadiusSM }}>
            <Text>{reviewComments}</Text>
          </div>
        </div>
      )}

      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>Requested Changes</Text>
        <div style={{ marginTop: 4 }}>
          {fields.length > 0 ? (
            <FieldChangeList fields={fields} />
          ) : (
            <Text type="secondary">No fields were specified for this return.</Text>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * ApplicationRequestedChangesModal - A reusable modal for displaying requested changes
 *
 * Two modes:
 * - Review mode: pass `requestChangeFields` to show the current set of fields marked for changes.
 * - Returned mode: pass `returnHistory` to show past returns with their reasons, dates, and fields.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {Array} [props.requestChangeFields=[]] - Current fields marked for changes
 * @param {Array} [props.returnHistory=[]] - Past returns with { returnNumber, returnedAt, returnedByName, reviewComments, fields }
 */
export default function ApplicationRequestedChangesModal({ open, onCancel, requestChangeFields = [], returnHistory = [] }) {
  const hasHistory = returnHistory.length > 0
  const hasCurrentFields = requestChangeFields.length > 0

  return (
    <ResponsiveModal
      title="Requested Changes"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {hasHistory ? (
          returnHistory.map((returnItem) => (
            <ReturnSection key={returnItem.returnNumber} returnItem={returnItem} />
          ))
        ) : hasCurrentFields ? (
          <FieldChangeList fields={requestChangeFields} />
        ) : (
          <Text type="secondary">No requested changes</Text>
        )}
      </div>
    </ResponsiveModal>
  )
}
