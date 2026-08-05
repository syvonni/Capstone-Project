import { useState, useEffect, useMemo } from 'react'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import AuditHistoryModal from '@/shared/components/AuditHistoryModal'
import InspectionItemAuditDetailPanel from './InspectionItemAuditDetailPanel'
import InspectionItemOverview from './InspectionItemOverview'
import InspectionItemConfiguration from './InspectionItemConfiguration'
import { useInspectionItemForm } from '../hooks/useInspectionItemForm'
import { useAudit } from '@/shared/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { getChecklistsByInspectionItem } from '@/features/admin/services/checklistService'

export default function InspectionItemDetailPanel({ inspectionItemId, inspectionItem, onSave }) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [associatedChecklists, setAssociatedChecklists] = useState([])

  const isNew = inspectionItemId === 'new' || !inspectionItem

  const { auditLogs, auditLoading, refresh: refreshAudit } = useAudit('inspection-item', inspectionItemId, !isNew)

  useEffect(() => {
    const fetchChecklists = async () => {
      if (!isNew && inspectionItemId) {
        try {
          const checklists = await getChecklistsByInspectionItem(inspectionItemId)
          setAssociatedChecklists(checklists)
        } catch (error) {
          console.error('Failed to fetch associated checklists:', error)
        }
      }
    }
    fetchChecklists()
  }, [inspectionItemId, isNew])

  const initialValues = useMemo(() => ({
    name: inspectionItem?.name || '',
    question: inspectionItem?.question || '',
    notes: inspectionItem?.notes || '',
    legalBasis: inspectionItem?.legalBasis || [],
    violationId: inspectionItem?.violationId?._id || inspectionItem?.violationId || '',
    isActive: inspectionItem?.isActive !== undefined ? inspectionItem.isActive : true,
  }), [inspectionItem])

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
  } = useInspectionItemForm({ inspectionItemId, inspectionItem, initialValues, onSave })

  const handleEnterEditMode = () => {
    setIsEditMode(true)
  }

  const handleExitEditMode = () => {
    setIsEditMode(false)
    form.setFieldsValue(initialValues)
    resetChangeTracking(initialValues)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={isNew ? 'New Inspection Item' : inspectionItem?.name || 'Inspection Item'}
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
        instructionSlotId="admin-inspection-items"
        selectFields={!isNew ? [
          {
            label: 'Status',
            value: inspectionItem?.isActive ? 'active' : 'disabled',
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
        onRefresh={refreshAudit}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('inspection_item_'))}
        DetailPanelComponent={InspectionItemAuditDetailPanel}
      />
      {stepUpModal}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <InspectionItemConfiguration form={form} handleFormValuesChange={handleFormValuesChange} initialValues={initialValues} />
        ) : (
          <InspectionItemOverview inspectionItem={inspectionItem} initialValues={initialValues} violation={inspectionItem?.violationId} associatedChecklists={associatedChecklists} />
        )}
      </div>
    </div>
  )
}
