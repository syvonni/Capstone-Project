import LottieSpinner from '@/shared/components/LottieSpinner.jsx'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthSession, useMaintenanceStatus } from '@/features/authentication'
import { getCurrentUser as getAuthEventCurrentUser, getIsLoggingOut, getLogoutNotification } from '@/features/authentication/lib/authEvents.js'
import { theme } from 'antd'

const { useToken } = theme

function normalizeRoleKey(value) {
  const raw = String(value?.slug ?? value ?? '').trim().toLowerCase()
  if (['owner', 'business-owner', 'business owner', 'businessowner'].includes(raw)) {
    return 'business_owner'
  }
  return raw
}

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { token } = useToken()
  const { currentUser, role, isLoading } = useAuthSession()
  const location = useLocation()
  const maintenance = useMaintenanceStatus()
  const isLoggingOut = getIsLoggingOut()
  const authEventUser = getAuthEventCurrentUser()
  const effectiveUser = currentUser || authEventUser

  const roleKey = normalizeRoleKey(role)
  const allowed = allowedRoles.map((r) => String(r || '').toLowerCase())
  const isUnauthorized = !isLoading && effectiveUser && allowed.length > 0 && !allowed.includes(roleKey)

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 16,
        background: token.colorBgContainer,
        zIndex: 9999
      }}>
        <LottieSpinner size="large" />
        <div style={{ color: token.colorTextSecondary, fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  if (maintenance.active && effectiveUser?.token && roleKey !== 'admin' && !isLoggingOut) {
    return <Navigate to="/maintenance" replace state={{ from: location }} />
  }

  // If not authenticated, redirect to login
  if (!effectiveUser || !effectiveUser.token) {
    const logoutNotification = getLogoutNotification()

    if (isLoggingOut || logoutNotification) {
      // Voluntary logout should not show an access warning.
      // Let the logout flow's success notification handle the feedback.
      return <Navigate to="/login" replace />
    }

    const path = location.pathname.toLowerCase()
    const sensitiveRoutes = ['/admin', '/staff', '/owner']
    const isSensitive = sensitiveRoutes.some(r => path.startsWith(r))
    
    const notification = isSensitive ? {
      type: 'warning',
      message: 'Restricted Access',
      description: 'You must be logged in to view this page.'
    } : undefined

    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ 
          from: location,
          notification
        }} 
      />
    )
  }

  const staffRoles = ['staff', 'lgu_officer', 'inspector']

  // Handle Deletion Pending State
  if (effectiveUser?.deletionPending) {
    if (location.pathname !== '/deletion-pending') {
      return <Navigate to="/deletion-pending" replace state={{ from: location }} />
    }
    return children
  }

  // Prevent access to Deletion Pending screen if not pending
  if (!effectiveUser?.deletionPending && location.pathname === '/deletion-pending') {
    // Try to restore the previous location if available
    if (location.state?.from?.pathname) {
      return <Navigate to={location.state.from.pathname} replace />
    }

    // Default to role-based dashboard
    let target = '/owner'
    if (roleKey === 'admin') target = '/admin/dashboard'
    else if (roleKey === 'business_owner') target = '/owner'
    else if (staffRoles.includes(roleKey)) target = '/staff'

    return <Navigate to={target} replace />
  }

  // Staff and admin must complete onboarding (MFA/password); business owners only redirected if mustSetupMfa is true
  // Dev bypass only applies to business owner; staff and admin always must complete MFA when mustSetupMfa is set
  const bypassMfaDev = import.meta.env.VITE_BYPASS_MFA_DEV === 'true'
  const isStaffOrAdmin = staffRoles.includes(roleKey) || roleKey === 'admin'
  const mustSetupMfaEffective = isStaffOrAdmin ? !!effectiveUser?.mustSetupMfa : (bypassMfaDev ? false : !!effectiveUser?.mustSetupMfa)
  const needsOnboarding = (staffRoles.includes(roleKey) || roleKey === 'admin') && (effectiveUser?.mustChangeCredentials || mustSetupMfaEffective)
  // Business owners need onboarding if mustChangeCredentials is true (temporary password) or mustSetupMfa is true (MFA not yet set up)
  const businessOwnerNeedsOnboarding = roleKey === 'business_owner' && (effectiveUser?.mustChangeCredentials || mustSetupMfaEffective)
  const onboardingAllowedPaths = ['/staff/onboarding', '/admin/onboarding', '/business-owner/onboarding']
  const needsPasswordOrOnboarding = needsOnboarding || businessOwnerNeedsOnboarding
  if (needsPasswordOrOnboarding && !onboardingAllowedPaths.includes(location.pathname)) {
    const onboardingTarget = roleKey === 'admin' ? '/admin/onboarding' : roleKey === 'business_owner' ? '/business-owner/onboarding' : '/staff/onboarding'
    console.warn('[ProtectedRoute] Redirecting to onboarding:', {
      from: location.pathname,
      to: onboardingTarget,
      roleKey,
      mustSetupMfa: effectiveUser?.mustSetupMfa,
      mustChangeCredentials: effectiveUser?.mustChangeCredentials
    })
    return <Navigate to={onboardingTarget} replace state={{ from: location }} />
  }

  // Business owner on /account/security - redirect to dashboard (we removed this route from onboarding flow)
  if (roleKey === 'business_owner' && location.pathname === '/account/security') {
    console.warn('[ProtectedRoute] Business owner on /account/security, redirecting to /owner')
    return <Navigate to='/owner' replace />
  }

  // If roles are specified and user doesn't match
  if (isUnauthorized) {
    // Determine target dashboard based on role to avoid redirect loops or intermediate pages
    let target = '/owner' // fallback

    if (roleKey === 'admin') target = '/admin/dashboard'
    else if (roleKey === 'business_owner') target = '/owner'
    else if (staffRoles.includes(roleKey)) target = '/staff'

    return (
      <Navigate 
        to={target} 
        replace 
        state={{ 
          notification: {
            type: 'warning',
            message: 'Restricted Access',
            description: 'You do not have permission to view this page.'
          }
        }} 
      />
    )
  }

  return children
}
