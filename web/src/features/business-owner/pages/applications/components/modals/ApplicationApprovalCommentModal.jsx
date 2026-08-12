import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ApplicationApprovalCommentModal({ open, onCancel, comment }) {
  return (
    <ResponsiveModal
      title="Approval Comment"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16 }}>
        <Text>{comment || 'No approval comment provided.'}</Text>
      </div>
    </ResponsiveModal>
  )
}
