import { useMemo } from 'react'

/**
 * Hook to calculate section completion status
 * Returns a map where key is section index and value is boolean indicating completion
 */
export function useSectionCompletion(visibleSections, formValues) {
  return useMemo(() => {
    const hasValue = (val) => {
      if (val === undefined || val === null) return false
      if (typeof val === 'string') return val.trim() !== ''
      if (typeof val === 'boolean') return true
      if (typeof val === 'number') return true
      if (Array.isArray(val)) {
        // Array must have at least one item with actual content
        if (val.length === 0) return false
        return val.some(item => {
          if (item === undefined || item === null) return false
          if (typeof item === 'string') return item.trim() !== ''
          if (typeof item === 'boolean') return true
          if (typeof item === 'number') return true
          if (typeof item === 'object' && item !== null) {
            // Object in array must have at least one non-empty value
            // Special case: file upload objects with cid or url are valid
            if (item.cid || item.url || item.ipfsCid) return true
            const objValues = Object.values(item)
            if (objValues.length === 0) return false
            return objValues.some(v =>
              v !== undefined && v !== null && v !== '' &&
              !(typeof v === 'string' && v.trim() === '')
            )
          }
          return false
        })
      }
      if (typeof val === 'object' && val !== null) {
        // Object must have at least one non-empty value
        const values = Object.values(val)
        if (values.length === 0) return false
        return values.some(v => {
          if (v === undefined || v === null) return false
          if (typeof v === 'string') return v.trim() !== ''
          if (typeof v === 'boolean') return true
          if (typeof v === 'number') return true
          if (Array.isArray(v)) return v.length > 0 && hasValue(v)
          if (typeof v === 'object' && v !== null) {
            return Object.values(v).some(nested => 
              nested !== undefined && nested !== null && nested !== '' &&
              !(typeof nested === 'string' && nested.trim() === '')
            )
          }
          return false
        })
      }
      return false
    }
    const map = {}
    visibleSections.forEach((section, idx) => {
      const items = section.items || []
      const requiredFields = items.filter((f) => f.required)
      if (requiredFields.length > 0) {
        const allFilled = requiredFields.every((field) => {
          const key = field.key
          const val = formValues[key]
          return hasValue(val)
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
        const val = formValues[key]
        return hasValue(val)
      })
      map[idx] = hasAtLeastOneValue
    })
    return map
  }, [visibleSections, formValues])
}
