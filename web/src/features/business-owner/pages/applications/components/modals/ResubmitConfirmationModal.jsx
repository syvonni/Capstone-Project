import { Modal, Typography } from 'antd'

const { Text } = Typography

export default function ResubmitConfirmationModal({ open, onCancel, onConfirm, loading = false }) {
  return (
    <Modal
      title="Confirm Resubmission"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Yes, Resubmit"
      confirmLoading={loading}
      destroyOnHidden
      cancelButtonProps={{ style: { display: 'none' } }}
    >
      <div>
        <Text>Are you sure you want to resubmit your application?  You can only resubmit once. Please ensure all requested changes are complete and final before proceeding.</Text>
      </div>
    </Modal>
  )
}
