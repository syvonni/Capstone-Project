import { useState, useMemo, useCallback } from 'react'
import { Typography, theme, Empty, Grid, App } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { filterSectionsByFormValues } from '@/features/business-owner/utils/formUtils.js'
import { useFormDefinition } from '@/features/staffs/lgu-officer/pages/applications/hooks/useFormDefinition'
import { useApplicationStatus } from '../hooks/useApplicationStatus'
import { useApplicationCompletionStatus } from '../hooks/useApplicationCompletionStatus'
import { useBusinessOwnerApplicationModals } from '../hooks/useBusinessOwnerApplicationModals'
import { useApplicationFees } from '../hooks/useApplicationFees'
import { useApplicationInfoCard } from '../hooks/useApplicationInfoCard'
import { useApplicationAppealHandlers } from '../hooks/useApplicationAppealHandlers'
import { useApplicationPaymentHandlers } from '../hooks/useApplicationPaymentHandlers'
import { useApplicationFormHandlers } from '../hooks/useApplicationFormHandlers'
import { useApplicationDelete } from '../hooks/useApplicationDelete'
import ApplicationForm from './ApplicationForm'
import ApplicationDetailHeader from './ApplicationDetailHeader'
import ApplicationPaymentReceiptModal from './modals/ApplicationPaymentReceiptModal'
import ApplicationMockPaymentModal from './modals/ApplicationMockPaymentModal'
import ApplicationAppealDetailsModal from './modals/ApplicationAppealDetailsModal'
import ApplicationRejectionReasonModal from './modals/ApplicationRejectionReasonModal'
import ApplicationAppealRejectionReasonModal from './modals/ApplicationAppealRejectionReasonModal'
import ApplicationApprovalCommentModal from './modals/ApplicationApprovalCommentModal'
import ApplicationRequestedChangesModal from './modals/ApplicationRequestedChangesModal'
import ApplicationProgressModal from '@/shared/components/applications/ApplicationProgressModal'
import ApplicationAppealModal from './modals/ApplicationAppealModal'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function ApplicationDetailPanel({
  application,
  dashboardState,
  isMobile: isMobileProp = false,
  onSaveStatusChange = () => {},
}) {
  const { token: themeToken } = theme.useToken()
  const { message } = App.useApp()
  const screens = useBreakpoint()
  const isMobile = isMobileProp || !screens.lg
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [formAllSectionsComplete, setFormAllSectionsComplete] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState({ isAutosaving: false, hasUnsavedChanges: false, saveError: null })

  const handleAutosaveStatusChange = useCallback((status) => {
    setAutosaveStatus(status)
    onSaveStatusChange(status)
  }, [onSaveStatusChange])

  // Handle progress click to show modal
  const handleProgressClick = () => {
    setShowProgressModal(true)
  }

  // Form handlers hook
  const {
    currentFormData,
    formRef,
    handleFormDataChanged,
    handleFormRef,
    handleFormSubmitted,
    handleDraftCreated,
  } = useApplicationFormHandlers({
    application,
    dashboardState,
    message,
  })

  // Delete confirmation
  const { handleDeleteClick } = useApplicationDelete({
    application,
    onAfterDelete: () => {
      window.location.href = '/business-owner/applications'
    },
    message,
  })

  // Status hooks
  const statusFlags = useApplicationStatus(application)
  const {
    isDraft,
    isReturned,
    isReadOnly,
    hasLockedFields,
  } = statusFlags

  // Form definition
  const appIdentifier = application?.applicationId || application?._id
  const formDefId = application?.formDefinitionId
  const formType = application?.formType || 'permit'
  const businessType = application?.primaryLineOfBusiness || application?.lineOfBusiness || null
  const { formDefinition } = useFormDefinition(appIdentifier, formDefId, formType, businessType)
  const { feeData } = useApplicationFees(formType)

  // Modal state
  const {
    showReceiptModal,
    setShowReceiptModal,
    receiptData,
    setReceiptData,
    showAppealPaymentModal,
    setShowAppealPaymentModal,
    showAppealDetailsModal,
    setShowAppealDetailsModal,
    appealDetails,
    setAppealDetails,
    loadingAppealDetails,
    setLoadingAppealDetails,
    showAppRejectionModal,
    setShowAppRejectionModal,
    showAppealRejectionModal,
    setShowAppealRejectionModal,
    showApprovalCommentModal,
    setShowApprovalCommentModal,
    changesModalOpen,
    setChangesModalOpen,
    appealModalOpen,
    setAppealModalOpen,
    appealReceiptData,
    submittingAppeal,
    setSubmittingAppeal,
  } = useBusinessOwnerApplicationModals()

  // Payment handlers hook
  const {
    handlePaymentSuccess,
    handleReceiptModalClose,
    handleViewReceipt,
  } = useApplicationPaymentHandlers({
    application,
    formRef,
    setReceiptData,
    setShowReceiptModal,
    feeData,
    dashboardState,
    message,
  })

  // Appeal handlers hook
  const {
    handleAppealClick,
    handleAppealSubmit,
    handleViewAppealDetails,
    handleViewAppealReceipt,
  } = useApplicationAppealHandlers({
    application,
    setAppealModalOpen,
    setSubmittingAppeal,
    setShowAppealDetailsModal,
    setAppealDetails,
    setLoadingAppealDetails,
    setReceiptData,
    setShowReceiptModal,
    appealDetails,
    loadingAppealDetails,
    appealReceiptData,
    feeData,
    dashboardState,
  })

  // Form data
  const formData = useMemo(() => currentFormData && typeof currentFormData === 'object' ? currentFormData : (application?.formData && typeof application.formData === 'object' ? application.formData : {}), [currentFormData, application?.formData])
  const sections = useMemo(() => formDefinition ? filterSectionsByFormValues(formDefinition.sections || [], formData) : [], [formDefinition, formData])

  // Application info card data
  const {
    rejectionReason,
    approvalComment,
    requestChangeFields,
  } = useApplicationInfoCard(
    { ...application, formData: currentFormData },
    sections
  )

  const { allSectionsComplete, lockedFields } = useApplicationCompletionStatus({
    application,
    formAllSectionsComplete,
    isReturned,
    hasLockedFields,
  })

  // Single form instance - always mounted to preserve state
  const singleForm = (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ApplicationForm
        ref={handleFormRef}
        editingApplication={application}
        readOnly={isReadOnly}
        lockedFields={lockedFields}
        hideActionButtons={!isReturned}
        onSubmitted={handleFormSubmitted}
        onDraftCreated={handleDraftCreated}
        onViewReceipt={handleViewReceipt}
        onViewAppealReceipt={handleViewAppealReceipt}
        onViewAppealDetails={handleViewAppealDetails}
        onAppealClick={handleAppealClick}
        loadingAppealDetails={loadingAppealDetails}
        appealDetails={appealDetails}
        onShowAppRejectionModal={() => setShowAppRejectionModal(true)}
        onShowAppealRejectionModal={() => setShowAppRejectionModal(true)}
        onShowApprovalCommentModal={() => setShowApprovalCommentModal(true)}
        onFormDataChanged={handleFormDataChanged}
        showAddForm={dashboardState?.showAddForm}
        onBack={() => {
          dashboardState.setShowAddForm(false)
          dashboardState.setEditingApplication(null)
        }}
        onDeleteDraft={handleDeleteClick}
        onToggleForm={() => dashboardState.setShowAddForm(prev => !prev)}
        onSectionCompleteChange={setFormAllSectionsComplete}
        onPaymentSuccess={isReturned ? handlePaymentSuccess : undefined}
        onProgressClick={handleProgressClick}
        onAutosaveStatusChange={handleAutosaveStatusChange}
      />
    </div>
  )

  // Empty state - only show if not adding a new application
  if (!application && !dashboardState?.showAddForm) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <Empty
          image={<FileTextOutlined style={{ fontSize: 48, color: themeToken.colorTextQuaternary }} />}
          styles={{ image: { height: 60 } }}
          description={<Text type="secondary">Select an application to view details</Text>}
        />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Header */}
      {!isMobile && (
        <ApplicationDetailHeader
          application={application}
          isDraft={isDraft}
          isReturned={isReturned}
          formSubmitting={false}
          isMobile={isMobile}
          onDeleteDraft={isDraft ? handleDeleteClick : undefined}
          onPaymentSuccess={isDraft || isReturned ? handlePaymentSuccess : undefined}
          onFillTestData={() => {
            formRef?.current?.fillTestData?.()
          }}
          allSectionsComplete={allSectionsComplete}
          token={themeToken}
          isAutosaving={autosaveStatus.isAutosaving}
          hasUnsavedChanges={autosaveStatus.hasUnsavedChanges}
          saveError={autosaveStatus.saveError}
          feeData={feeData}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {singleForm}
      </div>

      {/* Mobile actions footer */}
      {isMobile && (isDraft || isReturned) && (
        <ApplicationDetailHeader
          application={application}
          isDraft={isDraft}
          isReturned={isReturned}
          formSubmitting={false}
          isMobile={isMobile}
          onDeleteDraft={isDraft ? handleDeleteClick : undefined}
          onPaymentSuccess={isDraft || isReturned ? handlePaymentSuccess : undefined}
          onFillTestData={() => {
            formRef?.current?.fillTestData?.()
          }}
          allSectionsComplete={allSectionsComplete}
          token={themeToken}
          isAutosaving={autosaveStatus.isAutosaving}
          hasUnsavedChanges={autosaveStatus.hasUnsavedChanges}
          saveError={autosaveStatus.saveError}
          feeData={feeData}
          showSaveTag={false}
          isFooter={true}
        />
      )}

      {/* Modals */}
      <ApplicationPaymentReceiptModal
        visible={showReceiptModal}
        onClose={handleReceiptModalClose}
        receiptId={receiptData?.receiptId}
        receiptNumber={receiptData?.receiptNumber}
        transactionDate={receiptData?.transactionDate}
        transactionName={receiptData?.transactionName}
        fees={receiptData?.fees}
        totalAmount={receiptData?.totalAmount}
        applicationReferenceNumber={receiptData?.applicationReferenceNumber}
        paymentType={receiptData?.paymentType}
      />
      <ApplicationMockPaymentModal
        visible={showAppealPaymentModal}
        onClose={() => setShowAppealPaymentModal(false)}
        onSubmit={() => {}}
      />
      <ApplicationAppealDetailsModal
        open={showAppealDetailsModal}
        onCancel={() => setShowAppealDetailsModal(false)}
        appealDetails={appealDetails}
      />
      <ApplicationRejectionReasonModal
        open={showAppRejectionModal}
        onCancel={() => setShowAppRejectionModal(false)}
        rejectionReason={rejectionReason}
      />
      <ApplicationAppealRejectionReasonModal
        open={showAppealRejectionModal}
        onCancel={() => setShowAppealRejectionModal(false)}
        reason={appealDetails?.rejectionReason}
      />
      <ApplicationApprovalCommentModal
        open={showApprovalCommentModal}
        onCancel={() => setShowApprovalCommentModal(false)}
        comment={approvalComment}
      />
      <ApplicationRequestedChangesModal
        open={changesModalOpen}
        onCancel={() => setChangesModalOpen(false)}
        requestChangeFields={requestChangeFields}
      />
      <ApplicationProgressModal
        open={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        application={application}
        statusLower={application?.applicationStatus?.toLowerCase()}
      />
      <ApplicationAppealModal
        open={appealModalOpen}
        onCancel={() => setAppealModalOpen(false)}
        onSubmit={handleAppealSubmit}
        submitting={submittingAppeal}
      />
    </div>
  )
}
