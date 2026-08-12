import { Button, Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function ApplicationResubmitConfirmationModal({ open, onCancel, onConfirm, loading = false }) {
  return (
    <ResponsiveModal
      title="Confirm Resubmission"
      open={open}
      onCancel={onCancel}
      footer={
        <Button type="primary" onClick={onConfirm} loading={loading}>
          Yes, Resubmit
        </Button>
      }
      destroyOnHidden
    >
      <div>
        <Text>Are you sure you want to resubmit your application?  You can only resubmit once. Please ensure all requested changes are complete and final before proceeding.</Text>
      </div>
    </ResponsiveModal>
  )
}
