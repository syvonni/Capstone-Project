import { Typography, Card, Divider, Grid, Button, theme, Tag } from 'antd'
import { FileTextOutlined, UserOutlined } from '@ant-design/icons'
import { getStatusLabel } from '@/shared/utils/statusUtils'
import { formatDate } from '../utils/formatters.js'
import ApplicationPermitTypesModal from '@/shared/components/applications/ApplicationPermitTypesModal'
import ApplicationFieldProgressModal from '@/shared/components/applications/ApplicationFieldProgressModal'
import { useApplicationInfoCard } from '../hooks/useApplicationInfoCard'
import ApplicationRequestedChangesModal from './modals/ApplicationRequestedChangesModal'

const { Text } = Typography

export default function ApplicationInfoCard({
  application,
  onProgressClick,
  onViewReceipt,
  onViewAppealReceipt,
  onViewAppealDetails,
  onAppealClick,
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
    isRejected,
    formType,
    permitTypeLabel,
    rejectionReason,
    approvalComment,
    requestChangeFields,
    formProgress,
  } = useApplicationInfoCard(application, sections, formValues)

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
      <div style={{ flex: screens.md ? '0 0 40%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: screens.md ? '48px 16px 16px' : '96px 24px 16px' }}>
        <div>
          <FileTextOutlined style={{ fontSize: 24, color: token.colorTextSecondary, marginBottom: 8 }} />
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
        <div>
          {statusLower === 'appeal_rejected' ? (
            <>
              {rejectionReason && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
                  <div>
                    <Button
                      type="link"
                      size="small"
                      onClick={onShowAppRejectionModal}
                      style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              )}
              {rejectionReason && appealDetails?.resolution && (
                <Divider style={{ margin: '12px 0' }} />
              )}
              {appealDetails?.resolution && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Appeal Rejection Reason</Text>
                  <div>
                    <Button
                      type="link"
                      size="small"
                      onClick={onShowAppealRejectionModal}
                      style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              )}
              {(rejectionReason || appealDetails?.resolution) && (
                <Divider style={{ margin: '12px 0' }} />
              )}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Message</Text>
                <Text style={{ marginTop: 4, display: 'block' }}>
                  Your appeal was not granted. This is the final decision on your application. You may submit a new application if you wish to reapply.
                </Text>
              </div>
            </>
          ) : statusLower === 'appeal_pending' ? (
            <>
              {rejectionReason && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
                  <div>
                    <Button
                      type="link"
                      size="small"
                      onClick={onShowAppRejectionModal}
                      style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              )}
              {rejectionReason && (
                <Divider style={{ margin: '12px 0' }} />
              )}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Message</Text>
                <Text style={{ marginTop: 4, display: 'block' }}>
                  Your appeal has been submitted and is under review. You will be notified once a decision is made.
                </Text>
              </div>
            </>
          ) : statusLower === 'rejected' ? (
            <>
              {rejectionReason && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
                  <div>
                    <Button
                      type="link"
                      size="small"
                      onClick={onShowAppRejectionModal}
                      style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Message</Text>
                <Text style={{ marginTop: 4, display: 'block' }}>
                  Your application was not approved. You can submit an appeal if you believe this decision was made in error. Note that an appeal fee applies when submitting.
                </Text>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Message</Text>
                <Text style={{ marginTop: 4, display: 'block' }}>
                  {statusLower === 'draft' && 'Your application is saved as a draft. Complete the required sections and submit when ready. You\'ll need to pay application fees when you submit.'}
                  {statusLower === 'submitted' && 'Your application has been submitted and will be assigned to a reviewer shortly.'}
                  {statusLower === 'under_review' && 'Your application is now being reviewed. You will be notified once the review is complete.'}
                  {statusLower === 'needs_revision' && 'Your application needs changes. Please review the requested updates below and resubmit.'}
                  {statusLower === 'resubmit' && 'Your updated application has been resubmitted and is awaiting review.'}
                  {statusLower === 'approved' && 'Congratulations! Your application has been approved. Please check the next steps for payment and permit issuance.'}
                  {statusLower === 'returned' && 'Your application has been returned for revision. Please review the officer\'s comments and update the required information.'}
                  {!['draft', 'submitted', 'under_review', 'needs_revision', 'resubmit', 'approved', 'returned'].includes(statusLower) && 'Track your application status and progress below.'}
                </Text>
              </div>
              {statusLower === 'approved' && approvalComment && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Approval Comment</Text>
                    <div style={{ marginTop: 4 }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={onShowApprovalCommentModal}
                        style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
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
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Original Rejection Reason (Appeal Granted)</Text>
                    <div style={{ marginTop: 4 }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={onShowAppRejectionModal}
                        style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {requestChangeFields.length > 0 && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Requested Changes</Text>
                    <div style={{ marginTop: 4 }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setChangesModalOpen(true)}
                        style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View Details ({requestChangeFields.length} Field{requestChangeFields.length !== 1 ? 's' : ''})
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
          {isRejected && !(application?.hasActiveAppeal || statusLower === 'appeal_pending' || statusLower === 'appeal_rejected') && (
            <div style={{ marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                onClick={onAppealClick}
                style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
              >
                <span>
                  Appeal Rejection
                </span>
              </Button>
            </div>
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
                    height: 'auto',
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
                style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
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
          {isDraft && formProgress.total > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Form Progress</Text>
              <div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setProgressModalOpen(true)}
                  style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
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
                  style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
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
                  style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
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
                  style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
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
                  style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
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
