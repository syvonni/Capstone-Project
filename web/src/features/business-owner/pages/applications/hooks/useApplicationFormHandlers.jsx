import { useState, useEffect, useRef } from 'react'

/**
 * Hook for managing form-related handlers
 * @param {Object} params
 * @param {Object} business - Current business/application
 * @param {Object} dashboardState - Dashboard state for managing businesses
 * @param {Object} message - Ant Design message API
 * @returns {Object} Form handlers and state
 */
export function useApplicationFormHandlers({
  business,
  dashboardState,
  message,
}) {
  const [currentFormData, setCurrentFormData] = useState(business?.formData || {})
  const formRef = useRef(null)

  // Reset form data when business changes
  useEffect(() => {
    setCurrentFormData(business?.formData || {})
  }, [business?.businessId, business?._id, business?.formData])

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
    if (response?.businesses?.length) {
      dashboardState.setBusinesses(response.businesses)
    } else {
      dashboardState.fetchBusinesses()
    }
    // Only clear showAddForm if we were in add form mode (not viewing existing application)
    if (dashboardState?.showAddForm && !business) {
      dashboardState.setShowAddForm(false)
    }
  }

  const handleDraftCreated = async (newBusiness) => {
    dashboardState.setBusinesses(prev => [newBusiness, ...prev.filter(b => (b.businessId || b._id) !== (newBusiness.businessId || newBusiness._id))])
    dashboardState.setEditingApplication(newBusiness)
    dashboardState.setSelectedBusinessId(newBusiness.businessId || newBusiness._id)
    dashboardState.fetchBusinesses()

    // Mark welcome as completed if this draft was created from the welcome modal
    if (dashboardState?.fromWelcomeModal) {
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
        // Continue anyway - don't block the user
      }
    }
  }

  const handleDeleteDraft = async () => {
    const businessId = business?.businessId || business?._id
    if (!businessId) return

    try {
      const { deleteBusiness } = await import('@/features/business-owner/services/businessProfileService')
      await deleteBusiness(businessId)
      dashboardState.setBusinesses(prev => prev.filter(b => (b.businessId || b._id) !== businessId))
      dashboardState.setSelectedBusinessId(null)
      message.success('Draft deleted successfully')
    } catch (err) {
      console.error('Failed to delete draft:', err)
      message.error('Failed to delete draft')
    }
  }

  return {
    currentFormData,
    formRef,
    handleFormDataChanged,
    handleFormRef,
    handleFormSubmitted,
    handleDraftCreated,
    handleDeleteDraft,
  }
}
