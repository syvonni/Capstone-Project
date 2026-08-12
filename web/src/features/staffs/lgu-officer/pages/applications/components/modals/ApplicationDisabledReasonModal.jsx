import { Button, Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function DisabledReasonModal({ open, onClose, message }) {
  return (
    <ResponsiveModal
      title="Action Not Available"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <Text>{message}</Text>
    </ResponsiveModal>
  )
}
