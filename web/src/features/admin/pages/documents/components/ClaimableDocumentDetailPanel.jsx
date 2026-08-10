import { useState, useEffect, useMemo, useRef } from 'react'
import { Form, Input, Typography, theme, message, Grid } from 'antd'
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import DocumentPreviewModal from '@/shared/components/DocumentPreviewModal'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import ChangesSummaryModal from '@/shared/components/ChangesSummaryModal'
import ClaimableDocumentOverview from './ClaimableDocumentOverview'
import ClaimableDocumentConfiguration from './ClaimableDocumentConfiguration'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { useFormChangeTracking } from '@/shared/hooks/useFormChangeTracking'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { createDocument, updateDocument } from '@/features/admin/services/documentService'
import { getChecklists } from '@/features/admin/services/checklistService'
import { getPermitForms } from '@/features/admin/services/permitFormService'
import { useDocumentDependencies } from '../hooks/useDocumentDependencies'
import { validateTemplateTexts } from '../utils/documentValidation'

const { Text } = Typography
const { TextArea } = Input

export default function DocumentDetailPanel({ documentId, document, onSave, onDelete: _onDelete }) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const [form] = Form.useForm()
  const htmlUploadInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [templateHtml, setTemplateHtml] = useState(document?.templateHtml || '')
  const [templateImages, setTemplateImages] = useState(document?.templateImages || [])
  const [templateTexts, setTemplateTexts] = useState(document?.templateTexts || [])
  const [previewModal, setPreviewModal] = useState({ open: false, url: null, label: '', type: 'image' })
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [formDefinitions, setFormDefinitions] = useState([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [checklists, setChecklists] = useState([])
  const [loadingChecklists, setLoadingChecklists] = useState(false)
  const [permitForms, setPermitForms] = useState([])
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { auditLogs, loading: auditLoading, refresh } = useAudit('document', documentId, historyModalOpen && documentId !== 'new')

  const isNew = documentId === 'new'
  const isMobile = !screens.lg
  const { dependencies } = useDocumentDependencies(documentId, isNew)

  const initialValues = useMemo(() => ({
    name: document?.name || '',
    notes: document?.notes || '',
    formIds: document?.formIds || [],
    checklistId: document?.checklistId?._id?.toString() || document?.checklistId?.toString() || undefined,
  }), [document])

  const { hasChanges, changedFields, resetChangeTracking, handleValuesChange } = useFormChangeTracking(initialValues)

  const handleEnterEditMode = () => {
    setIsEditMode(true)
  }

  const handleExitEditMode = () => {
    setIsEditMode(false)
    form.resetFields()
    resetChangeTracking(initialValues)
    setTemplateHtml(document?.templateHtml || '')
    setTemplateImages(document?.templateImages || [])
    setTemplateTexts(document?.templateTexts || [])
  }

  // Create a map of permit form IDs to form names
  const permitFormMap = useMemo(() => {
    const map = {}
    permitForms.forEach(form => {
      map[form._id] = form
    })
    return map
  }, [permitForms])


  useEffect(() => {
    if (document || isNew) {
      form.setFieldsValue(initialValues)
    }
  }, [document, isNew, form, initialValues])

  useEffect(() => {
    if (document) {
      setTemplateHtml(document.templateHtml || '')
      setTemplateImages(document.templateImages || [])
      setTemplateTexts(document.templateTexts || [])
    }
  }, [document])

  useEffect(() => {
    const fetchFormDefinitions = async () => {
      try {
        setLoadingForms(true)
        const response = await getPermitForms()
        // Handle both direct array response and wrapped response
        const forms = Array.isArray(response) ? response : (response?.forms || [])
        // Convert _id to string for proper comparison with formIds
        const formsWithStringIds = forms.map(form => ({
          ...form,
          _id: form._id?.toString()
        }))
        setFormDefinitions(formsWithStringIds)
      } catch (error) {
        console.error('Failed to fetch form definitions:', error)
        message.error('Failed to load form definitions')
      } finally {
        setLoadingForms(false)
      }
    }
    fetchFormDefinitions()
  }, [])

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        setLoadingChecklists(true)
        const response = await getChecklists({ isActive: true })
        setChecklists(response || [])
      } catch (error) {
        console.error('Failed to fetch checklists:', error)
        message.error('Failed to load checklists')
      } finally {
        setLoadingChecklists(false)
      }
    }
    fetchChecklists()
  }, [])

  useEffect(() => {
    const fetchPermitForms = async () => {
      try {
        const response = await getPermitForms()
        // Handle both direct array response and wrapped response
        const forms = Array.isArray(response) ? response : (response?.forms || [])
        setPermitForms(forms)
      } catch (error) {
        console.error('Failed to fetch permit forms:', error)
      }
    }
    fetchPermitForms()
  }, [])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      // Validate templateTexts before saving
      const validation = validateTemplateTexts(templateTexts, templateHtml)
      if (!validation.valid) {
        message.error(`Validation failed: ${validation.errors.join(', ')}`)
        return
      }
      if (validation.warnings.length > 0) {
        message.warning(`Warnings: ${validation.warnings.join(', ')}`)
      }

      setSaving(true)

      const payload = {
        name: values.name,
        notes: values.notes,
        formIds: values.formIds,
        checklistId: values.checklistId,
        templateHtml,
        templateImages,
        templateTexts,
        isActive: true,
        version: 1,
        effectiveDate: new Date(),
      }

      if (isNew) {
        await runWithStepUp(async (stepUpToken) => {
          await createDocument(payload, { stepUpToken })
        })
        message.success('Document created successfully')
        resetChangeTracking(initialValues)
      } else {
        setConfirmModalOpen(true)
        setSaving(false)
        return
      }

      await onSave?.()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Save failed:', error)
        message.error(error.message || 'Failed to save document')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmPublish = async () => {
    try {
      setSaving(true)
      const values = form.getFieldsValue()
      const payload = {
        name: values.name,
        notes: values.notes,
        formIds: values.formIds,
        checklistId: values.checklistId,
        templateHtml,
        templateImages,
        templateTexts,
        isActive: true,
        version: 1,
        effectiveDate: new Date(),
      }

      await runWithStepUp(async (stepUpToken) => {
        await updateDocument(documentId, payload, { stepUpToken })
      })
      message.success('Document updated successfully')
      setConfirmModalOpen(false)
      resetChangeTracking(initialValues)
      await onSave?.()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Publish failed:', error)
        message.error(error.message || 'Failed to publish document')
      }
    } finally {
      setSaving(false)
    }
  }


  const primaryButton = {
    text: 'Save',
    icon: <SaveOutlined />,
    onClick: handleSave,
    loading: saving,
    disabled: !hasChanges && !isNew,
    type: 'primary',
  }

  const actionButtons = !isNew ? [
    ...(isEditMode ? [
      { text: 'Exit Edit Mode', icon: <CloseOutlined />, onClick: handleExitEditMode, type: 'default' },
    ] : [
      { text: 'Edit', icon: <EditOutlined />, onClick: handleEnterEditMode, type: 'default' },
    ]),
  ] : []

  const iconButtons = !isNew ? [
    { icon: <HistoryOutlined />, onClick: () => setHistoryModalOpen(true), title: 'History' },
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        primaryButton={primaryButton}
        actionButtons={actionButtons}
        iconButtons={iconButtons}
        instructionSlotId="admin-claimable-documents-management"
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {isEditMode ? (
          <ClaimableDocumentConfiguration
            form={form}
            handleFormValuesChange={handleValuesChange}
            templateHtml={templateHtml}
            setTemplateHtml={setTemplateHtml}
            templateImages={templateImages}
            setTemplateImages={setTemplateImages}
            templateTexts={templateTexts}
            setTemplateTexts={setTemplateTexts}
            formDefinitions={formDefinitions}
            loadingForms={loadingForms}
            checklists={checklists}
            loadingChecklists={loadingChecklists}
            token={token}
            saving={saving}
            htmlUploadInputRef={htmlUploadInputRef}
            setPreviewModal={setPreviewModal}
          />
        ) : (
          <ClaimableDocumentOverview
            document={document}
            templateHtml={templateHtml}
            templateImages={templateImages}
            templateTexts={templateTexts}
            permitFormMap={permitFormMap}
            dependencies={dependencies}
            token={token}
            isMobile={isMobile}
          />
        )}
      </div>

      <DocumentPreviewModal
        open={previewModal.open}
        onClose={() => setPreviewModal({ open: false, url: null, label: '', type: 'image' })}
        url={previewModal.url}
        label={previewModal.label}
        type={previewModal.type}
        isBlob={previewModal.url?.startsWith('blob:')}
      />
      {stepUpModal}
      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        DetailPanelComponent={AuditEventDetails}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('document_') && !e.event.startsWith('document_group_'))}
      />
      <ChangesSummaryModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmPublish}
        changedFields={changedFields}
        title="Confirm Document Changes"
      />
    </div>
  )
}

