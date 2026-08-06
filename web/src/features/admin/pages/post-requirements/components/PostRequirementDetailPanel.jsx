import { useState, useMemo } from 'react'
import { theme } from 'antd'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import PostRequirementOverview from './PostRequirementOverview'
import PostRequirementConfiguration from './PostRequirementConfiguration'
import { usePostRequirementForm } from '../hooks/usePostRequirementForm'
import { usePostRequirementDependencies } from '../hooks/usePostRequirementDependencies'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

export default function PostRequirementDetailPanel({ postRequirementId, postRequirement, onSave }) {
  const { token } = theme.useToken()
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const isNew = postRequirementId === 'new' || !postRequirement

  const { auditLogs, auditLoading, refresh } = useAudit('post-requirement', postRequirementId, !isNew)

  const initialValues = useMemo(() => ({
    name: postRequirement?.name || '',
    description: postRequirement?.description || '',
    notes: postRequirement?.notes || '',
    legalBasis: postRequirement?.legalBasis || [],
    checklistId: postRequirement?.checklistId?._id || postRequirement?.checklistId || null,
    version: postRequirement?.version || 1,
  }), [postRequirement])

  const { dependencies } = usePostRequirementDependencies(postRequirementId, isNew)
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
  } = usePostRequirementForm({ postRequirementId, postRequirement, initialValues, onSave })

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
        title={isNew ? 'New Post-Requirement' : postRequirement?.name || 'Post-Requirement'}
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
        instructionSlotId="admin-post-requirements"
        selectFields={!isNew ? [
          {
            label: 'Status',
            value: postRequirement?.isActive ? 'active' : 'disabled',
            onChange: handleStatusChange,
            width: 120,
            disabled: dependencies.length > 0,
            tooltip: dependencies.length > 0 ? 'Cannot change status - post requirement has dependent items' : undefined,
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
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('post_requirement_'))}
        DetailPanelComponent={AuditEventDetails}
        onRefresh={refresh}
      />
      {stepUpModal}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <PostRequirementConfiguration form={form} handleFormValuesChange={handleFormValuesChange} token={token} />
        ) : (
          <PostRequirementOverview postRequirement={postRequirement} initialValues={initialValues} dependencies={dependencies} token={token} />
        )}
      </div>
    </div>
  )
}
