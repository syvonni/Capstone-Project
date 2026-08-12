import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ApplicationRejectionReasonModal({ open, onClose, rejectionReason }) {
  return (
    <ResponsiveModal
      title="Application Rejection Reason"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Text>{rejectionReason || 'No rejection reason provided.'}</Text>
    </ResponsiveModal>
  )
}
