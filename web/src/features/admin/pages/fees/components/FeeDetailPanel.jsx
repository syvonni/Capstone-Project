import { useState, useEffect, useMemo } from 'react'
import { App, theme } from 'antd'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import AuditHistoryModal from '@/shared/components/AuditHistoryModal'
import FeeOverview from './FeeOverview'
import FeeConfiguration from './FeeConfiguration'
import FeeAuditDetailPanel from './FeeAuditDetailPanel'
import { createFee, updateFee, disableFee } from '@/features/admin/services/feeService'
import { getViolationsByFee } from '@/features/admin/services/violationService'
import { getPermitFormByFeeId } from '@/features/admin/services/permitFormService'
import { get } from '@/lib/http.js'
import { useFeeForm } from '../hooks/useFeeForm'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { useAudit } from '@/shared/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

export default function FeeDetailPanel({ feeId, fee, onSave, isMobile: _isMobile = false, hideStatusToggle = false, allowCreation = true }) {
  const { modal, message } = App.useApp()
  const { token } = theme.useToken()
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [violations, setViolations] = useState([])
  const [loadingViolations, setLoadingViolations] = useState(false)
  const [claimableDocument, setClaimableDocument] = useState(null)
  const [permitForm, setPermitForm] = useState(null)

  const isNew = allowCreation && feeId === 'new'
  const isPenaltyFee = fee?.category === 'penalty'
  const isClaimableDocumentFee = fee?.category === 'claimable_document'
  const isApplicationFee = fee?.category === 'application_fee'

  const { runWithStepUp, stepUpModal } = useStepUp()

  const { auditLogs, auditLoading, refreshAudit: _refreshAudit } = useAudit('fee', feeId)

  // Fetch violations by fee ID when viewing a penalty fee
  useEffect(() => {
    const fetchViolations = async () => {
      if (!feeId || feeId === 'new') {
        setViolations([])
        return
      }
      try {
        setLoadingViolations(true)
        const data = await getViolationsByFee(feeId)
        setViolations(data || [])
      } catch (error) {
        console.error('Failed to fetch violations:', error)
        setViolations([])
      } finally {
        setLoadingViolations(false)
      }
    }

    fetchViolations()
  }, [feeId])

  // Fetch claimable document by fee ID when viewing a claimable_document fee
  useEffect(() => {
    const fetchClaimableDocument = async () => {
      if (!feeId || feeId === 'new' || !isClaimableDocumentFee) {
        setClaimableDocument(null)
        return
      }
      try {
        const res = await get(`/api/business/admin/documents?feeId=${feeId}`)
        setClaimableDocument(res?.data?.[0] || null)
      } catch (error) {
        console.error('Failed to fetch claimable document:', error)
        setClaimableDocument(null)
      }
    }

    fetchClaimableDocument()
  }, [feeId, isClaimableDocumentFee])

  // Fetch permit form by fee ID when viewing application_fee
  useEffect(() => {
    const fetchPermitForm = async () => {
      if (!feeId || feeId === 'new' || !isApplicationFee) {
        setPermitForm(null)
        return
      }
      try {
        const data = await getPermitFormByFeeId(feeId)
        setPermitForm(data)
      } catch (error) {
        console.error('Failed to fetch permit form:', error)
        setPermitForm(null)
      }
    }

    fetchPermitForm()
  }, [feeId, isApplicationFee])

  const initialValues = useMemo(() => ({
    name: fee?.name || '',
    notes: fee?.notes || '',
    amount: fee?.amount || 0,
  }), [fee?.name, fee?.notes, fee?.amount])

  const {
    form,
    formValues: _formValues,
    setFormValues: _setFormValues,
    saving,
    setSaving,
    hasChanges,
    changedFields: _changedFields,
    resetChangeTracking,
    handleValuesChange: _handleValuesChange,
    handleUndo,
    handleRedo,
    handleFormValuesChange,
    canUndo,
    canRedo,
  } = useFeeForm(initialValues)


  const handleSave = async () => {
    try {
      setSaving(true)
      await form.validateFields()
      const values = form.getFieldsValue()

      if (isNew) {
        await runWithStepUp(async (stepUpToken) => {
          await createFee(values, { stepUpToken })
        })
        message.success('Fee created successfully')
      } else {
        await runWithStepUp(async (stepUpToken) => {
          await updateFee(feeId, values, { stepUpToken })
        })
        message.success('Fee updated successfully')
      }
      resetChangeTracking(initialValues)
      onSave()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to save fee:', error)
        message.error(error.message || 'Failed to save fee')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEnterEditMode = () => {
    setIsEditMode(true)
  }

  const handleExitEditMode = () => {
    setIsEditMode(false)
    form.setFieldsValue(initialValues)
    resetChangeTracking(initialValues)
  }

  const handleStatusChange = async (status) => {
    const newStatusLabel = status === 'active' ? 'Active' : 'Disabled'

    const getStatusMessage = (newStatus) => {
      switch (newStatus) {
        case 'active':
          return 'This will activate the fee and make it available for use in business permits.'
        case 'disabled':
          return 'This will disable the fee. It will no longer be available for new business permits.'
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
              await disableFee(feeId, { stepUpToken })
              message.success('Fee disabled successfully')
              if (onSave) onSave()
            } else {
              await updateFee(feeId, { isActive: true }, { stepUpToken })
              message.success('Fee activated successfully')
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


  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DetailHeader
        primaryButton={{
          text: isNew ? 'Create Fee' : 'Save',
          icon: <SaveOutlined />,
          onClick: handleSave,
          loading: saving,
          disabled: !hasChanges && !isNew,
          type: 'primary',
        }}
        showUndoRedo={!isNew}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        iconButtons={!isNew ? [
          { icon: <HistoryOutlined />, onClick: () => setHistoryModalOpen(true), title: 'History' },
        ] : []}
        actionButtons={isEditMode
          ? [{ text: 'Exit Edit Mode', icon: <CloseOutlined />, onClick: handleExitEditMode, type: 'default' }]
          : [{ text: 'Edit', icon: <EditOutlined />, onClick: handleEnterEditMode, type: 'default' }]}
        selectFields={!isNew && !isPenaltyFee && !hideStatusToggle ? [
          {
            label: 'Status',
            value: fee?.isActive ? 'active' : 'disabled',
            onChange: handleStatusChange,
            loading: updatingStatus,
            width: 120,
            options: STATUS_OPTIONS,
          }
        ] : []}
        instructionSlotId="admin-general-application-fees"
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isEditMode ? (
          <FeeConfiguration form={form} handleFormValuesChange={handleFormValuesChange} token={token} initialValues={initialValues} />
        ) : (
          <FeeOverview fee={fee} token={token} violations={violations} loading={loadingViolations} claimableDocument={claimableDocument} permitForm={permitForm} />
        )}
      </div>

      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        DetailPanelComponent={FeeAuditDetailPanel}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('fee_'))}
      />
      {stepUpModal}
    </div>
  )
}
