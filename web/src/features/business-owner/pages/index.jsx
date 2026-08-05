import { useEffect, useCallback, useRef } from 'react'
import { App } from 'antd'
import { ShopOutlined } from '@ant-design/icons'
import LottieSpinner from '@/shared/components/LottieSpinner.jsx'
import BusinessOwnerLayout from '../components/shared/BusinessOwnerLayout'
import WelcomeInline from '../components/onboarding/WelcomeModal'
import ApplicationsIndex from './applications/index'
import UserSettingsView from '@/features/user/pages/profileSettings/UserSettingsView'
import { useAuthSession } from '@/features/authentication'
import { useThemeSettings } from '@/features/user/hooks/useThemeSettings'
import { useApplicationsState } from './applications/hooks/useApplicationsState'
import { getCurrentUser } from '@/features/authentication/lib/authEvents'
import { authHeaders } from '@/lib/authHeaders'
import { fetchJsonWithFallback } from '@/lib/http'

export default function BusinessOwnerIndex() {
  const { message } = App.useApp()
  const { currentUser, roleSlug, isLoading: authLoading } = useAuthSession()
  const themeSettings = useThemeSettings(message)

  // State management hook (includes useBusinessDashboard)
  const dashboardState = useApplicationsState()
  const {
    businesses,
    loading,
    showWelcomeState,
    openApplicationForm,
    fetchBusinesses,
  } = dashboardState

  // Show welcome state based on welcomeCompleted flag from user profile
  const welcomeDismissedRef = useRef(false)

  useEffect(() => {
    // Only auto-show welcome if user hasn't explicitly dismissed it
    if (!loading && !showWelcomeState && !currentUser?.welcomeCompleted && !welcomeDismissedRef.current) {
      dashboardState.setShowWelcomeState(true)
    }
  }, [loading, showWelcomeState, currentUser?.welcomeCompleted, dashboardState])

  const handleWelcomeSelect = useCallback(async (registrationType) => {
    // Count draft, pending, and submitted applications
    const draftOrPendingCount = businesses.filter(
      b => b.applicationStatus === 'draft' || b.applicationStatus === 'pending' || b.applicationStatus === 'submitted'
    ).length

    if (draftOrPendingCount >= 2) {
      message.warning('You can only have up to 2 draft, pending, or submitted applications at a time. Please complete or delete existing applications before creating a new one.')
      return
    }

    // Mark welcome as dismissed so useEffect doesn't re-enable it
    welcomeDismissedRef.current = true

    // Don't mark welcome as completed via API yet - only mark it when user actually submits the application
    openApplicationForm({ registrationType, fromWelcome: true })
    dashboardState.setShowWelcomeState(false)
  }, [openApplicationForm, dashboardState, businesses, message])

  const handleLinkExisting = useCallback(async () => {
    // Mark welcome as dismissed so useEffect doesn't re-enable it
    welcomeDismissedRef.current = true

    // Mark welcome as completed via API
    try {
      const current = getCurrentUser()
      const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
      await fetchJsonWithFallback('/api/auth/welcome-complete', {
        method: 'PATCH',
        headers,
      })
    } catch (err) {
      console.error('Failed to mark welcome as completed:', err)
      // Continue anyway - don't block the user
    }

    message.info('Link existing business feature coming soon!')
    dashboardState.setShowWelcomeState(false)
  }, [message, dashboardState])

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LottieSpinner size="large" />
      </div>
    )
  }

  if (!currentUser || roleSlug !== 'business_owner') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LottieSpinner size="large" tip="Redirecting..."><div style={{ minHeight: 48 }} /></LottieSpinner>
      </div>
    )
  }

  return (
    <BusinessOwnerLayout
      pageTitle="Business Dashboard"
      pageIcon={<ShopOutlined />}
      showBrandLogo={true}
      onRefresh={fetchBusinesses}
      lastUpdated={dashboardState.lastUpdatedAt}
      socketConnected={false}
      loading={loading}
      onSettingsClick={dashboardState.toggleSettings}
    >
      {showWelcomeState ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <WelcomeInline
            onSelect={handleWelcomeSelect}
            onLinkExisting={handleLinkExisting}
          />
        </div>
      ) : dashboardState.showSettings ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <UserSettingsView
              showBackButton={false}
              themeSettings={themeSettings}
              embedded={true}
            />
          </div>
        </div>
      ) : (
        <ApplicationsIndex dashboardState={dashboardState} />
      )}
    </BusinessOwnerLayout>
  )
}
