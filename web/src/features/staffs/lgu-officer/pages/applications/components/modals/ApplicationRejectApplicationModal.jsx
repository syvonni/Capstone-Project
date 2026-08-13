import { Button, Space, Input } from 'antd'
import { Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function RejectApplicationModal({ open, onClose, onConfirm, rejectReason, setRejectReason }) {
  return (
    <ResponsiveModal
      title="Reject Application"
      open={open}
      onCancel={onClose}
      width={520}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="reject" type="primary" onClick={onConfirm}>
          Reject
        </Button>,
      ]}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={16}>
        <Text>
          Provide a reason for rejecting this application. The applicant will be notified of the rejection and the reason provided.
        </Text>
        <Input.TextArea
          placeholder="Please specify the rejection reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
        />
      </Space>
    </ResponsiveModal>
  )
}
