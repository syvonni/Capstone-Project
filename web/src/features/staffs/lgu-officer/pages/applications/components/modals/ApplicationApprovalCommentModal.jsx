import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ApprovalCommentModal({ open, onClose, reviewComments }) {
  return (
    <ResponsiveModal
      title="Approval Comment"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Text>{reviewComments || 'No approval comment provided.'}</Text>
    </ResponsiveModal>
  )
}
