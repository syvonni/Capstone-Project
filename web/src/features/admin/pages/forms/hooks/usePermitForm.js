import { useState, useCallback } from 'react'
import { Form, message, App } from 'antd'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { useFormChangeTracking } from '@/shared/hooks/useFormChangeTracking'
import useUndoRedo from '@/shared/hooks/useUndoRedo'
import {
  createPermitForm,
  updatePermitForm,
  updatePermitFormStatus,
} from '@/features/admin/services/permitFormService'

export function usePermitForm({ permitFormId, permitForm, initialValues, onSave }) {
  const { modal } = App.useApp()
  const [form] = Form.useForm()
  const { runWithStepUp, stepUpModal } = useStepUp()
  const [saving, setSaving] = useState(false)
  const [, setUpdatingStatus] = useState(false)

  const isNew = permitFormId === 'new' || !permitForm

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
          return 'This will activate the permit form and make it available for business owners to use.'
        case 'disabled':
          return 'This will disable the permit form. It will no longer be available for new applications.'
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
              await updatePermitFormStatus(permitFormId, { isActive: false }, { stepUpToken })
              message.success('Permit form disabled successfully')
              if (onSave) onSave()
            } else {
              await updatePermitFormStatus(permitFormId, { isActive: true }, { stepUpToken })
              message.success('Permit form activated successfully')
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
          const created = await createPermitForm(values, { stepUpToken })
          message.success('Permit form created successfully')
          onSave?.(created)
        } else {
          const updated = await updatePermitForm(permitFormId, values, { stepUpToken })
          message.success('Permit form updated successfully')
          onSave?.(updated)
        }
        resetChangeTracking(initialValues)
        resetHistory(initialValues)
      } catch (error) {
        console.error('Failed to save permit form:', error)
        message.error(error.response?.data?.error?.message || 'Failed to save permit form')
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
