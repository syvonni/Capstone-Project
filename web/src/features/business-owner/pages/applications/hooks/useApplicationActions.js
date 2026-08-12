import { useCallback, useRef } from 'react'
import { App } from 'antd'
import { createApplication } from '../../../services/applicationService'
import { isDraftStatus } from '../utils/statusUtils'

export function useApplicationActions({
  applications,
  dashboardState,
  setEditingApplication,
  fetchApplications,
}) {
  const { message } = App.useApp()
  const creatingRef = useRef(false)

  const handleApplicationSelect = useCallback((applicationId) => {
    const application = applications.find(app => {
      return app.applicationId === applicationId || app._id === applicationId
    })

    if (application) {
      const appStatus = application.applicationStatus || application.permitStatus || ''
      if (isDraftStatus(appStatus)) {
        // Clear selected application ID when opening draft for editing
        dashboardState.setSelectedApplicationId(null)
        dashboardState.setShowSettings(false)
        dashboardState.openEditApplicationForm(application)
      } else {
        // Clear form state when selecting non-draft application
        dashboardState.setShowAddForm(false)
        dashboardState.setEditingApplication(null)
        dashboardState.setShowSettings(false)
        dashboardState.selectApplication(applicationId)
      }
    }
  }, [applications, dashboardState])

  const handleAddApplication = useCallback(() => {
    // Count draft, pending, and submitted applications
    const draftOrPendingCount = applications.filter(
      app => app.applicationStatus === 'draft' || app.applicationStatus === 'pending' || app.applicationStatus === 'submitted'
    ).length

    if (draftOrPendingCount >= 2) {
      message.warning('You can only have up to 2 draft, pending, or submitted applications at a time. Please complete or delete existing applications before creating a new one.')
      return
    }

    dashboardState.setShowApplicationTypeSelector(true)
    dashboardState.setSelectedApplicationId(null)
    dashboardState.setShowAddForm(false)
    setEditingApplication(null)
  }, [dashboardState, setEditingApplication, applications, message])

  // Calculate draft limit status for UI
  const draftLimitReached = applications.filter(
    app => app.applicationStatus === 'draft' || app.applicationStatus === 'pending' || app.applicationStatus === 'submitted'
  ).length >= 2

  const handleApplicationTypeSelect = useCallback(async (formId) => {
    if (creatingRef.current) return
    creatingRef.current = true

    // formId can be either a specific form ID (e.g., 'unified-business-permit') or 'temporary-permit' parent
    // For temporary permit parent, we'll let the form loader handle the category selection
    if (formId === 'temporary-permit') {
      dashboardState.openApplicationForm({ formId, fromWelcome: false })
      dashboardState.setShowApplicationTypeSelector(false)
      creatingRef.current = false
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
      await fetchApplications()

      dashboardState.setSelectedApplicationId(applicationId)
      dashboardState.openEditApplicationForm(newApplication)
      dashboardState.setShowApplicationTypeSelector(false)
    } catch (err) {
      console.error('Failed to create application:', err)
      message.error(err.message || 'Failed to create application.')
    } finally {
      creatingRef.current = false
    }
  }, [dashboardState, fetchApplications, message])

  return {
    handleApplicationSelect,
    handleAddApplication,
    handleApplicationTypeSelect,
    draftLimitReached,
  }
}
