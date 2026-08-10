/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { theme } from 'antd'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import LobOverview from './LobOverview'
import LobConfiguration from './LobConfiguration'
import { useLobForm } from '../hooks/useLobForm'
import { getTaxBrackets } from '@/features/admin/services/feeService'
import { getVariables } from '@/features/admin/services/variableService'
import { getDocuments } from '@/features/admin/services/documentService'
import { getPostRequirements } from '@/features/admin/services/lobService'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

export default function LobDetailPanel({ lobId, lob, onSave }) {
  const { token } = theme.useToken()
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [variables, setVariables] = useState([])
  const [taxBrackets, setTaxBrackets] = useState([])
  const [documents, setDocuments] = useState([])
  const [postRequirements, setPostRequirements] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadingTaxBrackets, setLoadingTaxBrackets] = useState(false)

  const isNew = lobId === 'new' || !lob

  const { auditLogs, auditLoading, refresh } = useAudit('lob', lobId, !isNew)

  const initialValues = useMemo(() => {
    if (isNew) {
      return { code: '', name: '', category: '', description: '', notes: '', variables: [], documents: [], postRequirements: { required: [], conditional: [] }, essentialCommodity: false, status: 'draft' }
    }

    const variablesIds = (lob.variables || []).map(r => typeof r === 'object' ? r._id : r)
    const documentsIds = (lob.documents || []).map(d => typeof d === 'object' ? d._id : d)
    const requiredPostRequirementIds = (lob.postRequirements?.required || []).map(r => typeof r === 'object' ? r._id : r)
    const conditionalPostRequirementIds = (lob.postRequirements?.conditional || []).map(r => typeof r === 'object' ? r._id : r)

    return {
      code: lob.code,
      name: lob.name,
      description: lob.description,
      notes: lob.notes || '',
      category: lob.category,
      variables: variablesIds,
      documents: documentsIds,
      postRequirements: {
        required: requiredPostRequirementIds,
        conditional: conditionalPostRequirementIds,
      },
      essentialCommodity: lob.essentialCommodity || false,
      status: lob.status || 'active',
    }
  }, [isNew, lob])

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
    resetHistory,
    stepUpModal,
  } = useLobForm({ lobId, lob, initialValues, onSave })

  const handleEnterEditMode = () => {
    setIsEditMode(true)
  }

  const handleExitEditMode = () => {
    setIsEditMode(false)
    form.setFieldsValue(initialValues)
    resetChangeTracking(initialValues)
  }

  // Seed undo history and change-tracking baseline on mount
  useEffect(() => {
    form.setFieldsValue(initialValues)
    resetHistory(initialValues)
    resetChangeTracking(initialValues)
  }, [form, initialValues, resetHistory, resetChangeTracking])

  const loading = saving || loadingData || loadingTaxBrackets

  // Fetch variables, documents, and post requirements from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true)
        const [varsRes, docsRes, postReqsRes] = await Promise.allSettled([
          getVariables({ isActive: true }),
          getDocuments({ isActive: true }),
          getPostRequirements()
        ])
        if (varsRes.status === 'fulfilled') setVariables(varsRes.value)
        else console.error('Failed to fetch variables:', varsRes.reason)
        if (docsRes.status === 'fulfilled') setDocuments(docsRes.value)
        else console.error('Failed to fetch documents:', docsRes.reason)
        if (postReqsRes.status === 'fulfilled') setPostRequirements(postReqsRes.value)
        else console.error('Failed to fetch post requirements:', postReqsRes.reason)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  // Fetch tax brackets for the current LOB
  useEffect(() => {
    const fetchTaxBrackets = async () => {
      if (!lobId || lobId === 'new') {
        setTaxBrackets([])
        return
      }
      try {
        setLoadingTaxBrackets(true)
        const brackets = await getTaxBrackets({ lobId, isActive: true })
        setTaxBrackets(brackets)
      } catch (error) {
        console.error('Failed to fetch tax brackets:', error)
        setTaxBrackets([])
      } finally {
        setLoadingTaxBrackets(false)
      }
    }
    fetchTaxBrackets()
  }, [lobId, lob?.name])

  // Status options - remove draft if LOB is already active
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
  ].filter(option => {
    if (option.value === 'draft' && lob?.status === 'active') {
      return false
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
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
        instructionSlotId="admin-lob"
        selectFieldsPosition="left"
        selectFields={!isNew ? [
          {
            label: 'Status',
            value: lob?.status || 'draft',
            onChange: handleStatusChange,
            width: 120,
            options: statusOptions,
          },
        ] : []}
      />
      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        DetailPanelComponent={AuditEventDetails}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('lob_'))}
      />
      {stepUpModal}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <LobConfiguration form={form} handleFormValuesChange={handleFormValuesChange} variables={variables} documents={documents} postRequirements={postRequirements} />
        ) : (
          <LobOverview lob={lob} initialValues={initialValues} variables={variables} documents={documents} postRequirements={postRequirements} taxBrackets={taxBrackets} token={token} loading={loading} />
        )}
      </div>
    </div>
  )
}
