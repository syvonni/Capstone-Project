import { Typography, List, Spin, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

/**
 * ApplicationFeeBreakdownModal - A reusable modal for displaying application fee breakdown
 * 
 * Features:
 * - Responsive: Uses ResponsiveModal (Drawer on mobile, Modal on desktop)
 * - Loading state: Shows spinner while fetching fee data
 * - Error handling: Shows error message if fee data cannot be loaded
 * - Formatted display: Shows fee items with labels and amounts, plus total
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {Object} props.feeData - Fee data object with { fees: Array, total: Number }
 * @param {boolean} props.loadingFees - Whether fee data is being loaded
 * @param {Object} props.token - Ant Design theme token
 */
export default function ApplicationFeeBreakdownModal({ open, onCancel, feeData, loadingFees }) {
  const { token: themeToken } = theme.useToken()

  return (
    <ResponsiveModal
      title="Application Fee Breakdown"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      {loadingFees ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : feeData?.fees ? (
        <div style={{ padding: 16 }}>
          <List
            size="small"
            bordered
            dataSource={feeData.fees || []}
            renderItem={(item) => (
              <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>{item.label}</Text>
                <Text strong>₱{(item.amount || 0).toFixed(2)}</Text>
              </List.Item>
            )}
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Total Amount Due</Text>
                <Text strong style={{ color: themeToken.colorPrimary, fontSize: 16 }}>₱{(feeData.total || 0).toFixed(2)}</Text>
              </div>
            }
          />
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
            * Payment will be processed after submission
          </Text>
        </div>
      ) : (
        <Text type="secondary">Unable to load fee details</Text>
      )}
    </ResponsiveModal>
  )
}
