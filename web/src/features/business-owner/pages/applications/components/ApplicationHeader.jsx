import { useState } from 'react'
import { Space, Button, Typography, Tag, App } from 'antd'
import { ShopOutlined, BugOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { getBusinessDisplayName } from '../utils/statusUtils'
import MockPaymentModal from './modals/MockPaymentModal'
import ResubmitConfirmationModal from './modals/ResubmitConfirmationModal'

const { Title } = Typography

export default function ApplicationHeader({
  business,
  isDraft,
  isReturned = false,
  formSubmitting,
  isMobile = false,
  onDeleteDraft,
  onPaymentSuccess,
  onFillTestData,
  allSectionsComplete = false,
  token,
  isAutosaving = false,
  hasUnsavedChanges = false,
  isFooter = false
}) {
  const { message } = App.useApp()
  const displayName = getBusinessDisplayName(business)
  const [feeData, setFeeData] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showResubmitModal, setShowResubmitModal] = useState(false)

  const handleSubmitAndPay = () => {
    if (isReturned) {
      setShowResubmitModal(true)
    } else {
      setShowPaymentModal(true)
    }
  }

  const handleResubmitConfirm = () => {
    setShowResubmitModal(false)
    const receiptInfo = {
      receiptId: 'RESUBMIT-' + Date.now(),
      transactionDate: new Date().toLocaleString(),
      transactionName: 'Application Resubmission',
      fees: [],
      totalAmount: 0,
      applicationReferenceNumber: business?.applicationReferenceNumber || 'N/A',
    }
    onPaymentSuccess(receiptInfo)
  }

  const handlePaymentSuccess = (receiptId) => {
    setShowPaymentModal(false)
    const receiptInfo = {
      receiptId,
      transactionDate: new Date().toLocaleString(),
      transactionName: 'Business Permit Application',
      fees: feeData?.fees || [],
      totalAmount: feeData?.total || 0,
      applicationReferenceNumber: business?.applicationReferenceNumber || 'N/A',
    }
    // Delegate to parent if it handles payment success
    if (onPaymentSuccess) {
      onPaymentSuccess(receiptInfo)
    }
  }

  const handlePaymentFail = () => {
    setShowPaymentModal(false)
    message.error('Payment cancelled. Application was not submitted.')
  }

  return (
    <div
      style={{
        flexShrink: 0,
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderTop: isFooter ? `1px solid ${token.colorBorderSecondary}` : undefined,
        borderBottom: !isFooter ? `1px solid ${token.colorBorderSecondary}` : undefined,
        background: token.colorBgContainer,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-end' : 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {!isMobile && (
          <Space size={12}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: token.borderRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                color: token.colorTextSecondary,
                border: `1px solid ${token.colorBorder}`,
              }}
            >
              <ShopOutlined style={{ fontSize: 20 }} />
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0 }}>
                {displayName}
              </Title>
              {isDraft && (
                <Tag
                  color={isAutosaving ? 'processing' : hasUnsavedChanges ? 'warning' : 'success'}
                  style={{ fontWeight: 'normal' }}
                >
                  {isAutosaving ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                </Tag>
              )}
            </div>
          </Space>
        )}
        <Space size="small">
          {isDraft || isReturned ? (
            <>
              {isDraft && import.meta.env.DEV && (
                <Button
                  type="dashed"
                  icon={<BugOutlined />}
                  iconPosition="end"
                  onClick={onFillTestData}
                >
                  Fill with test data
                </Button>
              )}
              {isDraft && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  iconPosition="end"
                  onClick={onDeleteDraft}
                >
                  Delete
                </Button>
              )}
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                iconPosition="end"
                onClick={handleSubmitAndPay}
                loading={formSubmitting}
                disabled={!allSectionsComplete}
              >
                {isReturned ? 'Resubmit' : 'Submit'}
              </Button>
            </>
          ) : null}
        </Space>
      </div>
      
      <MockPaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        onFail={handlePaymentFail}
        amount={feeData?.total || 0}
        transactionName="Business Permit Application"
        fees={feeData?.fees || []}
      />
      <ResubmitConfirmationModal
        open={showResubmitModal}
        onCancel={() => setShowResubmitModal(false)}
        onConfirm={handleResubmitConfirm}
        loading={formSubmitting}
      />
    </div>
  )
}
