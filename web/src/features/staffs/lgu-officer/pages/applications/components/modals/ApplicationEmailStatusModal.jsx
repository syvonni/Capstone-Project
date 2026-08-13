import { Button, Empty, Space, Tag, Typography, Tooltip, Card, message } from 'antd'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

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

  // Build the list of attempted email types with their metadata
  const emailTypes = useMemo(() => {
    const baseTypes = [
      {
        key: 'submitted',
        label: 'Application Submission',
        canResend: true,
        isAppeal: false,
      },
      {
        key: 'resubmitted',
        label: 'Application Resubmission',
        canResend: true,
        isAppeal: false,
        showWhen: localEmailSendStatus.returned?.status === 'sent',
      },
      {
        key: 'rejected',
        label: 'Rejected Application',
        canResend: isRejected,
        isAppeal: false,
      },
      {
        key: 'returned',
        label: 'Returned Application',
        canResend: isReturned,
        isAppeal: false,
      },
      {
        key: 'appeal_submitted',
        label: 'Appeal Submission',
        canResend: !!appealId,
        isAppeal: true,
      },
      {
        key: 'appeal_approved',
        label: 'Appeal Approval',
        canResend: !!appealId,
        isAppeal: true,
      },
      {
        key: 'appeal_denied',
        label: 'Appeal Denial',
        canResend: !!appealId,
        isAppeal: true,
      },
      {
        key: 'approved',
        label: 'Approved Application',
        canResend: isApproved,
        isAppeal: false,
      },
    ]

    const attempted = baseTypes
      .map((type) => {
        const meta = localEmailSendStatus[type.key] || {}
        return {
          ...type,
          ...meta,
        }
      })
      .filter((item) => {
        // Filter out emails that haven't been attempted (status is null or pending)
        if (!item.status || item.status === 'pending') return false
        // Filter out resubmitted if application wasn't returned first
        if (item.key === 'resubmitted' && !item.showWhen) return false
        return true
      })

    // Most recent attempts first
    return attempted.sort((a, b) => {
      const aTime = a.lastAttempt ? new Date(a.lastAttempt).getTime() : 0
      const bTime = b.lastAttempt ? new Date(b.lastAttempt).getTime() : 0
      return bTime - aTime
    })
  }, [localEmailSendStatus, appealId, isApproved, isRejected, isReturned])

  const getStatusColor = (status) => {
    if (status === 'sent') return 'green'
    if (status === 'failed') return 'red'
    return 'default'
  }

  const getResendLabel = (status) => {
    if (status === 'failed') return 'Retry'
    return 'Resend'
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
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      {emailTypes.map((item) => {
        const statusColor = getStatusColor(item.status)
        const actionHandler = item.isAppeal ? onResendAppealEmail : onResendEmail
        const canAction = isClaimed && actionHandler && resendingKey === null

        const statusLabel = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : ''

        const primaryText = (
          <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Text>{item.label}</Text>
            <Tag color={statusColor}>{statusLabel}</Tag>
          </Space>
        )

        const metaLines = [
          item.lastAttempt && (
            <Text key="lastAttempt" type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {item.status === 'sent' ? 'Sent' : 'Last attempt'}:
              {' '}{dayjs(item.lastAttempt).format('MMM D, YYYY h:mm A')}
            </Text>
          ),
          (item.retryCount > 0) && (
            <Text key="retryCount" type="secondary" style={{ display: 'block', fontSize: 12 }}>
              Attempt {item.retryCount}
            </Text>
          ),
          (item.to || item.provider) && (
            <Text key="toProvider" type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
              {item.to && `To: ${item.to}`}
              {item.to && item.provider && ' · '}
            </Text>
          ),
        ].filter(Boolean)

        const actionButton = (
          <Button
            block
            type={item.status === 'failed' ? 'primary' : 'default'}
            danger={item.status === 'failed'}
            loading={resendingKey === item.key}
            disabled={!canAction}
            onClick={() => handleResend(item.key, item.isAppeal)}
          >
            {resendingKey === item.key ? 'Sending...' : getResendLabel(item.status)}
          </Button>
        )

        const cardContent = (
          <Card
            key={item.key}
            size="small"
            style={{ width: '100%' }}
          >
            <Space orientation="vertical" size={2} style={{ width: '100%' }}>
              {primaryText}
              <div>
                {metaLines}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {actionButton}
              </div>
            </Space>
          </Card>
        )

        // For failed emails, wrap the card in a generic tooltip that explains
        // the retry action without surfacing raw provider errors in the UI.
        if (item.status === 'failed') {
          return (
            <Tooltip key={item.key} title="Send failed. Click Retry to attempt again." placement="topLeft">
              {cardContent}
            </Tooltip>
          )
        }

        return cardContent
      })}
    </Space>
  )

  return (
    <ResponsiveModal
      title="Email Status"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      {content}
    </ResponsiveModal>
  )
}
