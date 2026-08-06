import { useState, useCallback, useMemo, useEffect } from 'react'
import { Typography, Empty, theme, Space, Grid, Button, message, Row, Col } from 'antd'
import { UserOutlined, LockOutlined, IdcardOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import FormNavigation from '@/shared/components/FormNavigation'
import InfoGrid from '@/shared/components/InfoGrid'
import PanelCard from '@/shared/components/PanelCard'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import BusinessOwnerDetailHeader from './BusinessOwnerDetailHeader'
import BusinessOwnerEditInfoModal from './modals/BusinessOwnerEditInfoModal'
import BusinessOwnerUpdateEmailModal from './modals/BusinessOwnerUpdateEmailModal'
import { useBusinessOwnerBookmarks } from '../hooks/useBusinessOwnerBookmarks'
import { useBusinessOwnerData } from '../hooks/useBusinessOwnerData'
import { useBusinessOwnerModals } from '../hooks/useBusinessOwnerModals'
import { useBusinessOwnerHandlers } from '../hooks/useBusinessOwnerHandlers'
import { useBusinessOwnerForm } from '../hooks/useBusinessOwnerForm'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import BusinessOwnerService from '@/features/staffs/lgu-officer/services/businessOwnerService'
import { STATUS_CONFIG } from '../../applications/constants'

const { Text, Title } = Typography
const { useBreakpoint } = Grid

export default function BusinessOwnerDetailPanel({
  businessOwner: initialBusinessOwner,
  onReviewComplete: _onReviewComplete,
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('personal')

  const ownerId = initialBusinessOwner?._id || initialBusinessOwner?.id

  // Use data hook for fetching business owner, applications, and businesses
  const {
    businessOwner,
    applications,
    applicationsLoading,
    businesses: _businesses,
    updateBusinessOwner,
  } = useBusinessOwnerData(ownerId)

  // Use modal hook for modal state management
  const {
    historyModalOpen,
    editInfoModalOpen,
    updateEmailModalOpen,
    openHistoryModal,
    closeHistoryModal,
    openEditInfoModal,
    closeEditInfoModal,
    openUpdateEmailModal,
    closeUpdateEmailModal,
  } = useBusinessOwnerModals()

  const { auditLogs, auditLoading, refresh: refreshAudit } = useAudit('business-owner', ownerId)

  // Use form hook for form management
  const { editForm, emailForm, initializeEditForm, initializeEmailForm, hasChanges, changedFields, resetChangeTracking, handleValuesChange } = useBusinessOwnerForm(businessOwner)

  // Use handlers hook for event handlers
  const {
    handleEditInfoSubmit,
    handleUpdateEmailSubmit,
    stepUpModal,
  } = useBusinessOwnerHandlers(businessOwner, updateBusinessOwner)

  // Use bookmark hook
  const { isBookmarked, toggleBookmark } = useBusinessOwnerBookmarks(businessOwner)

  // Use step-up hook for resend operations
  const { runWithStepUp } = useStepUp()
  const businessOwnerService = useMemo(() => new BusinessOwnerService(), [])

  const handleResendCredentials = useCallback(async () => {
    try {
      await runWithStepUp(async (stepUpToken) => {
        await businessOwnerService.resendCredentialsEmail(ownerId, { stepUpToken })
      })
      message.success('Credentials email sent successfully')
      // Refresh business owner data to update emailSendStatus
      if (updateBusinessOwner) {
        await updateBusinessOwner()
      }
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error('Failed to send credentials email')
      }
    }
  }, [runWithStepUp, ownerId, businessOwnerService, updateBusinessOwner])

  const handleResendEditInfo = useCallback(async () => {
    try {
      await runWithStepUp(async (stepUpToken) => {
        await businessOwnerService.resendEditInfoEmail(ownerId, { stepUpToken })
      })
      message.success('Edit info email sent successfully')
      // Refresh business owner data to update emailSendStatus
      if (updateBusinessOwner) {
        await updateBusinessOwner()
      }
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error('Failed to send edit info email')
      }
    }
  }, [runWithStepUp, ownerId, businessOwnerService, updateBusinessOwner])

  const handleResendEmailChange = useCallback(async () => {
    try {
      await runWithStepUp(async (stepUpToken) => {
        await businessOwnerService.resendEmailChangeNotification(ownerId, { stepUpToken })
      })
      message.success('Email change notification sent successfully')
      // Refresh business owner data to update emailSendStatus
      if (updateBusinessOwner) {
        await updateBusinessOwner()
      }
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error('Failed to send email change notification')
      }
    }
  }, [runWithStepUp, ownerId, businessOwnerService, updateBusinessOwner])

  // Auto-retry logic with exponential backoff
  useEffect(() => {
    const emailTypes = ['credentials', 'editInfo', 'emailChange']
    const timers = []

    emailTypes.forEach(emailType => {
      const status = businessOwner?.emailSendStatus?.[emailType]
      if (status?.status === 'failed' && status.retryCount < 3) {
        // Calculate delay: 30s * 2^retryCount
        const delay = 30 * Math.pow(2, status.retryCount) * 1000
        const timer = setTimeout(async () => {
          try {
            let resendFn
            if (emailType === 'credentials') resendFn = handleResendCredentials
            else if (emailType === 'editInfo') resendFn = handleResendEditInfo
            else if (emailType === 'emailChange') resendFn = handleResendEmailChange

            if (resendFn) await resendFn()
          } catch (err) {
            console.error(`Auto-retry failed for ${emailType}:`, err)
          }
        }, delay)
        timers.push(timer)
      }
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [businessOwner?.emailSendStatus, handleResendCredentials, handleResendEditInfo, handleResendEmailChange])

  // Polling for status updates (every 10 seconds when there are failed emails)
  useEffect(() => {
    const hasFailedEmails = ['credentials', 'editInfo', 'emailChange'].some(
      emailType => businessOwner?.emailSendStatus?.[emailType]?.status === 'failed' &&
                   businessOwner.emailSendStatus[emailType].retryCount < 3
    )

    if (!hasFailedEmails || !updateBusinessOwner) return

    const interval = setInterval(async () => {
      try {
        await updateBusinessOwner()
      } catch (err) {
        console.error('Failed to poll for status updates:', err)
      }
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [businessOwner?.emailSendStatus, updateBusinessOwner])

  const handleHistoryClick = useCallback(() => {
    if (openHistoryModal) openHistoryModal()
  }, [openHistoryModal])

  const handleEditInfoClick = useCallback(() => {
    if (openEditInfoModal) openEditInfoModal()
  }, [openEditInfoModal])

  const handleUpdateEmailClick = useCallback(() => {
    if (initializeEmailForm) initializeEmailForm()
    if (openUpdateEmailModal) openUpdateEmailModal()
  }, [initializeEmailForm, openUpdateEmailModal])

  const handleEditInfoSubmitWithClose = useCallback(async (values) => {
    if (handleEditInfoSubmit) {
      await handleEditInfoSubmit(values, () => {
        if (closeEditInfoModal) closeEditInfoModal()
      })
    }
  }, [handleEditInfoSubmit, closeEditInfoModal])

  const handleUpdateEmailSubmitWithClose = useCallback(async (values) => {
    if (handleUpdateEmailSubmit) {
      await handleUpdateEmailSubmit(values, () => {
        if (closeUpdateEmailModal) closeUpdateEmailModal()
      })
    }
  }, [handleUpdateEmailSubmit, closeUpdateEmailModal])

  const handleCopyToClipboard = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(`${label} copied to clipboard`)
    } catch {
      message.error('Failed to copy')
    }
  }, [])

  if (!initialBusinessOwner) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <Empty
          image={<UserOutlined style={{ fontSize: 48, color: token.colorTextQuaternary }} />}
          styles={{ image: { height: 60 } }}
          description={<Text type="secondary">Select a business owner to view details</Text>}
        />
      </div>
    )
  }

  // Determine account status
  let statusLabel = 'Active'
  if (businessOwner?.deletionPending) {
    statusLabel = 'Pending Deletion'
  } else if (businessOwner && !businessOwner.isActive) {
    statusLabel = 'Inactive'
  }

  // Convert marital status to sentence case
  const toSentenceCase = (str) => {
    if (!str) return 'N/A'
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getBusinessStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || 'unknown'
    return statusLower === 'active' ? 'success'
         : statusLower === 'suspended' ? 'error'
         : statusLower === 'under_review' ? 'processing'
         : statusLower === 'inactive' ? 'default'
         : 'default'
  }

  // Tab items
  const mainNavItems = [
    {
      key: 'personal',
      label: (
        <Space>
          <IdcardOutlined />
          <span>Personal Information</span>
        </Space>
      ),
    },
    {
      key: 'account',
      label: (
        <Space>
          <LockOutlined />
          <span>Account Settings</span>
        </Space>
      ),
    },
    {
      key: 'applications',
      label: (
        <Space>
          <FileTextOutlined />
          <span>Applications</span>
        </Space>
      ),
    },
    {
      key: 'businesses',
      label: (
        <Space>
          <FileTextOutlined />
          <span>Businesses</span>
        </Space>
      ),
    },
  ]

  const getActiveContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <InfoGrid
            items={[
              { label: 'Status', value: statusLabel },
              { label: 'Email Verified', value: businessOwner?.isEmailVerified ? 'Yes' : 'No' },
              { label: 'MFA Enabled', value: businessOwner?.mfaEnabled ? 'Yes' : 'No' },
              { label: 'PIS Completed', value: businessOwner?.pisCompleted ? 'Yes' : 'No' },
              { label: 'Registered On', value: businessOwner?.createdAt ? new Date(businessOwner.createdAt).toLocaleDateString() : 'N/A' },
              { label: 'Last Login', value: businessOwner?.lastLoginAt ? new Date(businessOwner.lastLoginAt).toLocaleString() : 'N/A' },
            ]}
          />
        )
      case 'personal': {
        const addressParts = [
          businessOwner?.address?.street,
          businessOwner?.address?.barangay,
          businessOwner?.address?.city,
          businessOwner?.address?.province,
          businessOwner?.address?.zipCode,
        ].filter(Boolean)
        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A'
        return (
          <InfoGrid
            items={[
              { label: 'Name', value: [businessOwner?.firstName, businessOwner?.middleName, businessOwner?.lastName, businessOwner?.suffix].filter(Boolean).join(' ') || 'N/A' },
              { label: 'Email', value: businessOwner?.email ? <Button type="link" size="small" onClick={() => handleCopyToClipboard(businessOwner.email, 'Email')} style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}>{businessOwner.email}</Button> : 'N/A' },
              { label: 'Phone Number', value: businessOwner?.phoneNumber ? <Button type="link" size="small" onClick={() => handleCopyToClipboard(businessOwner.phoneNumber, 'Phone number')} style={{ padding: 0, height: 'auto', fontWeight: 600, textDecoration: 'underline' }}>{businessOwner.phoneNumber}</Button> : 'N/A' },
              { label: 'Sex', value: businessOwner?.sex ? (businessOwner.sex === 'male' ? 'Male' : businessOwner.sex === 'female' ? 'Female' : businessOwner.sex) : 'N/A' },
              { label: 'Date of Birth', value: businessOwner?.dateOfBirth ? new Date(businessOwner.dateOfBirth).toLocaleDateString() : 'N/A' },
              { label: 'Marital Status', value: toSentenceCase(businessOwner?.maritalStatus) },
              { type: 'divider' },
              { label: 'Address', value: fullAddress },
              { type: 'divider' },
              { label: 'Place of Birth', value: businessOwner?.placeOfBirth || 'N/A' },
              { label: 'Nationality', value: businessOwner?.nationality || 'N/A' },
              { label: 'Highest Educational Attainment', value: toSentenceCase(businessOwner?.highestEducationalAttainment) },
              { label: "Father's Name", value: businessOwner?.fatherName || 'N/A' },
              { label: "Mother's Name", value: businessOwner?.motherName || 'N/A' },
              { label: 'Distinctive Mark', value: businessOwner?.distinctiveMark || 'N/A' },
            ]}
          />
        )
      }
      case 'applications': {
        if (applicationsLoading) {
          return (
            <div style={{ padding: 16 }}>
              <Text type="secondary">Loading...</Text>
            </div>
          )
        }
        if (applications.length === 0) {
          return (
            <div style={{ padding: 16 }}>
              <Text type="secondary">No applications found</Text>
            </div>
          )
        }
        return (
          <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              {applications.map((app) => {
                const status = app.status || app.applicationStatus
                const statusLower = status?.toLowerCase() || 'unknown'
                const statusConfig = STATUS_CONFIG[statusLower] || { color: 'default', label: toSentenceCase(status) }
                const metaInfo = [
                  { label: 'Submitted on', value: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A' },
                ]
                if (app.reviewedByName) {
                  metaInfo.push({ label: 'Claimed by', value: app.reviewedByName })
                }
                return (
                  <Col key={app._id} xs={24} xl={12}>
                    <PanelCard
                      title={app.businessName || 'Unnamed Business'}
                      metaInfo={metaInfo}
                      tags={[
                        { color: statusConfig.color, label: statusConfig.label },
                        { color: 'default', label: app.applicationReferenceNumber || 'Pending Reference Number' },
                      ]}
                      onClick={() => navigate(`/staff/applications?selectedId=${app._id}`)}
                    />
                  </Col>
                )
              })}
            </Row>
          </div>
        )
      }
      case 'businesses': {
        const businesses = businessOwner?.businesses || []
        if (businesses.length === 0) {
          return (
            <div style={{ padding: 16 }}>
              <Title level={5}>Businesses</Title>
              <Text type="secondary">{businessOwner?.businessCount !== undefined ? `${businessOwner.businessCount} registered business${businessOwner.businessCount !== 1 ? 'es' : ''}` : 'No businesses found'}</Text>
            </div>
          )
        }
        return (
          <div style={{ padding: 16 }}>
            <Title level={5}>Businesses</Title>
            <Row gutter={[16, 16]}>
              {businesses.map((business) => (
                <Col key={business._id} xs={24} sm={12} lg={8} xl={6}>
                  {/* Each card is clickable and must redirect to the businesses page and open the detail panel for the clicked business */}
                  <PanelCard
                    title={business.businessName || business.registeredBusinessName || 'Unnamed Business'}
                    description=''
                    metaInfo={[
                      { label: 'Location', value: business.address ? (business.address.city || business.address.province || 'N/A') : 'N/A' },
                    ]}
                    tags={[
                      { color: getBusinessStatusColor(business.status), label: toSentenceCase(business.status) },
                      { color: 'default', label: business.businessType || business.lineOfBusiness || 'N/A' },
                    ]}
                  />
                </Col>
              ))}
            </Row>
          </div>
        )
      }
      default:
        return null
    }
  }

  const activeContent = getActiveContent()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <BusinessOwnerDetailHeader
        isBookmarked={isBookmarked}
        onBookmarkToggle={toggleBookmark}
        onHistoryClick={handleHistoryClick}
        onEditInfoClick={handleEditInfoClick}
        onUpdateEmailClick={handleUpdateEmailClick}
        emailSendStatus={businessOwner?.emailSendStatus}
        onResendCredentials={handleResendCredentials}
        onResendEditInfo={handleResendEditInfo}
        onResendEmailChange={handleResendEmailChange}
      />

      {/* Content with Form Navigation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {isMobile ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <FormNavigation
              mainNavItems={mainNavItems}
              formNavItems={[]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isMobile={isMobile}
            />
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeContent}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', alignItems: 'stretch' }}>
            <FormNavigation
              mainNavItems={mainNavItems}
              formNavItems={[]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isMobile={isMobile}
            />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                background: token.colorBgContainer,
              }}
            >
              {activeContent}
            </div>
          </div>
        )}
      </div>

      {/* Edit Information Modal */}
      <BusinessOwnerEditInfoModal
        open={editInfoModalOpen}
        onClose={closeEditInfoModal}
        _businessOwner={businessOwner}
        form={editForm}
        onSubmit={handleEditInfoSubmitWithClose}
        hasChanges={hasChanges}
        changedFields={changedFields}
        resetChangeTracking={resetChangeTracking}
        handleValuesChange={handleValuesChange}
        initializeEditForm={initializeEditForm}
      />

      {/* Update Email Modal */}
      <BusinessOwnerUpdateEmailModal
        open={updateEmailModalOpen}
        onClose={closeUpdateEmailModal}
        businessOwner={businessOwner}
        form={emailForm}
        onSubmit={handleUpdateEmailSubmitWithClose}
      />

      {/* Audit History Modal */}
      <AuditHistoryModal
        open={historyModalOpen}
        onClose={closeHistoryModal}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refreshAudit}
        DetailPanelComponent={(props) => (
          <AuditEventDetails
            {...props}
            priorityFields={[
              'eventType',
              'createdAt',
              'userName',
              'version',
              'updatedByName',
              'createdByName',
              'deletedByName',
            ]}
          />
        )}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('business_owner') || e.event.startsWith('account') || e.event.startsWith('personal') || e.event.startsWith('address') || e.event.startsWith('contact') || e.event.startsWith('email') || e.event.startsWith('password') || e.event.startsWith('mfa') || e.event.startsWith('name') || e.event.startsWith('pis'))}
      />

      {/* Step-up Modal */}
      {stepUpModal}
    </div>
  )
}
