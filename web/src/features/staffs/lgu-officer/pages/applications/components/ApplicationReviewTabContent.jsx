import { Typography, Alert } from 'antd'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import ApplicationInfoCard from './ApplicationInfoCard'

const { Text } = Typography

export default function ReviewTabContent({
  application,
  formDefLoading,
  formDefinition,
  ownerName,
  token,
  _canReview,
  allFieldKeys,
  decidedCount,
  _allFieldsReviewed,
  _rejectedFields,
  fieldReviewDecisions,
  sections,
  _isWaitingForApplicant,
  _isFinalDecision,
  _isDraft,
  _isOfficerDraft,
  _loadApplicationDetails,
  _message,
  ownerIdentity,
  businessReg,
  onShowAppRejectionModal,
  onShowAppealRejectionModal,
  onShowAppealLetterModal,
  onShowApprovalCommentModal,
  onViewReceipt,
  onViewAppealReceipt,
}) {
  return (
    <div style={{ overflow: 'auto' }}>
      {formDefLoading && (
        <div style={{ marginBottom: 16 }}>
          <LottieSpinner size="small" tip="Loading form sections..." />
        </div>
      )}
      {!formDefLoading && !formDefinition && (
        <Alert
          title="Form definition not loaded"
          description="No active form definition is available for this application type. Section tabs will appear when an active form is published by the admin."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Application Details Card */}
      <ApplicationInfoCard
        application={application}
        ownerName={ownerName}
        token={token}
        ownerIdentity={ownerIdentity}
        businessReg={businessReg}
        decidedCount={decidedCount}
        allFieldKeys={allFieldKeys}
        fieldReviewDecisions={fieldReviewDecisions}
        sections={sections}
        onShowAppRejectionModal={onShowAppRejectionModal}
        onShowAppealRejectionModal={onShowAppealRejectionModal}
        onShowAppealLetterModal={onShowAppealLetterModal}
        onShowApprovalCommentModal={onShowApprovalCommentModal}
        onViewReceipt={onViewReceipt}
        onViewAppealReceipt={onViewAppealReceipt}
      />

    </div>
  )
}
