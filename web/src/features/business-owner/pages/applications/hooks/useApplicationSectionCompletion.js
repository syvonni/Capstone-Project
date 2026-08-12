import { useMemo } from 'react'
import { hasMainFieldValue, isFieldComplete } from '@/features/business-owner/utils/formCompletion'

/**
 * Hook to calculate section completion status
 * Returns a map where key is section index and value is boolean indicating completion
 */
export function useApplicationSectionCompletion(visibleSections, formValues) {
  return useMemo(() => {
    const map = {}
    visibleSections.forEach((section, idx) => {
      // Handle LOB sections specially
      // The form is the source of truth for businessActivities now.
      if (section.type === 'lob_section') {
        const hasFormLob = Array.isArray(formValues.businessActivities) && formValues.businessActivities.length > 0
        map[idx] = hasFormLob
        return
      }

      const items = section.items || []
      const requiredFields = items.filter((f) => f.required)
      if (requiredFields.length > 0) {
        const allFilled = requiredFields.every((field) => {
          const key = field.key
          return isFieldComplete(field, key, formValues)
        })
        map[idx] = allFilled
        return
      }
      // No required fields: section is complete only if at least one field has a real value
      // Filter to only items that have a key/label (actual form fields)
      const formFields = items.filter(f => f.key || f.label)
      if (formFields.length === 0) {
        map[idx] = false
        return
      }
      // Check if at least one field has a meaningful value
      const hasAtLeastOneValue = formFields.some((field) => {
        const key = field.key
        return hasMainFieldValue(field, key, formValues)
      })
      map[idx] = hasAtLeastOneValue
    })
    return map
  }, [visibleSections, formValues])
}
