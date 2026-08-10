import { useState, useEffect, useMemo } from 'react'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import ChecklistOverview from './ChecklistOverview'
import ChecklistConfiguration from './ChecklistConfiguration'
import { useChecklistForm } from '../hooks/useChecklistForm'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { getChecklist } from '@/features/admin/services/checklistService'

export default function ChecklistDetailPanel({ checklistId, checklist, onSave }) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [fetchedChecklist, setFetchedChecklist] = useState(null)
  const [loadingChecklist, setLoadingChecklist] = useState(false)

  const isNew = checklistId === 'new' || (!checklist && !fetchedChecklist)

  // Fetch checklist by ID if not provided via prop
  useEffect(() => {
    if (checklistId && checklistId !== 'new' && !checklist) {
      setLoadingChecklist(true)
      getChecklist(checklistId)
        .then(data => setFetchedChecklist(data))
        .catch(err => console.error('Failed to fetch checklist:', err))
        .finally(() => setLoadingChecklist(false))
    }
  }, [checklistId, checklist])

  const effectiveChecklist = checklist || fetchedChecklist

  const { auditLogs, auditLoading, refresh } = useAudit('checklist', checklistId, !isNew)

  const initialValues = useMemo(() => {
    // Transform items to just IDs for multi-select
    // item.inspectionItemId may be a populated object or a string ID
    const itemIds = (effectiveChecklist?.items || []).map(item => {
      const inspItem = item?.inspectionItemId
      if (inspItem && typeof inspItem === 'object') {
        return inspItem._id
      }
      if (typeof inspItem === 'string') {
        return inspItem
      }
      if (typeof item === 'string') {
        return item
      }
      return null
    }).filter(Boolean)

    return {
      name: effectiveChecklist?.name || '',
      description: effectiveChecklist?.description || '',
      notes: effectiveChecklist?.notes || '',
      legalBasis: effectiveChecklist?.legalBasis || [],
      items: itemIds,
      isActive: effectiveChecklist?.isActive !== undefined ? effectiveChecklist.isActive : true,
      postRequirementId: effectiveChecklist?.postRequirementId?._id || effectiveChecklist?.postRequirementId || null,
    }
  }, [effectiveChecklist])

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
  } = useChecklistForm({ checklistId, checklist: effectiveChecklist, initialValues, onSave })

  const loading = saving || loadingChecklist

  const handleEnterEditMode = () => {
    setIsEditMode(true)
  }

  const handleExitEditMode = () => {
    setIsEditMode(false)
    form.setFieldsValue(initialValues)
    resetChangeTracking(initialValues)
  }

  // Reset form when checklist changes
  useEffect(() => {
    if (effectiveChecklist && !isNew) {
      form.setFieldsValue(initialValues)
      resetChangeTracking(initialValues)
    }
  }, [checklistId, effectiveChecklist, initialValues, form, resetChangeTracking, isNew])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={isNew ? 'New Checklist' : effectiveChecklist?.name || 'Checklist'}
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
        instructionSlotId="admin-checklists"
        selectFields={!isNew ? [
          {
            label: 'Status',
            value: effectiveChecklist?.isActive ? 'active' : 'disabled',
            onChange: handleStatusChange,
            width: 120,
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
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('checklist_'))}
        DetailPanelComponent={AuditEventDetails}
      />
      {stepUpModal}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <ChecklistConfiguration form={form} handleFormValuesChange={handleFormValuesChange} />
        ) : (
          <ChecklistOverview checklist={effectiveChecklist} initialValues={initialValues} loading={loading} />
        )}
      </div>
    </div>
  )
}
