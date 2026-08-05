import { CheckOutlined, CloseOutlined, HistoryOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'

const STATUS_CONFIG = {
  open: { color: 'blue', label: 'Open' },
  in_progress: { color: 'gold', label: 'In Progress' },
  needs_response: { color: 'volcano', label: 'Needs Response' },
  waiting_for_business_owner: { color: 'cyan', label: 'Waiting for Owner' },
  closed: { color: 'green', label: 'Closed' },
  invalid: { color: 'default', label: 'Invalid' },
}

export default function HelpRequestDetailHeader({
  detail,
  isClaimed,
  isClaimedByMe,
  claiming,
  statusLockInfo,
  updatingStatus,
  updatingPriority,
  onClaim,
  onRelease,
  onStatusChange,
  onPriorityChange,
  onHistoryClick,
  isBookmarked = false,
  onBookmarkToggle,
}) {
  const getPrimaryButton = () => {
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
        disabled: detail.status === 'closed' || detail.status === 'invalid',
      }
    }
    return {
      text: `Claimed by: ${detail.claimedByName}`,
      icon: null,
      onClick: onClaim,
      loading: claiming,
    }
  }

  const getStatusOptions = () => {
    if (detail.status === 'closed' || detail.status === 'invalid') {
      return [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'needs_response', label: 'Needs Response' },
        { value: 'waiting_for_business_owner', label: 'Waiting for Owner' },
        { value: 'closed', label: 'Closed' },
        { value: 'invalid', label: 'Invalid' },
      ]
    }
    if (isClaimedByMe) {
      return [
        { value: 'in_progress', label: 'In Progress' },
        { value: 'needs_response', label: 'Needs Response' },
        { value: 'waiting_for_business_owner', label: 'Waiting for Owner' },
        { value: 'closed', label: 'Closed' },
        { value: 'invalid', label: 'Invalid' },
      ]
    }
    return [{ value: 'open', label: 'Open' }]
  }

  return (
    <DetailHeader
      primaryButton={getPrimaryButton()}
      iconButtons={[
        { icon: isBookmarked ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />, onClick: onBookmarkToggle, title: isBookmarked ? 'Remove Bookmark' : 'Add Bookmark' },
        { icon: <HistoryOutlined />, onClick: onHistoryClick, title: 'History' },
      ]}
      selectFields={[
        {
          label: 'Status',
          value: detail.status,
          onChange: onStatusChange,
          loading: updatingStatus,
          width: 160,
          disabled: statusLockInfo?.locked || (!isClaimedByMe && detail.status !== 'closed' && detail.status !== 'invalid'),
          options: getStatusOptions(),
        },
        {
          label: 'Priority',
          value: detail.priority,
          onChange: onPriorityChange,
          loading: updatingPriority,
          width: 100,
          disabled: !isClaimedByMe || detail.status === 'closed' || detail.status === 'invalid',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
          ],
        },
      ]}
      manualSlotId="bizclear-manual"
      instructionSlotId="help-requests-instructions"
    />
  )
}
