import { Button, Space, Input } from 'antd'
import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function CompleteReviewModal({ open, onClose, onConfirm, completeReviewComment, setCompleteReviewComment }) {
  return (
    <ResponsiveModal
      title="Complete Review"
      open={open}
      onCancel={onClose}
      width={520}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="complete" type="primary" onClick={onConfirm}>
          Complete
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Text>
          Complete your review of this application. You may add optional comments for your records.
        </Text>
        <Input.TextArea
          placeholder="Add any comments about this review..."
          value={completeReviewComment}
          onChange={(e) => setCompleteReviewComment(e.target.value)}
          rows={3}
        />
      </Space>
    </ResponsiveModal>
  )
}
