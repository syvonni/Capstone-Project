import { useState, useMemo, useEffect } from 'react'
import { theme } from 'antd'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import VariableConfiguration from './VariableConfiguration'
import VariableOverview from './VariableOverview'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { useVariableDependencies } from '../hooks/useVariableDependencies'
import { useVariableForm } from '../hooks/useVariableForm'
import { useAudit } from '@/shared/audit/hooks/useAudit'

export default function VariableDetailPanel({ variableId, variable, onSave }) {
  const { token } = theme.useToken()
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const isNew = variableId === 'new' || !variable

  const { auditLogs, auditLoading, refresh } = useAudit('variable', variableId, !isNew)

  const initialValues = useMemo(() => ({
    name: variable?.name || '',
    description: variable?.description || '',
    notes: variable?.notes || '',
    question: variable?.question || '',
    unit: variable?.unit || '',
    unitSingular: variable?.unitSingular || '',
    unitPlural: variable?.unitPlural || '',
    unitContextSingular: variable?.unitContextSingular || '',
    unitContextPlural: variable?.unitContextPlural || '',
    legalBasis: variable?.legalBasis || [],
    checklistId: variable?.checklistId?._id || null,
  }), [variable])

  const { dependencies, loading: loadingDependencies } = useVariableDependencies(variableId, isNew)
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
  } = useVariableForm({ variableId, variable, initialValues, onSave })

  const loading = saving || loadingDependencies

  // Reset form when variable changes
  useEffect(() => {
    if (variable && !isNew) {
      form.setFieldsValue(initialValues)
      resetChangeTracking(initialValues)
    }
  }, [variableId, variable, initialValues, form, resetChangeTracking, isNew])

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
        title={isNew ? 'New Variable' : variable?.name || 'Variable'}
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
        instructionSlotId="admin-variables"
        selectFields={!isNew ? [
          {
            label: 'Status',
            value: variable?.isActive ? 'active' : 'disabled',
            onChange: handleStatusChange,
            width: 120,
            disabled: dependencies.length > 0,
            tooltip: dependencies.length > 0 ? 'Cannot change status - variable has dependent items' : undefined,
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
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => ['variable_created', 'variable_updated', 'variable_disabled'].includes(e.event))}
        showEntityName={false}
        DetailPanelComponent={AuditEventDetails}
        onRefresh={refresh}
      />
      {stepUpModal}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <VariableConfiguration form={form} handleFormValuesChange={handleFormValuesChange} token={token} />
        ) : (
          <VariableOverview variable={variable} initialValues={initialValues} dependencies={dependencies} token={token} loading={loading} />
        )}
      </div>
    </div>
  )
}
