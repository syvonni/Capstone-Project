import { useCallback } from 'react'

/**
 * Hook for managing form values change handling
 * @param {Object} params
 * @param {Object} form - Ant Design form instance
 * @param {Function} setFormValues - Function to set form values
 * @param {Function} setHasUnsavedChanges - Function to set unsaved changes flag
 * @param {Function} onFormDataChanged - Callback when form data changes
 * @returns {Object} Form values change handler
 */
export function useApplicationFormValues({
  form,
  setFormValues,
  setHasUnsavedChanges,
  onFormDataChanged,
}) {
  const handleFormValuesChange = useCallback(
    (changedValues, _allValues) => {
      // Use form.getFieldsValue(true) instead of allValues because allValues
      // does not reliably include nested metadata fields rendered inside
      // Form.Item shouldUpdate render functions.
      const values = form ? form.getFieldsValue(true) : _allValues
      // Preserve the LOB section value, which is stored as an unregistered
      // form field and can be dropped by getFieldsValue in some paths.
      const businessActivities = form ? form.getFieldValue('businessActivities') : undefined
      const valuesWithLob = businessActivities !== undefined
        ? { ...values, businessActivities }
        : values
      setFormValues(valuesWithLob)
      setHasUnsavedChanges(true)
      // Notify parent of form data changes for real-time progress updates
      if (onFormDataChanged) {
        onFormDataChanged(valuesWithLob)
      }
    },
    [form, setFormValues, setHasUnsavedChanges, onFormDataChanged]
  )

  return {
    handleFormValuesChange,
  }
}
