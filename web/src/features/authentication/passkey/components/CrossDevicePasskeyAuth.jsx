import React from 'react'
import { Button, Space, Typography, Alert, theme } from 'antd'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import QrDisplay from '@/features/authentication/mfa/components/QrDisplay.jsx'
import useWebAuthn from '@/features/authentication/hooks/useWebAuthn.js'
import { useNotifier } from '@/shared/notifications.js'
import { useAuthSession } from '@/features/authentication/hooks'

const { Text } = Typography
const { useToken } = theme

export default function CrossDevicePasskeyAuth({ form, onAuthenticated, onCancel } = {}) {
  const { token } = useToken()
  const { authenticateCrossDevice, checkCrossDeviceStatus } = useWebAuthn()
  const { login } = useAuthSession()
  const { error: notifyError } = useNotifier()
  const [loading, setLoading] = React.useState(false)
  const [polling, setPolling] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [qrCodeData, setQrCodeData] = React.useState(null)
  const pollingIntervalRef = React.useRef(null)

  const [allowRegistration, setAllowRegistration] = React.useState(false)
  // Note: sessionId and pairingData are not stored in state as they're only used temporarily

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setPolling(false)
  }

  const startPolling = (sid) => {
    setPolling(true)
    
    // Poll every 2 seconds for authentication/registration status
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await checkCrossDeviceStatus({ sessionId: sid })
        
        // Check if backend returned an error response
        if (status?.ok === false || (status?.error && !status?.authenticated)) {
          stopPolling()
          // Extract error message from backend error format
          let errorMsg = 'Authentication failed. Please try again.'
          
          // Try multiple ways to extract error message
          if (status?.error) {
            if (typeof status.error === 'string') {
              errorMsg = status.error
            } else if (status.error?.message) {
              errorMsg = status.error.message
            } else if (status.error?.error) {
              if (typeof status.error.error === 'string') {
                errorMsg = status.error.error
              } else if (status.error.error?.message) {
                errorMsg = status.error.error.message
              } else if (status.error.error?.code) {
                // Map error codes to user-friendly messages
                const codeMap = {
                  'webauthn_verification_failed': 'Passkey verification failed. Please try scanning the QR code again.',
                  'webauthn_verification_exception': 'Registration failed. Please try scanning the QR code again.',
                  'webauthn_auth_failed': 'Authentication failed. Please try scanning the QR code again.',
                  'credential_not_found': 'Passkey not found. Please register a passkey first.',
                  'session_not_found': 'Session expired. Please scan the QR code again.',
                  'session_expired': 'Session expired. Please scan the QR code again.',
                  'challenge_missing': 'Session error. Please scan the QR code again.',
                  'webauthn_invalid_publickey': 'Invalid passkey format. Please try again.',
                }
                errorMsg = codeMap[status.error.error.code] || `Authentication error: ${status.error.error.code}`
              }
            }
          }
          
          // Also check for error at top level
          if (errorMsg === 'Authentication failed. Please try again.' && status?.message) {
            errorMsg = status.message
          }
          
          const finalErrorMsg = errorMsg.toLowerCase().includes('something went wrong') 
            ? 'Authentication failed. Please try scanning the QR code again.' 
            : errorMsg
          
          console.error('[CrossDevice] Backend returned error:', {
            status,
            extractedError: finalErrorMsg
          })
          
          setError(finalErrorMsg)
          notifyError(finalErrorMsg)
          return
        }
        
        if (status?.authenticated && status?.user) {
          stopPolling()
          const remember = !!form?.getFieldValue('rememberMe')
          
          if (status.registered) {
            // Passkey was just registered, now log the user in
          }
          // Login success shown on destination via navigate state (Option A)
          login(status.user, { remember })
          if (typeof onAuthenticated === 'function') {
            onAuthenticated(status.user)
          }
        }
        // If status is pending (authenticated: false, pending: true), continue polling
      } catch (e) {
        console.error('[CrossDevice] Polling error:', {
          error: e,
          message: e?.message,
          code: e?.code,
          originalError: e?.originalError
        })
        
        // Extract error message properly
        let errorMsg = e?.message || 'Failed to check authentication status. Please try again.'
        const errorCode = e?.code || 
                         e?.originalError?.error?.code || 
                         e?.originalError?.code ||
                         (e?.originalError?.error && typeof e.originalError.error === 'object' ? e.originalError.error.code : null)
        
        // Handle specific error codes
        if (errorCode === 'session_not_found' || errorCode === 'session_expired') {
          stopPolling()
          errorMsg = 'Session expired. Please scan the QR code again.'
          setError(errorMsg)
          notifyError(errorMsg)
        } else if (errorCode === 'cross_device_status_failed') {
          // Continue polling, might be temporary server issue
          console.warn('[CrossDevice] Status check failed, continuing to poll...')
        } else {
          // For other errors, continue polling but log them
          // Don't show error to user unless it's persistent
          // But ensure error message is never "Something went wrong"
          if (errorMsg.toLowerCase().includes('something went wrong')) {
            errorMsg = 'Failed to check authentication status. Please try again.'
          }
          console.warn('[CrossDevice] Polling encountered error, will retry:', errorMsg)
        }
      }
    }, 2000)
  }

  const startCrossDeviceAuth = async (allowReg = false) => {
    try {
      setLoading(true)
      setError(null)
      setQrCodeData(null)
      // Don't reset allowRegistration here - preserve it if we're in registration mode

      // Email is optional for passkey authentication
      // If email is provided, use it; otherwise, pass undefined for userless authentication
      const email = form?.getFieldValue('email') ? String(form.getFieldValue('email')).trim() : undefined

      // Start cross-device authentication (or registration if no passkeys)
      const result = await authenticateCrossDevice({ email, allowRegistration: allowReg })
      
      // Prefer backend-generated QR code image (Microsoft-compatible), fallback to URL string
      const hasQrCodeImage = result?.qrCodeImage && typeof result.qrCodeImage === 'string'
      const hasQrCodeUrl = (result?.qrCode || result?.qrCodeUrl) && result?.sessionId
      
      if ((hasQrCodeImage || hasQrCodeUrl) && result?.sessionId) {
        // Use backend-generated QR code image if available (Microsoft-compatible format)
        if (hasQrCodeImage) {
          setQrCodeData(result.qrCodeImage)
        } else {
          // Fallback: Use URL string (for backward compatibility or if image generation failed)
          const qrData = result.qrCode || result.qrCodeUrl
          
          // Verify URL format contains required parameters
          if (qrData && qrData.startsWith('http')) {
            try {
              new URL(qrData)
            } catch (e) {
              console.warn('[CrossDevice] QR data is not a valid URL:', e)
            }
          } else if (qrData && qrData.startsWith('{')) {
            // Fallback: JSON format (if backend still sends it)
            try {
              JSON.parse(qrData)
            } catch (e) {
              console.warn('[CrossDevice] QR data is not valid JSON or URL:', e)
            }
          }
          
          setQrCodeData(qrData)
        }
        
        // Store pairing data if available for debugging/display
        if (result.pairingData) {
          // Pairing data available for debugging (not stored in state as it's not displayed)
        }
        
        setAllowRegistration(allowReg) // Update state to match what we requested
        startPolling(result.sessionId, allowReg) // Pass registration flag to polling
      } else {
        throw new Error('Failed to generate QR code for cross-device authentication')
      }
    } catch (e) {
      let errMsg = e?.message || 'Failed to start cross-device authentication. Please try again.'
      
      // Check for specific error types - check code from multiple possible locations
      const errorCode = e?.code || 
                       e?.originalError?.error?.code || 
                       e?.originalError?.code ||
                       (e?.originalError?.error && typeof e.originalError.error === 'object' ? e.originalError.error.code : null)
      
      const errorMsgLower = errMsg.toLowerCase()
      const isNoPasskeysError = errorCode === 'no_passkeys' || 
          errorMsgLower.includes('no passkey') || 
          errorMsgLower.includes('no passkeys registered') ||
          errorMsgLower.includes('no passkeys registered for this user') ||
          errorMsgLower.includes('no passkeys registered for this')
      
      if (isNoPasskeysError && !allowReg) {
        // Allow registration during cross-device flow - show registration option
        // This is expected behavior, not an error
        // Update state - React will batch these updates
        setAllowRegistration(true) // Show registration button
        setError(null) // Clear error to show registration option instead
        setLoading(false) // Make sure loading state is cleared
        // Don't show error notification - this is expected when no passkeys exist
        return
      }
      
      // Only log and show error if it's not a "no passkeys" error or if we're already trying to register
      if (!isNoPasskeysError || allowReg) {
        console.error('Cross-device authentication start failed', e, { errorCode, errMsg, allowReg })
        setError(errMsg)
        notifyError(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    // Automatically start cross-device authentication when component mounts
    // This matches Microsoft's flow: QR code appears immediately when "Use a phone or tablet" is selected
    // First try authentication, if no passkeys exist, automatically switch to registration
    const attemptAuth = async () => {
      try {
        await startCrossDeviceAuth(false) // Start with authentication
      } catch (e) {
        // If authentication fails due to no passkeys, automatically start registration
        const errorCode = e?.code || 
                         e?.originalError?.error?.code || 
                         e?.originalError?.code ||
                         (e?.originalError?.error && typeof e.originalError.error === 'object' ? e.originalError.error.code : null)
        const errorMsgLower = (e?.message || '').toLowerCase()
        const isNoPasskeysError = errorCode === 'no_passkeys' || 
            errorMsgLower.includes('no passkey') || 
            errorMsgLower.includes('no passkeys registered')
        
        if (isNoPasskeysError) {
          // Automatically start registration flow if no passkeys exist
          await startCrossDeviceAuth(true) // Start registration
        }
      }
    }
    
    attemptAuth()
    
    return () => {
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {error && (
        <Alert
          message="Authentication Failed"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      <div style={{ textAlign: 'center' }}>
        {loading && !qrCodeData ? (
          <div style={{ padding: '40px 0' }}>
            <LottieSpinner size="large" />
            <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
              Generating QR code...
            </Text>
          </div>
        ) : qrCodeData ? (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 14 }}>
              {allowRegistration ? (
                <>Scan this QR code with your phone&apos;s camera or <strong>ID Melon Authenticator</strong> to <strong>register a passkey</strong> and sign in.</>
              ) : (
                <>Scan this QR code with your phone&apos;s camera or <strong>ID Melon Authenticator</strong> on your phone or tablet to <strong>sign in</strong>.</>
              )}
            </Text>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {(qrCodeData && typeof qrCodeData === 'string' && qrCodeData.includes('localhost')) && (
              <Alert
                message="Network Configuration Required"
                description={
                  <div>
                    <Text style={{ display: 'block', marginBottom: 8 }}>
                      The QR code uses <code>localhost</code>, which won&apos;t work on mobile devices.
                    </Text>
                    <Text style={{ display: 'block', marginBottom: 4 }}>
                      <strong>Solution:</strong>
                    </Text>
                    <Text style={{ display: 'block', marginBottom: 4 }}>
                      1. Make sure your mobile device and computer are on the same WiFi network
                    </Text>
                    <Text style={{ display: 'block', marginBottom: 4 }}>
                      2. Set <code>FRONTEND_URL</code> environment variable to your local IP (e.g., <code>http://192.168.1.100:5173</code>)
                    </Text>
                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: token.colorTextSecondary }}>
                      The backend should automatically detect your local IP in development mode.
                    </Text>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16, maxWidth: 400 }}
              />
            )}
            <QrDisplay dataUrl={qrCodeData} size={300} alt="Cross-device authentication QR code" />
            {polling && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LottieSpinner size="small" />
                <Text type="secondary">
                  {allowRegistration 
                    ? 'Registering passkey and signing you in...' 
                    : 'Waiting for approval on your device...'}
                </Text>
              </div>
            )}
            <div style={{ padding: 16, background: token.colorFillAlter, borderRadius: 8, maxWidth: 400 }}>
              <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14, textAlign: 'center' }}>
                📱 How to {allowRegistration ? 'Register Passkey' : 'Sign In'} with Your Phone:
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12, textAlign: 'left' }}>
                <strong>Step 1: Scan the QR Code</strong>
                <br />
                {allowRegistration 
                  ? 'Open your phone&apos;s camera app and point it at the QR code. Your browser will open automatically and guide you through registration.'
                  : 'Open your phone&apos;s camera app and point it at the QR code. Your browser will open automatically and guide you through sign-in.'}
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12, textAlign: 'left' }}>
                <strong>Step 2: {allowRegistration ? 'Register Your Passkey' : 'Approve Sign-In'}</strong>
                <br />
                {allowRegistration 
                  ? 'Follow the prompts on your phone to create and register your passkey using your device&apos;s biometrics (fingerprint, face) or PIN. You&apos;ll be signed in automatically after registration.'
                  : 'Review the sign-in request on your phone and approve it using your device&apos;s biometrics (fingerprint, face) or PIN.'}
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8, textAlign: 'left' }}>
                <strong>Alternative: Use Authenticator Apps</strong>
                <br />
                You can also use <strong>Microsoft Authenticator</strong> or <strong>ID Melon Authenticator</strong> to scan the QR code. Download ID Melon from <a href="https://play.google.com/store/apps/details?id=com.idmelon.authenticator" target="_blank" rel="noopener noreferrer">Google Play</a> or <a href="https://apps.apple.com/la/app/idmelon-authenticator/id1511376376" target="_blank" rel="noopener noreferrer">App Store</a>
              </Text>
              <Alert
                message="Microsoft-Compatible QR Code"
                description={
                  <Text style={{ fontSize: 12 }}>
                    This QR code uses the standard WebAuthn format (Microsoft Authenticator compatible) and contains all necessary {allowRegistration ? 'registration' : 'authentication'} data. Your authenticator app will automatically extract the information from the QR code.
                  </Text>
                }
                type="info"
                showIcon
                style={{ marginTop: 12, fontSize: 12 }}
              />
            </div>
          </div>
          </>
        ) : allowRegistration ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <Alert
              message="Register Your Passkey"
              description={
                <div>
                  <Text style={{ display: 'block', marginBottom: 8 }}>
                    You don&apos;t have a passkey registered yet. Register one now to enable passwordless sign-in.
                  </Text>
                  <Text style={{ fontSize: 12, display: 'block' }}>
                    After registration, you&apos;ll be automatically signed in and can use your phone to sign in on any device.
                  </Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16, maxWidth: 400 }}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => startCrossDeviceAuth(true)}
              loading={loading}
            >
              Register Passkey and Sign In
            </Button>
            <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', maxWidth: 300 }}>
              Click to generate a QR code for registration. Scan it with your phone to complete setup.
            </Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            {loading ? (
              <>
                <LottieSpinner size="large" />
                <Text type="secondary">Generating QR code...</Text>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    // Regenerate QR code
                    startCrossDeviceAuth(false)
                  }}
                  loading={loading}
                >
                  Refresh QR Code
                </Button>
                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', maxWidth: 300 }}>
                  If the QR code didn&apos;t appear, click to generate a new one.
                </Text>
              </>
            )}
          </div>
        )}
      </div>

      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            stopPolling()
            onCancel()
          }}
          disabled={loading}
        >
          Back
        </Button>
        {qrCodeData && (
          <Button
            icon={<ReloadOutlined />}
            onClick={() => startCrossDeviceAuth(allowRegistration)}
            disabled={loading || polling}
          >
            Refresh QR Code
          </Button>
        )}
      </Space>
    </Space>
  )
}
