import { useRef, useEffect, useCallback } from 'react'
import { addBusiness } from '../../../services/businessProfileService'


/**
 * Hook for managing draft creation for permit applications
 * @param {Object} params
 * @param {boolean} isEditing - Whether editing an existing application
 * @param {string|null} initialRegistrationType - Initial registration type from welcome modal
 * @param {Function} onDraftCreated - Callback when draft is created
 * @param {Function} setLoading - Function to set loading state
 * @param {Function} setRegistrationType - Function to set registration type
 * @param {Function} setStep - Function to set form step
 * @param {Function} fetchFormDefinition - Function to fetch form definition
 * @param {Function} setFormDefinition - Function to set form definition
 * @param {Function} setActiveSectionIndex - Function to set active section index
 * @param {Function} setFormValues - Function to set form values
 * @param {Object} form - Form instance
 * @param {Function} setGeneralPermitCategory - Function to set general permit category
 * @param {Object} message - Ant Design message API
 * @returns {Object} Draft creation handlers
 */
export function useApplicationDraftCreation({
  isEditing,
  initialRegistrationType,
  onDraftCreated,
  setLoading,
  setRegistrationType,
  setStep,
  fetchFormDefinition,
  setFormDefinition,
  setActiveSectionIndex,
  setFormValues,
  form,
  setGeneralPermitCategory,
  message,
}) {
  const draftCreatedRef = useRef(false)
  const initialTypeRef = useRef(initialRegistrationType)

  // Auto-create draft when initialRegistrationType is provided (from welcome modal)
  // Runs ONLY on mount - ref flag prevents duplicate in React Strict Mode
  useEffect(() => {
    if (draftCreatedRef.current) return
    if (initialTypeRef.current && onDraftCreated && !isEditing) {
      draftCreatedRef.current = true
      const type = initialTypeRef.current
      if (type === 'general_permit') {
        setStep('category_selection')
        setLoading(false) // Stop loading spinner, show category selection
      } else {
        // Create draft for permit type
        ;(async () => {
          setLoading(true)
          try {
            const payload = {
              businessName: 'New Business Application',
              applicationStatus: 'draft',
              formType: 'permit',
              formData: {},
            }
            const response = await addBusiness(payload)
            const businessId = response.businessId
            const newBusiness = (response.profile?.businesses || []).find(
              (b) => (b.businessId || b._id) === businessId
            )
            if (newBusiness) {
              onDraftCreated(newBusiness)
            }
          } catch (err) {
            console.error('Failed to create draft:', err)
            message.error(err.message || 'Failed to create draft.')
            setLoading(false)
          }
          // Note: Don't setLoading(false) on success - onDraftCreated will unmount this component
        })()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTypeSelect = useCallback(
    async (formId) => {
      console.log('handleTypeSelect called with formId:', formId)
      setRegistrationType(formId)

      // Handle temporary permit parent - show category selection
      if (formId === 'temporary-permit') {
        setStep('category_selection')
        return
      }

      // For specific formIds, create draft when onDraftCreated provided (dashboard flow), else load form in-place
      if (onDraftCreated && !isEditing) {
        setLoading(true)
        try {
          const payload = {
            businessName: 'New Business Application',
            applicationStatus: 'draft',
            formType: formId,
            formId: formId,
            formData: {},
          }
          console.log('Creating draft with payload:', payload)
          const response = await addBusiness(payload)
          console.log('Draft creation response:', response)
          const businessId = response.businessId
          // The new business should be in response.profile.businesses array
          const newBusiness = (response.profile?.businesses || []).find(
            (b) => (b.businessId || b._id) === businessId
          )
          console.log('Found new business:', newBusiness)
          if (newBusiness && onDraftCreated) {
            console.log('Calling onDraftCreated with:', newBusiness)
            onDraftCreated(newBusiness)
          } else {
            console.error('Draft creation failed - newBusiness not found or onDraftCreated not provided')
            message.error('Draft created but could not load. Please select it from the list.')
          }
        } catch (err) {
          console.error('Failed to create draft:', err)
          message.error(err.message || 'Failed to create draft.')
        } finally {
          setLoading(false)
        }
        return
      }

      console.log('About to call fetchFormDefinition with formId:', formId)
      fetchFormDefinition(formId || 'unified-business-permit', null, isEditing, setFormDefinition, setStep, setActiveSectionIndex, setFormValues, form)
    },
    [
      onDraftCreated,
      isEditing,
      fetchFormDefinition,
      setFormDefinition,
      setStep,
      setActiveSectionIndex,
      setFormValues,
      form,
      message,
      setRegistrationType,
      setLoading,
    ]
  )

  const handleCategorySelect = useCallback(
    async (category) => {
      setGeneralPermitCategory(category)

      // Format kebab-case to Title Case for display
      const categoryLabel = category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

      if (onDraftCreated && !isEditing) {
        setLoading(true)
        try {
          const payload = {
            businessName: `General Permit - ${categoryLabel}`,
            applicationStatus: 'draft',
            formType: 'general_permit',
            category,
            formData: { generalPermitCategory: category },
          }
          const response = await addBusiness(payload)
          const businessId = response.businessId
          const newBusiness = (response.profile?.businesses || []).find(
            (b) => (b.businessId || b._id) === businessId
          )
          if (newBusiness && onDraftCreated) {
            onDraftCreated(newBusiness)
          } else {
            message.error('Draft created but could not load. Please select it from the list.')
          }
        } catch (err) {
          console.error('Failed to create draft:', err)
          message.error(err.message || 'Failed to create draft.')
        } finally {
          setLoading(false)
        }
        return
      }

      // For temporary permits, use the category-specific formId
      const categoryFormId = category ? `temporary-${category}` : 'temporary-permit'
      fetchFormDefinition(categoryFormId, category, isEditing, setFormDefinition, setStep, setActiveSectionIndex, setFormValues, form)
    },
    [
      onDraftCreated,
      isEditing,
      fetchFormDefinition,
      setFormDefinition,
      setStep,
      setActiveSectionIndex,
      setFormValues,
      form,
      message,
      setGeneralPermitCategory,
      setLoading,
    ]
  )

  return {
    handleTypeSelect,
    handleCategorySelect,
  }
}
