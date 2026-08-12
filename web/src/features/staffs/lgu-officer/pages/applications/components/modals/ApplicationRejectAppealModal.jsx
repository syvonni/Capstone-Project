import { Button, Space, Input } from 'antd'
import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function RejectAppealModal({ open, onClose, onConfirm, rejectAppealReason, setRejectAppealReason }) {
  return (
    <ResponsiveModal
      title="Reject Appeal"
      open={open}
      onCancel={onClose}
      width={520}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="reject" type="primary" onClick={onConfirm}>
          Reject Appeal
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Text>
          Provide a reason for rejecting this appeal. The applicant will be notified of the appeal rejection and the reason provided.
        </Text>
        <Input.TextArea
          placeholder="Please specify the appeal rejection reason"
          value={rejectAppealReason}
          onChange={(e) => setRejectAppealReason(e.target.value)}
          rows={4}
        />
      </Space>
    </ResponsiveModal>
  )
}
