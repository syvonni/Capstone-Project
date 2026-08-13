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

export default function ApplicationRejectionReasonModal({
  open,
  onCancel,
  rejectionReason,
  reviewedAt,
}) {
  const { token } = theme.useToken()
  const timestamp = formatDate(reviewedAt)

  return (
    <ResponsiveModal
      title="Application Rejection Reason"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text>{rejectionReason || 'No rejection reason provided.'}</Text>
        {timestamp && (
          <Text type="secondary" style={{ fontSize: 12, color: token.colorTextSecondary }}>
            Rejected on {timestamp}
          </Text>
        )}
      </div>
    </ResponsiveModal>
  )
}
