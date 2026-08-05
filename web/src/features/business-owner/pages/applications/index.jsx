import { theme } from 'antd'
import ApplicationsList from './components/ApplicationsList'
import ApplicationsAnnouncementsCard from './components/ApplicationsAnnouncementsCard'
import ApplicationTypeSelector from '../../components/onboarding/ApplicationTypeSelector'
import ApplicationDetailPanel from './components/ApplicationDetailPanel'
import PermitApplicationForm from './components/ApplicationPermitForm'
import { getBusinessDisplayName } from './utils/statusUtils'
import { useAnnouncements } from './hooks/useAnnouncements'
import { useBusinessActions } from './hooks/useBusinessActions'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

export default function ApplicationsIndex({ dashboardState }) {
  const { token } = theme.useToken()

  // Announcements hook
  const { announcements, announcementItems, defaultOpenKey } = useAnnouncements()

  const {
    businesses,
    loading,
    selectedBusinessId,
    showAddForm,
    showBusinessTypeSelector,
    editingApplication,
    setEditingApplication,
    readAnnouncements,
    fetchBusinesses,
  } = dashboardState

  // Business actions hook
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

  const selectedBusiness = businesses.find(b => (b.businessId || b._id) === selectedBusinessId)
  const displayName = getBusinessDisplayName(selectedBusiness)

  // List content for ResponsiveSplitLayout
  const listContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '24px', width: '100%', maxWidth: 'none' }}>
      {/* Announcements Card */}
      {announcementItems && announcementItems.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <ApplicationsAnnouncementsCard
            announcementItems={announcementItems}
            announcements={announcements}
            defaultOpenKey={defaultOpenKey}
            readAnnouncements={readAnnouncements}
            onAnnouncementRead={dashboardState.handleAnnouncementRead}
          />
        </div>
      )}

      {/* Business List Panel */}
      <ApplicationsList
        businesses={businesses}
        loading={loading}
        selectedBusinessId={selectedBusinessId}
        onBusinessSelect={handleBusinessSelect}
        onAddBusiness={handleAddBusiness}
        isSelectingType={showBusinessTypeSelector}
        draftLimitReached={draftLimitReached}
      />
    </div>
  )

  // Detail content for ResponsiveSplitLayout
  const detailContent = showBusinessTypeSelector ? (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
      <ApplicationTypeSelector
        onSelect={handleBusinessTypeSelect}
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
          const businessId = newBusiness.businessId || newBusiness._id
          // Refetch businesses to get the updated list
          await fetchBusinesses()
          dashboardState.setSelectedBusinessId(businessId)
          dashboardState.setShowAddForm(false)

          // Mark welcome as completed if this draft was created from the welcome modal
          if (dashboardState.fromWelcomeModal) {
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
          if (dashboardState.fromWelcomeModal) {
            dashboardState.setShowWelcomeState(true)
            dashboardState.setFromWelcomeModal(false)
          } else {
            // When not coming from welcome, show business type selector in right panel
            dashboardState.setShowBusinessTypeSelector(true)
          }
        }}
        initialRegistrationType={dashboardState.permitType}
      />
    </div>
  ) : selectedBusiness ? (
    <ApplicationDetailPanel
      business={selectedBusiness}
      token={token}
      dashboardState={dashboardState}
    />
  ) : null

  // When creating a new application from welcome modal (showAddForm true, fromWelcomeModal true), show full-screen form instead of split layout
  // Otherwise, use split layout to keep the list panel visible
  if (showAddForm && !editingApplication && dashboardState.fromWelcomeModal) {
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
            if (dashboardState.fromWelcomeModal) {
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
            if (dashboardState.fromWelcomeModal) {
              dashboardState.setShowWelcomeState(true)
              dashboardState.setFromWelcomeModal(false)
            } else {
              // When not coming from welcome, show business type selector in right panel
              dashboardState.setShowBusinessTypeSelector(true)
            }
          }}
          initialRegistrationType={dashboardState.permitType}
        />
      </div>
    )
  }

  return (
    <ResponsiveSplitLayout
      listContent={listContent}
      detailContent={detailContent}
      drawerTitle={selectedBusiness ? displayName : 'Details'}
      onDrawerClose={() => {
        dashboardState.setSelectedBusinessId(null)
        dashboardState.setShowAddForm(false)
      }}
      drawerOpen={!!selectedBusiness || showAddForm || showBusinessTypeSelector}
      mobileDrawerPlacement="right"
      listDefaultSize="350px"
    />
  )
}
