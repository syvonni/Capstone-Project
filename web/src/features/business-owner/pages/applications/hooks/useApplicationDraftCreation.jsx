import { useRef, useEffect, useCallback } from 'react'
import { createApplication } from '../../../services/applicationService'


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
  message,
}) {
  const draftCreatedRef = useRef(false)
  const initialTypeRef = useRef(initialRegistrationType)
  const creatingRef = useRef(false)

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
            const response = await createApplication(payload)
            const application = response.application
            if (application) {
              onDraftCreated(application)
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
      if (creatingRef.current) return
      creatingRef.current = true
      console.log('handleTypeSelect called with formId:', formId)
      setRegistrationType(formId)

      // Handle temporary permit parent - show category selection
      if (formId === 'temporary-permit') {
        setStep('category_selection')
        creatingRef.current = false
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
          const response = await createApplication(payload)
          console.log('Draft creation response:', response)
          const application = response.application
          console.log('Found new application:', application)
          if (application && onDraftCreated) {
            console.log('Calling onDraftCreated with:', application)
            onDraftCreated(application)
          } else {
            console.error('Draft creation failed - application not found or onDraftCreated not provided')
            message.error('Draft created but could not load. Please select it from the list.')
          }
        } catch (err) {
          console.error('Failed to create draft:', err)
          message.error(err.message || 'Failed to create draft.')
        } finally {
          setLoading(false)
          creatingRef.current = false
        }
        return
      }

      console.log('About to call fetchFormDefinition with formId:', formId)
      fetchFormDefinition(formId || 'unified-business-permit', null, isEditing, setFormDefinition, setStep, setActiveSectionIndex, setFormValues, form)
      creatingRef.current = false
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

  return {
    handleTypeSelect,
  }
}
