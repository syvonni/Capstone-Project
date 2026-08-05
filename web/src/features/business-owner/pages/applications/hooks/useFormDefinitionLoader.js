import { useState, useCallback } from 'react'
import { getPublicPermitFormByFormId } from '@/shared/services/permitFormService'

/**
 * Hook for loading form definitions
 */
export function useFormDefinitionLoader() {
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  const fetchFormDefinition = useCallback(async (type, category = null, isEditing = false, onSetFormDefinition, onSetStep, onSetActiveSectionIndex, onSetFormValues, form) => {
    setLoading(true)
    setLocalError(null)

    try {
      const response = await getPublicPermitFormByFormId(type)
      if (response?.success && response?.form) {
        onSetFormDefinition(response.form)
        onSetActiveSectionIndex(-1)

        if (category && !isEditing) {
          onSetFormValues({ generalPermitCategory: category })
          form.setFieldValue('generalPermitCategory', category)
        }

        onSetStep('form')
      } else {
        setLocalError('Failed to load form definition')
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
