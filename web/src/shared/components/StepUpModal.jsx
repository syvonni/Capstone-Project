import { useState } from 'react'
import { Modal, Input, Button, Typography, Alert, Space, theme } from 'antd'
import { KeyOutlined } from '@ant-design/icons'
import { stepUpWithTotp, stepUpWithPasskey } from '@/shared/services/stepUpService'
import { useNotifier } from '@/shared/notifications'

const { Text } = Typography

/**
 * Modal for step-up authentication (TOTP or passkey).
 * Generic component used by both admin and staff roles.
 * @param {boolean} open
 * @param {() => void} onCancel
 * @param {(stepUpToken: string) => void} onVerified - called with stepUpToken on success
 * @param {'authenticator'|'passkey'} mfaMethod - current user's super-auth method
 */
export default function StepUpModal({ open, onCancel, onVerified, mfaMethod = 'authenticator' }) {
  const { error: notifyError } = useNotifier()
  const { token } = theme.useToken()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const methodLower = String(mfaMethod || '').toLowerCase()
  const isPasskey = methodLower.includes('passkey') || methodLower.includes('webauthn')

  const handleTotpSubmit = async () => {
    const trimmed = String(code || '').trim()
    if (!/^[0-9]{6}$/.test(trimmed)) {
      setError('Enter a 6-digit code from your authenticator app')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const data = await stepUpWithTotp(trimmed)
      if (data?.stepUpToken) {
        onVerified?.(data.stepUpToken)
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (e) {
      const msg = e?.message || e?.originalError?.error?.message || 'Verification failed'
      setError(msg)
      notifyError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePasskeyClick = async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await stepUpWithPasskey()
      if (data?.stepUpToken) {
        onVerified?.(data.stepUpToken)
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (e) {
      const msg = e?.message || e?.originalError?.error?.message || 'Passkey verification failed'
      setError(msg)
      notifyError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setError(null)
    onCancel?.()
  }

  return (
    <Modal
      title="Confirm your identity"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
      closable
      width={400}
      zIndex={10000}
      getContainer={false}
      styles={{
        header: { background: token.colorBgContainer },
        content: { background: token.colorBgContainer },
        body: { background: token.colorBgContainer },
        container: { background: token.colorBgContainer },
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text type="secondary">
            {isPasskey
              ? 'Use your passkey to confirm your identity.'
              : 'Enter the 6-digit code from your authenticator app to confirm your identity.'}
          </Text>
          {error && <Alert type="error" message={error} showIcon />}
          {isPasskey ? (
            <Button
              type="primary"
              block
              loading={loading}
              onClick={handlePasskeyClick}
            >
              Use passkey
            </Button>
          ) : (
            <>
              <Input
                prefix={<KeyOutlined />}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onPressEnter={handleTotpSubmit}
                maxLength={6}
                autoComplete="one-time-code"
              />
              <Button type="primary" block loading={loading} onClick={handleTotpSubmit}>
                Verify
              </Button>
            </>
          )}
        </Space>
    </Modal>
  )
}
