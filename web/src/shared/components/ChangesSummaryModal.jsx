import { Modal, Typography, Descriptions } from 'antd'

const { Text } = Typography

export default function ChangesSummaryModal({ open, onClose, onConfirm, changedFields, title = 'Confirm Changes' }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      onOk={onConfirm}
      okText="Confirm"
      cancelText="Cancel"
      width={600}
    >
      <Text style={{ display: 'block', marginBottom: 16 }}>
        Are you sure you want to publish these changes? This action cannot be undone.
      </Text>
      {changedFields && changedFields.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontWeight: 500 }}>Changes to be saved:</Text>
          <Descriptions column={1} size="small" bordered>
            {changedFields.map((change, index) => (
              <Descriptions.Item key={index} label={change.field}>
                <Text type="secondary" style={{ textDecoration: 'line-through', marginRight: 8 }}>{change.from}</Text>
                <Text>→ {change.to}</Text>
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      )}
    </Modal>
  )
}
