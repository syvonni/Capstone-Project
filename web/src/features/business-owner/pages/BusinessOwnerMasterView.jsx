import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, theme, App, Grid } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import LayoutPageHeader from '@/shared/components/LayoutPageHeader'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import AnnouncementsCard from '@/shared/components/AnnouncementsCard'
import ApplicationsList from './applications/components/ApplicationsList'
import ApplicationDetailPanel from './applications/components/ApplicationDetailPanel'
import ApplicationTypeSelector from '../components/onboarding/ApplicationTypeSelector'
import PermitApplicationForm from './applications/components/ApplicationPermitForm'
import UserSettingsView from '@/features/user/components/layout/UserSettingsView'
import WelcomeInline from '../components/onboarding/WelcomeModal'
import LottieSpinner from '@/shared/components/LottieSpinner.jsx'
import { useAnnouncements } from '@/shared/hooks/useAnnouncements'
import { useApplicationsState } from './applications/hooks/useApplicationsState'
import { useBusinessActions } from './applications/hooks/useBusinessActions'
import { getBusinessDisplayName } from './applications/utils/statusUtils'
import { useAuthSession } from '@/features/authentication'
import { getCurrentUser } from '@/features/authentication/lib/authEvents'
import { authHeaders } from '@/lib/authHeaders'
import { fetchJsonWithFallback } from '@/lib/http'

const { useBreakpoint } = Grid

