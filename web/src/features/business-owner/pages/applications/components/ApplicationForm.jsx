import {
  useState,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { Form } from 'antd';
import { Typography, Button, Space, Result, Grid, theme, App, Empty } from 'antd';
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx';
import FormRenderer from '@/shared/components/formPreview/FormRenderer';
import { filterSectionsByFormValues } from '../../../utils/formUtils.js';
import { resolveIpfsUrl } from '@/lib/ipfsUtils';
import ApplicationTypeSelectorModal from './modals/ApplicationTypeSelectorModal';
import ApplicationOverview from './ApplicationOverview';
import ApplicationDetailHeader from './ApplicationDetailHeader';
import { formDataWithDayjs } from '../../../utils/businessFormUtils';
import { useApplicationFormSubmit } from '../hooks/useApplicationFormSubmit';
import { useApplicationAutosave } from '../hooks/useApplicationAutosave';
import { calculateRevisionFieldKeys } from '../../../utils/formUtils.js';
import { useApplicationSectionCompletion } from '../hooks/useApplicationSectionCompletion.js';
import { useApplicationFormDefinitionLoader } from '../hooks/useApplicationFormDefinitionLoader.js';
import { useApplicationFormStepState } from '../hooks/useApplicationFormStepState.js';
import { useApplicationFormContentState } from '../hooks/useApplicationFormContentState.js';
import { useBusinessOwnerApplicationModals } from '../hooks/useBusinessOwnerApplicationModals';
import { useApplicationFees } from '../hooks/useApplicationFees';
import { useApplicationFormNavigation } from '../hooks/useApplicationFormNavigation';
import { useApplicationDelete } from '../hooks/useApplicationDelete';
import { useApplicationDraftCreation } from '../hooks/useApplicationDraftCreation';
import { useApplicationResubmitHandler } from '../hooks/useApplicationResubmitHandler';
import { useApplicationLobChangeHandler } from '../hooks/useApplicationLobChangeHandler';
import { useApplicationPaymentFlow } from '../hooks/useApplicationPaymentFlow';
import { useApplicationTestData } from '../hooks/useApplicationTestData';
import { isApplicationEditable } from '../hooks/useApplicationStatus';
import { useApplicationFormValues } from '../hooks/useApplicationFormValues';
import { useApplicationAutosaveSectionChange } from '../hooks/useApplicationAutosaveSectionChange';
import FormNavigation from '@/shared/components/FormNavigation';
import ApplicationFaqTab from './ApplicationFaqTab';
import ApplicationMockPaymentModal from './modals/ApplicationMockPaymentModal';
import ApplicationPaymentReceiptModal from '@/shared/components/applications/ApplicationPaymentReceiptModal';
import ApplicationResubmitConfirmationModal from './modals/ApplicationResubmitConfirmationModal';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default forwardRef(function ApplicationForm(
  {
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
    updateFn = null, // Optional: override updateApplication (officer walk-in uses PUT /api/business/walk-in/:id)
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
    onFormDataChanged = null, // Callback when form data changes (for updating parent application object)
    singleSectionIndex = null, // When embedded, show only this section index without tabs
    onFaqClick = null, // Callback when FAQ tab is clicked
    onProgressClick = null, // Callback when status link is clicked
  },
  ref
) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [form] = Form.useForm();

  const isEditing = !!editingApplication;
  const [submitted, setSubmitted] = useState(false);
  const activeApplicationId = editingApplication?.applicationId || editingApplication?._id;

  // Reset the local submitted flag when a different application is loaded,
  // otherwise opening another draft would still be treated as read-only.
  useEffect(() => {
    setSubmitted(false);
  }, [activeApplicationId]);

  // Form step state
  const { step, setStep, registrationType, setRegistrationType, generalPermitCategory } =
    useApplicationFormStepState(editingApplication, initialRegistrationType, form);

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
    draftApplicationId,
    setDraftApplicationId,
  } = useApplicationFormContentState(editingApplication, form);

  const lobSectionRef = useRef(null);

  // Payment modal state
  const {
    showPaymentModal,
    setShowPaymentModal,
    showResubmitModal,
    setShowResubmitModal,
    setIsSubmittingPayment,
    showReceiptModal,
    setShowReceiptModal,
    receiptData,
    setReceiptData,
  } = useBusinessOwnerApplicationModals();

  const feeFormType =
    editingApplication?.formType || editingApplication?.formId || registrationType;
  const { feeData } = useApplicationFees(feeFormType);

  // Delete confirmation for new draft applications
  const { handleDeleteClick } = useApplicationDelete({
    draftApplicationId,
    onBack: _onBack,
  });

  const currentApplicationStatus = (editingApplication?.applicationStatus || '').toLowerCase();
  const isRevisionMode =
    isEditing && currentApplicationStatus === 'needs_revision' && !readOnlyProp;
  const isResubmissionMode =
    isEditing &&
    (currentApplicationStatus === 'needs_revision' ||
      currentApplicationStatus === 'resubmit' ||
      currentApplicationStatus === 'returned') &&
    !readOnlyProp;
  const isReturnedMode = isEditing && currentApplicationStatus === 'returned' && !readOnlyProp;
  const statusReadOnly = isEditing
    ? !isApplicationEditable(editingApplication?.applicationStatus)
    : false;
  const formReadOnly = readOnlyProp || statusReadOnly || submitted;

  // Convert lockedFields array to Set for efficient lookup
  const lockedFieldKeys = useMemo(() => {
    if (!lockedFields || !Array.isArray(lockedFields)) return null;
    return new Set(lockedFields);
  }, [lockedFields]);

  const revisionFieldKeys = useMemo(
    () => calculateRevisionFieldKeys(editingApplication?.fieldReviewDecisions),
    [editingApplication?.fieldReviewDecisions]
  );

  // Visible sections for step-by-step tabs (depends on form definition + form values)
  const visibleSections = useMemo(() => {
    if (!formDefinition?.sections) return [];
    return filterSectionsByFormValues(formDefinition.sections, formValues);
  }, [formDefinition, formValues]);

  const sectionCompleteMap = useApplicationSectionCompletion(visibleSections, formValues);

  // Calculate if all sections are complete
  const allSectionsComplete = useMemo(() => {
    if (visibleSections.length === 0) return false;
    return visibleSections.every((_, idx) => sectionCompleteMap[idx] === true);
  }, [visibleSections, sectionCompleteMap]);

  // Notify parent when section completion status changes
  useEffect(() => {
    if (onSectionCompleteChange) {
      onSectionCompleteChange(allSectionsComplete);
    }
  }, [allSectionsComplete, onSectionCompleteChange]);

  const { error: definitionError, fetchFormDefinition } = useApplicationFormDefinitionLoader();

  const { handleSubmit, submitting } = useApplicationFormSubmit({
    _isEditing: isEditing,
    editingApplication,
    registrationType,
    generalPermitCategory,
    documentCids,
    formDefinition,
    onSubmitted,
    draftApplicationId,
    setDraftApplicationId,
    setSubmitted,
    setHasUnsavedChanges,
    updateFn,
    onSaveSuccess: onFormDataChanged, // Trigger form data update on save
    _currentApplicationStatus: editingApplication?.applicationStatus,
  });

  // Form navigation hook
  const { activeTab, handleTabChange, mainNavItems, formNavItems, getItemStatus } =
    useApplicationFormNavigation({
      activeSectionIndex,
      setActiveSectionIndex,
      visibleSections,
      currentApplicationStatus,
      sectionCompleteMap,
      onFaqClick,
    });

  // Store handleTabChange in a ref to access it in receipt modal onClose
  const handleTabChangeRef = useRef(handleTabChange);
  handleTabChangeRef.current = handleTabChange;

  // Draft creation hook
  const { handleTypeSelect } = useApplicationDraftCreation({
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
    message,
  });

  // Payment flow hook
  const {
    handleSubmitAndPay: originalHandleSubmitAndPay,
    handlePaymentSuccess,
    handlePaymentFail,
  } = useApplicationPaymentFlow({
    setShowPaymentModal,
    setIsSubmittingPayment,
    setReceiptData,
    setShowReceiptModal,
    feeData,
    editingApplication,
    handleSubmit,
    form,
    message,
  });

  const handleSubmitAndPay = () => {
    if (isReturnedMode) {
      setShowResubmitModal(true);
    } else {
      originalHandleSubmitAndPay();
    }
  };

  const { handleResubmitConfirm } = useApplicationResubmitHandler({
    form,
    handleSubmit,
    setShowResubmitModal,
  });

  // Test data hook
  const { doFillTestData } = useApplicationTestData({
    formDefinition,
    generalPermitCategory,
    form,
    setFormValues,
    lobSectionRef,
    isEditing,
    draftApplicationId,
    setDraftApplicationId,
    registrationType,
    message,
  });

  // Form values hook
  const { handleFormValuesChange } = useApplicationFormValues({
    form,
    setFormValues,
    setHasUnsavedChanges,
    onFormDataChanged,
  });

  // Keep local formValues in sync when the LOB section changes
  // (LOBSection writes directly to the form and calls this callback)
  const { handleLobChange } = useApplicationLobChangeHandler({
    form,
    setFormValues,
    setHasUnsavedChanges,
    onFormDataChanged,
  });

  // Autosave hook - saves draft automatically when form values change
  const handleAutosave = useCallback(
    async (values, options = {}) => {
      if (!formDefinition) return;
      if (submitting) return;
      if (formReadOnly) return;
      if (!isEditing && !draftApplicationId) return;

      try {
        const businessActivities = form.getFieldValue('businessActivities');
        const valuesWithLob = businessActivities !== undefined
          ? { ...values, businessActivities }
          : values;
        await handleSubmit(valuesWithLob, false, options);
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    },
    [formDefinition, submitting, formReadOnly, isEditing, draftApplicationId, form, handleSubmit]
  );

  const handleAutosaveComplete = useCallback(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const {
    isSaving: isAutosaving,
    saveError,
    markDirty,
  } = useApplicationAutosave(
    formValues,
    handleAutosave,
    // Enable autosave only when:
    // - We have a draft (editing or new with draftApplicationId)
    // - Not in read-only mode
    // - Not currently submitting
    (isEditing || draftApplicationId) && !formReadOnly && !submitting,
    { delayMs: 15000 }, // Configurable delay (default is 15000ms)
    hasUnsavedChanges,
    handleAutosaveComplete, // Reset unsaved flag after successful autosave
    setHasUnsavedChanges // Keep unsaved flag true on failure
  );

  // Load form definition when editing
  useEffect(() => {
    if (isEditing) {
      // Use formId if available, otherwise fall back to formType for backward compatibility
      const formId =
        editingApplication?.formId || editingApplication?.formType || 'unified-business-permit';
      fetchFormDefinition(
        formId,
        editingApplication?.category,
        isEditing,
        setFormDefinition,
        setStep,
        setActiveSectionIndex,
        setFormValues,
        form
      );
    }
  }, [
    isEditing,
    editingApplication?.formId,
    editingApplication?.formType,
    editingApplication?.category,
    editingApplication?.applicationId,
    editingApplication?._id,
    fetchFormDefinition,
    setFormDefinition,
    setStep,
    setActiveSectionIndex,
    setFormValues,
    form,
  ]);

  // Load form definition when creating new application with formId
  useEffect(() => {
    if (
      !isEditing &&
      registrationType &&
      registrationType !== 'general' &&
      step === 'type_selection'
    ) {
      fetchFormDefinition(
        registrationType,
        null,
        false,
        setFormDefinition,
        setStep,
        setActiveSectionIndex,
        setFormValues,
        form
      );
    }
  }, [
    isEditing,
    registrationType,
    step,
    fetchFormDefinition,
    setFormDefinition,
    setStep,
    setActiveSectionIndex,
    setFormValues,
    form,
  ]);

  // Set form values when editing and form definition is loaded
  useEffect(() => {
    if (isEditing && formDefinition && editingApplication?.formData) {
      const documents = editingApplication.documents || editingApplication.lguDocuments || {};
      const values = formDataWithDayjs(editingApplication.formData, formDefinition, documents);
      // Ensure generalPermitCategory is set for conditional section visibility
      // (legacy drafts may have 'category' instead of 'generalPermitCategory')
      if (editingApplication.category && !values.generalPermitCategory) {
        values.generalPermitCategory = editingApplication.category;
      }
      // Restore LOB data from the top-level field if formData is missing it
      // (some older save paths stored it only at the application root).
      if (
        !values.businessActivities &&
        Array.isArray(editingApplication.businessActivities) &&
        editingApplication.businessActivities.length > 0
      ) {
        values.businessActivities = editingApplication.businessActivities;
      }
      form.setFieldsValue(values);
      setFormValues(values);
      setHasUnsavedChanges(false);
    }
  }, [
    isEditing,
    formDefinition,
    editingApplication?.formData,
    editingApplication?.category,
    editingApplication?.businessActivities,
    editingApplication?.documents,
    editingApplication?.lguDocuments,
    form,
    setFormValues,
    setHasUnsavedChanges,
  ]);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  // Auto-save section change hook
  useApplicationAutosaveSectionChange({
    activeSectionIndex,
    draftApplicationId,
    isEditing,
    hasUnsavedChanges,
    submitting,
    formReadOnly,
    form,
    setFormValues,
    setHasUnsavedChanges,
    markDirty,
  });

  // Notify parent of autosave status changes
  useEffect(() => {
    onAutosaveStatusChange?.({ isAutosaving, hasUnsavedChanges, saveError });
  }, [isAutosaving, hasUnsavedChanges, saveError, onAutosaveStatusChange]);

  useImperativeHandle(
    ref,
    () => ({
      submitApplication: async () => {
        const values = await form.validateFields();
        const businessActivities = form.getFieldValue('businessActivities');
        const allValues = businessActivities !== undefined
          ? { ...form.getFieldsValue(true), ...values, businessActivities }
          : { ...form.getFieldsValue(true), ...values };
        return handleSubmit(allValues, true);
      },
      fillTestData: doFillTestData,
      handleTabChange: handleTabChange,
    }),
    [form, doFillTestData, handleSubmit, handleTabChange]
  );

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
            {!isEditing && formDefinition && (
              <ApplicationDetailHeader
                application={{
                  businessName: formDefinition.name || 'New Application',
                  applicationStatus: 'draft',
                }}
                isDraft={true}
                isReturned={false}
                formSubmitting={submitting}
                isMobile={isMobile}
                onDeleteDraft={handleDeleteClick}
                onPaymentSuccess={handlePaymentSuccess}
                onFillTestData={doFillTestData}
                allSectionsComplete={allSectionsComplete}
                token={token}
                isAutosaving={isAutosaving}
                hasUnsavedChanges={hasUnsavedChanges}
                saveError={saveError}
                isFooter={false}
                feeData={feeData}
              />
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

              <Form
                validateTrigger="onBlur"
                form={form}
                requiredMark={false}
                layout="vertical"
                onFinish={() => {
                  const values = form.getFieldsValue(true);
                  const businessActivities = form.getFieldValue('businessActivities');
                  return handleSubmit(
                    businessActivities !== undefined
                      ? { ...values, businessActivities }
                      : values,
                    true
                  );
                }}
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
                {/* Right panel: scrollable form content */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'auto',
                    padding: embedded && singleSectionIndex !== null ? 0 : 16,
                  }}
                >
                  {/* Overview content - show when activeTab is 'overview' */}
                  {activeTab === 'overview' && (
                    <ApplicationOverview
                      visibleSections={visibleSections}
                      sectionCompleteMap={sectionCompleteMap}
                      formValues={formValues}
                      token={token}
                      formType={registrationType}
                      category={generalPermitCategory}
                      application={editingApplication}
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
                  {activeTab === 'faq' && <ApplicationFaqTab application={editingApplication} />}
                  {/* Always render form fields so they're in DOM for validation */}
                  <div
                    style={{
                      display: activeTab === 'overview' || activeTab === 'faq' ? 'none' : 'block',
                    }}
                  >
                    <FormRenderer
                      definition={formDefinition}
                      form={form}
                      formValues={formValues}
                      isMobile={isMobile}
                      activeSectionIndex={
                        activeTab.startsWith('section-')
                          ? parseInt(activeTab.replace('section-', ''), 10)
                          : 0
                      }
                      readOnly={formReadOnly}
                      revisionFieldKeys={
                        (isRevisionMode ? revisionFieldKeys : null) ||
                        (isReturnedMode ? lockedFieldKeys : null)
                      }
                      fieldReviewDecisions={editingApplication?.fieldReviewDecisions}
                      applicationId={
                        draftApplicationId ||
                        editingApplication?.applicationId ||
                        editingApplication?._id ||
                        null
                      }
                      showAdminNotes={false}
                      lobSectionRef={lobSectionRef}
                      onLobChange={handleLobChange}
                      onDocumentCid={(key, cid) => {
                        setDocumentCids((prev) => ({ ...prev, [key]: cid }));
                        // Sync formValues on next tick after form.setFieldValue completes
                        // (programmatic setFieldValue doesn't trigger onValuesChange)
                        setTimeout(() => {
                          const values = form.getFieldsValue(true);
                          const businessActivities = form.getFieldValue('businessActivities');
                          setFormValues(businessActivities !== undefined
                            ? { ...values, businessActivities }
                            : values);
                          setHasUnsavedChanges(true);
                        }, 0);
                      }}
                      onSaveDraft={() => {
                        const values = form.getFieldsValue(true);
                        const businessActivities = form.getFieldValue('businessActivities');
                        // Sync formValues so useApplicationSectionCompletion recalculates
                        // (form.setFieldValue doesn't trigger onValuesChange)
                        setFormValues(businessActivities !== undefined
                          ? { ...values, businessActivities }
                          : values);
                        setHasUnsavedChanges(true);
                        markDirty();
                      }}
                      documents={(() => {
                        const lguDocs =
                          editingApplication?.lguDocuments ||
                          editingApplication?.documentCids ||
                          {};
                        const resolved = { ...lguDocs };
                        // Resolve *IpfsCid keys to base keys (e.g. dtiSecCdaCertificateIpfsCid -> dtiSecCdaCertificate)
                        Object.keys(lguDocs).forEach((k) => {
                          const val = lguDocs[k];
                          if (k.endsWith('IpfsCid') && typeof val === 'string' && val.trim()) {
                            const baseKey = k.slice(0, -7); // remove 'IpfsCid'
                            resolved[baseKey] = resolveIpfsUrl(val.trim()) || val.trim();
                          }
                        });
                        return resolved;
                      })()}
                    />
                  </div>
                </div>
              </Form>
            </div>
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
            <Result status="error" title="Unable to Load Form" subTitle={definitionError} />
          ) : step === 'type_selection' ? (
            <ApplicationTypeSelectorModal
              open={true}
              onCancel={_onBack}
              onSelect={handleTypeSelect}
            />
          ) : (
            <Empty description="No form available" />
          )}
          {/* Keep form instance connected when not on form step (avoids Ant Design useForm warning) */}
          <Form validateTrigger="onBlur" form={form} style={{ display: 'none' }} />
        </div>
      )}
      <ApplicationMockPaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        onFail={handlePaymentFail}
        amount={feeData?.total || 0}
        transactionName="Business Permit Application"
        fees={feeData?.fees || []}
      />
      <ApplicationResubmitConfirmationModal
        open={showResubmitModal}
        onCancel={() => setShowResubmitModal(false)}
        onConfirm={handleResubmitConfirm}
        loading={submitting}
      />
      <ApplicationPaymentReceiptModal
        visible={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          // Navigate to overview tab after payment completion
          handleTabChangeRef.current('overview');
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
  );
});
