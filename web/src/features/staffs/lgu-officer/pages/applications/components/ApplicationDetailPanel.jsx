import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Typography, Space, theme, Empty, App, Grid, Modal, Form } from 'antd'
import { generateTestDataForDefinition, formDataWithDayjs } from '@/features/business-owner/utils/businessFormUtils'
import { FileTextOutlined } from '@ant-design/icons'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'
import { filterSectionsByFormValues } from '@/features/business-owner/utils/formUtils.js'
import {
  LOB_FIELD_DESCRIPTION,
  getReviewableFieldKeys,
} from '@/features/staffs/lgu-officer/utils/fieldKeyUtils'
import { useAuthSession } from '@/features/authentication'
import DocumentPreviewModal from '@/shared/components/DocumentPreviewModal'
import ReviewTabContent from './ApplicationReviewTabContent'
import { createSectionTabs } from './ApplicationSectionTabs'
import ApplicationDetailPanelContent from './ApplicationDetailPanelContent'
import { useApplicationStatus } from '../hooks/useApplicationStatus'
import { useApplicationModals } from '../hooks/useApplicationModals'
import { useApplicationBookmarks } from '../hooks/useApplicationBookmarks'
import { useApplicationAudit, useApplicationAppeals } from '../hooks/useApplicationAudit'
import { usePendingActionCountdown } from '../hooks/usePendingActionCountdown'
import { useFormDefinition } from '../hooks/useFormDefinition'
import { useApplicationClaim } from '../hooks/useApplicationClaim'
import { useApplicationFieldActions } from '../hooks/useApplicationFieldActions'
import { useApplicationPendingActions } from '../hooks/useApplicationPendingActions'
import { useApplicationActions } from '../hooks/useApplicationActions'
import { useApplicationHandlers } from '../hooks/useApplicationHandlers'
import ApplicationAuditHistoryModal from './modals/ApplicationAuditHistoryModal'
import RejectApplicationModal from './modals/ApplicationRejectApplicationModal'
import RejectAppealModal from './modals/ApplicationRejectAppealModal'
import CompleteReviewModal from './modals/ApplicationCompleteReviewModal'
import ReturnToApplicantModal from './modals/ApplicationReturnToApplicantModal'
import DisabledReasonModal from './modals/ApplicationDisabledReasonModal'
import ApplicationRejectionReasonModal from './modals/ApplicationRejectionReasonModal'
import AppealRejectionReasonModal from './modals/ApplicationAppealRejectionReasonModal'
import AppealLetterModal from './modals/ApplicationAppealLetterModal'
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
  console.log('[AUTOSAVE] ApplicationDetailPanel rendered - applicationId:', initialApplication?.applicationId || initialApplication?._id)
  const [startingReview, setStartingReview] = useState(false)
  const [activeTab, setActiveTab] = useState('review')
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const { currentUser } = useAuthSession()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg
  const [documentCids, setDocumentCids] = useState({})
  const [_formValues, setFormValues] = useState({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  const permitService = useMemo(() => new PermitApplicationService(), [])
  const [application, setApplication] = useState(initialApplication)
  const [loading, setLoading] = useState(false)
  const { runWithStepUp } = useStepUp()

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
  console.log('[AUTOSAVE][HOOK-CALL] Before useFormDefinition - appIdentifier:', appIdentifier)
  const { formDefinition, formDefLoading } = useFormDefinition(appIdentifier, formDefId, formType, businessType)
  console.log('[AUTOSAVE][HOOK-CALL] After useFormDefinition - formDefinition:', !!formDefinition)

  const handleFillTestData = useCallback(async () => {
    if (!formDefinition) {
      message.error('Form definition not loaded yet. Please wait a moment and try again.')
      return
    }

    // Generate test data based on form definition (same as business owner)
    const testData = generateTestDataForDefinition(formDefinition, application?.category)
    const processedTestData = formDataWithDayjs(testData, formDefinition)

    // Update form directly first
    form.setFieldsValue(processedTestData)

    // Save to backend
    try {
      await permitService.updateFormData(application.applicationId || application._id, {
        formData: processedTestData
      })
      message.success('Test data filled successfully')
    } catch {
      message.error('Failed to save test data')
    }
  }, [formDefinition, application, form, permitService, message])
  console.log('[AUTOSAVE][HOOK-CALL] Before useApplicationClaim')
  const { handleClaim, handleRelease, isClaimed, stepUpModal: claimStepUpModal } = useApplicationClaim(application, loadApplicationDetails, onReviewComplete, isClaimedByMe)
  console.log('[AUTOSAVE][HOOK-CALL] Before useApplicationFieldActions')
  const { handleFieldDecision, handleSaveLob } = useApplicationFieldActions(application, setApplication)

  // Use extracted hooks - must call useApplicationModals first to get setters
  console.log('[AUTOSAVE][HOOK-CALL] Before useApplicationModals')
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
    rejectReason, setRejectReason,
    rejectAppealReason, setRejectAppealReason,
    completeReviewComment, setCompleteReviewComment,
    returnRequestOther, setReturnRequestOther,
  } = useApplicationModals()

  console.log('[AUTOSAVE][HOOK-CALL] Before useApplicationPendingActions')
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
  console.log('[AUTOSAVE][HOOK-CALL] Before useApplicationBookmarks')
  const { isBookmarked, _bookmarkId, handleBookmarkToggle } = useApplicationBookmarks(application, onBookmarkToggle)
  console.log('[AUTOSAVE][HOOK-CALL] Before useApplicationAudit')
  const { auditLogs: _auditLogs, _refreshAudit } = useApplicationAudit(application)
  console.log('[AUTOSAVE][HOOK-CALL] Before useApplicationAppeals')
  const { latestAppeal, _getActiveAppeal } = useApplicationAppeals(application)


  useEffect(() => {
    console.log('[AUTOSAVE][EFFECT-242] initialApplication changed -> setApplication + setActiveTab(review)')
    if (initialApplication) {
      setApplication(initialApplication)
      setActiveTab('review')
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

  const formData = application?.formData && typeof application.formData === 'object' ? application.formData : {}
  const sections = formDefinition ? filterSectionsByFormValues(formDefinition.sections || [], formData) : []

  // Initialize form with existing formData for officer drafts
  // Only run when application is fully loaded (not just the initial prop from parent)
  useEffect(() => {
    console.log('[AUTOSAVE][EFFECT-292] form-init effect fired (application.formData ref changed)')
    if (isOfficerDraft && application?.formData && application?.applicationId) {
      form.setFieldsValue(application.formData)
      setFormValues(application.formData)
    }
  }, [isOfficerDraft, application?.applicationId, application?.formData, form])

  // Auto-save for officer drafts with debouncing
  const savingRef = useRef(false)
  const triggerAutoSave = useCallback(async () => {
    console.log('[AUTOSAVE] triggerAutoSave called - isOfficerDraft:', isOfficerDraft, 'applicationId:', application?.applicationId || application?._id, 'isClaimedByMe:', isClaimedByMe)
    if (!isOfficerDraft || !application?.applicationId && !application?._id) {
      console.log('[AUTOSAVE] Aborting: not officer draft or no application ID')
      return
    }
    if (savingRef.current) {
      console.log('[AUTOSAVE] Aborting: already saving')
      return
    }
    if (!isClaimedByMe) {
      console.log('[AUTOSAVE] Aborting: not claimed by current officer')
      return
    }

    console.log('[AUTOSAVE] Starting auto-save for application:', application?.applicationId || application?._id)

    try {
      savingRef.current = true
      console.log('[AUTOSAVE] Setting saving state to true')
      setSaving(true)
      const values = form.getFieldsValue(true)
      console.log('[AUTOSAVE] Got form values:', values)

      // Extract CIDs from file fields
      const allFields = (formDefinition?.sections || []).flatMap(s => s.items || [])
      const mergedCids = { ...documentCids }
      const cleanedValues = { ...values }

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
      console.log('[AUTOSAVE] Calling permitService.updateFormData with payload:', payload)

      await permitService.updateFormData(application.applicationId || application._id, payload)
      console.log('[AUTOSAVE] updateFormData succeeded, setting hasUnsavedChanges to false')
      setHasUnsavedChanges(false)
      console.log('[AUTOSAVE] Auto-save completed successfully')
    } catch (err) {
      console.error('[AUTOSAVE] Auto-save failed:', err)
      message.error('Failed to save draft')
    } finally {
      console.log('[AUTOSAVE] Setting saving state to false')
      savingRef.current = false
      setSaving(false)
    }
  }, [isOfficerDraft, isClaimedByMe, application, form, formDefinition, documentCids, permitService, message])

  // Handle form values change (for unsaved changes tracking with debounced auto-save)
  const saveTimeoutRef = useRef(null)
  const handleFormValuesChange = useCallback((changedValues, allValues) => {
    console.log('[AUTOSAVE] handleFormValuesChange called - changedValues:', changedValues, 'allValues:', allValues)
    setHasUnsavedChanges(true)
    console.log('[AUTOSAVE] Setting hasUnsavedChanges to true')

    // Debounced auto-save on form change
    if (saveTimeoutRef.current) {
      console.log('[AUTOSAVE] Clearing existing timeout')
      clearTimeout(saveTimeoutRef.current)
    }
    console.log('[AUTOSAVE] Setting new 5-second timeout for auto-save')
    saveTimeoutRef.current = setTimeout(() => {
      console.log('[AUTOSAVE] 5-second timeout elapsed, triggering auto-save')
      triggerAutoSave()
    }, 5000) // Save after 5 seconds of inactivity
  }, [triggerAutoSave])

  // Section-based auto-save (like business owner)
  const previousSectionRef = useRef(-1)
  useEffect(() => {
    if (!isOfficerDraft) return
    if (!hasUnsavedChanges) return
    if (previousSectionRef.current === activeTab) return
    if (saving) return

    console.log('[Officer Draft Auto-save] Section change detected, triggering auto-save from', previousSectionRef.current, 'to', activeTab)

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
  const fieldReviewDecisions = application?.fieldReviewDecisions && typeof application.fieldReviewDecisions === 'object' ? application.fieldReviewDecisions : {}
  const decidedCount = allFieldKeys.filter((k) => fieldReviewDecisions[k]?.status).length
  const allFieldsReviewed = allFieldKeys.length > 0 && decidedCount >= allFieldKeys.length
  const rejectedFields = allFieldKeys.filter((k) => fieldReviewDecisions[k]?.status === 'rejected')

  // Helper to get section and field name from fieldKey
  const getFieldDisplayName = (fieldKey) => {
    const parts = fieldKey.split('.')
    const sectionIdx = parseInt(parts[0], 10)
    const fieldKeyPart = parts.slice(1).join('.')

    const section = sections[sectionIdx]
    if (!section) return fieldKey

    const sectionName = section?.label || section?.title || `Section ${sectionIdx + 1}`

    // Find the field in the section items
    const item = section?.items?.find((item) => item.key === fieldKeyPart || item.label === fieldKeyPart)
    const fieldName = item?.label || fieldKeyPart

    return `${sectionName} - ${fieldName}`
  }

  // Calculate fields with request changes
  const requestChangeFields = Object.entries(fieldReviewDecisions)
    .filter(([_, decision]) => decision?.status === 'request_changes')
    .map(([fieldKey, decision]) => ({
      fieldKey,
      displayName: getFieldDisplayName(fieldKey),
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
    handleFillTestData,
    hasUnsavedChanges,
    saving
  )

  if (!initialApplication) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <Empty
          image={<FileTextOutlined style={{ fontSize: 48, color: token.colorTextQuaternary }} />}
          styles={{ image: { height: 60 } }}
          description={<Text type="secondary">Select an application to view details</Text>}
        />
      </div>
    )
  }




  const sectionTabs = createSectionTabs(
    sections,
    lobSectionIndex,
    formDefLoading,
    formData,
    fieldReviewDecisions,
    isActiveReviewState,
    handleFieldDecision,
    handleSaveLob,
    token,
    false, // savingLob - not used in current implementation
    businessReg,
    application,
    setDocumentModal,
    isFinalDecision || isWaitingForApplicant || !!pendingAction, // isFinalState when in final decision state, waiting for applicant, or has pending action
    (application?.status === 'resubmit' || application?.applicationStatus === 'resubmit'), // isResubmit
    isOfficerDraft,
    isOfficerDraft ? form : null,
    handleDocumentCid,
    handleFormValuesChange,
    isClaimedByMe
  )

  const reviewTab = {
    key: 'review',
    label: (
      <Space>
        <FileTextOutlined />
        <span>Review</span>
      </Space>
    ),
    children: (
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
      />
    ),
  }

  const tabItems = [
    reviewTab,
    ...sectionTabs
  ]

  const navItems = tabItems.map((t) => ({ key: t.key, label: t.label }))
  const mainNavItems = navItems.slice(0, 1)
  const formNavItems = navItems.slice(1)

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

  const activeContent = tabItems.find((t) => t.key === activeTab)?.children

  return (
    <>
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
        onClose={() => setDocumentModal({ open: false, url: null, label: '', type: 'other' })}
        url={documentModal.url}
        label={documentModal.label}
        type={documentModal.type}
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
      <ApplicationAuditHistoryModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        application={application}
      />
      <ApplicationRejectionReasonModal
        open={showAppRejectionModal}
        onClose={() => setShowAppRejectionModal(false)}
        rejectionReason={application?.rejectionReason}
      />
      <AppealRejectionReasonModal
        open={showAppealRejectionModal}
        onClose={() => setShowAppealRejectionModal(false)}
        appealResolution={latestAppeal?.resolution}
      />
      <AppealLetterModal
        open={showAppealLetterModal}
        onClose={() => setShowAppealLetterModal(false)}
        latestAppeal={latestAppeal}
        setDocumentPreview={setDocumentPreview}
      />
      <ApprovalCommentModal
        open={showApprovalCommentModal}
        onClose={() => setShowApprovalCommentModal(false)}
        reviewComments={application?.reviewComments}
      />
      <DocumentPreviewModal
        open={documentPreview.open}
        onClose={() => setDocumentPreview({ open: false, url: null, label: '', type: 'other' })}
        url={documentPreview.url}
        label={documentPreview.label}
        type={documentPreview.type}
      />
      <ViewReasonModal
        open={viewReasonOpen}
        onClose={() => setViewReasonOpen(false)}
        pendingAction={pendingAction}
        isMobile={isMobile}
      />
      {claimStepUpModal}
      {pendingActionsStepUpModal}
      {/* Hidden Form to ensure form instance is always connected (prevents React warning) */}
      <Form form={form} style={{ display: 'none' }} />
    </>
  )
}
