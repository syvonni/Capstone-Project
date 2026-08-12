import React, { useState, useEffect, useCallback } from 'react'
import { Button, Input, Space, Tooltip, Typography, Alert, theme, Result } from 'antd'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import {
  SafetyCertificateOutlined,
  MobileOutlined,
  CopyOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import QrDisplay from './QrDisplay.jsx'
import { useAuthSession, useMfaSetup } from '@/features/authentication/hooks'
import { usePasskeyManager } from '@/features/authentication/passkey/hooks/usePasskeyManager'
import { getProfile } from '@/features/authentication/services/authService'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

/**
 * @param {object} props
 * @param {() => void | Promise<void>} [props.onComplete] - Called when MFA is enabled (after profile refresh). Replaces redirect.
 * @param {() => void} [props.onSkip] - Called when user skips MFA setup (for business owners).
 * @param {boolean} [props.allowSkip] - Whether to show the skip button (for business owners).
 */
export default function MfaSetup({ onComplete }) {
  const { token } = theme.useToken()
  const { currentUser, role, login } = useAuthSession()
  const {
    loading, qrDataUrl, secret, code, setCode, enabled,
    handleSetup, handleVerify,
    showSecret, toggleShowSecret, handleCopy,
    markMfaComplete,
  } = useMfaSetup()
  const { handleRegister: registerPasskey, registering: passkeyRegistering } = usePasskeyManager()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isReturningUser, setIsReturningUser] = useState(false)

  const roleKey = String(role?.slug || role || '').toLowerCase()
  const isStaffRole = ['lgu_officer', 'inspector', 'staff'].includes(roleKey)
  const isAdmin = roleKey === 'admin'
  const needsOnboarding = (isStaffRole || isAdmin) && (!!currentUser?.mustSetupMfa || !!currentUser?.mustChangeCredentials)
  const postMfaTarget = React.useMemo(() => {
    if (isAdmin) return currentUser?.mustChangeCredentials ? '/admin/onboarding' : '/admin/dashboard'
    return needsOnboarding ? '/staff/onboarding' : null
  }, [isAdmin, currentUser?.mustChangeCredentials, needsOnboarding])

  const [navigating, setNavigating] = useState(false)
  const handleBackToSecureAccount = useCallback(() => {
    setCurrentStep(0)
  }, [])
  const handleShowVerifyStep = useCallback(() => setCurrentStep(2), [])
  const handleBackToQrStep = useCallback(() => setCurrentStep(1), [])
  const handleOtpChange = useCallback((val) => {
    const numericValue = String(val || '').replace(/[^0-9]/g, '').slice(0, 6)
    setCode(numericValue)
  }, [setCode])
  const handleOtpPaste = useCallback((e) => {
    e.preventDefault()
    const pastedText = (e.clipboardData || window.clipboardData).getData('text')
    const numericOnly = pastedText.replace(/[^0-9]/g, '').slice(0, 6)
    if (numericOnly) {
      setCode(numericOnly)
    }
  }, [setCode])
  const handleOtpKeyDown = useCallback((e) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    if (allowedKeys.includes(e.key)) return
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const refreshAndContinue = React.useCallback(async () => {
    setNavigating(true)
    try {
      const fresh = await getProfile()
      const merged = { ...currentUser, ...fresh, token: currentUser?.token }
      if (merged.mfaEnabled === true) {
        merged.mfaReenrollmentRequired = false
        merged.mfaReEnrollmentRequired = false
      }
      const remember = !!localStorage.getItem('auth__currentUser')
      login(merged, { remember })
      if (typeof onComplete === 'function') {
        onComplete()
      } else if (postMfaTarget) {
        window.location.assign(postMfaTarget)
      } else {
        navigate(-1)
      }
    } catch (e) {
      console.error('[MfaSetup] Failed to refresh profile', e)
      if (typeof onComplete === 'function') onComplete()
      else if (postMfaTarget) window.location.assign(postMfaTarget)
      else navigate(-1)
    } finally {
      setNavigating(false)
    }
  }, [onComplete, postMfaTarget, navigate, currentUser, login])

  const goToPostMfa = refreshAndContinue

  // Sync step with state and detect returning users.
  // Important: do not depend on currentStep here, otherwise pressing Back from
  // Scan QR (step 1) to intro (step 0) immediately auto-jumps to step 1 again
  // when a secret already exists.
  useEffect(() => {
    if (enabled) {
      // Check if this is a returning user (MFA already enabled before this page load)
      const wasEnabledInitially = currentUser?.mfaEnabled === true
      setIsReturningUser(wasEnabledInitially)
      setCurrentStep(wasEnabledInitially ? 4 : 3) // 4=management, 3=completed
    } else if (secret) {
      setCurrentStep((prev) => (prev === 0 ? 1 : prev)) // Move to scan once if secret exists
    } else {
      setCurrentStep(0) // Reset to start if no secret and disabled
      setIsReturningUser(false)
    }
  }, [enabled, secret, currentUser?.mfaEnabled])

  const onSetupClick = async () => {
    await handleSetup()
    setCurrentStep(1)
  }

  const onPasskeySetup = async () => {
    const success = await registerPasskey()
    if (!success) return
    try {
      const fresh = await getProfile()
      const raw = localStorage.getItem('auth__currentUser')
      const remember = !!raw
      const merged = { ...currentUser, ...fresh, token: currentUser?.token }
      if (merged.mfaEnabled === true) {
        merged.mfaReenrollmentRequired = false
        merged.mfaReEnrollmentRequired = false
      }
      login(merged, { remember })
      markMfaComplete()
      goToPostMfa()
    } catch (e) {
      console.error('Failed to refresh session after passkey registration', e)
      markMfaComplete()
      goToPostMfa()
    }
  }

  const handleVerifyAndContinue = async () => {
    const ok = await handleVerify()
    if (!ok) return
    goToPostMfa()
  }

  const renderContent = () => {
    // STATE: MANAGEMENT (Step 4) - For returning users who already have MFA enabled
    if (enabled && isReturningUser) {
      return (
        <div style={{ padding: '24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <SafetyCertificateOutlined style={{ fontSize: 32, color: token.colorSuccess }} />
            <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>Two-Factor Authentication Active</Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Your account is already protected with two-factor authentication. You can change it again below.
            </Paragraph>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button
              type="primary"
              onClick={onSetupClick}
              loading={loading}
              block
            >
              Set up New Authenticator
            </Button>
            <Button
              type="default"
              onClick={onPasskeySetup}
              loading={passkeyRegistering}
              block
            >
              Add Passkey
            </Button>
          </Space>
        </div>
      )
    }

    // STATE: ENABLED (Step 3) - For first-time setup completion
    if (enabled) {
      return (
        <Result
          status="success"
          title="Two-Factor Authentication Enabled"
          subTitle="Your account is now secured. You will need your authenticator app or passkey when signing in."
          extra={[
            <Button type="primary" key="continue" onClick={() => goToPostMfa()} loading={navigating} disabled={navigating} block>
              {postMfaTarget ? (isAdmin ? 'Go to Admin Dashboard' : 'Continue Onboarding') : 'Return to Settings'}
            </Button>,
          ]}
        />
      )
    }

    // STATE: STEP 0 - INTRO: choose authenticator app or passkey
    if (currentStep === 0) {
      return (
        <div style={{ padding: '24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={4} style={{ marginBottom: 8 }}>Secure Your Account</Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Protect your account from unauthorized access. This takes less than a minute.
            </Paragraph>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button
              type="primary"
              onClick={onPasskeySetup}
              loading={passkeyRegistering}
              icon={<KeyOutlined />}
              block
            >
              Use passkey
            </Button>
            <Button
              type="default"
              onClick={onSetupClick}
              loading={loading}
              icon={<MobileOutlined />}
              block
            >
              Use authenticator app
            </Button>
          </Space>
        </div>
      )
    }

    // STATE: STEP 1 - SCAN QR
    if (currentStep === 1) {
      return (
        <div style={{ padding: '0 12px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={4} style={{ marginBottom: 8 }}>Scan QR Code</Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Open your authenticator app and scan the code below.
            </Paragraph>
          </div>

          <div style={{
            padding: 24,
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 32,
          }}>
            {loading ? <LottieSpinner /> : <QrDisplay dataUrl={qrDataUrl} size={200} />}
          </div>

          <div style={{ marginBottom: 32 }}>
             <Alert
               message={
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <Text strong style={{ color: token.colorPrimary }}>Can&apos;t scan the code?</Text>
                   <Button type="link" size="small" onClick={toggleShowSecret}>
                     {showSecret ? 'Hide Key' : 'View Key'}
                   </Button>
                 </div>
               }
               description={showSecret && (
                 <div style={{ marginTop: 12 }}>
                   <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                     Enter this setup key manually in your app:
                   </Paragraph>
                   <Input.Search
                      readOnly
                      value={secret}
                      onSearch={handleCopy}
                      enterButton={<Tooltip title="Copy"><CopyOutlined /></Tooltip>}
                   />
                 </div>
               )}
               type="info"
               showIcon={false}
               style={{ border: 'none', background: token.colorInfoBg }}
             />
          </div>

          <Space style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
            <Button onClick={handleBackToSecureAccount}>
              Back
            </Button>
            <Button type="primary" onClick={handleShowVerifyStep}>
              Next Step
            </Button>
          </Space>
        </div>
      )
    }

    // STATE: STEP 2 - VERIFY
    if (currentStep === 2) {
      return (
        <div style={{ padding: '0 12px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={4} style={{ marginBottom: 8 }}>Verify Code</Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Enter the 6-digit code generated by your authenticator app.
            </Paragraph>
          </div>

          <div style={{ maxWidth: 320, margin: '0 auto 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <Input.OTP
                aria-label="Verification code"
                length={6}
                value={code}
                onChange={handleOtpChange}
                onKeyDown={handleOtpKeyDown}
                onPaste={handleOtpPaste}
                inputType="numeric"
                mask={false}
                style={{ width: '100%', maxWidth: 280, justifyContent: 'center', gap: 8 }}
              />
            </div>
          </div>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              block
              onClick={handleVerifyAndContinue}
              disabled={code.length !== 6 || loading}
              loading={loading}
            >
              Verify & Enable
            </Button>
            <Button type="text" block onClick={handleBackToQrStep}>
              Back to QR Code
            </Button>
          </Space>
        </div>
      )
    }
  }

  return (
    <div style={{ width: '100%', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 300,
          overflow: 'hidden',
          padding: 24,
        }}
      >
        {renderContent()}
      </div>
    </div>
  )
}
