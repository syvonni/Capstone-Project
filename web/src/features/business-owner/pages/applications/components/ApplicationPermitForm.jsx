import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Form } from '@/shared/components/AppForm'
import { Typography, Button, Space, Result, Grid, theme, App, Empty } from 'antd'
import LottieSpinner from '@/shared/components/LottieSpinner.jsx'
import DynamicFormRenderer from './ApplicationDynamicFormRenderer'
import { filterSectionsByFormValues } from '../../../utils/formUtils.js'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'
import ApplicationTypeSelector from '../../../components/onboarding/ApplicationTypeSelector'
import GeneralPermitCategorySelector from '../../../components/onboarding/GeneralPermitCategorySelector'
import ApplicationOverview from './ApplicationOverview'
import { formDataWithDayjs } from '../../../utils/businessFormUtils'
import { GENERAL_PERMIT_CATEGORIES } from '../constants'
import useBusinessFormSubmit from '../hooks/useBusinessFormSubmit'
import useApplicationAutosave from '../hooks/useApplicationAutosave'
import { calculateRevisionFieldKeys } from '../../../utils/formUtils.js'
import { useSectionCompletion } from '../hooks/useSectionCompletion.js'
import { useFormDefinitionLoader } from '../hooks/useFormDefinitionLoader.js'
import { useFormStepState } from '../hooks/useFormStepState.js'
import { useFormContentState } from '../hooks/useFormContentState.js'
import { useApplicationModals } from '../hooks/useApplicationModals'
import { useApplicationFormNavigation } from '../hooks/useApplicationFormNavigation'
import { useApplicationDraftCreation } from '../hooks/useApplicationDraftCreation'
import { useApplicationPaymentFlow } from '../hooks/useApplicationPaymentFlow'
import { useApplicationTestData } from '../hooks/useApplicationTestData'
import { useApplicationFormValues } from '../hooks/useApplicationFormValues'
import { useApplicationAutosaveSectionChange } from '../hooks/useApplicationAutosaveSectionChange'
import FormNavigation from '@/shared/components/FormNavigation'
import ApplicationFaqTab from './ApplicationFaqTab'
import MockPaymentModal from './modals/MockPaymentModal'
import PaymentReceiptModal from './modals/PaymentReceiptModal'
import ResubmitConfirmationModal from './modals/ResubmitConfirmationModal'

const { Title, Text, Paragraph } = Typography
const { useBreakpoint } = Grid

