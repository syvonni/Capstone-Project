import { useState } from 'react'
import { Typography, Space, Input, Button, Tooltip } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { CheckOutlined, CloseOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input

export default function FieldDecisionControl({ fieldKey, decision, onAccept, onReject, _token, disabled = false, isMobile = false, hideRequest = false, isFinalState = false, isResubmit = false }) {
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [viewReasonOpen, setViewReasonOpen] = useState(false)

  // Format decision author info
  const getDecisionAuthorText = () => {
    if (!decision?.decidedAt) return null
    const decidedBy = decision?.decidedByName || decision?.decidedBy || 'Officer'
    const time = new Date(decision.decidedAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const actionText = decision.status === 'accepted' ? 'Approved' : decision.status === 'request_changes' ? 'Requested changes' : 'Decided'
    return `${actionText} by ${decidedBy} at ${time}`
  }

  const handleConfirmRequest = () => {
    if (!requestReason?.trim()) return
    onReject(fieldKey, { status: 'request_changes', reasonCode: undefined, reasonOther: requestReason?.trim() })
    setRequestOpen(false)
    setRequestReason('')
  }

  const handleCancelRequest = () => {
    setRequestOpen(false)
    setRequestReason('')
  }

  if (disabled) {
    if (!decision) {
      return (
        <Text type="secondary" style={{ fontSize: 11 }}>Pending Review</Text>
      )
    }

    const isAccepted = decision.status === 'accepted'
    const isRequestChange = decision.status === 'request_changes'
    const authorText = getDecisionAuthorText()

    if (isAccepted) {
      return authorText ? (
        <Text type="secondary" style={{ fontSize: 11 }}>{authorText}</Text>
      ) : null
    }

    if (isRequestChange) {
      return authorText ? (
        <Text type="secondary" style={{ fontSize: 11 }}>{authorText}</Text>
      ) : null
    }

    return null
  }

  const requestContent = (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Text>
        Describe why this field needs changes. The applicant will be required to address this feedback.
      </Text>
      <TextArea
        placeholder="Enter your reason for requesting changes (required)"
        value={requestReason}
        onChange={(e) => setRequestReason(e.target.value)}
        rows={4}
      />
    </Space>
  )

  const isAccepted = decision?.status === 'accepted'
  const isRequestChange = decision?.status === 'request_changes'

  const handleAcceptClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onAccept(fieldKey, { status: 'accepted' })
  }

  const handleClearDecision = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onAccept(fieldKey, { status: null })
  }

  // When in final state, show only author stamp (no buttons)
  if (isFinalState) {
    const authorText = getDecisionAuthorText()
    if (!authorText) return null
    return (
      <Text type="secondary" style={{ fontSize: 11 }}>{authorText}</Text>
    )
  }

  // When accepted, only show undo button
  if (isAccepted) {
    const authorText = getDecisionAuthorText()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Tooltip title="Undo approval">
          <Button
            type="default"
            onClick={handleClearDecision}
            icon={<CloseOutlined />}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            Undo Approval
          </Button>
        </Tooltip>
        {authorText && (
          <Text type="secondary" style={{ fontSize: 11 }}>{authorText}</Text>
        )}
      </div>
    )
  }

  // When request changes, show undo and view reason buttons
  if (isRequestChange) {
    const authorText = getDecisionAuthorText()
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Space.Compact size={4} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Tooltip title="Undo request change">
              <Button
                type="default"
                onClick={handleClearDecision}
                icon={<CloseOutlined />}
                style={{ flex: isMobile ? 1 : 'auto' }}
              >
                Undo Request Change
              </Button>
            </Tooltip>
            <Tooltip title="View reason">
              <Button
                type="default"
                onClick={() => setViewReasonOpen(true)}
                icon={<EyeOutlined />}
                style={{ flex: isMobile ? 1 : 'auto' }}
              >
                View Reason
              </Button>
            </Tooltip>
          </Space.Compact>
          {authorText && (
            <Text type="secondary" style={{ fontSize: 11 }}>{authorText}</Text>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <Space.Compact size={4} style={{ width: isMobile ? '100%' : 'auto' }}>
        <Tooltip title="Accept field">
          <Button
            type="default"
            onClick={handleAcceptClick}
            icon={<CheckOutlined />}
            style={{ flex: isMobile ? 1 : 'auto' }}
          >
            Accept
          </Button>
        </Tooltip>
        {!hideRequest && (
          <Tooltip title={isResubmit ? 'Request changes is not available for resubmitted applications' : 'Request changes'}>
            <Button
              type={isRequestChange ? 'primary' : 'default'}
              icon={<EditOutlined />}
              onClick={() => setRequestOpen(true)}
              disabled={isResubmit}
              style={{ flex: isMobile ? 1 : 'auto' }}
            >
              Request
            </Button>
          </Tooltip>
        )}
      </Space.Compact>
      <ResponsiveModal
        open={requestOpen}
        onCancel={handleCancelRequest}
        title="Request Changes"
        width={520}
        footer={[
          <Button key="cancel" onClick={handleCancelRequest}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handleConfirmRequest}
            disabled={!requestReason?.trim()}
          >
            Confirm Request
          </Button>,
        ]}
      >
        {requestContent}
      </ResponsiveModal>
      <ResponsiveModal
        open={viewReasonOpen}
        onCancel={() => setViewReasonOpen(false)}
        title="Request Change Reason"
        width={520}
        footer={<Button onClick={() => setViewReasonOpen(false)}>Close</Button>}
      >
        <Text>{decision?.requestOther || decision?.requestCode || 'No reason provided'}</Text>
      </ResponsiveModal>
    </>
  )
}
