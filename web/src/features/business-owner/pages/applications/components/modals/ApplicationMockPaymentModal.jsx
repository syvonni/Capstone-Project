import { Typography, Button, Space, List, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Title, Text, Paragraph } = Typography
const { useToken } = theme

export default function ApplicationMockPaymentModal({
  visible,
  onClose,
  onSuccess,
  onFail,
  amount,
  transactionName,
  fees = [],
}) {
  const { token } = useToken()
  const generateReceiptId = () => {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `MOCK-${date}-${random}`
  }

  const handleSuccess = () => {
    const receiptId = generateReceiptId()
    onSuccess(receiptId)
  }

  return (
    <ResponsiveModal
      title="Mock Payment Gateway"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 24 }}>
          <List
            size="small"
            bordered
            header={<Text strong>{transactionName} Fee Breakdown</Text>}
            dataSource={fees || []}
            renderItem={(item) => (
              <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>{item.label}</Text>
                <Text strong>₱{(item.amount || 0).toFixed(2)}</Text>
              </List.Item>
            )}
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Total Amount Due</Text>
                <Text strong style={{ color: token.colorPrimary, fontSize: 16 }}>₱{(amount || 0).toFixed(2)}</Text>
              </div>
            }
          />
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Button
            type="primary"
            block
            onClick={handleSuccess}
          >
            Simulate Successful Payment
          </Button>
          <Button
            danger
            block
            onClick={onFail}
          >
            Simulate Failed Payment
          </Button>
        </Space>
      </div>
    </ResponsiveModal>
  )
}
