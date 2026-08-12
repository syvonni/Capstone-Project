import { useCallback } from 'react'

/**
 * Hook for syncing the LOB section changes into the parent form values state.
 * @param {Object} params
 * @param {Object} params.form - Ant Design form instance
 * @param {Function} params.setFormValues - Set form values state
 * @param {Function} params.setHasUnsavedChanges - Set unsaved changes flag
 * @param {Function} [params.onFormDataChanged] - Optional callback when form data changes
 * @returns {Object} LOB change handler
 */
export function useApplicationLobChangeHandler({ form, setFormValues, setHasUnsavedChanges, onFormDataChanged }) {
  const handleLobChange = useCallback((businessActivities) => {
    // Make sure the Ant Design form store itself has the unregistered field,
    // so subsequent getFieldValue / submit calls can retrieve it.
    form.setFieldsValue({ businessActivities })
    const allValues = form.getFieldsValue(true)
    // Use the value LOBSection just computed; form.getFieldsValue(true) can
    // lag for unregistered fields like businessActivities.
    allValues.businessActivities = businessActivities
    setFormValues(allValues)
    setHasUnsavedChanges(true)
    // Notify the overview infocard so its form progress link updates live
    if (onFormDataChanged) {
      onFormDataChanged(allValues)
    }
  }, [form, setFormValues, setHasUnsavedChanges, onFormDataChanged])

  return { handleLobChange }
}
