import React from 'react'
import { LoginForm, AuthLayout } from '@/features/authentication'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthSession } from '@/features/authentication/hooks/useAuthSession'
import { Alert } from 'antd'

function normalizeRoleKey(value) {
  const raw = String(value?.slug ?? value ?? '').trim().toLowerCase()
  if (['owner', 'business-owner', 'business owner', 'businessowner'].includes(raw)) {
    return 'business_owner'
  }
  return raw
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { logout } = useAuthSession()

  // Clear any existing location state notifications on login page load
  React.useEffect(() => {
    if (location.state?.notification) {
      const state = { ...window.history.state }
      if (state.usr) {
        delete state.usr.notification
        window.history.replaceState(state, '')
      }
    }
  }, [location])

  const showSessionExpired = searchParams.get('reason') === 'session_invalidated' || searchParams.get('reason') === 'token_expired'

  const handleLoginSuccess = React.useCallback((user) => {
    const role = normalizeRoleKey(user?.role)
    const needsOnboarding = !!(user?.mustChangeCredentials || user?.mustSetupMfa)

    // Success notification shown on destination page (Option A)
    const loginSuccessNotification = {
      type: 'success',
      message: 'Welcome back',
      description: 'You have signed in successfully.',
    }

    // Inspector accounts are mobile-app only; block web login and clear session
    if (role === 'inspector') {
      logout()
      navigate('/login', { state: { inspectorBlocked: true }, replace: true })
      return
    }

    if (role === 'admin') {
      if (needsOnboarding) {
        navigate('/admin/onboarding', { state: { from: '/admin/dashboard', notification: loginSuccessNotification }, replace: true })
        return
      }
      navigate('/admin/dashboard', { state: { notification: loginSuccessNotification }, replace: true })
      return
    }

    if (role === 'business_owner') {
      if (user?.mustChangeCredentials) {
        navigate('/account/security', { state: { notification: loginSuccessNotification }, replace: true })
      } else {
        navigate('/owner', { state: { notification: loginSuccessNotification }, replace: true })
      }
      return
    }

    const staffRoles = ['staff', 'lgu_officer']
    if (staffRoles.includes(role)) {
      if (user?.mustChangeCredentials || user?.mustSetupMfa) {
        navigate('/staff/onboarding', { state: { notification: loginSuccessNotification }, replace: true })
      } else {
        navigate('/staff', { state: { notification: loginSuccessNotification }, replace: true })
      }
      return
    }

    navigate('/owner', { state: { notification: loginSuccessNotification }, replace: true })
  }, [navigate, logout])

  const showInvalidCredentials = location.state?.inspectorBlocked === true

  return (
    <AuthLayout>
      {showSessionExpired && (
        <Alert
          type="warning"
          message="Session Expired"
          description="Your session has expired. Please log in again."
          showIcon
          style={{ marginBottom: 24, maxWidth: 300 }}
        />
      )}
      {showInvalidCredentials && (
        <Alert
          type="error"
          message="Invalid credentials."
          showIcon
          style={{ marginBottom: 24, maxWidth: 300 }}
        />
      )}
      <LoginForm onSubmit={handleLoginSuccess} />
    </AuthLayout>
  )
}
