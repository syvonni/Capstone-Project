import { useState, useEffect } from 'react'
import { Modal, Descriptions, Typography, Card, Tag, Empty, Skeleton, theme } from 'antd'
import LottieSpinner from '@/shared/components/LottieSpinner.jsx'
import { ShopOutlined } from '@ant-design/icons'
import { get } from '@/lib/http'
import dayjs from 'dayjs'

const { Text } = Typography
const { useToken } = theme

const EDUCATION_LABELS = {
  elementary: 'Elementary',
  high_school: 'High School',
  vocational: 'Vocational',
  college: 'College',
  postgraduate: 'Postgraduate',
}

const MARITAL_LABELS = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
  divorced: 'Divorced',
  separated: 'Separated',
}

const SEX_LABELS = { male: 'Male', female: 'Female' }

function formatDate(date) {
  if (!date) return 'N/A'
  const d = date?.toDate?.() || date
  return dayjs(d).format('MMM D, YYYY')
}

function na(value) {
  return value != null && String(value).trim() !== '' ? String(value).trim() : 'N/A'
}

const STATUS_COLORS = {
  draft: 'default',
  submitted: 'processing',
  under_review: 'processing',
  needs_revision: 'warning',
  approved: 'success',
  rejected: 'error',
  resubmit: 'warning',
}

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  needs_revision: 'Needs Revision',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmit: 'Resubmit',
}

