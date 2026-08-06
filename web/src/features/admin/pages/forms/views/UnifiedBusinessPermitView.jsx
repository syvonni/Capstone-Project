import { useState, useEffect, useMemo } from 'react'
import { Grid } from 'antd'
import { HistoryOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import FormNavigation from '@/shared/components/FormNavigation'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import { UnifiedBusinessPermitOverview, UnifiedBusinessPermitConfiguration, FormPreviewContent } from '../components'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { usePermitForm } from '../hooks/usePermitForm'
import { getPermitFormByFormId, getClaimableDocumentsByPermitFormId } from '@/features/admin/services/permitFormService'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

const { useBreakpoint } = Grid

const getMainNavItems = (isEditMode) => {
  if (isEditMode) {
    return [
      { key: 'configuration', label: 'Configuration' },
    ]
  }
  return [
    { key: 'overview', label: 'Overview' },
  ]
}

const getFormNavItems = (sections) => {
  const requiredDocumentsSection = sections.find(section => section.type === 'required_documents')
  const regularSections = sections.filter(section => section.type !== 'required_documents')

  const formNavItems = []

  if (requiredDocumentsSection) {
    formNavItems.push({
      key: 'required-documents',
      label: 'Required Documents',
    })
  }

  regularSections.forEach((section, index) => {
    if (section.type === 'lob_section') {
      formNavItems.push({
        key: 'lob-section',
        label: section.sectionName || 'Line of Business',
      })
    } else {
      formNavItems.push({
        key: `section-${index}`,
        label: section.sectionName || `Section ${index + 1}`,
      })
    }
  })

  return formNavItems
}

export default function UnifiedBusinessPermitView() {
  const [showAuditHistory, setShowAuditHistory] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditMode, setIsEditMode] = useState(false)
  const [permitForm, setPermitForm] = useState(null)
  const [claimableDocuments, setClaimableDocuments] = useState([])
  const screens = useBreakpoint()
  const isMobile = !screens.lg

  // Fetch permit form from API
  useEffect(() => {
    const fetchPermitForm = async () => {
      try {
        const response = await getPermitFormByFormId('unified-business-permit')
        if (response?.form) {
          setPermitForm(response.form)
        }
      } catch (error) {
        console.error('Failed to fetch permit form:', error)
      }
    }
    fetchPermitForm()
  }, [])

  // Fetch claimable documents for permit form
  useEffect(() => {
    const fetchClaimableDocuments = async () => {
      if (permitForm?._id) {
        try {
          const documents = await getClaimableDocumentsByPermitFormId(permitForm._id)
          setClaimableDocuments(documents)
        } catch (error) {
          console.error('Failed to fetch claimable documents:', error)
        }
      }
    }
    fetchClaimableDocuments()
  }, [permitForm?._id])

  // Use audit hook for permit form
  const { auditLogs, auditLoading, refresh } = useAudit('permit-form', permitForm?._id, !!permitForm?._id)

  // Use permit form hook
  const initialValues = useMemo(() => ({
    _id: permitForm?._id,
    formId: permitForm?.formId || 'unified-business-permit',
    name: permitForm?.name || '',
    description: permitForm?.description || '',
    sections: permitForm?.sections || [],
    notes: permitForm?.notes || '',
    isActive: permitForm?.isActive !== undefined ? permitForm.isActive : true,
  }), [permitForm])

  const {
    form,
    saving,
    hasChanges,
    handleStatusChange,
    handleSave,
    handleFormValuesChange,
    resetChangeTracking,
    resetHistory,
    stepUpModal,
  } = usePermitForm({ permitFormId: permitForm?._id, permitForm, initialValues, onSave: async () => {
    // Refetch the form data to get latest changes
    if (permitForm?.formId) {
      const response = await getPermitFormByFormId(permitForm.formId)
      if (response?.form) {
        setPermitForm(response.form)
      }
    }
    refresh()
  } })

  // Initialize form with values (only when in edit mode to avoid "form not connected" warning)
  useEffect(() => {
    if (permitForm && isEditMode) {
      form.setFieldsValue(initialValues)
      resetHistory(initialValues)
      resetChangeTracking(initialValues)
    }
  }, [permitForm, form, initialValues, resetHistory, resetChangeTracking, isEditMode])

  const formNavItems = isEditMode ? [] : getFormNavItems(initialValues.sections || [])
  const mainNavItems = getMainNavItems(isEditMode)

  const handleEnterEditMode = () => {
    setIsEditMode(true)
    setActiveTab('configuration')
  }

  const handleExitEditMode = () => {
    setIsEditMode(false)
    setActiveTab('overview')
    form.setFieldsValue(initialValues)
    resetHistory(initialValues)
    resetChangeTracking(initialValues)
  }

  const handleShowAuditHistory = () => {
    setShowAuditHistory(true)
  }

  const handleCloseAuditHistory = () => {
    setShowAuditHistory(false)
  }

  const iconButtons = [
    { icon: <HistoryOutlined />, onClick: handleShowAuditHistory, title: 'History' },
  ]

  const primaryButton = { 
    text: 'Save', 
    icon: <SaveOutlined />, 
    onClick: handleSave, 
    loading: saving, 
    type: 'primary',
    disabled: !hasChanges 
  }

  const actionButtons = isEditMode
    ? [{ text: 'Exit Edit Mode', icon: <CloseOutlined />, onClick: handleExitEditMode, type: 'default' }]
    : [{ text: 'Edit', icon: <EditOutlined />, onClick: handleEnterEditMode, type: 'default' }]

  const requiredDocumentsSection = (initialValues.sections || []).find(
    section => section.type === 'required_documents'
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <UnifiedBusinessPermitOverview
            title={initialValues.name}
            description={initialValues.description}
            requiredDocumentsSection={requiredDocumentsSection}
            lastUpdated={permitForm?.lastUpdated}
            version={permitForm?.version}
            notes={initialValues.notes}
            feeId={permitForm?.feeId?._id || permitForm?.feeId}
            feeAmount={permitForm?.feeId?.amount}
            createdAt={permitForm?.createdAt}
            claimableDocuments={claimableDocuments}
          />
        )
      case 'configuration':
        return (
          <UnifiedBusinessPermitConfiguration
            form={form}
            handleFormValuesChange={handleFormValuesChange}
            title={initialValues.name}
            description={initialValues.description}
            notes={initialValues.notes}
            sections={initialValues.sections}
            onSave={handleSave}
          />
        )
      default:
        // Form sections - use FormPreviewContent for preview mode
        return (
          <FormPreviewContent
            sections={initialValues.sections}
            title={initialValues.name}
            description={initialValues.description}
            lastUpdated={permitForm?.lastUpdated}
            notes={initialValues.notes}
            activeTab={activeTab}
            disabled={true}
          />
        )
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={initialValues.name}
        subtitle={initialValues.description}
        iconButtons={iconButtons}
        primaryButton={primaryButton}
        actionButtons={actionButtons}
        instructionSlotId="admin-forms-management"
        selectFields={[
          {
            label: 'Status',
            value: initialValues.isActive ? 'active' : 'disabled',
            onChange: handleStatusChange,
            width: 120,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ],
          },
        ]}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {isEditMode ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            {renderContent()}
          </div>
        ) : isMobile ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <FormNavigation
              mainNavItems={mainNavItems}
              formNavItems={formNavItems}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isMobile={isMobile}
            />
            <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px 16px 24px' }}>
              {renderContent()}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', alignItems: 'stretch' }}>
            <FormNavigation
              mainNavItems={mainNavItems}
              formNavItems={formNavItems}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isMobile={isMobile}
            />
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {renderContent()}
            </div>
          </div>
        )}
      </div>

      {stepUpModal}
      <AuditHistoryModal
        open={showAuditHistory}
        onClose={handleCloseAuditHistory}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('permit_form'))}
        DetailPanelComponent={AuditEventDetails}
      />
    </div>
  )
}
