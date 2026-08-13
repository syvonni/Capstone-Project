import { Typography, Button, Space, Divider, List, theme } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography
const { useToken } = theme

export default function ApplicationPaymentReceiptModal({
  visible,
  onClose,
  receiptId,
  receiptNumber,
  transactionDate,
  transactionName,
  fees = [],
  totalAmount,
  applicationReferenceNumber,
  paymentType = 'registration_fee',
  buttonText = 'Download Receipt and Continue',
}) {
  const { token } = useToken()
  const displayReceiptId = receiptNumber || receiptId

  const formatDate = (date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPaymentTypeLabel = (type) => {
    const labels = {
      registration_fee: 'Application Fee',
      penalty: 'Penalty',
      violation_fine: 'Violation Fine',
      general_permit_fee: 'General Permit Fee',
      occupational_permit_fee: 'Occupational Permit Fee',
      cessation_tax: 'Cessation Tax',
      permit_application: 'Permit Application Fee',
      appeal_fee: 'Appeal Fee',
      other: 'Other Fee',
    }
    return labels[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Payment'
  }

  const modalTitle = paymentType === 'appeal_fee'
    ? 'Appeal Payment Details'
    : 'Application Payment Details'

  const handleDownload = () => {
    const receiptText = `
PAYMENT RECEIPT
================
Receipt ID: ${displayReceiptId}
Transaction Date: ${formatDate(transactionDate)}
Transaction: ${transactionName}
Application Reference: ${applicationReferenceNumber}
Payment Type: ${getPaymentTypeLabel(paymentType)}

FEE BREAKDOWN
${fees.map(fee => `${fee.label}: ₱${fee.amount.toFixed(2)}`).join('\n')}

TOTAL: ₱${totalAmount.toFixed(2)}
    `.trim()

    const blob = new Blob([receiptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${displayReceiptId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <ResponsiveModal
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            {buttonText}
          </Button>
        </Space>
      }
      width={520}
    >
      <div>
        <List
          style={{ marginBottom: 12}}
          size="small"
          bordered
          dataSource={[
            { label: 'Receipt ID', value: displayReceiptId },
            { label: 'Transaction Date', value: formatDate(transactionDate) },
            { label: 'Payment Type', value: getPaymentTypeLabel(paymentType) },
            { label: 'Application Reference', value: applicationReferenceNumber },
          ]}
          renderItem={(item) => (
            <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">{item.label}</Text>
              <Text >{item.value}</Text>
            </List.Item>
          )}
        />
        <Divider> <Text type="secondary" style={{fontSize: 12}}>Fee Breakdown</Text> </Divider>

        {fees && fees.length > 0 ? (
          <List
            size="small"
            bordered
            dataSource={fees}
            renderItem={(item) => (
              <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>{item.label}</Text>
                <Text>₱{(item.amount || 0).toFixed(2)}</Text>
              </List.Item>
            )}
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Total Amount Paid</Text>
                <Text strong style={{ color: token.colorPrimary }}>
                  ₱{(totalAmount || 0).toFixed(2)}
                </Text>
              </div>
            }
          />
        ) : (
          <div style={{ padding: 16, textAlign: 'center', background: token.colorBgLayout, borderRadius: 8 }}>
            <Text type="secondary">Fee breakdown not available for this payment</Text>
          </div>
        )}
      </div>
    </ResponsiveModal>
  )
}
