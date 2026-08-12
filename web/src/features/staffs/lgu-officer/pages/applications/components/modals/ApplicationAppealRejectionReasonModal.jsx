import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function AppealRejectionReasonModal({ open, onClose, appealResolution }) {
  return (
    <ResponsiveModal
      title="Appeal Rejection Reason"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Text>{appealResolution || 'No appeal rejection reason provided.'}</Text>
    </ResponsiveModal>
  )
}
