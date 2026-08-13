import { Space, Button, Typography, Tag } from 'antd'
import { ShopOutlined, BugOutlined, DeleteOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { getApplicationDisplayName, getSaveStatus } from '../utils/statusUtils'
import ApplicationMockPaymentModal from './modals/ApplicationMockPaymentModal'
import ApplicationResubmitConfirmationModal from './modals/ApplicationResubmitConfirmationModal'
import { useBusinessOwnerApplicationModals } from '../hooks/useBusinessOwnerApplicationModals'

const { Title } = Typography

export default function ApplicationDetailHeader({
  application,
  isDraft,
  isReturned = false,
  isRejected = false,
  formSubmitting,
  isMobile = false,
  onDeleteDraft,
  onPaymentSuccess,
  onAppealClick,
  onFillTestData,
  allSectionsComplete = false,
  token,
  isAutosaving = false,
  hasUnsavedChanges = false,
  saveError = null,
  isFooter = false,
  feeData = null,
  showSaveTag = true,
  showActions = true,
}) {
  const displayName = getApplicationDisplayName(application)

  const { text: statusText, color: statusTagColor } = getSaveStatus({ isAutosaving, hasUnsavedChanges, saveError })

  const {
    showPaymentModal,
    setShowPaymentModal,
    showResubmitModal,
    setShowResubmitModal,
    handleSubmitAndPay,
    handleResubmitConfirm,
    handlePaymentSuccess,
    handlePaymentFail,
  } = useBusinessOwnerApplicationModals({ application, onPaymentSuccess, feeData })

  return (
    <div
      style={{
        flexShrink: 0,
        padding: isMobile ? '12px 16px' : '16px',
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
              {showSaveTag && isDraft && (
                <Tag color={statusTagColor} style={{ fontWeight: 'normal' }}>
                  {statusText}
                </Tag>
              )}
            </div>
          </Space>
        )}
        <Space size="small" style={{ alignItems: 'center' }}>
          {showSaveTag && isMobile && isDraft && (
            <Tag color={statusTagColor} style={{ fontWeight: 'normal' }}>
              {statusText}
            </Tag>
          )}
          {showActions && (isDraft || isReturned || (isRejected && !application?.hasActiveAppeal)) ? (
            <>
              {isDraft && import.meta.env.DEV && (
                <Button
                  type="dashed"
                  icon={<BugOutlined />}
                  iconPlacement="end"
                  onClick={onFillTestData}
                >
                  Fill with test data
                </Button>
              )}
              {isDraft && onDeleteDraft && (
                <Button
                  icon={<DeleteOutlined />}
                  iconPlacement="end"
                  onClick={onDeleteDraft}
                >
                  Delete
                </Button>
              )}
              {(isDraft || isReturned) && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  iconPlacement="end"
                  onClick={() => handleSubmitAndPay(isReturned)}
                  loading={formSubmitting}
                  disabled={!allSectionsComplete}
                >
                  {isReturned ? 'Resubmit' : 'Submit'}
                </Button>
              )}
              {isRejected && !application?.hasActiveAppeal && (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  iconPlacement="end"
                  onClick={onAppealClick}
                >
                  Appeal Rejection
                </Button>
              )}
            </>
          ) : null}
        </Space>
      </div>

      <ApplicationMockPaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        onFail={handlePaymentFail}
        amount={feeData?.total || 0}
        transactionName="Business Permit Application"
        fees={feeData?.fees || []}
      />
      <ApplicationResubmitConfirmationModal
        open={showResubmitModal}
        onCancel={() => setShowResubmitModal(false)}
        onConfirm={handleResubmitConfirm}
        loading={formSubmitting}
      />
    </div>
  )
}
