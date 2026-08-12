import { Typography, Descriptions } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ApplicationRequestedChangesModal({ open, onCancel, requestChangeFields }) {
  return (
    <ResponsiveModal
      title="Requested Changes"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16 }}>
        {requestChangeFields.length > 0 ? (
          (() => {
            // Group fields by section
            const groupedBySection = requestChangeFields.reduce((acc, item) => {
              const sectionMatch = item.displayName.match(/^Section \d+ - /)
              const sectionName = sectionMatch ? item.displayName.split(' - ')[0] : 'Other'
              const fieldName = sectionMatch ? item.displayName.replace(sectionMatch[0], '') : item.displayName
              if (!acc[sectionName]) {
                acc[sectionName] = []
              }
              acc[sectionName].push({ fieldName, reason: item.reason, fieldKey: item.fieldKey })
              return acc
            }, {})

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {Object.entries(groupedBySection)
                  .sort(([a], [b]) => {
                    // Sort "Other" to the end
                    if (a === 'Other') return 1
                    if (b === 'Other') return -1
                    return a.localeCompare(b)
                  })
                  .map(([sectionName, fields]) => (
                  <div key={sectionName}>
                    <Text style={{ display: 'block', marginBottom: 12 }}>{sectionName}</Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {fields.map((field) => (
                        <Descriptions key={field.fieldKey} column={1} bordered size="small" styles={{ label: { width: '120px' } }}>
                          <Descriptions.Item label="Field Name">{field.fieldName}</Descriptions.Item>
                          <Descriptions.Item label="Reason">{field.reason}</Descriptions.Item>
                        </Descriptions>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()
        ) : (
          <Text type="secondary">No requested changes</Text>
        )}
      </div>
    </ResponsiveModal>
  )
}
