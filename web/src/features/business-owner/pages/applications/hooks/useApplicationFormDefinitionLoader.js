import { useState, useCallback } from 'react'
import { getPublicPermitFormByFormId } from '@/shared/services/permitFormService'

/**
 * Hook for loading form definitions
 */
export function useApplicationFormDefinitionLoader() {
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  const fetchFormDefinition = useCallback(async (formId, category = null, isEditing = false, onSetFormDefinition, onSetStep, onSetActiveSectionIndex, onSetFormValues, _form) => {
    setLoading(true)
    setLocalError(null)

    try {
      // Handle special case for temporary-permit parent - load first available category or show error
      let actualFormId = formId
      if (formId === 'temporary-permit') {
        // For now, load the first available temporary permit form
        // In the future, this should show category selection
        const { getPublicPermitFormsGrouped } = await import('@/shared/services/permitFormService')
        const groupedForms = await getPublicPermitFormsGrouped()
        const firstCategory = groupedForms?.temporaryPermit?.categories?.find(c => c.isActive)
        if (firstCategory) {
          actualFormId = firstCategory.formId
        } else {
          setLocalError('No temporary permit categories available')
          setLoading(false)
          return
        }
      }

      const response = await getPublicPermitFormByFormId(actualFormId)

      // Handle different response structures
      const data = response
      const form = data?.form || data

      if (form) {
        onSetFormDefinition(form)
        onSetActiveSectionIndex(-1)

        if (category && !isEditing) {
          onSetFormValues({ generalPermitCategory: category })
          form.setFieldValue('generalPermitCategory', category)
        }

        onSetStep('form')
      } else {
        setLocalError('Failed to load form definition')
        console.error('No form found in response:', data)
      }
    } catch (error) {
      setLocalError('Failed to load form definition')
      console.error('Failed to load form definition:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, localError, fetchFormDefinition }
}
