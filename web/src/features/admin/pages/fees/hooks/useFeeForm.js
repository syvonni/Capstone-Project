import { useState, useEffect, useCallback } from 'react'
import { Form } from 'antd'
import useUndoRedo from '@/shared/hooks/useUndoRedo'
import { useFormChangeTracking } from '@/shared/hooks/useFormChangeTracking'

/**
 * Hook for managing fee form state with undo/redo and change tracking
 * Consolidates common logic used across fee detail panels
 */
export function useFeeForm(initialValues) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [formValues, setFormValues] = useState({})

  const { hasChanges, changedFields, resetChangeTracking, handleValuesChange } = useFormChangeTracking(initialValues)
  const { undo, redo, pushHistory, resetHistory, canUndo, canRedo } = useUndoRedo()

  const handleUndo = useCallback(() => {
    const entry = undo()
    if (entry) {
      form.setFieldsValue(entry)
      setFormValues(entry)
      handleValuesChange(entry, entry)
    }
  }, [form, undo, handleValuesChange])

  const handleRedo = useCallback(() => {
    const entry = redo()
    if (entry) {
      form.setFieldsValue(entry)
      setFormValues(entry)
      handleValuesChange(entry, entry)
    }
  }, [form, redo, handleValuesChange])

  const handleFormValuesChange = useCallback((changedValues, allValues) => {
    const currentValues = allValues || form.getFieldsValue()
    setFormValues(currentValues)
    const changed = Object.keys(initialValues).some(
      (key) => currentValues[key] !== initialValues[key]
    )
    if (changed) {
      pushHistory(currentValues)
    }
    handleValuesChange(changedValues, allValues)
  }, [form, initialValues, pushHistory, handleValuesChange])

  // Seed undo history and change-tracking baseline on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      form.setFieldsValue(initialValues)
      setFormValues(initialValues)
      resetHistory(initialValues)
      resetChangeTracking(initialValues)
    }, 0)
    return () => clearTimeout(timer)
  }, [form, initialValues, resetHistory, resetChangeTracking])

  return {
    form,
    formValues,
    setFormValues,
    saving,
    setSaving,
    hasChanges,
    changedFields,
    resetChangeTracking,
    handleValuesChange,
    handleUndo,
    handleRedo,
    handleFormValuesChange,
    canUndo,
    canRedo,
  }
}
