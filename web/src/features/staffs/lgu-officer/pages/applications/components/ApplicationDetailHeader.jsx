import { CheckOutlined, CloseOutlined, HistoryOutlined, StarOutlined, StarFilled, ShopOutlined, MailOutlined } from '@ant-design/icons'
import { Badge } from 'antd'
import { useState } from 'react'
import DetailHeader from '@/shared/components/DetailHeader'
import ApplicationEmailStatusModal from './modals/ApplicationEmailStatusModal'

export default function ApplicationDetailHeader({
  isClaimed,
  isClaimedByMe,
  claiming,
  onClaim,
  onRelease,
  onHistoryClick,
  actionButtons = [],
  isBookmarked = false,
  onBookmarkToggle,
  hasPendingAction = false,
  onGoToBusiness,
  applicationStatus,
  emailSendStatus = {},
  onResendEmail,
  onResendAppealEmail,
  appealId,
  _isOfficerDraft = false,
  _isAutosaving = false,
  _hasUnsavedChanges = false,
  _loadApplicationDetails,
  applicationId,
  businessId,
  permitService,
}) {
  // Only disable release button when pending action is 'complete_review' (approval pending)
  const isApprovalPending = hasPendingAction?.actionType === 'complete_review';
  const isApproved = applicationStatus === 'approved';
  const isRejected = applicationStatus === 'rejected' || applicationStatus === 'appeal_rejected';
  const isReturned = applicationStatus === 'needs_revision' || applicationStatus === 'returned';

  const getPrimaryButton = () => {
    // Show "Go To Business" button only when application is approved
    if (isApproved) {
      return {
        text: 'Go To Business',
        icon: <ShopOutlined />,
        onClick: onGoToBusiness || (() => {}),
        type: 'primary',
      }
    }
    // When there's a pending action, show disabled claim/release buttons
    if (hasPendingAction) {
      if (!isClaimed) {
        return {
          text: 'Claim',
          icon: <CheckOutlined />,
          onClick: onClaim,
          disabled: true,
        }
      }
      if (isClaimedByMe) {
        return {
          text: 'Release',
          icon: <CloseOutlined />,
          onClick: onRelease,
          disabled: true,
        }
      }
      return {
        text: 'Claimed by another officer',
        icon: null,
        onClick: onClaim,
        disabled: true,
      }
    }
    // When in final decision states (rejected, returned), show disabled claim/release buttons
    if (isRejected || isReturned) {
      if (!isClaimed) {
        return {
          text: 'Claim',
          icon: <CheckOutlined />,
          onClick: onClaim,
          disabled: true,
        }
      }
      if (isClaimedByMe) {
        return {
          text: 'Release',
          icon: <CloseOutlined />,
          onClick: onRelease,
          disabled: true,
        }
      }
      return {
        text: 'Claimed by another officer',
        icon: null,
        onClick: onClaim,
        disabled: true,
      }
    }
    // When approval is pending AND is claimed by me, show disabled release button
    if (isApprovalPending && isClaimedByMe) {
      return {
        text: 'Release',
        icon: <CloseOutlined />,
        onClick: onRelease,
        disabled: true,
      }
    }
    // Otherwise, show normal claim/release buttons
    if (!isClaimed) {
      return {
        text: 'Claim',
        icon: <CheckOutlined />,
        onClick: onClaim,
        loading: claiming,
      }
    }
    if (isClaimedByMe) {
      return {
        text: 'Release',
        icon: <CloseOutlined />,
        onClick: onRelease,
        loading: claiming,
      }
    }
    return {
      text: 'Claimed by another officer',
      icon: null,
      onClick: onClaim,
      loading: claiming,
    }
  }

  // Hide action buttons only when there's NO pending action AND in final decision states
  const effectiveActionButtons = !hasPendingAction && (isRejected || isReturned) ? [] : actionButtons;

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [refreshingEmail, setRefreshingEmail] = useState(false);

  // Check if any email has failed
  const hasFailedEmail = Object.values(emailSendStatus).some(status => status?.status === 'failed');

  // Email status button as secondary action
  const emailActionButton = onResendEmail ? {
    text: 'Email Status',
    icon: (
      <Badge dot={hasFailedEmail}>
        <MailOutlined />
      </Badge>
    ),
    onClick: async () => {
      setRefreshingEmail(true);
      await _loadApplicationDetails?.(); // Refresh application data to get latest emailSendStatus
      setRefreshingEmail(false);
      setEmailModalOpen(true);
    },
    loading: refreshingEmail,
  } : null;

  return (
    <>
      <DetailHeader
        primaryButton={getPrimaryButton()}
        iconButtons={[
          { icon: isBookmarked ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />, onClick: onBookmarkToggle, title: isBookmarked ? 'Remove Bookmark' : 'Add Bookmark' },
          { icon: <HistoryOutlined />, onClick: onHistoryClick, title: 'History' },
        ]}
        actionButtons={emailActionButton ? [...effectiveActionButtons, emailActionButton] : effectiveActionButtons}
        manualSlotId="bizclear-manual"
        instructionSlotId="lgu-officer-application-review"
      />
      <ApplicationEmailStatusModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        emailSendStatus={emailSendStatus}
        onResendEmail={onResendEmail}
        onResendAppealEmail={onResendAppealEmail}
        appealId={appealId}
        isApproved={isApproved}
        isRejected={isRejected}
        isReturned={isReturned}
        isClaimed={isClaimedByMe}
        applicationId={applicationId}
        businessId={businessId}
        permitService={permitService}
      />
    </>
  )
}
