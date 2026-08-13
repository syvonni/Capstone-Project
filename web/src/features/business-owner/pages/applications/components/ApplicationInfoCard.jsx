import { Typography, Card, Divider, Grid, Button, theme, Tag } from 'antd'
import { FileTextOutlined, UserOutlined } from '@ant-design/icons'
import { getStatusLabel } from '@/shared/utils/statusUtils'
import { formatDate } from '../utils/formatters.js'
import ApplicationPermitTypesModal from '@/shared/components/applications/ApplicationPermitTypesModal'
import ApplicationFieldProgressModal from '@/shared/components/applications/ApplicationFieldProgressModal'
import { useApplicationInfoCard } from '../hooks/useApplicationInfoCard'
import ApplicationRequestedChangesModal from '@/shared/components/applications/ApplicationRequestedChangesModal'

const { Text } = Typography

export default function ApplicationInfoCard({
  application,
  onProgressClick,
  onViewReceipt,
  onViewAppealReceipt,
  onViewAppealDetails,
  loadingAppealDetails = false,
  appealDetails = null,
  onShowAppRejectionModal,
  onShowAppealRejectionModal,
  onShowApprovalCommentModal,
  onShowFeesModal,
  feeData = null,
  loadingFees = false,
  sections = [],
  formValues = null,
}) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()

  const {
    permitModalOpen,
    setPermitModalOpen,
    changesModalOpen,
    setChangesModalOpen,
    progressModalOpen,
    setProgressModalOpen,
    statusLower,
    isDraft,
    isReturned,
    formType,
    permitTypeLabel,
    rejectionReason,
    approvalComment,
    requestChangeFields,
    returnHistory,
    formProgress,
  } = useApplicationInfoCard(application, sections, formValues)

  const changeFieldCount = returnHistory.length > 0
    ? returnHistory[returnHistory.length - 1].fields.length
    : requestChangeFields.length

  const statusMessage = (() => {
    switch (statusLower) {
      case 'draft':
        return 'Your application is saved as a draft. Complete the required sections and submit when ready. You\'ll need to pay application fees when you submit.'
      case 'submitted':
        return 'Your application has been submitted and will be assigned to a reviewer shortly.'
      case 'under_review':
        return 'Your application is now being reviewed. You will be notified once the review is complete.'
      case 'needs_revision':
        return 'Your application needs changes. Please review the requested updates below and resubmit.'
      case 'returned':
        return 'Your application has been returned for revision. Please review the officer\'s comments and update the required information.'
      case 'resubmit':
        return 'Your updated application has been resubmitted and is awaiting review.'
      case 'approved':
        return 'Congratulations! Your application has been approved. Please check the next steps for payment and permit issuance.'
      case 'rejected':
        return 'Your application was not approved. You can submit an appeal if you believe this decision was made in error. Note that an appeal fee applies when submitting.'
      case 'appeal_pending':
        return 'Your appeal has been submitted and is under review. You will be notified once a decision is made.'
      case 'appeal_rejected':
        return 'Your appeal was not granted. This is the final decision on your application. You may submit a new application if you wish to reapply.'
      default:
        return 'Track your application status and progress below.'
    }
  })()

  return (
    <>
    <Card
      size="small"
      style={{
        marginBottom: 12,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
      }}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: screens.md ? 'row' : 'column' }
      }}
    >
      {/* Left Panel - Icon and Title */}
      <div style={{ flex: screens.md ? '0 0 40%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: screens.md ? '48px 24px 24px' : '96px 24px 24px' }}>
        <div>
          <div
            style={{
              fontSize: 16,
              color: token.colorText,
              border: '1px solid',
              borderColor: token.colorBorder,
              padding: 6,
              height: 32,
              width: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <FileTextOutlined style={{ fontSize: 16 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Application Details</Typography.Title>
            {application?.createdByOfficer && (
              <Tag icon={<UserOutlined />} color="blue" style={{ fontSize: 11 }}>
                Created by Officer
              </Tag>
            )}
          </div>
        </div>
        <Divider style={{ margin: '16px 0' }} />
        <div style={{ width: '100%', marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Message</Text>
          <Text style={{ display: 'block' }}>{statusMessage}</Text>
        </div>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {statusLower === 'appeal_rejected' ? (
            <>
              {rejectionReason && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
                  <div>
                    <Button
                      type="link"
                      size="small"
                      onClick={onShowAppRejectionModal}
                      style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              )}
              {appealDetails?.resolution && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Appeal Rejection Reason</Text>
                  <div>
                    <Button
                      type="link"
                      size="small"
                      onClick={onShowAppealRejectionModal}
                      style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : statusLower === 'appeal_pending' ? (
            <>
              {rejectionReason && (
                <>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
                    <div>
                      <Button
                        type="link"
                        size="small"
                        onClick={onShowAppRejectionModal}
                        style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : statusLower === 'rejected' ? (
            <>
              {rejectionReason && (
                <>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
                    <div>
                      <Button
                        type="link"
                        size="small"
                        onClick={onShowAppRejectionModal}
                        style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {statusLower === 'approved' && approvalComment && (
                <>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Approval Comment</Text>
                    <div style={{ marginTop: 4 }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={onShowApprovalCommentModal}
                        style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {((statusLower === 'approved' || statusLower === 'under_review' || statusLower === 'returned') && application?.hadAppealGranted && application?.originalRejectionReason) && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Original Rejection Reason (Appeal Granted)</Text>
                    <div style={{ marginTop: 4 }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={onShowAppRejectionModal}
                        style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {(requestChangeFields.length > 0 || returnHistory.length > 0) && (
                <>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Requested Changes</Text>
                    <div>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setChangesModalOpen(true)}
                        style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View Details ({changeFieldCount} Field{changeFieldCount !== 1 ? 's' : ''})
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {statusLower === 'returned' && requestChangeFields.length === 0 && application.reviewComments && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Officer Comments</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text>{application.reviewComments}</Text>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Right Panel - Details Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: screens.md ? '24px' : '16px 24px 24px', borderLeft: screens.md ? `1px solid ${token.colorBorderSecondary}` : 'none', borderTop: screens.md ? 'none' : `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
            <div>
              {onProgressClick ? (
                <Button
                  type="link"
                  size="small"
                  onClick={onProgressClick}
                  style={{
                    padding: 0,
                    height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    textDecorationColor: statusLower === 'draft' ? token.colorText
                                    : statusLower === 'officer_draft' ? token.colorVolcano
                                    : statusLower === 'approved' ? token.colorSuccess
                                    : statusLower === 'rejected' ? token.colorError
                                    : statusLower === 'appeal_pending' ? token.colorPurple
                                    : statusLower === 'appeal_rejected' ? token.colorError
                                    : statusLower === 'needs_revision' || statusLower === 'returned' ? token.colorVolcano
                                    : token.colorInfo
                  }}
                >
                  <span style={{
                    color: statusLower === 'draft' ? token.colorText
                           : statusLower === 'officer_draft' ? token.colorVolcano
                           : statusLower === 'approved' ? token.colorSuccess
                           : statusLower === 'rejected' ? token.colorError
                           : statusLower === 'appeal_pending' ? token.colorPurple
                           : statusLower === 'appeal_rejected' ? token.colorError
                           : statusLower === 'needs_revision' || statusLower === 'returned' ? token.colorVolcano
                           : token.colorInfo
                  }}>
                    {statusLower === 'draft' ? 'Draft'
                     : statusLower === 'submitted' ? 'Waiting for Assignment'
                     : statusLower === 'under_review' ? 'Under Review'
                     : statusLower === 'needs_revision' ? 'Revision Required'
                     : statusLower === 'returned' ? 'Returned'
                     : statusLower === 'approved' ? 'Approved'
                     : statusLower === 'rejected' ? 'Rejected'
                     : statusLower === 'appeal_pending' ? 'Appeal Pending'
                     : statusLower === 'appeal_rejected' ? 'Appeal Rejected'
                     : getStatusLabel(statusLower)}
                  </span>
                </Button>
              ) : (
                <Text strong style={{
                  color: statusLower === 'draft' ? token.colorText
                         : statusLower === 'officer_draft' ? token.colorVolcano
                         : statusLower === 'approved' ? token.colorSuccess
                         : statusLower === 'rejected' ? token.colorError
                         : statusLower === 'appeal_pending' ? token.colorPurple
                         : statusLower === 'appeal_rejected' ? token.colorError
                         : statusLower === 'needs_revision' || statusLower === 'returned' ? token.colorVolcano
                         : token.colorInfo
                }}>
                  {statusLower === 'draft' ? 'Draft'
                   : statusLower === 'submitted' ? 'Waiting for Assignment'
                   : statusLower === 'under_review' ? 'Under Review'
                   : statusLower === 'needs_revision' ? 'Revision Required'
                   : statusLower === 'returned' ? 'Returned'
                   : statusLower === 'approved' ? 'Approved'
                   : statusLower === 'rejected' ? 'Rejected'
                   : statusLower === 'appeal_pending' ? 'Appeal Pending'
                   : statusLower === 'appeal_rejected' ? 'Appeal Rejected'
                   : getStatusLabel(statusLower)}
                </Text>
              )}
            </div>
          </div>
          {!isDraft && (
            <>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Submitted</Text>
                <div><Text strong>{formatDate(application.submittedAt)}</Text></div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Last Reviewed</Text>
                <div><Text strong>{application.reviewedAt ? formatDate(application.reviewedAt) : 'Not yet reviewed'}</Text></div>
              </div>
            </>
          )}
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Business Type</Text>
            <div>
              <Button
                type="link"
                size="small"
                onClick={() => setPermitModalOpen(true)}
                style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
              >
                {permitTypeLabel}
              </Button>
            </div>
          </div>
          {!isDraft && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Reference Number</Text>
              <div><Text strong>{application.applicationReferenceNumber || 'Pending'}</Text></div>
            </div>
          )}
          {(isDraft || isReturned) && formProgress.total > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Form Progress</Text>
              <div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setProgressModalOpen(true)}
                  style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {`${formProgress.completed}/${formProgress.total} Fields Completed`}
                </Button>
              </div>
            </div>
          )}
          {isDraft ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Application Fees</Text>
              <div>
                <Button
                  type="link"
                  size="small"
                  onClick={onShowFeesModal}
                  disabled={!onShowFeesModal}
                  style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                >
                  <span>
                    {loadingFees ? 'Loading...' : feeData?.fees ? `₱${(feeData.total || 0).toFixed(2)}` : 'View Fees'}
                  </span>
                </Button>
              </div>
            </div>
          ) : !isDraft && application.submittedAt && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Application Payment Receipt</Text>
              <div>
                <Button
                  type="link"
                  size="small"
                  onClick={onViewReceipt}
                  disabled={!onViewReceipt}
                  style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                >
                  <span>
                    View Receipt
                  </span>
                </Button>
              </div>
            </div>
          )}
          {(application?.hasActiveAppeal || statusLower === 'appeal_pending' || ((statusLower === 'approved' || statusLower === 'under_review') && application?.hadAppealGranted)) && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Appeal Payment Receipt</Text>
              <div>
                <Button
                  type="link"
                  size="small"
                  onClick={onViewAppealReceipt}
                  disabled={!onViewAppealReceipt}
                  style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                >
                  <span>View Receipt</span>
                </Button>
              </div>
            </div>
          )}
          {(application?.hasActiveAppeal || statusLower === 'appeal_pending' || ((statusLower === 'approved' || statusLower === 'under_review') && application?.hadAppealGranted)) && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Submitted Appeal</Text>
              <div>
                <Button
                  type="link"
                  size="small"
                  onClick={onViewAppealDetails}
                  loading={loadingAppealDetails}
                  disabled={!onViewAppealDetails}
                  style={{ padding: 0, height: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 600, textDecoration: 'underline' }}
                >
                  <span>View Details</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>

    <ApplicationPermitTypesModal
      open={permitModalOpen}
      onCancel={() => setPermitModalOpen(false)}
      selectedPermitType={formType || 'unified-business-permit'}
    />

    <ApplicationRequestedChangesModal
      open={changesModalOpen}
      onCancel={() => setChangesModalOpen(false)}
      requestChangeFields={requestChangeFields}
      returnHistory={returnHistory}
    />

    <ApplicationFieldProgressModal
      open={progressModalOpen}
      onCancel={() => setProgressModalOpen(false)}
      title="Incomplete Fields"
      fields={formProgress.incompleteFields}
      emptyMessage="All fields are completed"
    />
    </>
  )
}
