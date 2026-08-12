import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ApplicationAppealRejectionReasonModal({ open, onCancel, reason }) {
  return (
    <ResponsiveModal
      title="Appeal Rejection Reason"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16 }}>
        <Text>{reason || 'No appeal rejection reason provided.'}</Text>
      </div>
    </ResponsiveModal>
  )
}
