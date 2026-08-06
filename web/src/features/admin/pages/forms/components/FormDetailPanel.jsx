import { useState, useMemo, useEffect } from 'react'
import { Grid } from 'antd'
import { HistoryOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import DetailHeader from '@/shared/components/DetailHeader'
import FormNavigation from '@/shared/components/FormNavigation'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import { FormPreviewContent, TemporaryPermitConfiguration } from './index'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { usePermitForm } from '../hooks/usePermitForm'
import { getPermitFormByFormId, getClaimableDocumentsByPermitFormId } from '@/features/admin/services/permitFormService'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

const { useBreakpoint } = Grid

export function FormDetailPanel({ formId, _onBackToMenu }) {
  const [showAuditHistory, setShowAuditHistory] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [permitForm, setPermitForm] = useState(null)
  const [claimableDocuments, setClaimableDocuments] = useState([])
  const screens = useBreakpoint()
  const isMobile = !screens.lg

  // Fetch permit form from API
  useEffect(() => {
    const fetchPermitForm = async () => {
      try {
        const response = await getPermitFormByFormId(formId)
        if (response?.form) {
          setPermitForm(response.form)
        }
      } catch (error) {
        console.error('Failed to fetch permit form:', error)
      }
    }
    fetchPermitForm()
  }, [formId])

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
    formId: permitForm?.formId || formId,
    name: permitForm?.name || '',
    description: permitForm?.description || '',
    sections: permitForm?.sections || [],
    notes: permitForm?.notes || '',
    isActive: permitForm?.isActive !== undefined ? permitForm.isActive : true,
  }), [permitForm, formId])

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
    if (formId) {
      const response = await getPermitFormByFormId(formId)
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

  const handleShowAuditHistory = () => {
    setShowAuditHistory(true)
  }

  const handleCloseAuditHistory = () => {
    setShowAuditHistory(false)
  }

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

  if (!permitForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DetailHeader
          title="Form Not Found"
          subtitle="The selected form could not be found"
          iconButtons={iconButtons}
          instructionSlotId="admin-forms-management"
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            Please select a form from the list to view its details.
          </div>
        </div>
      </div>
    )
  }

  const mainNavItems = getMainNavItems(isEditMode)
  const formNavItems = isEditMode ? [] : getFormNavItems(initialValues.sections || [])

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <FormPreviewContent
            sections={initialValues.sections}
            title={initialValues.name}
            description={initialValues.description}
            lastUpdated={permitForm?.lastUpdated}
            version={permitForm?.version}
            createdAt={permitForm?.createdAt}
            notes={initialValues.notes || ''}
            activeTab={activeTab}
            disabled={true}
            feeId={permitForm?.feeId?._id || permitForm?.feeId}
            feeAmount={permitForm?.feeId?.amount}
            claimableDocuments={claimableDocuments}
          />
        )
      case 'configuration':
        return (
          <TemporaryPermitConfiguration
            form={form}
            handleFormValuesChange={handleFormValuesChange}
            title={initialValues.name}
            description={initialValues.description}
            sections={initialValues.sections}
            definitionId={formId}
            onSave={handleSave}
          />
        )
      default:
        // Form sections
        return (
          <FormPreviewContent
            sections={initialValues.sections}
            title={initialValues.name}
            description={initialValues.description}
            lastUpdated={permitForm?.lastUpdated}
            version={permitForm?.version}
            createdAt={permitForm?.createdAt}
            notes={initialValues.notes || ''}
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

      <AuditHistoryModal
        open={showAuditHistory}
        onClose={handleCloseAuditHistory}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('permit_form'))}
        DetailPanelComponent={AuditEventDetails}
      />
      {stepUpModal}
    </div>
  )
}
