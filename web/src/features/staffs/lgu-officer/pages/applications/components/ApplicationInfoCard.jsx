import { Typography, Card, Divider, Grid, Button, Modal, Descriptions, theme } from 'antd'
import { useState, useEffect, useMemo } from 'react'
import { formatDate } from '../utils/formatters'
import { getStatusLabel } from '@/shared/utils/statusUtils'
import PermitTypesModal from '@/shared/components/PermitTypesModal'
import DocumentPreviewModal from '@/shared/components/DocumentPreviewModal'
import ApplicationProgressModal from '@/shared/components/ApplicationProgressModal'
import OwnerDetailsModal from './modals/ApplicationOwnerDetailsModal'

import { getAppealsByBusiness } from '../../../services/appealsService'
import { get } from '@/lib/http'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function ApplicationInfoCard({ application, ownerName, token, ownerIdentity, businessReg, decidedCount, allFieldKeys, fieldReviewDecisions = {}, sections = [], latestAppeal: propLatestAppeal, onShowAppRejectionModal, onShowAppealRejectionModal, onShowAppealLetterModal, onShowApprovalCommentModal }) {
  const screens = useBreakpoint()
  const { token: themeToken } = theme.useToken()
  const [progressModalOpen, setProgressModalOpen] = useState(false)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [changesModalOpen, setChangesModalOpen] = useState(false)
  const [pendingFieldsModalOpen, setPendingFieldsModalOpen] = useState(false)
  const [latestAppeal, setLatestAppeal] = useState(propLatestAppeal || null)
  const [previewModal, setPreviewModal] = useState({ open: false, url: null, label: '', type: 'other' })
  const [permitModalOpen, setPermitModalOpen] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState(null)

  const ownerId = application?.userId

  // Fetch owner profile to get the actual name
  useEffect(() => {
    if (!ownerId) return
    let cancelled = false
    get(`/api/lgu-officer/owner-profile/${ownerId}`)
      .then((res) => {
        if (cancelled) return
        setOwnerProfile(res.profile)
      })
      .catch((err) => {
        console.error('Failed to fetch owner profile:', err)
      })
    return () => { cancelled = true }
  }, [ownerId])

  const businessId = application?.businessId || application?.applicationId
  const isAppealPending = application?.status === 'appeal_pending' || application?.applicationStatus === 'appeal_pending'
  const isAppealRejected = application?.status === 'appeal_rejected' || application?.applicationStatus === 'appeal_rejected'
  const hadAppealGranted = application?.hadAppealGranted

  // Fetch appeal data when status is appeal_pending, appeal_rejected, or hadAppealGranted
  useEffect(() => {
    // If prop is provided, use it instead of fetching
    if (propLatestAppeal) {
      setLatestAppeal(propLatestAppeal)
      return
    }

    if (!businessId || (!isAppealPending && !isAppealRejected && !hadAppealGranted)) {
      setLatestAppeal(null)
      return
    }

    const fetchAppeal = async () => {
      try {
        const res = await getAppealsByBusiness(businessId)
        const appeals = res || []
        // Get the latest appeal (any status for appeal_pending, appeal_rejected, or hadAppealGranted applications)
        const activeAppeal = appeals[0] || null
        setLatestAppeal(activeAppeal)
      } catch (err) {
        console.error('Failed to fetch appeal:', err)
        setLatestAppeal(null)
      }
    }

    fetchAppeal()
  }, [businessId, isAppealPending, isAppealRejected, hadAppealGranted, propLatestAppeal])

  // Extract reviewer names from backend reviewers array
  const reviewers = useMemo(() => {
    if (!application?.reviewers || application.reviewers.length === 0) {
      return []
    }
    const uniqueNames = new Set()
    return application.reviewers
      .map(r => r.officerName)
      .filter(Boolean)
      .filter(name => {
        if (uniqueNames.has(name)) {
          return false
        }
        uniqueNames.add(name)
        return true
      })
  }, [application?.reviewers])

  // Read rejection reason directly from application object
  // Use originalRejectionReason if hadAppealGranted is true
  const rejectionReason = (application?.hadAppealGranted && application?.originalRejectionReason) || application?.rejectionReason || application?.formData?.rejectionReason || null

  // Read approval comment directly from application object
  const approvalComment = application?.reviewComments || application?.formData?.reviewComments || null

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

  // Calculate pending fields (fields without decisions)
  const pendingFields = (allFieldKeys || []).filter(fieldKey => !fieldReviewDecisions[fieldKey]?.status)
    .map(fieldKey => ({
      fieldKey,
      displayName: getFieldDisplayName(fieldKey)
    }))

  const statusLower = (application?.status || application?.applicationStatus)?.toLowerCase() || 'unknown'

  const statusColor = statusLower === 'approved' ? themeToken.colorSuccess
                   : statusLower === 'rejected' ? themeToken.colorError
                   : statusLower === 'appeal_pending' ? themeToken.colorPurple
                   : statusLower === 'appeal_rejected' ? themeToken.colorError
                   : statusLower === 'needs_revision' || statusLower === 'returned' ? themeToken.colorVolcano
                   : statusLower === 'resubmit' ? themeToken.colorCyan
                   : statusLower === 'suspended' ? themeToken.colorMagenta
                   : statusLower === 'officer_draft' ? themeToken.colorVolcano
                   : themeToken.colorInfo

  const isApproved = application?.status === 'approved' || application?.applicationStatus === 'approved'
  const createdByOfficer = application?.createdByOfficer === true

  // Use ownerIdentity as fallback for ownerName, then use fetched ownerProfile
  // Construct full name from firstName and lastName if fullName is not available
  const profileFullName = ownerProfile?.fullName || (ownerProfile?.firstName && ownerProfile?.lastName
    ? `${ownerProfile.firstName} ${ownerProfile.lastName}`.trim()
    : null)
  const displayOwnerName = ownerName && ownerName !== 'N/A' ? ownerName : ownerIdentity?.fullName || profileFullName || 'Unknown Owner'

  const statusLabel = statusLower === 'submitted' ? 'Waiting for Assignment'
                   : statusLower === 'under_review' ? 'Under Review'
                   : statusLower === 'needs_revision' ? 'Revision Required'
                   : statusLower === 'returned' ? 'Returned'
                   : statusLower === 'resubmit' ? 'Resubmitted'
                   : statusLower === 'approved' ? 'Approved'
                   : statusLower === 'rejected' ? 'Rejected'
                   : statusLower === 'appeal_pending' ? 'Appeal Pending'
                   : statusLower === 'appeal_rejected' ? 'Appeal Rejected'
                   : getStatusLabel(application?.status || application?.applicationStatus)

  // Determine permit type: formType contains the specific form ID (e.g., 'association-foundation-permit', 'unified-business-permit')
  const formType = application?.formType

  // Format kebab-case to Title Case for display
  const formatToTitleCase = (str) => {
    if (!str) return str
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Extract permit type name from formType
  // If formType is 'unified-business-permit', show 'Unified Business Permit'
  // If formType is 'association-foundation-permit', show 'Association Foundation Permit'
  let businessTypeLabel
  if (formType === 'unified-business-permit') {
    businessTypeLabel = 'Unified Business Permit'
  } else if (formType) {
    // Remove '-permit' suffix and format as title case
    const baseName = formType.replace(/-permit$/, '')
    businessTypeLabel = formatToTitleCase(baseName) + ' Permit'
  } else {
    businessTypeLabel = 'Unknown Permit'
  }

  const reviewingOfficerName = application?.reviewedByName ||
    (application?.reviewedBy?.firstName && application?.reviewedBy?.lastName
      ? `${application.reviewedBy.firstName} ${application.reviewedBy.lastName}`
      : application?.reviewedBy?.name) ||
    'LGU Officer'

  return (
    <>
    <Card
      size="small"
      style={{
        border: `1px solid ${token.colorBorder}`,
        borderRadius: 8,
        background: token.colorBgContainer,
      }}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: screens.xl ? 'row' : 'column', alignItems: 'stretch' }
      }}
    >
      {/* Left Panel - Key Information */}
      <div style={{ flex: screens.xl ? '0 0 50%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: screens.xl ? '20px 16px' : '96px 24px 16px' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Business Name</Text>
          <Typography.Title level={5} style={{ margin: 0 }}>{application?.businessName || application?.formData?.businessName || application?.formData?.registeredBusinessName || application?.formData?.activityName || application?.formData?.['Business / trade name'] || application?.formData?.businessTradeName || 'Unnamed Business'}</Typography.Title>
        </div>
        <Divider style={{ margin: '16px 0' }} />
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Applicant Name</Text>
          <div>
            <Button
              type="link"
              size="small"
              onClick={() => setOwnerModalOpen(true)}
              style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
            >
              {displayOwnerName}
            </Button>
          </div>
        </div>
        {statusLower === 'rejected' && rejectionReason && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
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
        {statusLower === 'appeal_pending' && (rejectionReason || latestAppeal?.description) && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            {rejectionReason && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
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
            )}
            {rejectionReason && latestAppeal?.description && (
              <Divider style={{ margin: '12px 0' }} />
            )}
            {latestAppeal?.description && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Appeal Letter</Text>
                <div style={{ marginTop: 4 }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={onShowAppealLetterModal}
                    style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {statusLower === 'appeal_rejected' && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            {rejectionReason && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Application Rejection Reason</Text>
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
            )}
            {rejectionReason && latestAppeal?.resolution && (
              <Divider style={{ margin: '12px 0' }} />
            )}
            {latestAppeal?.resolution && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Appeal Rejection Reason</Text>
                <div style={{ marginTop: 4 }}>
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
            {(rejectionReason || latestAppeal?.resolution) && latestAppeal?.description && (
              <Divider style={{ margin: '12px 0' }} />
            )}
            {latestAppeal?.description && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Appeal Letter</Text>
                <div style={{ marginTop: 4 }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={onShowAppealLetterModal}
                    style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {statusLower === 'approved' && approvalComment && (
          <>
            <Divider style={{ margin: '16px 0' }} />
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
            <Divider style={{ margin: '16px 0' }} />
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
        {((statusLower === 'approved' || statusLower === 'under_review' || statusLower === 'returned') && application?.hadAppealGranted && latestAppeal?.description) && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Appeal Letter</Text>
              <div style={{ marginTop: 4 }}>
                <Button
                  type="link"
                  size="small"
                  onClick={onShowAppealLetterModal}
                  style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                >
                  View Details
                </Button>
              </div>
            </div>
          </>
        )}
        {!createdByOfficer && requestChangeFields.length > 0 && (
          <>
            <Divider style={{ margin: '16px 0' }} />
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
      </div>

      {/* Right Panel - Details Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: screens.xl ? '24px' : '16px 24px 24px', borderLeft: screens.xl ? `1px solid ${token.colorBorderSecondary}` : 'none', borderTop: screens.xl ? 'none' : `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
            <div>
              <Button
                type="link"
                size="small"
                onClick={() => setProgressModalOpen(true)}
                style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline', textDecorationColor: statusColor }}
              >
                <span style={{ color: statusColor }}>
                  {statusLabel}
                </span>
              </Button>
            </div>
          </div>
          {!createdByOfficer && (
            <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Reference Number</Text>
              <div><Text strong>{application?.applicationReferenceNumber || 'Pending'}</Text></div>
            </div>
          )}
          <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Business Type</Text>
            <div>
              <Button
                type="link"
                size="small"
                onClick={() => setPermitModalOpen(true)}
                style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
              >
                {businessTypeLabel}
              </Button>
            </div>
          </div>
          <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{createdByOfficer ? 'Created On' : 'Submitted On'}</Text>
            <div><Text strong>{formatDate(createdByOfficer ? application?.createdAt : application?.submittedAt)}</Text></div>
          </div>
          {createdByOfficer && isApproved && application?.submittedAt && (
            <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Submitted On</Text>
              <div><Text strong>{formatDate(application?.submittedAt)}</Text></div>
            </div>
          )}
          <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Last Reviewed</Text>
            <div><Text strong>{application?.reviewedAt ? formatDate(application.reviewedAt) : 'Not yet reviewed'}</Text></div>
          </div>
          {latestAppeal && (isAppealPending || isAppealRejected) && (
            <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Appeal Submitted On</Text>
              <div><Text strong>{latestAppeal.createdAt ? formatDate(latestAppeal.createdAt) : 'Unknown'}</Text></div>
            </div>
          )}
          {isApproved && application?.hadAppealGranted && latestAppeal && (
            <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Appeal Submitted On</Text>
              <div><Text strong>{latestAppeal.createdAt ? formatDate(latestAppeal.createdAt) : 'Unknown'}</Text></div>
            </div>
          )}
          {!isApproved && (
            <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Review Progress</Text>
              <div>
                {decidedCount !== undefined && allFieldKeys?.length && pendingFields.length > 0 ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setPendingFieldsModalOpen(true)}
                    style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {`${decidedCount}/${allFieldKeys.length} Fields Completed`}
                  </Button>
                ) : (
                  <Text strong>{decidedCount !== undefined && allFieldKeys?.length ? `${decidedCount}/${allFieldKeys.length} Fields Completed` : 'N/A'}</Text>
                )}
              </div>
            </div>
          )}
          {!isApproved && !createdByOfficer && (
            <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Requested Changes</Text>
              <div>
                {requestChangeFields.length > 0 ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setChangesModalOpen(true)}
                    style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {requestChangeFields.length} Field{requestChangeFields.length !== 1 ? 's' : ''}
                  </Button>
                ) : (
                  <Text strong>0 Fields</Text>
                )}
              </div>
            </div>
          )}
          {application?.reviewedBy && (
            <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Currently Claimed By</Text>
              <div><Text strong>{reviewingOfficerName}</Text></div>
            </div>
          )}
          <div style={{ minWidth: '100px', flex: '1 1 150px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Reviewers</Text>
            <div><Text strong>{reviewers.length > 0 ? reviewers.join(', ') : 'None'}</Text></div>
          </div>
        </div>
      </div>
    </Card>

    <ApplicationProgressModal
      open={progressModalOpen}
      onClose={() => setProgressModalOpen(false)}
      application={application}
      status={application?.status}
      statusLower={statusLower}
      latestAppeal={application?.latestAppeal}
    />

    <OwnerDetailsModal
      open={ownerModalOpen}
      onClose={() => setOwnerModalOpen(false)}
      application={application}
      ownerIdentity={ownerIdentity}
      businessReg={businessReg}
      ownerName={ownerName}
    />

    <DocumentPreviewModal
      open={previewModal.open}
      onClose={() => setPreviewModal({ open: false, url: null, label: '', type: 'other' })}
      url={previewModal.url}
      label={previewModal.label}
      type={previewModal.type}
    />

    <Modal
      title="Requested Changes"
      open={changesModalOpen}
      onCancel={() => setChangesModalOpen(false)}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16 }}>
        {requestChangeFields.length > 0 ? (
          (() => {
            // Group fields by section
            const groupedBySection = requestChangeFields.reduce((acc, item) => {
              const sectionMatch = item.displayName.match(/^Section \d+ - /)
              const sectionName = sectionMatch ? item.displayName.split(' - ')[0] : 'Other'
              const fieldName = sectionMatch ? item.displayName.replace(sectionMatch[0], '') : item.displayName
              if (!acc[sectionName]) {
                acc[sectionName] = []
              }
              acc[sectionName].push({ fieldName, reason: item.reason, fieldKey: item.fieldKey })
              return acc
            }, {})

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {Object.entries(groupedBySection)
                  .sort(([a], [b]) => {
                    // Sort "Other" to the end
                    if (a === 'Other') return 1
                    if (b === 'Other') return -1
                    return a.localeCompare(b)
                  })
                  .map(([sectionName, fields]) => (
                  <div key={sectionName}>
                    <Text style={{ display: 'block', marginBottom: 12 }}>{sectionName}</Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {fields.map((field) => (
                        <Descriptions key={field.fieldKey} column={1} bordered size="small" labelStyle={{ width: '120px' }}>
                          <Descriptions.Item label="Field Name">{field.fieldName}</Descriptions.Item>
                          <Descriptions.Item label="Reason">{field.reason}</Descriptions.Item>
                        </Descriptions>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()
        ) : (
          <Text type="secondary">No requested changes</Text>
        )}
      </div>
    </Modal>

    <Modal
      title={`Pending Review Fields (${pendingFields.length})`}
      open={pendingFieldsModalOpen}
      onCancel={() => setPendingFieldsModalOpen(false)}
      footer={null}
      width={600}
    >
      {pendingFields.length > 0 ? (
        (() => {
          // Group fields by section
          const groupedBySection = pendingFields.reduce((acc, item) => {
            const sectionMatch = item.displayName.match(/^Section \d+ - /)
            const sectionName = sectionMatch ? item.displayName.split(' - ')[0] : 'Other'
            const fieldName = sectionMatch ? item.displayName.replace(sectionMatch[0], '') : item.displayName
            if (!acc[sectionName]) {
              acc[sectionName] = []
            }
            acc[sectionName].push(fieldName)
            return acc
          }, {})

          return (
            <Descriptions column={1} bordered size="small" labelStyle={{ width: '150px' }}>
              {Object.entries(groupedBySection)
                .sort(([a], [b]) => {
                  // Sort "Other" to the end
                  if (a === 'Other') return 1
                  if (b === 'Other') return -1
                  return a.localeCompare(b)
                })
                .map(([sectionName, fields]) => (
                <Descriptions.Item key={sectionName} label={sectionName}>
                  {fields.join(', ')}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )
        })()
      ) : (
        <Text type="secondary">No pending fields</Text>
      )}
    </Modal>

    <PermitTypesModal 
      open={permitModalOpen} 
      onCancel={() => setPermitModalOpen(false)}
      selectedPermitType={formType || 'unified-business-permit'}
    />
  </>
  )
}
