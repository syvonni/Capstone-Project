import { StarOutlined, StarFilled, HistoryOutlined, EditOutlined, MailOutlined, SendOutlined, CheckCircleOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'

export default function BusinessOwnerDetailHeader({
  isBookmarked,
  onBookmarkToggle,
  onHistoryClick,
  onEditInfoClick,
  onUpdateEmailClick,
  emailSendStatus,
  onResendCredentials,
  onResendEditInfo,
  onResendEmailChange,
}) {
  // Calculate retry delay based on retryCount (exponential backoff: 30s, 60s, 120s)
  const getRetryDelay = (retryCount) => {
    if (retryCount === 0) return 30
    if (retryCount === 1) return 60
    if (retryCount === 2) return 120
    return 0
  }

  // Get button config for each email type
  const getEmailButtonConfig = (emailType, status, retryCount, onClick) => {
    const config = {
      credentials: {
        sentText: 'Account Credentials Sent',
        failedText: (delay) => `Resend Credentials Email (${delay}s)`,
        disabledText: 'Account Credentials Sent',
      },
      editInfo: {
        sentText: 'Edit Info Email Sent',
        failedText: (delay) => `Resend Edit Info Email (${delay}s)`,
        disabledText: 'Edit Info Email Sent',
      },
      emailChange: {
        sentText: 'New Credentials Sent',
        failedText: (delay) => `Resend Email Change Notification (${delay}s)`,
        disabledText: 'New Credentials Sent',
      },
    }

    const typeConfig = config[emailType]

    if (status === 'sent') {
      return {
        text: typeConfig.sentText,
        icon: <CheckCircleOutlined />,
        disabled: true,
        onClick: null,
      }
    }

    if (status === 'failed' && retryCount < 3) {
      const delay = getRetryDelay(retryCount)
      return {
        text: typeConfig.failedText(delay),
        icon: <SendOutlined />,
        disabled: false,
        onClick,
      }
    }

    if (status === 'failed' && retryCount >= 3) {
      return {
        text: 'Email Send Failed',
        icon: <SendOutlined />,
        disabled: true,
        onClick: null,
      }
    }

    // Default for 'pending' or other states
    return null
  }

  // Build action buttons array
  const actionButtons = [
    { text: 'Update Email', icon: <MailOutlined />, onClick: onUpdateEmailClick },
  ]

  // Add email status buttons for all types
  const credentialsButton = getEmailButtonConfig(
    'credentials',
    emailSendStatus?.credentials?.status,
    emailSendStatus?.credentials?.retryCount,
    onResendCredentials
  )
  if (credentialsButton) actionButtons.push(credentialsButton)

  const editInfoButton = getEmailButtonConfig(
    'editInfo',
    emailSendStatus?.editInfo?.status,
    emailSendStatus?.editInfo?.retryCount,
    onResendEditInfo
  )
  if (editInfoButton) actionButtons.push(editInfoButton)

  const emailChangeButton = getEmailButtonConfig(
    'emailChange',
    emailSendStatus?.emailChange?.status,
    emailSendStatus?.emailChange?.retryCount,
    onResendEmailChange
  )
  if (emailChangeButton) actionButtons.push(emailChangeButton)

  return (
    <DetailHeader
      primaryButton={{ text: 'Edit Information', icon: <EditOutlined />, onClick: onEditInfoClick }}
      iconButtons={[
        { icon: isBookmarked ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />, onClick: onBookmarkToggle, title: isBookmarked ? 'Remove Bookmark' : 'Add Bookmark' },
        { icon: <HistoryOutlined />, onClick: onHistoryClick, title: 'History' },
      ]}
      actionButtons={actionButtons}
      manualSlotId="bizclear-manual"
      instructionSlotId="lgu-officer-business-owners"
    />
  )
}
