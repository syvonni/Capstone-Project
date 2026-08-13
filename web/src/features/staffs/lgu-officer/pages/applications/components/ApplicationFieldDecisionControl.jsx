import { useState } from 'react'
import { Typography, Space, Input, Button, Tooltip } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input

export default function FieldDecisionControl({ fieldKey, decision, onAccept, onReject, _token, disabled = false, isMobile = false, block = false, hideRequest = false, isFinalState = false, isResubmit = false }) {
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestReason, setRequestReason] = useState('')

  const shouldFill = isMobile || block

  // Format decision author info
  const getDecisionAuthorText = () => {
    if (!decision?.decidedAt) return null
    const decidedBy = decision?.decidedByName || decision?.decidedBy || 'Officer'
    const decidedAt = new Date(decision.decidedAt)
    const time = decidedAt.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    const date = decidedAt.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const actionText = decision.status === 'accepted' ? 'Approved' : decision.status === 'request_changes' ? 'Requested changes' : 'Decided'
    return `${actionText} by ${decidedBy} at ${time} on ${date}`
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
        <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{authorText}</Text>
      ) : null
    }

    if (isRequestChange) {
      return authorText ? (
        <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{authorText}</Text>
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
      <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{authorText}</Text>
    )
  }

  // When accepted, only show undo button
  if (isAccepted) {
    const authorText = getDecisionAuthorText()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: shouldFill ? '100%' : 'auto' }}>
        <Tooltip title="Undo approval">
          <Button
            type="default"
            block
            onClick={handleClearDecision}
            icon={<CloseOutlined />}
            style={{ width: shouldFill ? '100%' : 'auto' }}
          >
            Undo Approval
          </Button>
        </Tooltip>
        {authorText && (
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{authorText}</Text>
        )}
      </div>
    )
  }

  // When request changes, show undo button
  if (isRequestChange) {
    const authorText = getDecisionAuthorText()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: shouldFill ? '100%' : 'auto' }}>
        <Tooltip title="Undo request change">
          <Button
            type="default"
            block
            onClick={handleClearDecision}
            icon={<CloseOutlined />}
            style={{ width: shouldFill ? '100%' : 'auto' }}
          >
            Undo Request Change
          </Button>
        </Tooltip>
        {authorText && (
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{authorText}</Text>
        )}
      </div>
    )
  }

  return (
    <>
      <Space.Compact size={4} style={{ width: shouldFill ? '100%' : 'auto' }}>
        <Tooltip title="Accept field">
          <Button
            type="default"
            block
            onClick={handleAcceptClick}
            icon={<CheckOutlined />}
            style={{ flex: shouldFill ? 1 : 'auto' }}
          >
            Accept
          </Button>
        </Tooltip>
        {!hideRequest && (
          <Tooltip title={isResubmit ? 'Request changes is not available for resubmitted applications' : 'Request changes'}>
            <Button
              type={isRequestChange ? 'primary' : 'default'}
              icon={<EditOutlined />}
              block
              onClick={() => setRequestOpen(true)}
              disabled={isResubmit}
              style={{ flex: shouldFill ? 1 : 'auto' }}
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
        footer={
          <Button
            key="confirm"
            type="primary"
            onClick={handleConfirmRequest}
            disabled={!requestReason?.trim()}
          >
            Confirm Request
          </Button>
        }
      >
        {requestContent}
      </ResponsiveModal>
    </>
  )
}