export default function BusinessOwnerMasterView({
  children,
  pageTitle,
  pageIcon,
  showPageHeader = true,
  onRefresh,
  lastUpdated,
  socketConnected,
  loading,
  showBrandLogo = false,
  brandLogoClickable = false,
  hideProfileSettings = true,
}) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const { currentUser, roleSlug, isLoading: authLoading } = useAuthSession()

  // Announcements hook
  const { announcements, announcementItems, defaultOpenKey } = useAnnouncements({ skipAuth: false })

  // Applications state
  const dashboardState = useApplicationsState()

  const {
    businesses,
    loading: appsLoading,
    selectedBusinessId,
    showAddForm,
    showBusinessTypeSelector,
    editingApplication,
    setEditingApplication,
    readAnnouncements,
    fetchBusinesses,
    showWelcomeState,
    openApplicationForm,
    fromWelcomeModal,
    permitType,
  } = dashboardState

  // Show welcome state based on welcomeCompleted flag from user profile
  const welcomeDismissedRef = useRef(false)

  useEffect(() => {
    // Only auto-show welcome if user hasn't explicitly dismissed it
    if (!appsLoading && !showWelcomeState && !currentUser?.welcomeCompleted && !welcomeDismissedRef.current) {
      dashboardState.setShowWelcomeState(true)
    }
  }, [appsLoading, showWelcomeState, currentUser?.welcomeCompleted, dashboardState])

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

  // Business actions
  const {
    handleBusinessSelect,
    handleAddBusiness,
    handleBusinessTypeSelect,
    draftLimitReached,
  } = useBusinessActions({
    businesses,
    dashboardState,
    setEditingApplication,
    fetchBusinesses,
    selectedBusinessId,
  })

  // Settings state
  const [showSettings, setShowSettings] = useState(false)

  const handleSettingsClick = () => {
    dashboardState.setSelectedBusinessId(null)
    dashboardState.setShowAddForm(false)
    dashboardState.setShowBusinessTypeSelector(false)
    setShowSettings(true)
  }

  // Update business actions to reset settings when interacting with applications
  const handleBusinessSelectWrapper = (applicationId) => {
    setShowSettings(false)
    handleBusinessSelect(applicationId)
  }

  const handleAddBusinessWrapper = () => {
    setShowSettings(false)
    handleAddBusiness()
  }

  const handleBusinessTypeSelectWrapper = (formId) => {
    setShowSettings(false)
    handleBusinessTypeSelect(formId)
  }

  const selectedBusiness = businesses.find(b => (b.businessId || b._id) === selectedBusinessId)
  const displayName = getBusinessDisplayName(selectedBusiness)

  // Auth loading state
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

  // Welcome modal full-screen view
  if (showWelcomeState) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, overflow: 'hidden' }}>
        <LayoutPageHeader
          pageTitle={pageTitle}
          pageIcon={pageIcon}
          viewNotificationsPath="/notifications"
          showPageHeader={showPageHeader}
          onRefresh={onRefresh}
          lastUpdated={lastUpdated}
          socketConnected={socketConnected}
          loading={loading}
          showBrandLogo={showBrandLogo}
          brandLogoClickable={brandLogoClickable}
          hideProfileSettings={hideProfileSettings}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <WelcomeInline
            onSelect={handleWelcomeSelect}
            onLinkExisting={handleLinkExisting}
          />
        </div>
      </div>
    )
  }

  // Full-screen permit form when creating from welcome modal
  if (showAddForm && !editingApplication && fromWelcomeModal) {
    return (
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <PermitApplicationForm
          editingApplication={editingApplication}
          onDraftCreated={async (newBusiness) => {
            const businessId = newBusiness.businessId || newBusiness._id
            await fetchBusinesses()
            dashboardState.setSelectedBusinessId(businessId)
            dashboardState.setShowAddForm(false)

            // Mark welcome as completed if this draft was created from the welcome modal
            if (fromWelcomeModal) {
              try {
                const { getCurrentUser } = await import('@/features/authentication/lib/authEvents')
                const { authHeaders } = await import('@/lib/authHeaders')
                const { fetchJsonWithFallback } = await import('@/lib/http')
                const current = getCurrentUser()
                const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
                await fetchJsonWithFallback('/api/auth/welcome-complete', {
                  method: 'PATCH',
                  headers,
                })
              } catch (err) {
                console.error('Failed to mark welcome as completed:', err)
              }
            }
          }}
          onBack={() => {
            dashboardState.setShowAddForm(false)
            // Restore welcome state if coming from welcome
            if (fromWelcomeModal) {
              dashboardState.setShowWelcomeState(true)
              dashboardState.setFromWelcomeModal(false)
            } else {
              // When not coming from welcome, show business type selector in right panel
              dashboardState.setShowBusinessTypeSelector(true)
            }
          }}
          initialRegistrationType={permitType}
        />
      </div>
    )
  }

  // Left panel content
  const listContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '24px', width: '100%', maxWidth: 'none' }}>
      {/* Announcements Card */}
      {announcementItems && announcementItems.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <AnnouncementsCard
            announcementItems={announcementItems}
            announcements={announcements}
            defaultOpenKey={defaultOpenKey}
            enableUnreadTracking={true}
            readAnnouncements={readAnnouncements}
            onAnnouncementRead={dashboardState.handleAnnouncementRead}
          />
        </div>
      )}

      {/* Applications List */}
      <ApplicationsList
        businesses={businesses}
        loading={appsLoading}
        selectedBusinessId={selectedBusinessId}
        onBusinessSelect={handleBusinessSelectWrapper}
        onAddBusiness={handleAddBusinessWrapper}
        isSelectingType={showBusinessTypeSelector}
        draftLimitReached={draftLimitReached}
      />

      {/* Settings Button */}
      <Button
        icon={<SettingOutlined />}
        style={{ width: '100%', marginTop: 12, textAlign: 'left', justifyContent: 'flex-start' }}
        onClick={handleSettingsClick}
      >
        Settings
      </Button>
    </div>
  )

  // Right panel content
  const detailContent = showSettings ? (
    <div style={{ flex: 1, overflow: 'auto', height: '100%' }}>
      <UserSettingsView />
    </div>
  ) : showBusinessTypeSelector ? (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
      <ApplicationTypeSelector
        onSelect={handleBusinessTypeSelectWrapper}
      />
    </div>
  ) : showAddForm && editingApplication ? (
    // Editing a draft application - use ApplicationDetailPanel for consistent navigation
    <ApplicationDetailPanel
      business={editingApplication}
      token={token}
      dashboardState={dashboardState}
    />
  ) : showAddForm ? (
    // Creating a new application - show form without header
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', alignItems: 'center' }}>
      <PermitApplicationForm
        editingApplication={editingApplication}
        onDraftCreated={async (newBusiness) => {
          console.log('onDraftCreated called with newBusiness:', newBusiness)
          const businessId = newBusiness.businessId || newBusiness._id
          console.log('Extracted businessId:', businessId)
          // Refetch businesses to get the updated list
          console.log('About to fetch businesses')
          await fetchBusinesses()
          console.log('Businesses fetched, setting selectedBusinessId:', businessId)
          dashboardState.setSelectedBusinessId(businessId)
          dashboardState.setShowAddForm(false)

          // Mark welcome as completed if this draft was created from the welcome modal
          if (fromWelcomeModal) {
            try {
              const { getCurrentUser } = await import('@/features/authentication/lib/authEvents')
              const { authHeaders } = await import('@/lib/authHeaders')
              const { fetchJsonWithFallback } = await import('@/lib/http')
              const current = getCurrentUser()
              const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
              await fetchJsonWithFallback('/api/auth/welcome-complete', {
                method: 'PATCH',
                headers,
              })
            } catch (err) {
              console.error('Failed to mark welcome as completed:', err)
            }
          }
        }}
        onBack={() => {
          dashboardState.setShowAddForm(false)
          // Restore welcome state if coming from welcome
          if (fromWelcomeModal) {
            dashboardState.setShowWelcomeState(true)
            dashboardState.setFromWelcomeModal(false)
          } else {
            // When not coming from welcome, show business type selector in right panel
            dashboardState.setShowBusinessTypeSelector(true)
          }
        }}
        initialRegistrationType={permitType}
      />
    </div>
  ) : selectedBusiness ? (
    <ApplicationDetailPanel
      business={selectedBusiness}
      token={token}
      dashboardState={dashboardState}
    />
  ) : null

  const handleDrawerClose = () => {
    dashboardState.setSelectedBusinessId(null)
    dashboardState.setShowAddForm(false)
    dashboardState.setShowBusinessTypeSelector(false)
    setShowSettings(false)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, overflow: 'hidden' }}>
      <LayoutPageHeader
        pageTitle={pageTitle}
        pageIcon={pageIcon}
        viewNotificationsPath="/notifications"
        showPageHeader={showPageHeader}
        onRefresh={onRefresh}
        lastUpdated={lastUpdated}
        socketConnected={socketConnected}
        loading={loading}
        showBrandLogo={showBrandLogo}
        brandLogoClickable={brandLogoClickable}
        hideProfileSettings={hideProfileSettings}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: token.colorBgContainer, width: '100%', paddingTop: isMobile ? 64 : 0 }}>
        <ResponsiveSplitLayout
          listContent={listContent}
          detailContent={detailContent}
          drawerTitle={showSettings ? 'Settings' : showAddForm ? 'New Application' : showBusinessTypeSelector ? 'Select Permit Type' : displayName || 'Details'}
          onDrawerClose={handleDrawerClose}
          drawerOpen={!!selectedBusiness || showSettings || showAddForm || showBusinessTypeSelector}
          mobileDrawerPlacement="bottom"
          listDefaultSize="350px"
        />
      </div>
    </div>
  )
}
