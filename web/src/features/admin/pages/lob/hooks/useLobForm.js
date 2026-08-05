import { useState, useCallback } from 'react'
import { Form, message, App } from 'antd'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { useFormChangeTracking } from '@/shared/hooks/useFormChangeTracking'
import useUndoRedo from '@/shared/hooks/useUndoRedo'
import { createLob, updateLob } from '@/features/admin/services/lobService'

export function useLobForm({ lobId, lob, initialValues, onSave }) {
  const { modal } = App.useApp()
  const [form] = Form.useForm()
  const { runWithStepUp, stepUpModal } = useStepUp()
  const [saving, setSaving] = useState(false)
  const [, setUpdatingStatus] = useState(false)

  const isNew = lobId === 'new' || !lob

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
    const newStatusLabel = status === 'active' ? 'Active' : status === 'disabled' ? 'Disabled' : 'Draft'

    const getStatusMessage = (newStatus) => {
      switch (newStatus) {
        case 'active':
          return 'This will make the LOB available for all business owners to select from. Please ensure all details are correct before proceeding.'
        case 'disabled':
          return 'This will disable the LOB. It will no longer be available as a selection for business owners.'
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
            await updateLob(lobId, { status }, { stepUpToken })
            message.success(`LOB ${newStatusLabel.toLowerCase()} successfully`)
            if (onSave) onSave()
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
    try {
      setSaving(true)
      const values = form.getFieldsValue()
      const lobData = {
        variables: values.variables || [],
        documents: values.documents || [],
        postRequirements: values.postRequirements || [],
        essentialCommodity: values.essentialCommodity || false,
        notes: values.notes || '',
        status: values.status || 'draft',
      }

      if (isNew) {
        await runWithStepUp(async (stepUpToken) => {
          const newLobData = {
            ...lobData,
            code: values.code,
            name: values.name,
            description: values.description,
            category: values.category,
            lineOfBusiness: values.lineOfBusiness,
            capitalTaxBrackets: values.capitalTaxBrackets || [],
            grossSalesTaxBrackets: values.grossSalesTaxBrackets || [],
          }
          await createLob(newLobData, { stepUpToken })
        })
        message.success('LOB created successfully')
      } else {
        await runWithStepUp(async (stepUpToken) => {
          await updateLob(lob._id, lobData, { stepUpToken })
        })
        message.success('LOB updated successfully')
      }

      resetChangeTracking(initialValues)
      resetHistory(initialValues)
      if (onSave) {
        onSave()
      }
    } catch (error) {
      console.error('Save failed:', error)
      message.error('Failed to save LOB')
    } finally {
      setSaving(false)
    }
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
