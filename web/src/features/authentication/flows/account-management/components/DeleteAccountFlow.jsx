import { useState, useEffect } from 'react'
import { Result, Button, Typography, Alert } from 'antd'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import { useLoggedInDeleteAccountFlow } from "../hooks/useLoggedInDeleteAccountFlow.js"
import { useSendDeleteAccountCode } from "../hooks/useSendDeleteAccountCode.js"
import { useResendDeleteAccountCode } from "../hooks/useResendDeleteAccountCode.js"
import VerificationForm from '@/features/authentication/components/VerificationForm.jsx'
import ConfirmDeleteAccountForm from './ConfirmDeleteAccountForm.jsx'
import { deleteAccountPasskeyStart, deleteAccountVerifyCode } from '@/features/authentication/services'
import { authenticateComplete } from '@/features/authentication/services/webauthnService'
import { base64ToBuffer, bufferToBase64 } from '@/features/authentication/lib/webauthnBuffers'

export default function DeleteAccountFlow({ onBackToStart } = {}) {
  const { step, sendProps, totpVerifyProps, verifyProps, confirmProps, reset, totpEnabled, setStep } = useLoggedInDeleteAccountFlow()
  const { isSending, handleSend } = useSendDeleteAccountCode({ email: sendProps.email, onSent: sendProps.onSent })
  const resendHook = useResendDeleteAccountCode({ email: verifyProps.email })
  const [passkeyError, setPasskeyError] = useState('')
  const [isPasskeyVerifying, setIsPasskeyVerifying] = useState(false)
  const [stepKey, setStepKey] = useState(0)
  const showBack = typeof onBackToStart === 'function'
  const isTotpUser = totpEnabled

  // Trigger fade animation when step changes
  useEffect(() => {
    setStepKey(prev => prev + 1)
  }, [step])

  const verifyPasskeyForDeleteAccount = async () => {
    const start = await deleteAccountPasskeyStart()
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
      purpose: 'delete_account',
    })
  }

  const beginVerification = async () => {
    if (isTotpUser) {
      setPasskeyError('')
      setStep('totp-verify')
      return
    }

    const result = await handleSend()

    if (result?.success && result?.passkeyBypass) {
      try {
        setIsPasskeyVerifying(true)
        setPasskeyError('')
        await verifyPasskeyForDeleteAccount()
        const bypassResult = await deleteAccountVerifyCode({ email: sendProps.email, code: 'PASSKEY_BYPASS' })
        await verifyProps.onSubmit({ email: sendProps.email, deleteToken: bypassResult?.deleteToken })
      } catch (err) {
        console.error('Passkey verification for delete account failed:', err)
        setPasskeyError(err?.message || 'Passkey verification failed. Please try again.')
        setStep('send')
      } finally {
        setIsPasskeyVerifying(false)
      }
    }
  }

  return (
    <div
      key={stepKey}
      style={{
        width: '100%',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
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
                Delete Account
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                Your account will be scheduled for deletion. You have 30 days to cancel this request.
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
              danger
              onClick={() => {
                setPasskeyError('')
                beginVerification()
              }}
              loading={isSending || isPasskeyVerifying}
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
          description="Enter the authentication code from your authenticator app to continue with account deletion."
          verificationType="delete-totp"
          onBack={showBack ? onBackToStart : reset}
        />
      )}

      {step === 'verify' && (
        <VerificationForm
          email={verifyProps.email}
          onSubmit={verifyProps.onSubmit}
          title="Enter verification code"
          verificationType="delete-account"
          dangerButton={true}
          maxWidth={420}
          onResend={resendHook.handleResend}
          isResending={resendHook.isSending}
          isCooling={resendHook.isCooling}
          remaining={resendHook.remaining}
        />
      )}

      {step === 'confirm' && (
        <ConfirmDeleteAccountForm
          email={confirmProps.email}
          deleteToken={confirmProps.deleteToken}
          onSubmit={confirmProps.onSubmit}
        />
      )}

      {step === 'done' && (
        <div style={{ maxWidth: 300, width: '100%', margin: '0 auto' }}>
        <Result
          status="success"
          title="Account Deletion Scheduled"
          subTitle="Your account access is scheduled for removal after the grace period. You will receive a confirmation email shortly, and records required for BPLO, legal, audit, or government record-keeping purposes may be retained."
          extra={[
            <Button type="primary" key="done" onClick={() => (typeof onBackToStart === 'function' ? onBackToStart() : reset())}>
              Done
            </Button>,
          ]}
        />
      </div>
      )}
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