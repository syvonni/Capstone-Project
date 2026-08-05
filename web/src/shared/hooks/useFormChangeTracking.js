import { useState, useCallback, useRef } from 'react'

/**
 * Simple change tracking hook for forms
 * Tracks changes between baseline values and current form values
 */
export function useFormChangeTracking(initialValues) {
  const [hasChanges, setHasChanges] = useState(false)
  const [changedFields, setChangedFields] = useState([])
  const [baselineValues, setBaselineValues] = useState(initialValues)
  const changeDetectionId = useRef(0)

  // Reset change tracking with new baseline
  const resetChangeTracking = useCallback((newBaseline) => {
    setHasChanges(false)
    setChangedFields([])
    setBaselineValues(newBaseline)
  }, [])

  // Helper function to format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '(empty)'
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '(empty)'
      return `${value.length} item${value.length === 1 ? '' : 's'}`
    }
    if (typeof value === 'object') {
      return '(object)'
    }
    return String(value)
  }

  // Check for changes when form values change
  const handleValuesChange = useCallback((changedValues, allValues) => {
    if (!baselineValues) return

    // Capture this invocation's id; only the latest invocation commits state
    const callId = ++changeDetectionId.current

    const changes = []

    for (const key of Object.keys(baselineValues)) {
      const initialValue = baselineValues[key]
      const currentValue = allValues[key]

      // Skip if values are the same
      if (JSON.stringify(initialValue) === JSON.stringify(currentValue)) {
        continue
      }

      // Convert to display values
      const fromValue = formatValue(initialValue)
      const toValue = formatValue(currentValue)

      // Format field name (camelCase to Title Case)
      const fieldName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())

      changes.push({ field: fieldName, from: fromValue, to: toValue })
    }

    // Bail out if a newer change-detection invocation has started
    if (callId !== changeDetectionId.current) return

    setHasChanges(changes.length > 0)
    setChangedFields(changes)
  }, [baselineValues])

  return {
    hasChanges,
    changedFields,
    resetChangeTracking,
    handleValuesChange,
  }
}
