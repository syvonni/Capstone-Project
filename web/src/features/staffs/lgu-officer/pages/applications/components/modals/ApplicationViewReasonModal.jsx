import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ViewReasonModal({ open, onClose, pendingAction }) {
  const content = pendingAction?.payload?.rejectionReason || pendingAction?.payload?.comments || pendingAction?.payload?.requestOther || 'No reason provided'

  return (
    <ResponsiveModal
      title="Reason"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Text>{content}</Text>
    </ResponsiveModal>
  )
}