export default function OwnerDetailsModal({ open, onClose, application, ownerIdentity = {}, businessReg = {}, ownerName }) {
  const { token } = useToken()
  // Fetch other applications by the same owner
  const [otherApplications, setOtherApplications] = useState([])
  const [loadingOthers, setLoadingOthers] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const currentBusinessId = application?.businessId || application?.applicationId || application?._id
  const ownerId = application?.userId

  // Fetch owner profile
  useEffect(() => {
    if (!ownerId) return
    let cancelled = false
    setLoadingProfile(true)
    get(`/api/lgu-officer/owner-profile/${ownerId}`)
      .then((res) => {
        if (cancelled) return
        setOwnerProfile(res.profile)
      })
      .catch((err) => {
        console.error('Failed to fetch owner profile:', err)
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false)
      })
    return () => { cancelled = true }
  }, [ownerId])

  const bo = application?.businessOwner || {}
  const formData = application?.formData || {}
  const profile = application?.profile || {}
  const op = ownerProfile || {}

  const fullName = ownerName || ownerIdentity.fullName || businessReg.ownerFullName || bo.name || formData.ownerName || profile.fullName || op.fullName || 'N/A'

  const parts = String(fullName).trim().split(/\s+/).filter(Boolean)
  const firstName = bo.firstName || formData.firstName || ownerIdentity.firstName || profile.firstName || op.firstName || parts[0] || 'N/A'
  const lastName = bo.lastName || formData.lastName || ownerIdentity.lastName || profile.lastName || op.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : 'N/A')
  const middleName = bo.middleName ?? formData.middleName ?? ownerIdentity.middleName ?? profile.middleName ?? op.middleName ?? ''
  const suffix = bo.suffix ?? formData.suffix ?? ownerIdentity.suffix ?? profile.suffix ?? op.suffix ?? ''

  const email = businessReg.emailAddress || bo.email || formData.email || ownerIdentity.email || profile.email || op.email || 'N/A'
  const phoneNumber = businessReg.mobileNumber || bo.phoneNumber || formData.phoneNumber || ownerIdentity.phoneNumber || profile.phoneNumber || op.phoneNumber || 'N/A'
  const dateOfBirth = ownerIdentity.dateOfBirth || bo.dateOfBirth || formData.dateOfBirth || profile.dateOfBirth || op.dateOfBirth
  const sex = ownerIdentity.sex || bo.sex || formData.sex || profile.sex || op.sex
  const maritalStatus = ownerIdentity.maritalStatus || bo.maritalStatus || formData.maritalStatus || profile.maritalStatus || op.maritalStatus
  const placeOfBirth = ownerIdentity.placeOfBirth || bo.placeOfBirth || formData.placeOfBirth || profile.placeOfBirth || op.placeOfBirth || ''
  const nationality = ownerIdentity.nationality || bo.nationality || businessReg.ownerNationality || formData.nationality || profile.nationality || op.nationality || ''
  const education = ownerIdentity.highestEducationalAttainment || bo.highestEducationalAttainment || formData.highestEducationalAttainment || profile.highestEducationalAttainment || op.highestEducationalAttainment || ''
  const fatherName = ownerIdentity.fatherName || bo.fatherName || formData.fatherName || profile.fatherName || op.fatherName || ''
  const motherName = ownerIdentity.motherName || bo.motherName || formData.motherName || profile.motherName || op.motherName || ''
  const distinctiveMark = ownerIdentity.distinctiveMark || bo.distinctiveMark || formData.distinctiveMark || profile.distinctiveMark || op.distinctiveMark || ''

  // Address: same separate fields as registration / PhilippineAddressFields
  const address = application?.businessOwner?.address || ownerIdentity.address || formData.address || profile.address || op.address || {}
  const fallbackLine = businessReg.ownerResidentialAddress || formData.ownerResidentialAddress || profile.ownerResidentialAddress || op.ownerResidentialAddress || ''
  const street = address.street || address.streetAddress || formData.street || profile.street || op.street || ''
  const barangay = address.barangayName || address.barangay || formData.barangay || profile.barangay || op.barangay || ''
  const city = address.cityName || address.city || formData.city || profile.city || op.city || ''
  const province = address.provinceName || address.province || formData.province || profile.province || op.province || ''
  const zipCode = address.postalCode || address.zipCode || formData.zipCode || profile.zipCode || op.zipCode || ''
  const hasStructuredAddress = [street, barangay, city, province, zipCode].some(v => v != null && String(v).trim() !== '')

  // Fixed label width so all sections have symmetrical left columns
  const descriptionLabelStyle = { width: 200, minWidth: 200 }

  // Fetch other applications by the same owner
  useEffect(() => {
    if (!ownerId) return
    let cancelled = false
    setLoadingOthers(true)
    get(`/api/lgu-officer/permit-applications?ownerId=${ownerId}&limit=50`)
      .then((res) => {
        if (cancelled) return
        const apps = res.applications || res || []
        // Filter out the current application
        const others = apps.filter((app) => {
          const appId = app.businessId || app.applicationId || app._id || app._businessId
          return String(appId) !== String(currentBusinessId)
        })
        setOtherApplications(others)
      })
      .catch((err) => {
        console.error('Failed to fetch other applications:', err)
        if (!cancelled) setOtherApplications([])
      })
      .finally(() => {
        if (!cancelled) setLoadingOthers(false)
      })
    return () => { cancelled = true }
  }, [ownerId, currentBusinessId])

  return (
    <Modal
      title="Owner Details"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <div style={{ padding: 16, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Basic information — same labels as Settings > General */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Basic information</Text>
            {loadingProfile ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
              <Descriptions column={1} size="small" bordered styles={{ label: descriptionLabelStyle }}>
                <Descriptions.Item label="First Name">{na(firstName)}</Descriptions.Item>
                <Descriptions.Item label="Last Name">{na(lastName)}</Descriptions.Item>
                <Descriptions.Item label="Middle Name (optional)">{na(middleName)}</Descriptions.Item>
                <Descriptions.Item label="Suffix (optional)">{na(suffix)}</Descriptions.Item>
                <Descriptions.Item label="Email">{na(email)}</Descriptions.Item>
                <Descriptions.Item label="Sex">{sex ? (SEX_LABELS[sex] || sex) : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth (optional)">{formatDate(dateOfBirth)}</Descriptions.Item>
                <Descriptions.Item label="Phone Number">{na(phoneNumber)}</Descriptions.Item>
              </Descriptions>
            )}
          </div>

          {/* Address — separate fields like registration page (or single line if only ownerResidentialAddress) */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Address</Text>
            {loadingProfile ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <Descriptions column={1} size="small" bordered styles={{ label: descriptionLabelStyle }}>
                {hasStructuredAddress ? (
                  <>
                    <Descriptions.Item label="House/Bldg No. & Street">{na(street)}</Descriptions.Item>
                    <Descriptions.Item label="Barangay">{na(barangay)}</Descriptions.Item>
                    <Descriptions.Item label="City/Municipality">{na(city)}</Descriptions.Item>
                    <Descriptions.Item label="Province">{na(province)}</Descriptions.Item>
                    <Descriptions.Item label="Postal Code">{na(zipCode)}</Descriptions.Item>
                  </>
                ) : (
                  <Descriptions.Item label="Complete Address">{na(fallbackLine)}</Descriptions.Item>
                )}
              </Descriptions>
            )}
          </div>

          {/* Other information — same labels as Settings > General */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Other information</Text>
            {loadingProfile ? (
              <Skeleton active paragraph={{ rows: 7 }} />
            ) : (
              <Descriptions column={1} size="small" bordered styles={{ label: descriptionLabelStyle }}>
                <Descriptions.Item label="Marital Status">{maritalStatus ? (MARITAL_LABELS[maritalStatus] || maritalStatus) : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Place of Birth">{na(placeOfBirth)}</Descriptions.Item>
                <Descriptions.Item label="Nationality">{na(nationality)}</Descriptions.Item>
                <Descriptions.Item label="Education">{education ? (EDUCATION_LABELS[education] || education) : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Father's Name">{na(fatherName)}</Descriptions.Item>
                <Descriptions.Item label="Mother's Name">{na(motherName)}</Descriptions.Item>
                <Descriptions.Item label="Distinctive Mark (optional)">{na(distinctiveMark)}</Descriptions.Item>
              </Descriptions>
            )}
          </div>

          {/* Other Business Applications by this Owner */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Other Business Applications</Text>
            {loadingOthers ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <LottieSpinner size="small" />
              </div>
            ) : otherApplications.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No other business applications"
                style={{ margin: '16px 0' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {otherApplications.map((app) => {
                  const appId = app.businessId || app.applicationId || app._id || app._businessId
                  const status = app.applicationStatus || app.status || 'draft'
                  return (
                    <Card
                      key={appId}
                      size="small"
                      styles={{ body: { padding: '12px 16px' } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                          <ShopOutlined style={{ fontSize: 18, color: token.colorPrimary, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {app.businessName || 'Unnamed Business'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {app.applicationReferenceNumber || `ID: ${String(appId).slice(-8)}`}
                              {app.submittedAt && ` • ${dayjs(app.submittedAt).format('MMM D, YYYY')}`}
                            </Text>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <Tag color={STATUS_COLORS[status] || 'default'}>
                            {STATUS_LABELS[status] || status}
                          </Tag>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
