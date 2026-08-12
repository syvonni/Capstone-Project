import { useCallback } from 'react'
import { App } from 'antd'
import { deleteApplication, createApplication } from '../../../services/applicationService'
import { isDraftStatus } from '../utils/statusUtils'

export function useBusinessActions({
  businesses,
  dashboardState,
  setEditingApplication,
  fetchBusinesses,
  selectedBusinessId,
}) {
  const { message } = App.useApp()

  const handleBusinessSelect = useCallback((applicationId) => {
    const application = businesses.find(b => {
      return b.applicationId === applicationId || b._id === applicationId
    })

    if (application) {
      const appStatus = application.applicationStatus || application.permitStatus || ''
      if (isDraftStatus(appStatus)) {
        // Clear selected business ID when opening draft for editing
        dashboardState.setSelectedBusinessId(null)
        dashboardState.setShowSettings(false)
        dashboardState.openEditApplicationForm(application)
      } else {
        // Clear form state when selecting non-draft application
        dashboardState.setShowAddForm(false)
        dashboardState.setEditingApplication(null)
        dashboardState.setShowSettings(false)
        dashboardState.selectBusiness(applicationId)
      }
    }
  }, [businesses, dashboardState])

  const handleAddBusiness = useCallback(() => {
    // Count draft, pending, and submitted applications
    const draftOrPendingCount = businesses.filter(
      b => b.applicationStatus === 'draft' || b.applicationStatus === 'pending' || b.applicationStatus === 'submitted'
    ).length

    if (draftOrPendingCount >= 2) {
      message.warning('You can only have up to 2 draft, pending, or submitted applications at a time. Please complete or delete existing applications before creating a new one.')
      return
    }

    dashboardState.setShowBusinessTypeSelector(true)
    dashboardState.setSelectedBusinessId(null)
    dashboardState.setShowAddForm(false)
    setEditingApplication(null)
  }, [dashboardState, setEditingApplication, businesses, message])

  // Calculate draft limit status for UI
  const draftLimitReached = businesses.filter(
    b => b.applicationStatus === 'draft' || b.applicationStatus === 'pending' || b.applicationStatus === 'submitted'
  ).length >= 2

  const handleBusinessTypeSelect = useCallback(async (formId) => {
    // formId can be either a specific form ID (e.g., 'unified-business-permit') or 'temporary-permit' parent
    // For temporary permit parent, we'll let the form loader handle the category selection
    if (formId === 'temporary-permit') {
      dashboardState.openApplicationForm({ formId, fromWelcome: false })
      dashboardState.setShowBusinessTypeSelector(false)
      return
    }

    // Create draft application for specific form IDs
    try {
      const payload = {
        businessName: 'New Business Application',
        applicationStatus: 'draft',
        formType: formId,
        formId: formId,
        formData: {},
      }
      const response = await createApplication(payload)

      const application = response.application
      const applicationId = application.applicationId || application._id

      // Construct a minimal application object from the response
      const newApplication = {
        _id: applicationId,
        applicationId: applicationId,
        businessName: 'New Business Application',
        applicationStatus: 'draft',
        formType: formId,
        formId: formId,
        formData: {},
      }

      // Fetch applications to update the list
      await fetchBusinesses()

      dashboardState.setSelectedBusinessId(applicationId)
      dashboardState.openEditApplicationForm(newApplication)
      dashboardState.setShowBusinessTypeSelector(false)
    } catch (err) {
      console.error('Failed to create application:', err)
      message.error(err.message || 'Failed to create application.')
    }
  }, [dashboardState, fetchBusinesses, message])

  const handleDeleteApplication = useCallback(async (application) => {
    const applicationId = application.applicationId || application._id
    try {
      await deleteApplication(applicationId)
      message.success('Application deleted.')
      localStorage.removeItem('addBusinessFormDraft')
      if (selectedBusinessId === applicationId) {
        dashboardState.setSelectedBusinessId(null)
        dashboardState.setShowAddForm(false)
        setEditingApplication(null)
      }
      fetchBusinesses()
    } catch (err) {
      console.error('Failed to delete application:', err)
      message.error(err?.message || 'Failed to delete application')
    }
  }, [selectedBusinessId, dashboardState, setEditingApplication, fetchBusinesses, message])

  const handleDeleteDraftClick = useCallback(() => {
    const selectedApplication = businesses.find(b => (b.applicationId || b._id) === selectedBusinessId)
    if (!selectedApplication) return
    message.confirm({
      title: 'Delete draft application?',
      content: 'This will permanently remove this draft. You can add a new business later if needed.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleDeleteApplication(selectedApplication),
    })
  }, [businesses, selectedBusinessId, message, handleDeleteApplication])

  return {
    handleBusinessSelect,
    handleAddBusiness,
    handleBusinessTypeSelect,
    handleDeleteApplication,
    handleDeleteDraftClick,
    draftLimitReached,
  }
}
