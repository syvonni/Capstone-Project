import { useState, useEffect, useMemo } from 'react'
import { theme } from 'antd'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import ViolationOverview from './ViolationOverview'
import ViolationConfiguration from './ViolationConfiguration'
import { useViolationForm } from '../hooks/useViolationForm'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { getInspectionItemsByViolation } from '@/features/admin/services/inspectionItemService'

export default function ViolationDetailPanel({ violationId, violation, onSave }) {
  const { token } = theme.useToken()
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasInspectionItems, setHasInspectionItems] = useState(false)

  const isNew = violationId === 'new' || !violation

  // Check if violation has associated inspection items
  useEffect(() => {
    const checkInspectionItems = async () => {
      if (!violationId || violationId === 'new') {
        setHasInspectionItems(false)
        return
      }
      try {
        const items = await getInspectionItemsByViolation(violationId)
        setHasInspectionItems(items && items.length > 0)
      } catch (error) {
        console.error('Failed to check inspection items:', error)
        setHasInspectionItems(false)
      }
    }
    checkInspectionItems()
  }, [violationId])

  const { auditLogs, auditLoading, refresh } = useAudit('violation', violationId, !isNew)

  const initialValues = useMemo(() => ({
    _id: violation?._id,
    name: violation?.name || '',
    description: violation?.description || '',
    notes: violation?.notes || '',
    severity: violation?.severity || '',
    legalBasis: violation?.legalBasis || [],
    correctiveAction: violation?.correctiveAction || '',
    inspectionItemId: violation?.inspectionItemId || null,
    isActive: violation?.isActive !== undefined ? violation.isActive : true,
  }), [violation])

  const {
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
    stepUpModal,
  } = useViolationForm({ violationId, violation, initialValues, onSave })

  const handleEnterEditMode = () => {
    setIsEditMode(true)
  }

  const handleExitEditMode = () => {
    setIsEditMode(false)
    form.setFieldsValue(initialValues)
    resetChangeTracking(initialValues)
  }

  // Reset form when violation changes
  useEffect(() => {
    if (violation && !isNew) {
      form.setFieldsValue(initialValues)
      resetChangeTracking(initialValues)
    }
  }, [violationId, violation, initialValues, form, resetChangeTracking, isNew])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={isNew ? 'New Violation' : violation?.name || 'Violation'}
        primaryButton={{
          text: 'Save',
          icon: <SaveOutlined />,
          onClick: handleSave,
          loading: saving,
          type: 'primary',
          disabled: !hasChanges,
        }}
        showUndoRedo={true}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        iconButtons={[
          { icon: <HistoryOutlined />, onClick: () => setHistoryModalOpen(true), title: 'History' },
        ]}
        actionButtons={isEditMode
          ? [{ text: 'Exit Edit Mode', icon: <CloseOutlined />, onClick: handleExitEditMode, type: 'default' }]
          : [{ text: 'Edit', icon: <EditOutlined />, onClick: handleEnterEditMode, type: 'default' }]}
        instructionSlotId="admin-violations"
        selectFields={!isNew ? [
          {
            label: 'Status',
            value: violation?.isActive ? 'active' : 'disabled',
            onChange: handleStatusChange,
            width: 120,
            disabled: hasInspectionItems,
            tooltip: hasInspectionItems ? 'Cannot change status - violation is associated with inspection items' : undefined,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ],
          },
        ] : []}
      />
      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('violation_'))}
        DetailPanelComponent={AuditEventDetails}
      />
      {stepUpModal}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <ViolationConfiguration form={form} handleFormValuesChange={handleFormValuesChange} token={token} initialValues={initialValues} />
        ) : (
          <ViolationOverview violation={violation} initialValues={initialValues} token={token} />
        )}
      </div>
    </div>
  )
}
