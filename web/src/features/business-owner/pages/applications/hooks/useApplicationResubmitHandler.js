import { useCallback } from 'react'

/**
 * Hook for handling the resubmit confirmation flow.
 * Validates the form, merges all values, and submits.
 * @param {Object} params
 * @param {Object} params.form - Ant Design form instance
 * @param {Function} params.handleSubmit - Submit handler
 * @param {Function} params.setShowResubmitModal - Function to close the resubmit modal
 * @returns {Object} Resubmit handler
 */
export function useApplicationResubmitHandler({ form, handleSubmit, setShowResubmitModal }) {
  const handleResubmitConfirm = useCallback(async () => {
    setShowResubmitModal(false)
    try {
      const values = await form.validateFields()
      // Merge with all form values (including unregistered fields like businessActivities)
      const allValues = { ...form.getFieldsValue(true), ...values }
      await handleSubmit(allValues, true)
    } catch {
      // Form validation or submission error - let the existing error handling work
    }
  }, [form, handleSubmit, setShowResubmitModal])

  return { handleResubmitConfirm }
}
