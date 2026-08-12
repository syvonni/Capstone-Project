import { useState, useEffect, useRef } from 'react'
import { markWelcomeComplete } from '@/features/authentication/services/authService'

/**
 * Hook for managing form-related handlers
 * @param {Object} params
 * @param {Object} application - Current application
 * @param {Object} dashboardState - Dashboard state for managing applications
 * @param {Object} message - Ant Design message API
 * @returns {Object} Form handlers and state
 */
export function useApplicationFormHandlers({
  application,
  dashboardState,
  message,
}) {
  const [currentFormData, setCurrentFormData] = useState(application?.formData || {})
  const formRef = useRef(null)

  // Reset form data when application changes
  useEffect(() => {
    setCurrentFormData(application?.formData || {})
  }, [application?.applicationId, application?._id, application?.formData])

  const handleFormDataChanged = (newFormDataOrResponse) => {
    // If it's a response from save, extract the formData
    const newFormData = newFormDataOrResponse?.formData || newFormDataOrResponse
    setCurrentFormData(newFormData)
  }

  const handleFormRef = (ref) => {
    formRef.current = ref
    if (dashboardState?.formRef) {
      dashboardState.formRef.current = ref
    }
  }

  const handleFormSubmitted = (response) => {
    message.success('Application submitted successfully')

    const submittedApplication =
      response?.applicationes?.[0] ||
      response?.application ||
      response?.data?.application

    if (submittedApplication) {
      const appId = submittedApplication.applicationId || submittedApplication._id

      // Merge formData and documents so the response doesn't wipe out values
      // the backend didn't echo back (e.g., category upload selections).
      const mergedApplication = {
        ...application,
        ...submittedApplication,
        formData: {
          ...(application?.formData || {}),
          ...(submittedApplication?.formData || {}),
        },
        lguDocuments: {
          ...(application?.lguDocuments || {}),
          ...(submittedApplication?.lguDocuments || submittedApplication?.documents || {}),
        },
      }

      dashboardState.setApplications((prev) =>
        prev.map((app) =>
          (app.applicationId || app._id) === appId ? { ...app, ...mergedApplication } : app
        )
      )

      if (application) {
        // Viewing/editing an existing draft: keep the panel open but update the app object
        dashboardState.setEditingApplication(mergedApplication)
      } else {
        // Creating a new application: close the add form and select the submitted app
        dashboardState.setShowAddForm(false)
        dashboardState.setSelectedApplicationId(appId)
        dashboardState.setEditingApplication(null)
      }
    } else if (application) {
      // Final submit response did not include the updated application, but we know it was submitted.
      // The backend uses 'pending_review' as the post-submit status, so mirror that locally
      // so the form becomes read-only right away.
      const appId = application.applicationId || application._id
      const updatedApp = {
        ...application,
        applicationStatus: 'pending_review',
        permitStatus: 'pending_review',
      }
      dashboardState.setApplications((prev) =>
        prev.map((app) =>
          (app.applicationId || app._id) === appId ? { ...app, ...updatedApp } : app
        )
      )
      dashboardState.setEditingApplication(updatedApp)
    } else {
      // Creating a new application but the response did not include the submitted app.
      // Close the form and refetch the list so the user sees the updated status.
      dashboardState.setShowAddForm(false)
      dashboardState.setEditingApplication(null)
    }

    dashboardState.fetchApplications()
  }

  const handleDraftCreated = async (newApplication) => {
    dashboardState.setApplications(prev => [newApplication, ...prev.filter(app => (app.applicationId || app._id) !== (newApplication.applicationId || newApplication._id))])
    dashboardState.setEditingApplication(newApplication)
    dashboardState.setSelectedApplicationId(newApplication.applicationId || newApplication._id)
    dashboardState.fetchApplications()

    // Mark welcome as completed if this draft was created from the welcome modal
    if (dashboardState?.fromWelcomeModal) {
      try {
        await markWelcomeComplete()
      } catch (err) {
        console.error('Failed to mark welcome as completed:', err)
        // Continue anyway - don't block the user
      }
    }
  }

  return {
    currentFormData,
    formRef,
    handleFormDataChanged,
    handleFormRef,
    handleFormSubmitted,
    handleDraftCreated,
  }
}
