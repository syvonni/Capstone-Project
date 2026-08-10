import { Navigate, useLocation } from 'react-router-dom'
import { useAuthSession, useMaintenanceStatus } from '@/features/authentication'
import { getCurrentUser as getAuthEventCurrentUser } from '@/features/authentication/lib/authEvents.js'

function normalizeRoleKey(value) {
  const raw = String(value?.slug ?? value ?? '').trim().toLowerCase()
  if (['owner', 'business-owner', 'business owner', 'businessowner'].includes(raw)) {
    return 'business_owner'
  }
  return raw
}

export default function PublicRoute({ children }) {
  const { currentUser, role, isLoading } = useAuthSession()
  const location = useLocation()
  const authEventUser = getAuthEventCurrentUser()
  const effectiveUser = currentUser || authEventUser
  const publicPages = ['/', '/login', '/forgot-password', '/sign-up', '/terms', '/privacy', '/manual', '/maintenance']
  const maintenance = useMaintenanceStatus({ enabled: !publicPages.includes(location.pathname) })

  if (isLoading || maintenance.loading) {
    return null
  }

  // If maintenance mode is active, redirect to maintenance page (except for admin users and allowed public pages)
  if (maintenance.active && location.pathname !== '/maintenance') {
    const roleKey = normalizeRoleKey(role)
    const allowedPublicPages = ['/', '/login', '/forgot-password', '/sign-up', '/terms', '/privacy', '/manual']
    
    // Allow admin users and specific public pages during maintenance
    if (roleKey !== 'admin' && !allowedPublicPages.includes(location.pathname)) {
      return <Navigate to="/maintenance" replace state={{ from: location }} />
    }
  }

  if (location.pathname === '/maintenance' && maintenance.active) {
    return children
  }

  if (effectiveUser && effectiveUser.token) {
    const r = normalizeRoleKey(role)
    const state = location.state // Preserve state (e.g. notifications) during redirect

    if (r === 'admin') {
      if (effectiveUser?.mustChangeCredentials || effectiveUser?.mustSetupMfa) {
        return <Navigate to="/admin/onboarding" replace state={{ ...state, from: '/admin/dashboard' }} />
      }
      return <Navigate to="/admin/dashboard" replace state={state} />
    }
    
    if (r === 'business_owner') {
      return <Navigate to="/owner" replace state={state} />
    }

    const staffRoles = ['staff', 'lgu_officer', 'inspector']
    if (staffRoles.includes(r)) {
      if (effectiveUser?.mustChangeCredentials || effectiveUser?.mustSetupMfa) {
        return <Navigate to="/staff/onboarding" replace state={state} />
      }
      return <Navigate to="/staff" replace state={state} />
    }

    return <Navigate to="/owner" replace state={state}/> 
  }
  return children
}
