import { Descriptions, Typography, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

/**
 * ApplicationFieldProgressModal - A reusable modal for displaying field progress details
 * 
 * Used in both business owner (Form Progress - incomplete fields) and LGU officer 
 * (Review Progress - pending review fields) contexts to show field lists grouped by section.
 * 
 * Features:
 * - Responsive: Uses ResponsiveModal (Drawer on mobile, Modal on desktop)
 * - Grouped display: Groups fields by section for better organization
 * - Empty state: Shows message when no fields to display
 * - Customizable: Accepts custom title and field data
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {string} props.title - Title for the modal (e.g., "Incomplete Fields", "Pending Review Fields")
 * @param {Array} props.fields - Array of field objects with { displayName: string }
 * @param {string} props.emptyMessage - Message to show when no fields (default: "All fields are completed")
 */
export default function ApplicationFieldProgressModal({ 
  open, 
  onCancel, 
  title, 
  fields = [], 
  emptyMessage = "All fields are completed" 
}) {
  const { token } = theme.useToken()

  if (fields.length === 0) {
    return (
      <ResponsiveModal
        title={title}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={600}
      >
        <Text type="secondary">{emptyMessage}</Text>
      </ResponsiveModal>
    )
  }

  // Group fields by section
  const groupedBySection = fields.reduce((acc, item) => {
    const sectionMatch = item.displayName.match(/^Section \d+ - /)
    const sectionName = sectionMatch ? item.displayName.split(' - ')[0] : 'Other'
    const fieldName = sectionMatch ? item.displayName.replace(sectionMatch[0], '') : item.displayName
    if (!acc[sectionName]) {
      acc[sectionName] = []
    }
    acc[sectionName].push(fieldName)
    return acc
  }, {})

  return (
    <ResponsiveModal
      title={`${title} (${fields.length})`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Descriptions 
        column={1} 
        bordered 
        size="small" 
        styles={{ label: { width: '150px', background: token.colorFillAlter } }}
      >
        {Object.entries(groupedBySection)
          .sort(([a], [b]) => {
            // Sort "Other" to the end
            if (a === 'Other') return 1
            if (b === 'Other') return -1
            return a.localeCompare(b)
          })
          .map(([sectionName, sectionFields]) => (
          <Descriptions.Item key={sectionName} label={sectionName}>
            {sectionFields.join(', ')}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </ResponsiveModal>
  )
}
