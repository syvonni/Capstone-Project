/**
 * Presentation Component: CrossDeviceAuthStatus
 * Displays authentication status for cross-device flow
 */
import { Typography, Space, Alert, Button, theme } from 'antd'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { useToken } = theme

export default function CrossDeviceAuthStatus({
  status,
  error,
  onRetry,
  onDeny
}) {
  const { token } = useToken()
  if (status === 'pending') {
    return (
      <>
        <Text type="secondary" style={{ marginBottom: 16 }}>
          A sign-in request is waiting for your approval on another device.
        </Text>
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 24 }}>
          This page will automatically prompt you to authenticate using your device&apos;s passkey.
        </Text>
        <LottieSpinner size="large" />
      </>
    )
  }

  if (status === 'authenticating') {
    return (
      <>
        <Text type="secondary" style={{ marginBottom: 24 }}>
          Please use your device&apos;s biometric authentication or passcode to approve the sign-in.
          <br />
          <strong>Your browser will show a prompt</strong> - use Face ID, Touch ID, fingerprint, or your device PIN.
        </Text>
        <LottieSpinner style={{ marginBottom: 24 }} />
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space size="middle">
            <Button onClick={onDeny} danger s style={{ minWidth: 120 }}>
              Deny
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              You can cancel at any time
            </Text>
          </Space>
          <Alert
            message="Using Your Browser for Passkey Authentication"
            description="Passkeys work through your browser (Safari/Chrome). You can use built-in features or password managers like 1Password or Bitwarden that support passkeys."
            type="info"
            showIcon
            style={{ fontSize: 12 }}
          />
        </Space>
      </>
    )
  }

  if (status === 'success') {
    return (
      <>
        <CheckCircleOutlined style={{ fontSize: 64, color: token.colorSuccess }} />
        <Title level={4} style={{ color: token.colorSuccess }}>Approved</Title>
        <Text type="secondary">
          You can close this page. The sign-in will complete on the other device.
        </Text>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <CloseCircleOutlined style={{ fontSize: 64, color: token.colorError }} />
        <Title level={4} style={{ color: token.colorError }}>Authentication Failed</Title>
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16, textAlign: 'left' }}
          />
        )}
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button type="primary" onClick={onRetry} block size="large">
            Try Again
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Make sure you&apos;re using a supported browser (Safari on iOS, Chrome on Android) and have a passkey registered for this account.
          </Text>
        </Space>
      </>
    )
  }

  return null
}
