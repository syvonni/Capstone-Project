import { useState, useEffect, useCallback, useMemo } from 'react'
import { Form, App } from 'antd'
import { requestMaintenance, getMaintenanceCurrent, getMaintenanceApprovals, approveMaintenance, undoVote, cancelApprovedMaintenance, getMaintenancePublicStatus } from '@/features/admin/services/maintenanceService'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { REASON_PRESET_OTHER, REASON_PRESET_OPTIONS, DISABLE_REASON_PRESET_OPTIONS, DISABLE_PRESET_REASONS } from '../constants/maintenance.constants.js'

export default function useMaintenance() {
  const { modal } = App.useApp()
  const { runWithStepUp, stepUpModal } = useStepUp()
  const [form] = Form.useForm()
  const [current, setCurrent] = useState(null)
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestModalOptions, setRequestModalOptions] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const { message } = App.useApp()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, approvalsRes] = await Promise.all([
        getMaintenanceCurrent(),
        getMaintenanceApprovals(),
      ])
      let maintenance = statusRes?.maintenance || null
      if (!maintenance) {
        const publicStatus = await getMaintenancePublicStatus()
        if (publicStatus?.active) {
          maintenance = {
            isActive: true,
            message: publicStatus.message || '',
            expectedResumeAt: publicStatus.expectedResumeAt || null,
            activatedAt: publicStatus.activatedAt || null,
          }
        }
      }
      setCurrent(maintenance)
      setApprovals(
        (approvalsRes?.approvals || []).filter((a) => a.requestType === 'maintenance_mode')
      )
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Load maintenance data failed', err)
      message.error('Failed to load maintenance data. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
    const intervalId = window.setInterval(load, 30000)
    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [load])

  const handleSubmit = useCallback(
    async (values) => {
      try {
        let reason = ''
        const isDisable = values.action === 'disable'
        if (values.reasonPreset === REASON_PRESET_OTHER) {
          reason = values.reason || ''
        } else if (values.reasonPreset) {
          if (isDisable) {
            reason = DISABLE_PRESET_REASONS[values.reasonPreset]
              || DISABLE_REASON_PRESET_OPTIONS.find((o) => o.value === values.reasonPreset)?.label
              || ''
          } else {
            const preset = REASON_PRESET_OPTIONS.find((o) => o.value === values.reasonPreset)
            reason = preset?.label || ''
          }
        }
        const payload = {
          action: values.action,
          reason,
          message: values.message || '',
        }
        if (values.expectedResumeAt && typeof values.expectedResumeAt.toISOString === 'function') {
          payload.expectedResumeAt = values.expectedResumeAt.toISOString()
        }
        if (values.whenToStart === 'scheduled' && values.scheduledStartAt && typeof values.scheduledStartAt.toISOString === 'function') {
          payload.scheduledStartAt = values.scheduledStartAt.toISOString()
        }
        await runWithStepUp(async (stepUpToken) => {
          await requestMaintenance(payload, { stepUpToken })
        })
        message.success('Maintenance request submitted for approval')
        form.resetFields()
        setRequestModalOpen(false)
        await load()
      } catch (err) {
        if (err?.message !== 'Step-up cancelled') {
          console.error('Maintenance request failed', err)
          message.error('Failed to submit request. Please try again.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [form, message, load, runWithStepUp]
  )

  const handleConfirmSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      const values = await form.validateFields()
      await handleSubmit(values)
    } catch {
      setSubmitting(false)
    }
  }, [form, handleSubmit])

  const handleApprove = useCallback(
    async (approvalId, approved, comment = '') => {
      try {
        await runWithStepUp(async (stepUpToken) => {
          await approveMaintenance(approvalId, approved, comment, { stepUpToken })
        })
        message.success(approved ? 'Approved maintenance request' : 'Rejected maintenance request')
        await load()
      } catch (err) {
        if (err?.message !== 'Step-up cancelled') {
          console.error('Approve maintenance failed', err)
          message.error('Failed to process approval. Please try again.')
        }
      }
    },
    [message, load, runWithStepUp]
  )

  const handleCancelApproved = useCallback(
    async (approvalId) => {
      try {
        await runWithStepUp(async (stepUpToken) => {
          await cancelApprovedMaintenance(approvalId, { stepUpToken })
        })
        message.success('Cancellation request submitted for approval')
        await load()
      } catch (err) {
        if (err?.message !== 'Step-up cancelled') {
          console.error('Cancel approved maintenance failed', err)
          message.error('Failed to request cancellation. Please try again.')
        }
      }
    },
    [message, load, runWithStepUp]
  )

  const hasPendingDisableRequest = useMemo(
    () =>
      approvals.some(
        (a) =>
          a.status === 'pending' &&
          a.requestDetails?.action === 'disable'
      ),
    [approvals]
  )

  const openRequestModalOrBlock = useCallback(
    (options) => {
      const isDisableFlow = current?.isActive && !options?.forceScheduleMode
      if (isDisableFlow && hasPendingDisableRequest) {
        modal.warning({
          title: 'Ongoing disable request',
          content: 'A pending request to disable maintenance already exists. Please wait for it to be resolved before submitting another.',
        })
        return
      }
      setRequestModalOptions(options || {})
      setRequestModalOpen(true)
    },
    [current?.isActive, hasPendingDisableRequest, modal]
  )

  const setFormValues = useCallback((values) => {
    form.setFieldsValue(values)
  }, [form])

  return {
    form,
    current,
    approvals,
    loading,
    submitting,
    requestModalOpen,
    setRequestModalOpen,
    requestModalOptions,
    lastUpdated,
    load,
    handleSubmit,
    handleConfirmSubmit,
    handleApprove,
    handleUndoVote: undoVote,
    handleCancelApproved,
    openRequestModalOrBlock,
    setFormValues,
    stepUpModal,
  }
}