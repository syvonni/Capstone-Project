import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button, theme, App, Grid, Tag } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import LayoutPageHeader from '@/shared/components/LayoutPageHeader'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import AnnouncementsCard from '@/shared/components/cms/AnnouncementsCard'
import ApplicationsList from './applications/components/ApplicationsList'
import ApplicationDetailPanel from './applications/components/ApplicationDetailPanel'
import ApplicationTypeSelectorModal from './applications/components/modals/ApplicationTypeSelectorModal'
import ApplicationForm from './applications/components/ApplicationForm'
import UserSettingsView from '@/features/user/components/layout/UserSettingsView'
import WelcomeInline from './onboarding/WelcomeModal'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import { useAnnouncements } from '@/shared/hooks/useAnnouncements'
import { useApplicationsState } from './applications/hooks/useApplicationsState'
import { useApplicationActions } from './applications/hooks/useApplicationActions'
import { getApplicationDisplayName, getSaveStatus } from './applications/utils/statusUtils'
import { useApplicationStatus } from './applications/hooks/useApplicationStatus'
import { useAuthSession } from '@/features/authentication'
import { markWelcomeComplete } from '@/features/authentication/services/authService'

const { useBreakpoint } = Grid

export default function BusinessOwnerMasterView({
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
    applications,
    loading: appsLoading,
    selectedApplicationId,
    showAddForm,
    showApplicationTypeSelector,
    setShowApplicationTypeSelector,
    editingApplication,
    setEditingApplication,
    readAnnouncements,
    fetchApplications,
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
    const draftOrPendingCount = applications.filter(
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
  }, [openApplicationForm, dashboardState, applications, message])

  const handleLinkExisting = useCallback(async () => {
    // Mark welcome as dismissed so useEffect doesn't re-enable it
    welcomeDismissedRef.current = true

    // Mark welcome as completed via API
    try {
      await markWelcomeComplete()
    } catch (err) {
      console.error('Failed to mark welcome as completed:', err)
      // Continue anyway - don't block the user
    }

    message.info('Link existing business feature coming soon!')
    dashboardState.setShowWelcomeState(false)
  }, [message, dashboardState])

  // Business actions
  const {
    handleApplicationSelect,
    handleAddApplication,
    handleApplicationTypeSelect,
    draftLimitReached,
  } = useApplicationActions({
    applications,
    dashboardState,
    setEditingApplication,
    fetchApplications,
  })

  // Settings state
  const [showSettings, setShowSettings] = useState(false)

  // Track autosave status for the mobile drawer title
  const [drawerSaveStatus, setDrawerSaveStatus] = useState(null)

  const handleSettingsClick = () => {
    dashboardState.setSelectedApplicationId(null)
    dashboardState.setShowAddForm(false)
    dashboardState.setShowApplicationTypeSelector(false)
    setShowSettings(true)
  }

  const handleApplicationSubmitted = useCallback((response) => {
    const submittedApplication =
      response?.applicationes?.[0] ||
      response?.application ||
      response?.data?.application

    if (submittedApplication) {
      const appId = submittedApplication.applicationId || submittedApplication._id

      // Merge formData and documents so the response doesn’t wipe out values
      // the backend didn’t echo back (e.g., category upload selections).
      const mergedApplication = {
        ...editingApplication,
        ...submittedApplication,
        formData: {
          ...(editingApplication?.formData || {}),
          ...(submittedApplication?.formData || {}),
        },
        lguDocuments: {
          ...(editingApplication?.lguDocuments || {}),
          ...(submittedApplication?.lguDocuments || submittedApplication?.documents || {}),
        },
      }

      dashboardState.setApplications((prev) =>
        prev.map((app) =>
          (app.applicationId || app._id) === appId ? { ...app, ...mergedApplication } : app
        )
      )
    }

    // Always close the full-screen create form and refresh the list
    dashboardState.setShowAddForm(false)
    dashboardState.setEditingApplication(null)
    if (submittedApplication) {
      dashboardState.setSelectedApplicationId(submittedApplication.applicationId || submittedApplication._id)
    }
    fetchApplications()
  }, [dashboardState, editingApplication, fetchApplications])

  // Update application actions to reset settings when interacting with applications
  const handleApplicationSelectWrapper = (applicationId) => {
    setShowSettings(false)
    handleApplicationSelect(applicationId)
  }

  const handleAddApplicationWrapper = () => {
    setShowSettings(false)
    handleAddApplication()
  }

  const handleApplicationTypeSelectWrapper = async (formId) => {
    setShowSettings(false)
    await handleApplicationTypeSelect(formId)
  }

  const selectedApplication = applications.find(app => (app.applicationId || app._id) === selectedApplicationId)
  const activeApplication = selectedApplication || editingApplication
  const activeDisplayName = getApplicationDisplayName(activeApplication)
  const { isDraft } = useApplicationStatus(activeApplication)

  const drawerTitle = useMemo(() => {
    if (showSettings) return 'Settings'
    if (showApplicationTypeSelector) return 'Select Permit Type'
    if (showAddForm && !editingApplication) return 'New Application'
    if (!activeApplication) return activeDisplayName || 'Details'

    let saveTag = null
    if (isDraft && drawerSaveStatus) {
      const { text, color } = getSaveStatus(drawerSaveStatus)
      saveTag = (
        <Tag color={color} style={{ fontWeight: 'normal' }}>
          {text}
        </Tag>
      )
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{activeDisplayName || 'Details'}</span>
        {saveTag}
      </div>
    )
  }, [showSettings, showApplicationTypeSelector, showAddForm, editingApplication, activeApplication, isDraft, drawerSaveStatus, activeDisplayName])

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
        <ApplicationForm
          editingApplication={editingApplication}
          onSubmitted={handleApplicationSubmitted}
          onDraftCreated={async (newApplication) => {
            const applicationId = newApplication.applicationId || newApplication._id
            await fetchApplications()
            dashboardState.setSelectedApplicationId(applicationId)
            dashboardState.setShowAddForm(false)

            // Mark welcome as completed if this draft was created from the welcome modal
            if (fromWelcomeModal) {
              try {
                await markWelcomeComplete()
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
              // When not coming from welcome, show application type selector in right panel
              dashboardState.setShowApplicationTypeSelector(true)
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
        applications={applications}
        loading={appsLoading}
        selectedApplicationId={selectedApplicationId}
        onApplicationSelect={handleApplicationSelectWrapper}
        onAddApplication={handleAddApplicationWrapper}
        isSelectingType={showApplicationTypeSelector}
        draftLimitReached={draftLimitReached}
      />

      {/* Settings Button */}
      <Button
        icon={<SettingOutlined />}
        block
        style={{ width: '100%', marginTop: 12, textAlign: 'left', justifyContent: 'flex-start', height: 46 }}
        onClick={handleSettingsClick}
      >
        <span style={{ marginLeft: 4 }}>Settings</span>
      </Button>
    </div>
  )

  // Right panel content
  const detailContent = showSettings ? (
    <div style={{ flex: 1, overflow: 'auto', height: '100%' }}>
      <UserSettingsView />
    </div>
  ) : showApplicationTypeSelector ? (
    <ApplicationTypeSelectorModal
      open={showApplicationTypeSelector}
      onCancel={() => setShowApplicationTypeSelector(false)}
      onSelect={handleApplicationTypeSelectWrapper}
      onLinkExisting={handleLinkExisting}
    />
  ) : showAddForm && editingApplication ? (
    // Editing a draft application - use ApplicationDetailPanel for consistent navigation
    <ApplicationDetailPanel
      application={editingApplication}
      token={token}
      dashboardState={dashboardState}
      onSaveStatusChange={setDrawerSaveStatus}
    />
  ) : showAddForm ? (
    // Creating a new application - show form without header
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', alignItems: 'center' }}>
      <ApplicationForm
        editingApplication={editingApplication}
        onSubmitted={handleApplicationSubmitted}
        onDraftCreated={async (newApplication) => {
          console.log('onDraftCreated called with newApplication:', newApplication)
          const applicationId = newApplication.applicationId || newApplication._id
          console.log('Extracted applicationId:', applicationId)
          // Refetch applications to get the updated list
          console.log('About to fetch applications')
          await fetchApplications()
          console.log('Applications fetched, setting selectedApplicationId:', applicationId)
          dashboardState.setSelectedApplicationId(applicationId)
          dashboardState.setShowAddForm(false)

          // Mark welcome as completed if this draft was created from the welcome modal
          if (fromWelcomeModal) {
            try {
              await markWelcomeComplete()
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
            // When not coming from welcome, show application type selector in right panel
            dashboardState.setShowApplicationTypeSelector(true)
          }
        }}
        initialRegistrationType={permitType}
      />
    </div>
  ) : selectedApplication ? (
    <ApplicationDetailPanel
      application={selectedApplication}
      token={token}
      dashboardState={dashboardState}
      onSaveStatusChange={setDrawerSaveStatus}
    />
  ) : null

  const handleDrawerClose = () => {
    dashboardState.setSelectedApplicationId(null)
    dashboardState.setShowAddForm(false)
    dashboardState.setShowApplicationTypeSelector(false)
    setShowSettings(false)
    setDrawerSaveStatus(null)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, overflow: 'hidden' }}>
      <LayoutPageHeader
        pageTitle={pageTitle}
        pageIcon={pageIcon}
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
          drawerTitle={drawerTitle}
          onDrawerClose={handleDrawerClose}
          drawerOpen={!!selectedApplication || showSettings || showAddForm || showApplicationTypeSelector}
          mobileDrawerPlacement="bottom"
          listDefaultSize="350px"
        />
      </div>
    </div>
  )
}
