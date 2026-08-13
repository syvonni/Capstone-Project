import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import { Typography, Space, theme, Empty, App, Form, Modal, Grid } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'
import { filterSectionsByFormValues } from '@/features/business-owner/utils/formUtils.js'
import {
  LOB_FIELD_DESCRIPTION,
  getReviewableFieldKeys,
  getFieldKey,
  getLobActivityFieldKey,
  getFieldDisplayName,
} from '@/features/staffs/lgu-officer/utils/fieldKeyUtils'
import { useAuthSession } from '@/features/authentication'
import DocumentPreviewModal from '@/shared/components/document/DocumentPreviewModal'
import FormRenderer from '@/shared/components/formPreview/FormRenderer'
import FieldDecisionControl from './ApplicationFieldDecisionControl'
import ReviewTabContent from './ApplicationReviewTabContent'
import ApplicationDetailPanelContent from './ApplicationDetailPanelContent'
import { useApplicationStatus } from '../hooks/useApplicationStatus'
import { useApplicationModals } from '../hooks/useApplicationModals'
import { useApplicationBookmarks } from '../hooks/useApplicationBookmarks'
import { useApplicationAppeals } from '../hooks/useApplicationAudit'
import { useApplicationViewReceipt } from '@/shared/hooks/useApplicationViewReceipt'
import { getPayments } from '@/features/staffs/lgu-officer/services/paymentService'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import { APPLICATION_AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { usePendingActionCountdown } from '../hooks/usePendingActionCountdown'
import { useFormDefinition } from '../hooks/useFormDefinition'
import { useApplicationClaim } from '../hooks/useApplicationClaim'
import { useApplicationFieldActions } from '../hooks/useApplicationFieldActions'
import { useApplicationPendingActions } from '../hooks/useApplicationPendingActions'
import { useApplicationActions } from '../hooks/useApplicationActions'
import { useApplicationHandlers } from '../hooks/useApplicationHandlers'
import { useApplicationTestData } from '@/features/business-owner/pages/applications/hooks/useApplicationTestData'
import { formDataWithDayjs } from '@/features/business-owner/utils/businessFormUtils.js'
import RejectApplicationModal from './modals/ApplicationRejectApplicationModal'
import RejectAppealModal from './modals/ApplicationRejectAppealModal'
import CompleteReviewModal from './modals/ApplicationCompleteReviewModal'
import ReturnToApplicantModal from './modals/ApplicationReturnToApplicantModal'
import DisabledReasonModal from './modals/ApplicationDisabledReasonModal'
import ApplicationRejectionReasonModal from '@/shared/components/applications/ApplicationRejectionReasonModal'
import ApplicationAppealRejectionReasonModal from '@/shared/components/applications/ApplicationAppealRejectionReasonModal'
import ApplicationAppealDetailsModal from '@/shared/components/applications/ApplicationAppealDetailsModal'
import ApplicationPaymentReceiptModal from '@/shared/components/applications/ApplicationPaymentReceiptModal'
import ApprovalCommentModal from './modals/ApplicationApprovalCommentModal'
import ViewReasonModal from './modals/ApplicationViewReasonModal'

const { Text, Title } = Typography

export default function ApplicationDetailPanel({
  application: initialApplication,
  onReviewComplete,
  onReview: _onReview,
  onReviewStarted,
  onSelectApplication: _onSelectApplication,
  onBookmarkToggle,
  onClose,
}) {

  const [startingReview, setStartingReview] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg
  const { message } = App.useApp()
  const { currentUser } = useAuthSession()
  const [documentCids, setDocumentCids] = useState({})
  const [_formValues, setFormValues] = useState({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  const permitService = useMemo(() => new PermitApplicationService(), [])
  const [application, setApplication] = useState(initialApplication)
  const [loading, setLoading] = useState(false)
  const { runWithStepUp, stepUpModal: handlersStepUpModal } = useStepUp()

  const { canReview, isFinalDecision, isWaitingForApplicant, isActiveReviewState, isDraft, isOfficerDraft, isClaimedByMe } = useApplicationStatus(application, currentUser)

  // Form instance for officer drafts
  const [form] = Form.useForm()

  // Email handlers
  const { handleResendEmail, handleResetEmailStatus, handleResendAppealEmail } = useApplicationHandlers(application, setApplication, null, null, initialApplication, runWithStepUp)

  const loadApplicationDetails = useCallback(async () => {
    // Accept either applicationId or businessId as valid identifier (old flat schema uses businessId)
    const appId = initialApplication?.applicationId || initialApplication?.businessId || initialApplication?._id
    if (!appId) return

    setLoading(true)
    try {
      const details = await permitService.getApplicationById(
        appId,
        initialApplication?.businessId
      )
      if (details) setApplication(details)
    } catch (error) {
      console.error('[loadApplicationDetails] Failed to load application details:', error)
      message.error('Failed to load application details')
    } finally {
      setLoading(false)
    }
  }, [initialApplication, permitService, message])

  // Officer draft handlers
  const handleFinishApplication = useCallback(async () => {
    if (!application?.applicationId && !application?._id) return

    try {
      await runWithStepUp(async (stepUpToken) => {
        const appId = application.applicationId || application._id
        await permitService.finishApplication(appId, stepUpToken)
        message.success('Application finished and approved successfully')
        await loadApplicationDetails()
      })
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error(err?.message || 'Failed to finish application')
      }
    }
  }, [application, permitService, runWithStepUp, loadApplicationDetails, message])

  const handleDeleteDraft = useCallback(async () => {
    if (!application?.applicationId && !application?._id) return

    Modal.confirm({
      title: 'Delete Draft Application',
      content: 'Are you sure you want to delete this draft application? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await runWithStepUp(async (stepUpToken) => {
            const appId = application.applicationId || application._id
            await permitService.deleteApplication(appId, stepUpToken)
            message.success('Draft application deleted successfully')
            if (onReviewComplete) {
              onReviewComplete()
            }
            if (onClose) {
              onClose()
            }
          })
        } catch (err) {
          if (err?.message !== 'Step-up cancelled') {
            message.error(err?.message || 'Failed to delete draft application')
          }
        }
      },
    })
  }, [application, permitService, runWithStepUp, onReviewComplete, onClose, message])

  // Load full application details on mount
  useEffect(() => {
    loadApplicationDetails()
  }, [loadApplicationDetails])

  // Use extracted hooks
  const pendingAction = application?.pendingAction?.actionType ? application.pendingAction : null
  const countdown = usePendingActionCountdown(pendingAction)
  const appIdentifier = application?.applicationId || application?.businessId
  const formDefId = application?.formDefinitionId
  const formType = application?.formType || 'permit'
  const businessType = application?.businessRegistration?.businessType || application?.organizationType || null
  const { formDefinition, formDefLoading } = useFormDefinition(appIdentifier, formDefId, formType, businessType)

  // Test data hook (shared with business owner)
  const { doFillTestData } = useApplicationTestData({
    formDefinition,
    generalPermitCategory: application?.category,
    form,
    setFormValues: (values) => {
      form.setFieldsValue(values)
    },
    isEditing: true,
    draftBusinessId: null,
    setDraftBusinessId: () => {},
    registrationType: application?.formType,
    message,
    mode: 'update',
    updateFn: permitService.updateFormData,
    applicationId: application.applicationId || application._id,
  })
  const { handleClaim, handleRelease, isClaimed, stepUpModal: claimStepUpModal } = useApplicationClaim(application, loadApplicationDetails, onReviewComplete, isClaimedByMe)
  const { handleFieldDecision } = useApplicationFieldActions(application, setApplication)

  // Use extracted hooks - must call useApplicationModals first to get setters
  const {
    documentModal, setDocumentModal,
    documentPreview, setDocumentPreview,
    auditModalOpen, setAuditModalOpen,
    rejectModalOpen, setRejectModalOpen,
    rejectAppealModalOpen, setRejectAppealModalOpen,
    completeReviewModalOpen, setCompleteReviewModalOpen,
    returnModalOpen, setReturnModalOpen,
    disabledReasonModal, setDisabledReasonModal,
    viewReasonOpen, setViewReasonOpen,
    showAppRejectionModal, setShowAppRejectionModal,
    showAppealRejectionModal, setShowAppealRejectionModal,
    showAppealLetterModal, setShowAppealLetterModal,
    showApprovalCommentModal, setShowApprovalCommentModal,
    showReceiptModal, setShowReceiptModal,
    receiptData, setReceiptData,
    rejectReason, setRejectReason,
    rejectAppealReason, setRejectAppealReason,
    completeReviewComment, setCompleteReviewComment,
    returnRequestOther, setReturnRequestOther,
  } = useApplicationModals()

  const { handleViewReceipt } = useApplicationViewReceipt({
    application,
    paymentType: 'registration_fee',
    getPayments,
    setReceiptData,
    setShowReceiptModal,
    transactionName: 'Business Permit Application',
  })

  const { handleViewReceipt: handleViewAppealReceipt } = useApplicationViewReceipt({
    application,
    paymentType: 'appeal_fee',
    getPayments,
    setReceiptData,
    setShowReceiptModal,
    transactionName: 'Appeal Payment',
  })

  const handleCloseReceiptModal = () => setShowReceiptModal(false)

  const handleViewDocument = useCallback((doc) => {
    setDocumentModal({ ...doc, open: true })
  }, [setDocumentModal])

  const {
    handleReturnConfirm,
    handleRejectClick,
    handleRejectConfirm,
    handleRejectAppealClick,
    handleRejectAppealConfirm,
    handleCompleteReviewClick,
    handleCompleteReviewConfirm,
    handleReturnClick,
    handleUndoPendingAction,
    handleExecutePendingActionNow,
    stepUpModal: pendingActionsStepUpModal,
  } = useApplicationPendingActions(
    application,
    loadApplicationDetails,
    onReviewComplete,
    // Values
    rejectReason,
    rejectAppealReason,
    completeReviewComment,
    returnRequestOther,
    // Setters
    setRejectReason,
    setRejectModalOpen,
    setRejectAppealReason,
    setRejectAppealModalOpen,
    setCompleteReviewComment,
    setCompleteReviewModalOpen,
    setReturnRequestOther,
    setReturnModalOpen
  )
  const { isBookmarked, _bookmarkId, handleBookmarkToggle } = useApplicationBookmarks(application, onBookmarkToggle)
  const appId = application?.applicationId || application?.businessId || application?._id
  const { auditLogs, auditLoading, refresh } = useAudit('application', appId, !!application)

  // Transform audit logs to match shared component format
  const transformedLogs = useMemo(() => {
    return auditLogs.map(audit => ({
      ...audit,
      timestamp: audit.createdAt,
      userName: audit.metadata?.userName || null,
    }))
  }, [auditLogs])

  // Custom search filter for application audit logs
  const searchFilter = useCallback((audit, searchValue) => {
    const searchLower = searchValue.toLowerCase()
    const metadata = audit.metadata || {}
    const user = metadata.userName || audit.role || ''
    const eventType = audit.eventType || ''
    const name = metadata.name || ''
    const ref = metadata.applicationReferenceNumber || metadata.applicationId || ''
    return user.toLowerCase().includes(searchLower) ||
           eventType.toLowerCase().includes(searchLower) ||
           name.toLowerCase().includes(searchLower) ||
           ref.toLowerCase().includes(searchLower)
  }, [])

  const { latestAppeal } = useApplicationAppeals(application)

  useEffect(() => {
    if (initialApplication) {
      setApplication(initialApplication)
      setActiveTab('overview')
    }
  }, [initialApplication])

  const _handleStartReview = async () => {
    if (!initialApplication?.applicationId) return
    if (!['submitted', 'resubmit'].includes(initialApplication?.status)) return

    setStartingReview(true)
    try {
      const result = await permitService.startReview({
        applicationId: initialApplication.applicationId,
        businessId: initialApplication.businessId
      })

      if (result?.lockedByOfficer) {
        message.warning(`This application is already under review by ${result.lockedByOfficer}`)
        await loadApplicationDetails()
      } else if (result?.application) {
        setApplication(result.application)
        if (onReviewStarted) {
          onReviewStarted(result.application)
        }
      } else {
        await loadApplicationDetails()
      }
    } catch (error) {
      console.error('Failed to start review:', error)
      await loadApplicationDetails()
    } finally {
      setStartingReview(false)
    }
  }

  const ownerIdentity = application?.ownerIdentity || {}
  const businessReg = application?.businessRegistration || {}

  // Fallback logic for owner name - same as ApplicationOwnerDetailsModal
  const bo = application?.businessOwner || {}
  const profile = application?.profile || {}
  const ownerName = application?.ownerName || ownerIdentity?.fullName || businessReg?.ownerFullName || bo?.name || profile?.fullName || 'N/A'

  const formData = useMemo(() =>
    application?.formData && typeof application.formData === 'object' ? application.formData : {},
    [application?.formData]
  )
  const formDataForForm = useMemo(() =>
    formDataWithDayjs(formData, formDefinition, application?.lguDocuments || {}),
    [formData, formDefinition, application?.lguDocuments]
  )
  const sections = formDefinition ? filterSectionsByFormValues(formDefinition.sections || [], formData) : []

  // Initialize form with existing formData for rendering and officer drafts
  // Only run when application is fully loaded (not just the initial prop from parent)
  useEffect(() => {
    if (application?.formData && application?.applicationId) {
      form.setFieldsValue(formDataForForm)
      setFormValues(formDataForForm)
    }
  }, [application?.applicationId, application?.formData, form, formDataForForm])

  // Auto-save for officer drafts with debouncing
  const savingRef = useRef(false)
  const triggerAutoSave = useCallback(async () => {
    if (!isOfficerDraft || (!application?.applicationId && !application?._id)) {
      return
    }
    if (savingRef.current) {
      return
    }
    if (!isClaimedByMe) {
      return
    }

    try {
      savingRef.current = true
      setSaving(true)
      const values = form.getFieldsValue(true)

      // Convert any dayjs instances back to date strings for the backend
      const serializeFormValues = (obj) => {
        if (dayjs.isDayjs(obj)) {
          return obj.format('YYYY-MM-DD')
        }
        if (Array.isArray(obj)) {
          return obj.map(serializeFormValues)
        }
        if (obj && typeof obj === 'object' && !(obj instanceof File) && !obj.uid) {
          const out = {}
          Object.keys(obj).forEach((k) => {
            out[k] = serializeFormValues(obj[k])
          })
          return out
        }
        return obj
      }
      const serializedValues = serializeFormValues(values)

      // Extract CIDs from file fields
      const allFields = (formDefinition?.sections || []).flatMap(s => s.items || [])
      const mergedCids = { ...documentCids }
      const cleanedValues = { ...serializedValues }

      allFields.forEach((field) => {
        if (field.type !== 'file') return
        const key = field.key
        if (!key) return
        const val = values[key]
        if (Array.isArray(val) && val.length > 0) {
          const first = val[0]
          const cid = first?.cid || first?.ipfsCid || first?.response?.cid
          if (cid && typeof cid === 'string' && cid.trim()) {
            mergedCids[field.documentKey || key] = cid.trim()
            cleanedValues[key] = cid.trim()
          }
        }
      })

      const payload = {
        formData: cleanedValues,
        documentCids: mergedCids,
      }

      await permitService.updateFormData(application.applicationId || application._id, payload)
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Auto-save failed:', err)
      message.error('Failed to save draft')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [isOfficerDraft, isClaimedByMe, application, form, formDefinition, documentCids, permitService, message])

  // Handle form values change (for unsaved changes tracking with debounced auto-save)
  const saveTimeoutRef = useRef(null)
  const handleFormValuesChange = useCallback(() => {
    if (!isOfficerDraft) {
      return
    }

    setHasUnsavedChanges(true)

    // Debounced auto-save on form change
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave()
    }, 5000) // Save after 5 seconds of inactivity
  }, [isOfficerDraft, triggerAutoSave])

  // Section-based auto-save (like business owner)
  const previousSectionRef = useRef(-1)
  useEffect(() => {
    if (!isOfficerDraft) return
    if (!hasUnsavedChanges) return
    if (previousSectionRef.current === activeTab) return
    if (saving) return

    // Auto-save when switching sections
    const autoSave = async () => {
      try {
        await triggerAutoSave()
      } catch (err) {
        console.error('Section change autosave failed:', err)
      }
    }
    autoSave()
    previousSectionRef.current = activeTab
  }, [activeTab, isOfficerDraft, hasUnsavedChanges, saving, triggerAutoSave])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Handle document CID from file upload
  const handleDocumentCid = useCallback((fieldKey, cid) => {
    setDocumentCids(prev => ({
      ...prev,
      [fieldKey]: cid,
    }))
  }, [])
  // ST-PA-17: Officer field editing is intentionally scoped to LOB fields only.
  // Other form fields (business info, address, etc.) are owner-controlled and
  // can only be changed via the Edit Request workflow.
  const { keys: allFieldKeys = [], lobSectionIndex } = getReviewableFieldKeys(sections, formData)
  const fieldReviewDecisions = useMemo(() => {
    return application?.fieldReviewDecisions && typeof application.fieldReviewDecisions === 'object' ? application.fieldReviewDecisions : {}
  }, [application?.fieldReviewDecisions])
  const decidedCount = allFieldKeys.filter((k) => fieldReviewDecisions[k]?.status).length
  const allFieldsReviewed = allFieldKeys.length > 0 && decidedCount >= allFieldKeys.length
  const rejectedFields = allFieldKeys.filter((k) => fieldReviewDecisions[k]?.status === 'rejected')

  const isFinalState = isFinalDecision || isWaitingForApplicant || !!pendingAction
  const isResubmit = application?.status === 'resubmit' || application?.applicationStatus === 'resubmit'
  const reviewLocked = !isActiveReviewState

  const handleAccept = useCallback((fieldKey, payload = { status: 'accepted' }) => {
    if (handleFieldDecision) handleFieldDecision(fieldKey, payload)
  }, [handleFieldDecision])

  const handleReject = useCallback((fieldKey, payload) => {
    if (handleFieldDecision) handleFieldDecision(fieldKey, payload)
  }, [handleFieldDecision])

  const renderFieldActions = useCallback((context) => {
    if (isOfficerDraft) return null
    const { field, sectionIndex, rowIndex } = context || {}
    if (sectionIndex === undefined) return null
    const fieldKey = rowIndex !== undefined
      ? getFieldKey(sectionIndex, field, rowIndex)
      : getFieldKey(sectionIndex, field)
    const decision = fieldReviewDecisions[fieldKey]
    return (
      <FieldDecisionControl
        fieldKey={fieldKey}
        decision={decision}
        onAccept={handleAccept}
        onReject={handleReject}
        token={token}
        disabled={reviewLocked}
        isMobile={isMobile}
        block
        isFinalState={isFinalState}
        isResubmit={isResubmit}
      />
    )
  }, [isOfficerDraft, fieldReviewDecisions, handleAccept, handleReject, token, reviewLocked, isMobile, isFinalState, isResubmit])

  const renderLineActions = useCallback((taxCode, lineName) => {
    if (isOfficerDraft) return null
    if (!handleFieldDecision && reviewLocked) return null
    const activities = Array.isArray(formData?.businessActivities) ? formData.businessActivities : []
    const index = activities.findIndex((activity) => {
      const line = activity.detailedLine || activity.detailedLineOfBusiness || activity.lineOfBusiness
      return activity.taxCode === taxCode && line === lineName
    })
    if (index === -1) return null
    const fieldKey = getLobActivityFieldKey(index)
    const decision = fieldReviewDecisions[fieldKey]
    return (
      <FieldDecisionControl
        fieldKey={fieldKey}
        decision={decision}
        onAccept={handleAccept}
        onReject={handleReject}
        token={token}
        disabled={reviewLocked}
        isMobile={false}
        isFinalState={isFinalState}
        block
      />
    )
  }, [isOfficerDraft, handleFieldDecision, reviewLocked, formData?.businessActivities, fieldReviewDecisions, handleAccept, handleReject, token, isFinalState])

  // Helper to get section and field name from fieldKey
  const getFieldDisplayNameForKey = (fieldKey) => {
    return getFieldDisplayName(fieldKey, sections, formData)
  }

  // Calculate fields with request changes
  const requestChangeFields = Object.entries(fieldReviewDecisions)
    .filter(([_, decision]) => decision?.status === 'request_changes')
    .map(([fieldKey, decision]) => ({
      fieldKey,
      displayName: getFieldDisplayNameForKey(fieldKey),
      reason: decision?.requestOther || decision?.requestCode || 'No reason provided'
    }))

  const { resolvedActionButtons } = useApplicationActions(
    application,
    isClaimedByMe,
    allFieldsReviewed,
    rejectedFields,
    requestChangeFields,
    isFinalDecision,
    isWaitingForApplicant,
    pendingAction,
    countdown,
    setDisabledReasonModal,
    setViewReasonOpen,
    handleRejectClick,
    handleRejectAppealClick,
    handleCompleteReviewClick,
    handleReturnClick,
    handleUndoPendingAction,
    handleExecutePendingActionNow,
    isOfficerDraft,
    handleFinishApplication,
    handleDeleteDraft,
    doFillTestData,
    hasUnsavedChanges,
    saving
  )

  if (!initialApplication) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
          <Empty
            image={<FileTextOutlined style={{ fontSize: 48, color: token.colorTextQuaternary }} />}
            styles={{ image: { height: 60 } }}
            description={<Text type="secondary">Select an application to view details</Text>}
          />
        </div>
        <Form form={form} style={{ display: 'none' }} />
      </>
    )
  }




  const mainNavItems = [
    {
      key: 'overview',
      label: (
        <Space>
          <FileTextOutlined />
          <span>Overview</span>
        </Space>
      ),
    },
  ]

  const formNavItems = sections.map((section, idx) => ({
    key: `section-${idx}`,
    label: section.sectionName || section.label || section.title || section.category || `Section ${idx + 1}`,
  }))

  const activeSectionIndex = activeTab.startsWith('section-')
    ? parseInt(activeTab.replace('section-', ''), 10)
    : 0

  const reviewContent = (
    <ReviewTabContent
      application={application}
      formDefLoading={formDefLoading}
      formDefinition={formDefinition}
      ownerName={ownerName}
      token={token}
      canReview={canReview}
      allFieldKeys={allFieldKeys}
      decidedCount={decidedCount}
      allFieldsReviewed={allFieldsReviewed}
      _rejectedFields={rejectedFields}
      fieldReviewDecisions={fieldReviewDecisions}
      sections={sections}
      _isWaitingForApplicant={isWaitingForApplicant}
      _isFinalDecision={isFinalDecision}
      isDraft={isDraft}
      _isOfficerDraft={isOfficerDraft}
      _loadApplicationDetails={loadApplicationDetails}
      _message={message}
      ownerIdentity={ownerIdentity}
      businessReg={businessReg}
      onShowAppRejectionModal={() => setShowAppRejectionModal(true)}
      onShowAppealRejectionModal={() => setShowAppealRejectionModal(true)}
      onShowAppealLetterModal={() => setShowAppealLetterModal(true)}
      onShowApprovalCommentModal={() => setShowApprovalCommentModal(true)}
      onViewReceipt={handleViewReceipt}
      onViewAppealReceipt={handleViewAppealReceipt}
    />
  )

  const sectionContent = (
    <FormRenderer
      definition={{ sections }}
      form={form}
      formValues={formData}
      activeSectionIndex={activeSectionIndex}
      readOnly={isOfficerDraft ? !isClaimedByMe : true}
      applicationId={application?.applicationId || application?._id}
      onDocumentCid={isOfficerDraft ? handleDocumentCid : undefined}
      documents={application?.lguDocuments || {}}
      fieldReviewDecisions={isOfficerDraft ? undefined : fieldReviewDecisions}
      renderFieldActions={isOfficerDraft ? undefined : renderFieldActions}
      renderLineActions={isOfficerDraft ? undefined : renderLineActions}
      onViewDocument={handleViewDocument}
      showAdminNotes={!isOfficerDraft}
      isMobile={isMobile}
      onLobChange={isOfficerDraft ? (businessActivities) => {
        form.setFieldsValue({ businessActivities })
        setFormValues((prev) => ({ ...prev, businessActivities }))
      } : undefined}
    />
  )

  const getSectionStatus = (sectionIdx) => {
    const sectionKeys = sectionIdx === lobSectionIndex
      ? allFieldKeys.filter((k) => k === LOB_FIELD_DESCRIPTION || k.startsWith('businessActivities.'))
      : allFieldKeys.filter((k) => String(k).startsWith(`${sectionIdx}.`))
    if (sectionKeys.length === 0) return null
    const hasRejected = sectionKeys.some((k) => fieldReviewDecisions[k]?.status === 'rejected')
    const allDecided = sectionKeys.every((k) => fieldReviewDecisions[k]?.status)
    if (hasRejected) return 'rejected'
    if (allDecided) return 'ok'
    return 'pending'
  }

  const activeContent = activeTab === 'overview' ? reviewContent : sectionContent

  return (
    <Form
      form={form}
      onValuesChange={handleFormValuesChange}
      layout="vertical"
      requiredMark={false}
      validateTrigger="onBlur"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <ApplicationDetailPanelContent
        loading={loading}
        startingReview={startingReview}
        setActiveTab={setActiveTab}
        application={application}
        isWaitingForApplicant={isWaitingForApplicant}
        ownerIdentity={ownerIdentity}
        businessReg={businessReg}
        ownerName={ownerName}
        rejectedFields={rejectedFields}
        fieldReviewDecisions={fieldReviewDecisions}
        sections={sections}
        loadApplicationDetails={loadApplicationDetails}
        message={message}
        activeContent={activeContent}
        mainNavItems={mainNavItems}
        formNavItems={formNavItems}
        activeTab={activeTab}
        getSectionStatus={getSectionStatus}
        token={token}
        onHistoryClick={() => setAuditModalOpen(true)}
        isClaimed={isClaimed}
        isClaimedByMe={isClaimedByMe}
        onClaim={handleClaim}
        onRelease={handleRelease}
        actionButtons={resolvedActionButtons}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
        hasPendingAction={pendingAction}
        isOfficerDraft={isOfficerDraft}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
        emailSendStatus={application?.emailSendStatus || {}}
        onResendEmail={handleResendEmail}
        onResetEmailStatus={handleResetEmailStatus}
        onResendAppealEmail={handleResendAppealEmail}
        appealId={application?.appealId}
        _permitService={permitService}
      />
      <DocumentPreviewModal
        open={documentModal.open}
        onClose={() => setDocumentModal({ open: false, url: null, label: '', type: 'other', isBlob: false })}
        url={documentModal.url}
        label={documentModal.label}
        type={documentModal.type}
        isBlob={documentModal.isBlob}
      />
      <RejectApplicationModal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
      />
      <RejectAppealModal
        open={rejectAppealModalOpen}
        onClose={() => setRejectAppealModalOpen(false)}
        onConfirm={handleRejectAppealConfirm}
        rejectAppealReason={rejectAppealReason}
        setRejectAppealReason={setRejectAppealReason}
      />
      <CompleteReviewModal
        open={completeReviewModalOpen}
        onClose={() => setCompleteReviewModalOpen(false)}
        onConfirm={handleCompleteReviewConfirm}
        completeReviewComment={completeReviewComment}
        setCompleteReviewComment={setCompleteReviewComment}
      />
      <ReturnToApplicantModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onConfirm={handleReturnConfirm}
        returnRequestOther={returnRequestOther}
        setReturnRequestOther={setReturnRequestOther}
        requestChangeFields={requestChangeFields}
      />
      <DisabledReasonModal
        open={disabledReasonModal.open}
        onClose={() => setDisabledReasonModal({ open: false, message: '' })}
        message={disabledReasonModal.message}
      />
      <AuditHistoryModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        auditLogs={transformedLogs}
        loading={auditLoading}
        eventDescriptions={APPLICATION_AUDIT_EVENT_INFO}
        customFilter={searchFilter}
        DetailPanelComponent={(props) => (
          <AuditEventDetails
            {...props}
            priorityFields={[
              'eventType',
              'name',
              'applicationId',
              'applicationReferenceNumber',
              'createdAt',
              'userName',
              'role',
              'oldStatus',
              'newStatus',
              'comments',
              'rejectionReason',
              'changedFields',
              'changeCount',
              'changeSummary',
              'fieldKey',
              'fieldDecision',
              'reasonCode',
              'actionType',
              'scheduledAt',
            ]}
          />
        )}
        onRefresh={refresh}
      />
      <ApplicationRejectionReasonModal
        open={showAppRejectionModal}
        onCancel={() => setShowAppRejectionModal(false)}
        rejectionReason={application?.rejectionReason}
        reviewedAt={application?.reviewedAt}
      />
      <ApplicationAppealRejectionReasonModal
        open={showAppealRejectionModal}
        onCancel={() => setShowAppealRejectionModal(false)}
        reason={latestAppeal?.resolution}
        resolvedAt={latestAppeal?.resolvedAt || latestAppeal?.updatedAt}
        resolvedByName={latestAppeal?.reviewedByName}
      />
      <ApplicationAppealDetailsModal
        open={showAppealLetterModal}
        onCancel={() => setShowAppealLetterModal(false)}
        appeal={latestAppeal}
        onViewDocument={setDocumentPreview}
      />
      <ApprovalCommentModal
        open={showApprovalCommentModal}
        onClose={() => setShowApprovalCommentModal(false)}
        reviewComments={application?.reviewComments}
      />
      <ApplicationPaymentReceiptModal
        visible={showReceiptModal}
        onClose={handleCloseReceiptModal}
        receiptId={receiptData?.receiptId}
        receiptNumber={receiptData?.receiptNumber}
        transactionDate={receiptData?.transactionDate}
        transactionName={receiptData?.transactionName}
        fees={receiptData?.fees}
        totalAmount={receiptData?.totalAmount}
        applicationReferenceNumber={receiptData?.applicationReferenceNumber}
        paymentType={receiptData?.paymentType}
      />
      <DocumentPreviewModal
        open={documentPreview.open}
        onClose={() => setDocumentPreview({ open: false, url: null, label: '', type: 'other', isBlob: false })}
        url={documentPreview.url}
        label={documentPreview.label}
        type={documentPreview.type}
        isBlob={documentPreview.isBlob}
      />
      <ViewReasonModal
        open={viewReasonOpen}
        onClose={() => setViewReasonOpen(false)}
        pendingAction={pendingAction}
      />
      {claimStepUpModal}
      {pendingActionsStepUpModal}
      {handlersStepUpModal}
    </Form>
  )
}