export default forwardRef(function PermitApplicationForm({
  onBack: _onBack,
  editingApplication,
  onDraftCreated,
  embedded = false,
  onSubmittingChange,
  readOnly: readOnlyProp = false,
  onSubmitted,
  initialRegistrationType = null,
  onSectionCompleteChange = null,
  onAutosaveStatusChange = null,
  updateFn = null, // Optional: override updateBusiness (officer walk-in uses PUT /api/business/walk-in/:id)
  lockedFields = null, // Array of field keys that should be locked (for returned applications)
  onViewReceipt,
  onViewAppealReceipt,
  onViewAppealDetails,
  onAppealClick,
  loadingAppealDetails,
  appealDetails,
  onShowAppRejectionModal,
  onShowAppealRejectionModal,
  onShowApprovalCommentModal,
  onFormDataChanged = null, // Callback when form data changes (for updating parent business object)
  singleSectionIndex = null, // When embedded, show only this section index without tabs
  onFaqClick = null, // Callback when FAQ tab is clicked
  onProgressClick = null, // Callback when status link is clicked
}, ref) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [form] = Form.useForm()

  const isEditing = !!editingApplication
  const [submitted, setSubmitted] = useState(false)

  // Form step state
  const {
    step,
    setStep,
    registrationType,
    setRegistrationType,
    generalPermitCategory,
    setGeneralPermitCategory,
  } = useFormStepState(editingApplication, initialRegistrationType, form)

  // Form content state
  const {
    formDefinition,
    setFormDefinition,
    loading,
    setLoading,
    formValues,
    setFormValues,
    activeSectionIndex,
    setActiveSectionIndex,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    documentCids,
    setDocumentCids,
    draftBusinessId,
    setDraftBusinessId,
  } = useFormContentState(editingApplication, form)

  // Payment modal state
  const {
    showPaymentModal,
    setShowPaymentModal,
    feeData,
    setIsSubmittingPayment,
    showReceiptModal,
    setShowReceiptModal,
    receiptData,
    setReceiptData,
  } = useApplicationModals(registrationType, generalPermitCategory)

  const [showResubmitModal, setShowResubmitModal] = useState(false)

  const currentApplicationStatus = (editingApplication?.applicationStatus || '').toLowerCase()
  const isRevisionMode = isEditing && currentApplicationStatus === 'needs_revision' && !readOnlyProp
  const isResubmissionMode = isEditing && (currentApplicationStatus === 'needs_revision' || currentApplicationStatus === 'resubmit' || currentApplicationStatus === 'returned') && !readOnlyProp
  const isReturnedMode = isEditing && currentApplicationStatus === 'returned' && !readOnlyProp
  const formReadOnly = readOnlyProp || (embedded && submitted)
  
  // Convert lockedFields array to Set for efficient lookup
  const lockedFieldKeys = useMemo(() => {
    if (!lockedFields || !Array.isArray(lockedFields)) return null
    return new Set(lockedFields)
  }, [lockedFields])


  const revisionFieldKeys = useMemo(() => 
    calculateRevisionFieldKeys(editingApplication?.fieldReviewDecisions),
    [editingApplication?.fieldReviewDecisions]
  )

  // Visible sections for step-by-step tabs (depends on form definition + form values)
  const visibleSections = useMemo(() => {
    if (!formDefinition?.sections) return []
    return filterSectionsByFormValues(formDefinition.sections, formValues)
  }, [formDefinition, formValues])

  const sectionCompleteMap = useSectionCompletion(visibleSections, formValues)

  // Calculate if all sections are complete
  const allSectionsComplete = useMemo(() => {
    if (visibleSections.length === 0) return false
    return visibleSections.every((_, idx) => sectionCompleteMap[idx] === true)
  }, [visibleSections, sectionCompleteMap])

  // Notify parent when section completion status changes
  useEffect(() => {
    if (onSectionCompleteChange) {
      onSectionCompleteChange(allSectionsComplete)
    }
  }, [allSectionsComplete, onSectionCompleteChange])

  const { error: definitionError, fetchFormDefinition } = useFormDefinitionLoader()

  const { handleSubmit, submitting } = useBusinessFormSubmit({
    _isEditing: isEditing,
    editingApplication,
    registrationType,
    generalPermitCategory,
    documentCids,
    formDefinition,
    onSubmitted,
    draftBusinessId,
    setDraftBusinessId,
    setSubmitted,
    setHasUnsavedChanges,
    updateFn,
    onSaveSuccess: onFormDataChanged, // Trigger form data update on save
    currentApplicationStatus: editingApplication?.applicationStatus,
  })

  // Form navigation hook
  const {
    activeTab,
    handleTabChange,
    mainNavItems,
    formNavItems,
    getItemStatus,
  } = useApplicationFormNavigation({
    activeSectionIndex,
    setActiveSectionIndex,
    visibleSections,
    currentApplicationStatus,
    sectionCompleteMap,
    onFaqClick,
  })

  // Store handleTabChange in a ref to access it in receipt modal onClose
  const handleTabChangeRef = useRef(handleTabChange)
  handleTabChangeRef.current = handleTabChange

  // Draft creation hook
  const { handleTypeSelect, handleCategorySelect } = useApplicationDraftCreation({
    isEditing,
    initialRegistrationType,
    onDraftCreated,
    setLoading,
    setRegistrationType,
    setStep,
    fetchFormDefinition,
    setFormDefinition,
    setActiveSectionIndex,
    setFormValues,
    form,
    setGeneralPermitCategory,
    message,
  })

  // Payment flow hook
  const { handleSubmitAndPay: originalHandleSubmitAndPay, handlePaymentSuccess, handlePaymentFail } = useApplicationPaymentFlow({
    setShowPaymentModal,
    setIsSubmittingPayment,
    setReceiptData,
    setShowReceiptModal,
    feeData,
    editingApplication,
    handleSubmit,
    form,
    message,
  })

  const handleSubmitAndPay = () => {
    if (isReturnedMode) {
      setShowResubmitModal(true)
    } else {
      originalHandleSubmitAndPay()
    }
  }

  const handleResubmitConfirm = async () => {
    setShowResubmitModal(false)
    try {
      const values = await form.validateFields()
      await handleSubmit(values, true)
    } catch {
      // Form validation or submission error - let the existing error handling work
    }
  }

  // Test data hook
  const { doFillTestData } = useApplicationTestData({
    formDefinition,
    generalPermitCategory,
    form,
    setFormValues,
    isEditing,
    draftBusinessId,
    setDraftBusinessId,
    registrationType,
    message,
  })

  // Form values hook
  const { handleFormValuesChange } = useApplicationFormValues({
    setFormValues,
    setHasUnsavedChanges,
    onFormDataChanged,
  })

  // Auto-save section change hook
  useApplicationAutosaveSectionChange({
    activeSectionIndex,
    draftBusinessId,
    isEditing,
    hasUnsavedChanges,
    submitting,
    formReadOnly,
    form,
    handleSubmit,
  })

  // Load form definition when editing
  useEffect(() => {
    if (isEditing) {
      const type = editingApplication?.formType || 'permit'
      fetchFormDefinition(type, editingApplication?.category, isEditing, setFormDefinition, setStep, setActiveSectionIndex, setFormValues, form)
    }
  }, [isEditing, editingApplication?.formType, editingApplication?.category, editingApplication?.businessId, editingApplication?._id, fetchFormDefinition, setFormDefinition, setStep, setActiveSectionIndex, setFormValues, form])

  // Set form values when editing and form definition is loaded
  useEffect(() => {
    if (isEditing && formDefinition && editingApplication?.formData) {
      const documents = editingApplication.documents || editingApplication.lguDocuments || {}
      const values = formDataWithDayjs(editingApplication.formData, formDefinition, documents)
      // Ensure generalPermitCategory is set for conditional section visibility
      // (legacy drafts may have 'category' instead of 'generalPermitCategory')
      if (editingApplication.category && !values.generalPermitCategory) {
        values.generalPermitCategory = editingApplication.category
      }
      form.setFieldsValue(values)
      setFormValues(values)
      setHasUnsavedChanges(false)
    }
  }, [isEditing, formDefinition, editingApplication?.formData, editingApplication?.category, editingApplication?.documents, editingApplication?.lguDocuments, form, setFormValues, setHasUnsavedChanges])

  useEffect(() => {
    onSubmittingChange?.(submitting)
  }, [submitting, onSubmittingChange])

  // Autosave hook - saves draft automatically when form values change
  const handleAutosave = useCallback(async (values) => {
    if (!formDefinition) return
    if (submitting) return
    if (formReadOnly) return
    if (!isEditing && !draftBusinessId) return

    try {
      await handleSubmit(values, false)
    } catch (err) {
      console.error('Autosave failed:', err)
    }
  }, [formDefinition, submitting, formReadOnly, isEditing, draftBusinessId, handleSubmit])

  const handleAutosaveComplete = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [setHasUnsavedChanges])

  const { isSaving: isAutosaving } = useApplicationAutosave(
    formValues,
    handleAutosave,
    // Enable autosave only when:
    // - We have a draft (editing or new with draftBusinessId)
    // - Not in read-only mode
    // - Not currently submitting
    (isEditing || draftBusinessId) && !formReadOnly && !submitting,
    { delayMs: 5000 }, // Configurable delay (default is 5000ms)
    hasUnsavedChanges,
    handleAutosaveComplete // Reset unsaved flag after successful autosave
  )

  // Notify parent of autosave status changes
  useEffect(() => {
    onAutosaveStatusChange?.({ isAutosaving, hasUnsavedChanges })
  }, [isAutosaving, hasUnsavedChanges, onAutosaveStatusChange])

  useImperativeHandle(ref, () => ({
    submitApplication: async () => {
      const values = await form.validateFields()
      return handleSubmit(values, true)
    },
    fillTestData: doFillTestData,
    handleTabChange: handleTabChange,
  }), [form, doFillTestData, handleSubmit, handleTabChange])


  return (
    <>
      {step === 'form' && formDefinition ? (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {!isEditing && (
              <div>
                <Title level={4} style={{ marginBottom: 4 }}>
                  {registrationType === 'general_permit'
                    ? `General Permit - ${GENERAL_PERMIT_CATEGORIES.find(c => c.value === generalPermitCategory)?.label || 'Application'}`
                    : 'New Business Application'
                  }
                </Title>
                <Paragraph style={{ margin: 0 }}>
                  Complete each section below.
                </Paragraph>
              </div>
            )}

          {embedded && isResubmissionMode && (
            <div style={{ flexShrink: 0, marginBottom: 16 }}>
              <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  htmlType="button"
                  loading={submitting}
                  onClick={handleSubmitAndPay}
                >
                  {isRevisionMode ? 'Resubmit Application' : 'Submit'}
                </Button>
              </Space>
            </div>
          )}

          {/* Form with two-panel layout */}
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => handleSubmit(values, true)}
            onValuesChange={handleFormValuesChange}
            initialValues={isEditing ? {} : formValues}
            preserve={true}
            style={{ 
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Two-panel: sticky section tabs (left), scrollable form content (right) */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              {/* Only show FormNavigation if not embedded with singleSectionIndex */}
              {!(embedded && singleSectionIndex !== null) && (
                <FormNavigation
                  mainNavItems={mainNavItems}
                  formNavItems={formNavItems}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  getItemStatus={getItemStatus}
                  isMobile={isMobile}
                />
              )}

              {/* Right panel: scrollable form content */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  overflow: 'auto',
                  padding: (embedded && singleSectionIndex !== null) ? 0 : 16,
                }}
              >
                {/* Overview content - show when activeTab is 'overview' */}
                {activeTab === 'overview' && (
                  <ApplicationOverview
                    visibleSections={visibleSections}
                    sectionCompleteMap={sectionCompleteMap}
                    token={token}
                    formType={registrationType}
                    category={generalPermitCategory}
                    business={editingApplication}
                    onViewReceipt={onViewReceipt}
                    onViewAppealReceipt={onViewAppealReceipt}
                    onViewAppealDetails={onViewAppealDetails}
                    onAppealClick={onAppealClick}
                    loadingAppealDetails={loadingAppealDetails}
                    appealDetails={appealDetails}
                    onShowAppRejectionModal={onShowAppRejectionModal}
                    onShowAppealRejectionModal={onShowAppealRejectionModal}
                    onShowApprovalCommentModal={onShowApprovalCommentModal}
                    onProgressClick={onProgressClick}
                  />
                )}
                {/* FAQ content - show when activeTab is 'faq' */}
                {activeTab === 'faq' && (
                  <ApplicationFaqTab business={editingApplication} />
                )}
                {/* Always render form fields so they're in DOM for validation */}
                <div style={{ display: activeTab === 'overview' || activeTab === 'faq' ? 'none' : 'block' }}>
                  <DynamicFormRenderer
                    definition={formDefinition}
                    form={form}
                    formValues={formValues}
                    isMobile={isMobile}
                    activeSectionIndex={activeTab.startsWith('section-') ? parseInt(activeTab.replace('section-', ''), 10) : 0}
                    readOnly={formReadOnly}
                    revisionFieldKeys={(isRevisionMode ? revisionFieldKeys : null) || (isReturnedMode ? lockedFieldKeys : null)}
                    fieldReviewDecisions={editingApplication?.fieldReviewDecisions}
                    businessId={editingApplication?.businessId || editingApplication?._id || draftBusinessId || null}
                    onDocumentCid={(key, cid) => {
                      setDocumentCids(prev => ({ ...prev, [key]: cid }))
                      // Sync formValues on next tick after form.setFieldValue completes
                      // (programmatic setFieldValue doesn't trigger onValuesChange)
                      setTimeout(() => setFormValues(form.getFieldsValue(true)), 0)
                    }}
                    onSaveDraft={async () => {
                      try {
                        const values = form.getFieldsValue(true)
                        // Sync formValues so useSectionCompletion recalculates
                        // (form.setFieldValue doesn't trigger onValuesChange)
                        setFormValues(values)
                        await handleSubmit(values, false)
                      } catch (err) {
                        console.error('Auto-save draft failed:', err)
                      }
                    }}
                    formDataKey={editingApplication?.businessId ?? editingApplication?._id ?? draftBusinessId ?? 'new'}
                    documents={(() => {
                      const lguDocs = editingApplication?.lguDocuments || editingApplication?.documentCids || {}
                      const resolved = { ...lguDocs }
                      // Resolve *IpfsCid keys to base keys (e.g. dtiSecCdaCertificateIpfsCid -> dtiSecCdaCertificate)
                      Object.keys(lguDocs).forEach((k) => {
                        const val = lguDocs[k]
                        if (k.endsWith('IpfsCid') && typeof val === 'string' && val.trim()) {
                          const baseKey = k.slice(0, -7) // remove 'IpfsCid'
                          resolved[baseKey] = resolveIpfsUrl(val.trim()) || val.trim()
                        }
                      })
                      return resolved
                    })()}
                  />
                </div>
              </div>
            </div>
          </Form>
          </div>
        </div>
      ) : (
        <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <LottieSpinner size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">Loading form...</Text>
                </div>
              </div>
            ) : definitionError ? (
              <Result
                status="error"
                title="Unable to Load Form"
                subTitle={definitionError}
              />
            ) : step === 'type_selection' ? (
              <ApplicationTypeSelector onSelect={handleTypeSelect} />
            ) : step === 'category_selection' ? (
              <GeneralPermitCategorySelector
                onSelect={handleCategorySelect}
                onBack={() => {
                  if (_onBack) {
                    _onBack()
                  }
                }}
                title="Select Temporary Permit Type"
              />
            ) : (
              <Empty description="No form available" />
            )}
          {/* Keep form instance connected when not on form step (avoids Ant Design useForm warning) */}
          <Form form={form} style={{ display: 'none' }} />
        </div>
      )}

      <MockPaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        onFail={handlePaymentFail}
        amount={feeData?.total || 0}
        transactionName="Business Permit Application"
        fees={feeData?.fees || []}
      />

      <ResubmitConfirmationModal
        open={showResubmitModal}
        onCancel={() => setShowResubmitModal(false)}
        onConfirm={handleResubmitConfirm}
        loading={submitting}
      />

      <PaymentReceiptModal
        visible={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false)
          // Navigate to overview tab after payment completion
          handleTabChangeRef.current('overview')
        }}
        receiptId={receiptData?.receiptId}
        receiptNumber={receiptData?.receiptNumber}
        transactionDate={receiptData?.transactionDate}
        transactionName={receiptData?.transactionName}
        fees={receiptData?.fees}
        totalAmount={receiptData?.totalAmount}
        applicationReferenceNumber={receiptData?.applicationReferenceNumber}
      />
    </>
  )
})
