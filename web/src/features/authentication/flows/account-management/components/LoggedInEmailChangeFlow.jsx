import { useEffect, useRef, useState } from 'react'
import { Result, Button, Typography, Alert } from 'antd'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import { ChangeEmailForm, VerificationForm, EmailChangeGracePeriod } from "@/features/authentication"
import { useLoggedInEmailChangeFlow } from "../hooks/useLoggedInEmailChangeFlow.js"
import { useSendCodeForCurrentUserConfirm } from "../hooks/useSendCodeForCurrentUserConfirm.js"
import { useResendEmailChangeCode } from "../hooks/useResendEmailChangeCode.js"
import { changeEmailConfirmPasskeyStart, changeEmailConfirmVerify } from '@/features/authentication/services'
import { authenticateComplete } from '@/features/authentication/services/webauthnService'
import { base64ToBuffer, bufferToBase64 } from '@/features/authentication/lib/webauthnBuffers'

export default function LoggedInEmailChangeFlow({ onBackToStart } = {}) {
  const { step, sendProps, totpVerifyProps, verifyProps, changeProps, verifyNewProps, reset, totpEnabled, setStep } = useLoggedInEmailChangeFlow()
  const { isSending, handleSend } = useSendCodeForCurrentUserConfirm({ email: sendProps.email, onSent: sendProps.onSent })
  const resendHook = useResendEmailChangeCode({ email: verifyProps.email })
  const sendTriggeredRef = useRef(false)
  const [isPasskeyVerifying, setIsPasskeyVerifying] = useState(false)
  const [passkeyError, setPasskeyError] = useState('')
  const [stepKey, setStepKey] = useState(0)
  const showBack = typeof onBackToStart === 'function'
  const isTotpUser = totpEnabled // User has TOTP MFA enabled

  // Trigger fade animation when step changes
  useEffect(() => {
    setStepKey(prev => prev + 1)
  }, [step])

  const verifyPasskeyForEmailChange = async () => {
    const start = await changeEmailConfirmPasskeyStart()
    const pub = start?.publicKey
    if (!pub?.challenge) throw new Error('Invalid passkey challenge')

    const publicKey = {
      ...pub,
      challenge: base64ToBuffer(pub.challenge),
    }

    if (pub.allowCredentials?.length) {
      publicKey.allowCredentials = pub.allowCredentials.map((c) => ({
        ...c,
        id: base64ToBuffer(c.id),
      }))
    }

    const cred = await navigator.credentials.get({ publicKey })
    if (!cred?.response) throw new Error('Passkey verification was cancelled or timed out')

    const resp = cred.response
    await authenticateComplete({
      credential: {
        id: cred.id,
        rawId: bufferToBase64(cred.rawId),
        type: cred.type,
        response: {
          clientDataJSON: bufferToBase64(resp.clientDataJSON),
          authenticatorData: bufferToBase64(resp.authenticatorData),
          signature: bufferToBase64(resp.signature),
          userHandle: resp.userHandle ? bufferToBase64(resp.userHandle) : null,
        },
      },
      purpose: 'email_change',
    })

    await changeEmailConfirmVerify({ code: 'PASSKEY_BYPASS' })
  }

  useEffect(() => {
    if (step !== 'send' || !sendProps.email || sendTriggeredRef.current) return
    
    const checkVerificationMethod = async () => {
      sendTriggeredRef.current = true
      
      // If user has TOTP enabled, skip email sending and go directly to TOTP verification
      if (isTotpUser) {
        setStep('totp-verify')
        return
      }
      
      const result = await handleSend()

      if (result?.success && result?.passkeyBypass) {
        try {
          setIsPasskeyVerifying(true)
          setPasskeyError('')
          await verifyPasskeyForEmailChange()
          setStep('change')
        } catch (err) {
          console.error('Passkey verification for email change failed:', err)
          setPasskeyError(err?.message || 'Passkey verification failed. Please try again.')
          sendTriggeredRef.current = false
          setStep('send')
        } finally {
          setIsPasskeyVerifying(false)
        }
      }
    }
    
    checkVerificationMethod()
  }, [step, sendProps.email, handleSend, isTotpUser, setStep])

  return (
    <div
      key={stepKey}
      style={{
        width: '100%',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <div style={{ maxWidth: 300, width: '100%', margin: '0 auto' }}>
      <div>
        {step === 'send' && (
          <div style={{ maxWidth: 300, width: '100%', margin: '0 auto' }}>
            {isSending || isPasskeyVerifying ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <LottieSpinner size="large" />
                <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
                  {isPasskeyVerifying
                    ? 'Confirm the passkey prompt to continue...'
                    : (isTotpUser ? 'Preparing verification...' : 'Sending verification code to your email…')}
                </Typography.Paragraph>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <Typography.Title level={4} style={{ margin: '0 0 8px' }}>
                    Change Email
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                    Your identity will be verified before you can change your email.
                  </Typography.Paragraph>
                </div>

                {passkeyError && (
                  <Alert
                    type="error"
                    showIcon
                    message={passkeyError}
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Button
                  type="primary"
                  onClick={() => {
                    sendTriggeredRef.current = false
                    setPasskeyError('')
                    handleSend()
                  }}
                  loading={isSending}
                  block
                >
                  {passkeyError ? 'Try again' : 'Continue'}
                </Button>

                {showBack && (
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Button type="text" onClick={onBackToStart} style={{ padding: 0 }}>
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 'totp-verify' && (
          <VerificationForm
            email={totpVerifyProps.email}
            onSubmit={totpVerifyProps.onVerified}
            title="Verify Your Identity"
            description="Enter the authentication code from your authenticator app to continue with email change."
            verificationType="email-change-totp"
            onBack={onBackToStart}
          />
        )}

        {step === 'verify' && (
          <VerificationForm
            email={verifyProps.email}
            onSubmit={verifyProps.onSubmit}
            title="Enter verification code"
            onBack={onBackToStart}
            onResend={resendHook.handleResend}
            isResending={resendHook.isSending}
            isCooling={resendHook.isCooling}
            remaining={resendHook.remaining}
            verificationType="email"
            maxWidth={400}
          />
        )}

        {step === 'change' && (
          <ChangeEmailForm
            currentEmail={changeProps.email}
            resetToken={changeProps.resetToken}
            onSubmit={changeProps.onSubmit}
          />
        )}

        {step === 'verifyNew' && (
          <VerificationForm
            email={verifyNewProps.email}
            currentEmail={verifyNewProps.currentEmail}
            onSubmit={verifyNewProps.onSubmit}
            title="Confirm new email"
            verificationType="email-change"
            maxWidth={400}
            onResend={resendHook.handleResend}
            isResending={resendHook.isSending}
            isCooling={resendHook.isCooling}
            remaining={resendHook.remaining}
          />
        )}

        {step === 'done' && (
          <div>
            <Result
              status="success"
              title="Email Address Updated"
              subTitle={
                <span>
                  Your email has been successfully updated to <strong>{verifyNewProps?.email || ''}</strong>.
                  <br />Please use this email for future logins.
                </span>
              }
              extra={[
                <Button type="primary" key="done" onClick={() => (typeof onBackToStart === 'function' ? onBackToStart() : reset())}>
                  Done
                </Button>,
              ]}
            />
            <EmailChangeGracePeriod onReverted={reset} />
          </div>
        )}
      </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}