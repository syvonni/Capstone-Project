import { Typography, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * ApplicationAppealRejectionReasonModal - A reusable modal for displaying an appeal rejection reason
 *
 * Used by both business owners and LGU officers to view why an appeal was rejected.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {string} props.reason - The rejection reason to display
 * @param {string} [props.resolvedAt] - When the appeal was resolved
 * @param {string} [props.resolvedByName] - Name of the officer who resolved the appeal
 */
export default function ApplicationAppealRejectionReasonModal({
  open,
  onCancel,
  reason,
  resolvedAt,
  resolvedByName,
}) {
  const { token } = theme.useToken()
  const timestamp = formatDate(resolvedAt)

  return (
    <ResponsiveModal
      title="Appeal Rejection Reason"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text>{reason || 'No appeal rejection reason provided.'}</Text>
        {timestamp && (
          <Text type="secondary" style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {resolvedByName ? `Rejected on ${timestamp} by ${resolvedByName}` : `Rejected on ${timestamp}`}
          </Text>
        )}
      </div>
    </ResponsiveModal>
  )
}
