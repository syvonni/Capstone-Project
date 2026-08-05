import { CheckOutlined, CloseOutlined, HistoryOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'

/**
 * PermitDetailHeader
 * 
 * Header component for permit processing detail panel.
 * Shows claim/release buttons, bookmark toggle, and history button.
 * Uses permitStatus from usePermitStatus hook to determine button states.
 * 
 * TODO: Add action buttons for print, notify, complete when status allows
 */
export default function PermitDetailHeader({
  permitStatus,
  claiming,
  onClaim,
  onRelease,
  onHistoryClick,
  actionButtons = [],
  isBookmarked = false,
  onBookmarkToggle,
}) {
  const { isClaimed, isClaimedByMe, canClaim, canRelease, isTerminal } = permitStatus

  const getPrimaryButton = () => {
    // When in terminal states, show disabled claim/release buttons
    if (isTerminal) {
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
    // Otherwise, show normal claim/release buttons based on permissions
    if (!isClaimed) {
      return {
        text: 'Claim',
        icon: <CheckOutlined />,
        onClick: onClaim,
        disabled: !canClaim,
        loading: claiming,
      }
    }
    if (isClaimedByMe) {
      return {
        text: 'Release',
        icon: <CloseOutlined />,
        onClick: onRelease,
        disabled: !canRelease,
        loading: claiming,
      }
    }
    return {
      text: 'Claimed by another officer',
      icon: null,
      onClick: onClaim,
      disabled: true,
    }
  }

  // Hide action buttons when in terminal states
  const effectiveActionButtons = isTerminal ? [] : actionButtons

  return (
    <DetailHeader
      primaryButton={getPrimaryButton()}
      iconButtons={[
        { icon: isBookmarked ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />, onClick: onBookmarkToggle, title: isBookmarked ? 'Remove Bookmark' : 'Add Bookmark' },
        { icon: <HistoryOutlined />, onClick: onHistoryClick, title: 'History' },
      ]}
      actionButtons={effectiveActionButtons}
      manualSlotId="bizclear-manual"
    />
  )
}
