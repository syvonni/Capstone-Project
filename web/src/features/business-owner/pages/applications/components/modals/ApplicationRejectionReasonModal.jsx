import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ApplicationRejectionReasonModal({ open, onCancel, rejectionReason }) {
  return (
    <ResponsiveModal
      title="Application Rejection Reason"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16 }}>
        <Text>{rejectionReason || 'No rejection reason provided.'}</Text>
      </div>
    </ResponsiveModal>
  )
}
