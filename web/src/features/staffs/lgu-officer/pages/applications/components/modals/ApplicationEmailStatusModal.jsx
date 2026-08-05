import { Modal, Button, Drawer, Empty, Space, message } from 'antd'
import { useState, useCallback, useRef, useEffect } from 'react'

export default function EmailStatusModal({
  open,
  onClose,
  emailSendStatus = {},
  onResendEmail,
  onResendAppealEmail,
  appealId,
  isApproved,
  isRejected,
  isReturned,
  isMobile = false,
  isClaimed = false,
  applicationId,
  businessId,
  permitService,
}) {
  const [resendingKey, setResendingKey] = useState(null)
  const isResendingRef = useRef(false)
  const [localEmailSendStatus, setLocalEmailSendStatus] = useState(emailSendStatus)

  // Fetch fresh emailSendStatus when modal opens
  useEffect(() => {
    if (open && (applicationId || businessId) && permitService) {
      const fetchFreshStatus = async () => {
        try {
          const appId = applicationId || businessId
          const details = await permitService.getApplicationById(appId, businessId)
          if (details?.emailSendStatus) {
            setLocalEmailSendStatus(details.emailSendStatus)
          }
        } catch (err) {
          console.error('[EmailStatusModal] Failed to fetch fresh emailSendStatus:', err)
        }
      }
      fetchFreshStatus()
    } else if (!open) {
      // Reset to prop value when closed
      setLocalEmailSendStatus(emailSendStatus)
    }
  }, [open, applicationId, businessId, permitService, emailSendStatus])
  // Only show email types that have been attempted (sent or failed)
  const emailTypes = [
    {
      key: 'submitted',
      label: 'Application Submission',
      status: localEmailSendStatus.submitted?.status,
      canResend: true,
      isAppeal: false,
    },
    {
      key: 'resubmitted',
      label: 'Application Resubmission',
      status: localEmailSendStatus.resubmitted?.status,
      canResend: true,
      isAppeal: false,
      // Only show resubmitted if the application was returned first
      show: localEmailSendStatus.returned?.status === 'sent',
    },
    {
      key: 'rejected',
      label: 'Application Rejection',
      status: localEmailSendStatus.rejected?.status,
      canResend: isRejected,
      isAppeal: false,
    },
    {
      key: 'returned',
      label: 'Application Return',
      status: localEmailSendStatus.returned?.status,
      canResend: isReturned,
      isAppeal: false,
    },
    {
      key: 'appeal_submitted',
      label: 'Appeal Submission',
      status: localEmailSendStatus.appeal_submitted?.status,
      canResend: !!appealId, // Enable resend when appealId is available
      isAppeal: true,
    },
    {
      key: 'appeal_approved',
      label: 'Appeal Approval',
      status: localEmailSendStatus.appeal_approved?.status,
      canResend: !!appealId, // Enable resend when appealId is available
      isAppeal: true,
    },
    {
      key: 'appeal_denied',
      label: 'Appeal Denial',
      status: localEmailSendStatus.appeal_denied?.status,
      canResend: !!appealId, // Enable resend when appealId is available
      isAppeal: true,
    },
    {
      key: 'approved',
      label: 'Application Approval',
      status: localEmailSendStatus.approved?.status,
      canResend: isApproved,
      isAppeal: false,
    },
  ].filter(email => {
    // Filter out emails that haven't been attempted (status is null or pending)
    if (!email.status || email.status === 'pending') return false;
    // Filter out resubmitted if application wasn't returned first
    if (email.key === 'resubmitted' && !email.show) return false;
    return true;
  })

  const getButtonText = (item) => {
    if (resendingKey === item.key) {
      return 'Retrying...'
    }
    const action = item.status === 'failed' ? 'failed to send. Retry?' : 'was sent successfully.'
    return `Email for ${item.label} ${action}`
  }

  const handleResend = useCallback(async (key, isAppeal) => {
    if (!isClaimed) {
      message.warning('You must claim this application first to perform actions on it.')
      return
    }
    if (isResendingRef.current) return
    isResendingRef.current = true
    setResendingKey(key)
    try {
      if (isAppeal) {
        if (onResendAppealEmail) await onResendAppealEmail(key)
      } else {
        if (onResendEmail) await onResendEmail(key)
      }
    } catch (error) {
      console.error('Failed to resend email:', error)
      message.error(error?.message || 'Failed to resend email')
    } finally {
      isResendingRef.current = false
      setResendingKey(null)
    }
  }, [onResendEmail, onResendAppealEmail, isClaimed])

  const content = emailTypes.length === 0 ? (
    <Empty description="No emails have been sent yet" />
  ) : (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      {emailTypes.map((item) => (
        <Button
          key={item.key}
          block
          onClick={() => handleResend(item.key, item.isAppeal)}
          disabled={item.isAppeal ? !onResendAppealEmail || !item.canResend || item.status !== 'failed' || resendingKey !== null : !onResendEmail || !item.canResend || item.status !== 'failed' || resendingKey !== null}
          loading={resendingKey === item.key}
          style={!isClaimed ? { opacity: 0.5 } : undefined}
        >
          {getButtonText(item)}
        </Button>
      ))}
    </Space>
  )

  if (isMobile) {
    return (
      <Drawer
        title="Email Status"
        open={open}
        onClose={onClose}
        width="75%"
      >
        {content}
      </Drawer>
    )
  }

  return (
    <Modal
      title="Email Status"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <div style={{ padding: 16 }}>
        {content}
      </div>
    </Modal>
  )
}
