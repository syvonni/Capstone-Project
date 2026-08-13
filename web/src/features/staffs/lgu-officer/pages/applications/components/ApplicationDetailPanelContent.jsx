import { Alert, Typography, Grid } from 'antd'
import { useNavigate } from 'react-router-dom'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import ApplicationDetailHeader from './ApplicationDetailHeader'
import FormNavigation from '@/shared/components/FormNavigation'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function ApplicationDetailPanelContent({
  loading,
  startingReview,
  setActiveTab,
  application,
  _isWaitingForApplicant,
  _ownerIdentity,
  _businessReg,
  _ownerName,
  _rejectedFields,
  _fieldReviewDecisions,
  _sections,
  _loadApplicationDetails,
  _message,
  activeContent,
  mainNavItems,
  formNavItems,
  activeTab,
  getSectionStatus,
  token,
  onManualClick,
  onHistoryClick,
  onInfoClick,
  isClaimed,
  isClaimedByMe,
  claiming,
  onClaim,
  onRelease,
  actionButtons = [],
  isBookmarked = false,
  onBookmarkToggle,
  hasPendingAction = false,
  emailSendStatus = {},
  onResendEmail,
  onResetEmailStatus,
  onResendAppealEmail,
  appealId,
  isOfficerDraft = false,
  saving = false,
  hasUnsavedChanges = false,
  _permitService,
}) {
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const navigate = useNavigate()

  // Adapt getSectionStatus(sectionIdx) to FormNavigation's getItemStatus(item) interface
  const getItemStatus = (item) => {
    if (!getSectionStatus) return null
    const sectionIdx = parseInt(String(item.key).replace('section-', ''), 10)
    return getSectionStatus(sectionIdx)
  }

  const handleGoToBusiness = () => {
    const businessId = application?.businessId || application?._id
    if (businessId) {
      navigate(`/staff/businesses/${businessId}`)
    }
  }

  return (
    <div className="application-detail-panel-root" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <style>{`
        /* Spin wraps content in .ant-spin-nested-loading and .ant-spin-container; make them pass through flex/height */
        .application-detail-panel-root.ant-spin-nested-loading {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          min-height: 0 !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        .application-detail-panel-root .ant-spin-container {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          min-height: 0 !important;
          height: 100% !important;
          overflow: hidden !important;
        }
      `}</style>
      {(loading || startingReview) ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <LottieSpinner size="large" />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
        {/* Closed business warning */}
        {application?.businessStatus === 'closed' && (
          <Alert
            type="warning"
            showIcon
            banner
            title="This business has been closed (cessation confirmed)."
            style={{ flexShrink: 0 }}
          />
        )}
        {/* Header */}
        <ApplicationDetailHeader
          isClaimed={isClaimed}
          isClaimedByMe={isClaimedByMe}
          claiming={claiming}
          onClaim={onClaim}
          onRelease={onRelease}
          onHistoryClick={onHistoryClick || (() => {})}
          onManualClick={onManualClick || (() => {})}
          onInfoClick={onInfoClick || (() => {})}
          emailSendStatus={emailSendStatus}
          onResendEmail={onResendEmail}
          onResetEmailStatus={onResetEmailStatus}
          onResendAppealEmail={onResendAppealEmail}
          appealId={appealId}
          applicationStatus={application?.status || application?.applicationStatus}
          actionButtons={actionButtons}
          isBookmarked={isBookmarked}
          onBookmarkToggle={onBookmarkToggle}
          hasPendingAction={hasPendingAction}
          onGoToBusiness={handleGoToBusiness}
          isOfficerDraft={isOfficerDraft}
          isAutosaving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          _loadApplicationDetails={_loadApplicationDetails}
          applicationId={application?.applicationId || application?.businessId}
          businessId={application?.businessId}
          permitService={_permitService}
        />

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* Always show tabbed interface with review tab and form sections */}
          {isMobile ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <FormNavigation
                mainNavItems={mainNavItems}
                formNavItems={formNavItems}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                getItemStatus={getItemStatus}
                isMobile={isMobile}
              />
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {activeContent}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', alignItems: 'stretch' }}>
              <FormNavigation
                mainNavItems={mainNavItems}
                formNavItems={formNavItems}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                getItemStatus={getItemStatus}
                isMobile={isMobile}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'auto',
                  padding: 16,
                  background: token.colorBgContainer,
                }}
              >
                {activeContent}
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  )
}
