import { useState, useCallback } from 'react'
import { Form, message, App } from 'antd'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { useFormChangeTracking } from '@/shared/hooks/useFormChangeTracking'
import useUndoRedo from '@/shared/hooks/useUndoRedo'
import {
  createViolation,
  updateViolation,
} from '@/features/admin/services/violationService'

export function useViolationForm({ violationId, violation, initialValues, onSave }) {
  const { modal } = App.useApp()
  const [form] = Form.useForm()
  const { runWithStepUp, stepUpModal } = useStepUp()
  const [saving, setSaving] = useState(false)
  const [, setUpdatingStatus] = useState(false)

  const isNew = violationId === 'new' || !violation

  const { hasChanges, resetChangeTracking, handleValuesChange } = useFormChangeTracking(initialValues)
  const { undo, redo, pushHistory, resetHistory, canUndo, canRedo } = useUndoRedo()

  const handleUndo = useCallback(() => {
    const entry = undo()
    if (entry) {
      form.setFieldsValue(entry)
      handleValuesChange(entry, entry)
    }
  }, [form, undo, handleValuesChange])

  const handleRedo = useCallback(() => {
    const entry = redo()
    if (entry) {
      form.setFieldsValue(entry)
      handleValuesChange(entry, entry)
    }
  }, [form, redo, handleValuesChange])

  const handleFormValuesChange = useCallback((changedValues, allValues) => {
    const currentValues = allValues || form.getFieldsValue()
    const changed = Object.keys(initialValues).some(
      (key) => JSON.stringify(currentValues[key]) !== JSON.stringify(initialValues[key])
    )
    if (changed) {
      pushHistory(currentValues)
    }
    handleValuesChange(changedValues, allValues)
  }, [form, initialValues, pushHistory, handleValuesChange])

  const handleStatusChange = async (status) => {
    const newStatusLabel = status === 'active' ? 'Active' : 'Disabled'

    const getStatusMessage = (newStatus) => {
      switch (newStatus) {
        case 'active':
          return 'This will activate the violation and make it available for use in inspections.'
        case 'disabled':
          return 'This will disable the violation. It will no longer be available for new inspections.'
        default:
          return `Are you sure you want to change the status to ${newStatusLabel}?`
      }
    }

    modal.confirm({
      title: 'Change Status',
      content: getStatusMessage(status),
      okText: 'Change',
      cancelText: 'Cancel',
      onOk: async () => {
        setUpdatingStatus(true)
        try {
          await runWithStepUp(async (stepUpToken) => {
            if (status === 'disabled') {
              await updateViolation(violationId, { isActive: false }, { stepUpToken })
              message.success('Violation disabled successfully')
              if (onSave) onSave()
            } else {
              await updateViolation(violationId, { isActive: true }, { stepUpToken })
              message.success('Violation activated successfully')
              if (onSave) onSave()
            }
          })
        } catch (error) {
          if (error?.message !== 'Step-up cancelled') {
            console.error('Failed to update status:', error)
            message.error(error.message || 'Failed to update status')
          }
        } finally {
          setUpdatingStatus(false)
        }
      },
    })
  }

  const handleSave = async () => {
    const saveOperation = async (stepUpToken) => {
      setSaving(true)
      try {
        const values = form.getFieldsValue()
        if (isNew) {
          const created = await createViolation(values, { stepUpToken })
          message.success('Violation created successfully')
          onSave?.(created)
        } else {
          const updated = await updateViolation(violationId, values, { stepUpToken })
          message.success('Violation updated successfully')
          onSave?.(updated)
        }
        resetChangeTracking(initialValues)
        resetHistory(initialValues)
      } catch (error) {
        console.error('Failed to save violation:', error)
        message.error(error.response?.data?.error?.message || 'Failed to save violation')
      } finally {
        setSaving(false)
      }
    }

    runWithStepUp(saveOperation)
  }

  return {
    form,
    saving,
    hasChanges,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleFormValuesChange,
    handleStatusChange,
    handleSave,
    resetChangeTracking,
    resetHistory,
    stepUpModal,
  }
}
