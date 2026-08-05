import { useState, useCallback, useMemo } from 'react'
import { Modal, Form, Input, Divider, Button, Typography, message, Grid, Drawer, theme } from 'antd'
import PanelCard from '@/shared/components/PanelCard'
import InfoGrid from '@/shared/components/InfoGrid'
import ListPanel from '@/shared/components/ListPanel'
import PersonalInformationForm from '@/features/authentication/signup/components/PersonalInformationForm'
import dayjs from 'dayjs'
import { findProvinceByName, findCityByName, findBarangayByName } from '@/shared/services/psgcService'
import BusinessOwnerService from '@/features/staffs/lgu-officer/services/businessOwnerService'
import { useStepUp } from '@/shared/hooks/useStepUp'

const { Text } = Typography
const { useBreakpoint } = Grid
const { useToken } = theme

// BACKEND COMPATIBILITY NOTE:
// The backend registration endpoint expects the following fields that are NOT collected in this officer modal:
// - password: System will generate temporary password and email to business owner
// - confirmPassword: Not applicable for officer-initiated registration
// - termsAndConditions: Officer is registering on behalf of business owner, terms acceptance is implied
// - captchaToken: Not required for officer-initiated registration (officer already authenticated)
//
// When implementing actual API integration, ensure the backend either:
// 1. Accepts officer-initiated registrations without these fields, OR
// 2. Generates default values for these fields on the backend side

export default function BusinessOwnerRegisterModal({ open, onClose, onOwnerSelect }) {
  const [form] = Form.useForm()
  const screens = useBreakpoint()
  const { token } = useToken()
  const [currentStep, setCurrentStep] = useState(0)
  const [canSubmit, setCanSubmit] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedResult, setSelectedResult] = useState(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const isMobile = !screens.lg
  const { runWithStepUp, stepUpModal } = useStepUp()

  const businessOwnerService = useMemo(() => new BusinessOwnerService(), [])

  const showPrefillButton = import.meta.env.DEV === true

  const getDemoPrefill = useCallback(() => {
    return {
      firstName: 'Mark Stephen',
      lastName: 'Diaz',
      middleName: 'Cabalsi',
      suffix: '',
      email: 'stephendiaz.syv@gmail.com',
      phoneNumber: '09957811767',
      sex: 'male',
      maritalStatus: 'single',
      dateOfBirth: dayjs().subtract(30, 'year'),
      placeOfBirth: 'Manila',
      nationality: 'Filipino',
      highestEducationalAttainment: 'college',
      fatherName: 'José Dela Cruz',
      motherName: 'Maria Dela Cruz',
      distinctiveMark: '',
    }
  }, [])

  const resolveDemoAddress = useCallback(async () => {
    const province = await findProvinceByName('Pangasinan')
    if (!province) return null
    const city = await findCityByName('Alaminos City', province.code)
    if (!city) {
      return {
        streetAddress: '123 Rizal St',
        postalCode: '2404',
        province: province.code,
        provinceName: province.name,
        city: undefined,
        cityName: '',
        barangay: undefined,
        barangayName: '',
      }
    }
    const barangay = await findBarangayByName('Poblacion', city.code)
    return {
      streetAddress: '123 Rizal St',
      postalCode: '2404',
      province: province.code,
      provinceName: province.name,
      city: city.code,
      cityName: city.name,
      barangay: barangay?.code ?? '',
      barangayName: barangay?.name ?? '',
    }
  }, [])

  const handleFillDemoData = useCallback(async () => {
    const values = getDemoPrefill()
    form.setFieldsValue(values)
    const address = await resolveDemoAddress()
    if (address) {
      form.setFieldsValue({ address })
    }
    setHasChecked(false)
    setCanSubmit(false)
    setSearchResults([])
    setSelectedResult(null)
  }, [form, getDemoPrefill, resolveDemoAddress])

  const handleCheck = async () => {
    try {
      // Only validate step 0 fields (name fields), not step 2 fields
      const values = await form.validateFields(['firstName', 'lastName', 'middleName', 'suffix'])
      setSearchLoading(true)

      const searchParams = {
        firstName: values.firstName,
        lastName: values.lastName,
      }
      if (values.middleName) searchParams.middleName = values.middleName
      if (values.suffix) searchParams.suffix = values.suffix

      const response = await businessOwnerService.searchBusinessOwners(searchParams, { page: 1, limit: 20 })
      setSearchResults(response.data || [])
      setCanSubmit(true)
      setHasChecked(true)
    } catch (err) {
      console.error('[BusinessOwnerRegisterModal] Search error:', err)
      message.error('Failed to search for existing records')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleContinue = async () => {
    if (currentStep === 0) {
      // Proceed to step 2 (registration form)
      setCurrentStep(1)
    } else if (currentStep === 1) {
      // Validate step 2 form before proceeding
      try {
        await form.validateFields()
        setCurrentStep(2)
      } catch {
        // Validation failed, form will show errors
      }
    }
  }

  const handleBack = () => {
    if (currentStep === 1) {
      setCurrentStep(0)
    } else if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const handleFormChange = () => {
    // Re-enable check button and clear results when fields change
    setHasChecked(false)
    setCanSubmit(false)
    setSearchResults([])
    setSelectedResult(null)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await runWithStepUp(async (stepUpToken) => {
        await businessOwnerService.registerBusinessOwner(values, { stepUpToken })
      })
      message.success('Business owner registered successfully. Temporary credentials will be sent to their email.')
      onClose()
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error('Failed to register business owner')
      }
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setCanSubmit(false)
    setSearchResults([])
    setSelectedResult(null)
    setHasChecked(false)
    setCurrentStep(0)
    onClose()
  }

  const handleResultSelect = (result) => {
    setSelectedResult(result)
    // Close modal and pass selected owner to parent
    onClose()
    if (onOwnerSelect) {
      onOwnerSelect(result)
    }
  }

  const getItemId = useCallback((item) => {
    return item._id || item.userId || item.id
  }, [])

  const renderCard = (owner, currentSelectedId, onSelect) => {
    const ownerId = getItemId(owner)
    const createdDate = owner.createdAt ? dayjs(owner.createdAt).format('MMMM D, YYYY') : null
    const lastLoginDate = owner.lastLoginAt ? dayjs(owner.lastLoginAt).format('MMMM D, YYYY') : null

    // Construct full name from individual fields
    const fullName = [owner.firstName, owner.middleName, owner.lastName, owner.suffix]
      .filter(Boolean)
      .join(' ')

    // Determine account status for primary tag
    let statusLabel = 'Active'
    let statusColor = 'green'
    if (owner.deletionPending) {
      statusLabel = 'Pending Deletion'
      statusColor = 'orange'
    } else if (!owner.isActive) {
      statusLabel = 'Inactive'
      statusColor = 'red'
    }

    const tags = [
      { label: statusLabel, color: statusColor },
    ]
    if (owner.email) {
      tags.push({ label: owner.email.toLowerCase(), color: 'default', textTransform: 'none' })
    }
    if (owner.businessCount !== undefined) {
      tags.push({ label: `${owner.businessCount} business${owner.businessCount !== 1 ? 'es' : ''}`, color: 'default' })
    }
    const applicationCount = owner.applications?.length || 0
    if (applicationCount > 0) {
      tags.push({ label: `${applicationCount} application${applicationCount !== 1 ? 's' : ''}`, color: 'default' })
    }

    const metaInfo = []
    if (createdDate) {
      metaInfo.push({ label: 'Registered on', value: createdDate })
    }
    if (lastLoginDate) {
      metaInfo.push({ label: 'Last logged in', value: lastLoginDate })
    }

    return (
      <PanelCard
        key={ownerId}
        item={owner}
        selected={currentSelectedId === ownerId}
        onClick={() => onSelect(owner)}
        title={fullName || owner.fullName || owner.name || 'Unnamed Owner'}
        description=""
        metaInfo={metaInfo}
        tags={tags}
      />
    )
  }

  const toSentenceCase = (str) => {
    if (!str) return 'N/A'
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
        {/* Step Indicator */}
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Step {currentStep + 1} of 3
        </Text>

        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          initialValues={{
            firstName: '',
            middleName: '',
            lastName: '',
            suffix: '',
          }}
        >
        {/* Step 1: Name Verification */}
        {currentStep === 0 && (
          <>
            <Text style={{ display: 'block', marginBottom: 24 }}>
              Enter the business owner&apos;s name to check for existing records. If a match is found, you can link to the existing account. Otherwise, proceed with registration.
            </Text>

            <Form.Item
              name="firstName"
              label={<span>First Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: false, message: 'Please enter first name' }]}
            >
              <Input placeholder="Enter first name" />
            </Form.Item>

            <Form.Item
              name="middleName"
              label={<span>Middle Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: false, message: 'Please enter middle name' }]}
            >
              <Input placeholder="Enter middle name" />
            </Form.Item>

            <Form.Item
              name="lastName"
              label={<span>Last Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: false, message: 'Please enter last name' }]}
            >
              <Input placeholder="Enter last name" />
            </Form.Item>

            <Form.Item
              name="suffix"
              label="Suffix (Optional)"
            >
              <Input placeholder="e.g., Jr, Sr, III" />
            </Form.Item>

            <Divider />

            {/* Search Results */}
            <Button onClick={handleCheck} block disabled={hasChecked} loading={searchLoading}>
              Check for existing records
            </Button>

            {searchResults.length > 0 && (
              <div style={{ marginTop: 16, height: 500, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
                <ListPanel
                  items={searchResults}
                  isLoading={searchLoading}
                  selectedId={selectedResult?._id}
                  onSelectItem={handleResultSelect}
                  renderCard={renderCard}
                  pageSize={10}
                  customFilter={true}
                />
              </div>
            )}
          </>
        )}

        {/* Step 2: Registration Form */}
        {currentStep === 1 && (
          <>
            <Text style={{ display: 'block', marginBottom: 24 }}>
              Enter the business owner&apos;s personal and contact information.
            </Text>
          </>
        )}

        {/* Form is always mounted to preserve values, but only visible in step 1 */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <PersonalInformationForm
            form={form}
            showNameFields={true}
            showAccountInfo={true}
            showPIS={true}
            checkDuplicateFn={async (params) => {
              try {
                const result = await businessOwnerService.checkDuplicate(params)
                return result
              } catch {
                return { exists: false }
              }
            }}
          />
        </div>

        {/* Step 3: Review & Confirm */}
        {currentStep === 2 && (
          <>
            <Text style={{ display: 'block', marginBottom: 24 }}>
              Review the information below before registering the business owner. Submitting will send an email to the business owner with temporary credentials.
            </Text>
            

            {/* Review cards using InfoGrid */}
            <div style={{ marginTop: 16 }}>
              <InfoGrid
                items={[
                  { label: 'Name*', value: [form.getFieldValue('firstName'), form.getFieldValue('middleName'), form.getFieldValue('lastName'), form.getFieldValue('suffix')].filter(Boolean).join(' ') || 'N/A' },
                  { label: 'Email*', value: form.getFieldValue('email') || 'N/A' },
                  { label: 'Phone Number*', value: form.getFieldValue('phoneNumber') || 'N/A' },
                  { label: 'Sex*', value: toSentenceCase(form.getFieldValue('sex')) },
                  { label: 'Date of Birth*', value: form.getFieldValue('dateOfBirth') ? dayjs(form.getFieldValue('dateOfBirth')).format('MMMM D, YYYY') : 'N/A' },
                  { label: 'Marital Status*', value: toSentenceCase(form.getFieldValue('maritalStatus')) },
                  { type: 'divider' },
                  { label: 'Address*', value: (() => {
                    const address = form.getFieldValue('address') || {}
                    const addressParts = [
                      address.streetAddress,
                      address.barangayName || address.barangay,
                      address.cityName || address.city,
                      address.provinceName || address.province,
                      address.postalCode,
                    ].filter(Boolean)
                    return addressParts.length > 0 ? addressParts.join(', ') : 'N/A'
                  })() },
                  { type: 'divider' },
                  { label: 'Place of Birth*', value: form.getFieldValue('placeOfBirth') || 'N/A' },
                  { label: 'Nationality*', value: form.getFieldValue('nationality') || 'N/A' },
                  { label: 'Highest Educational Attainment*', value: toSentenceCase(form.getFieldValue('highestEducationalAttainment')) },
                  { label: "Father's Name*", value: form.getFieldValue('fatherName') || 'N/A' },
                  { label: "Mother's Name*", value: form.getFieldValue('motherName') || 'N/A' },
                  { label: 'Distinctive Mark', value: form.getFieldValue('distinctiveMark') || 'N/A' },
                ]}
              />
            </div>
          </>
        )}
      </Form>
      </div>
    </div>
  )

  const footerContent = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      {showPrefillButton && (
        <Button onClick={handleFillDemoData} style={{ fontSize: 13 }}>
          Fill demo data
        </Button>
      )}
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        {currentStep > 0 && (
          <Button onClick={handleBack}>
            Back
          </Button>
        )}
        {currentStep === 0 && (
          <Button type="primary" onClick={handleContinue} disabled={!canSubmit}>
            Continue
          </Button>
        )}
        {currentStep === 1 && (
          <Button type="primary" onClick={handleContinue}>
            Continue
          </Button>
        )}
        {currentStep === 2 && (
          <Button type="primary" onClick={handleSubmit}>
            Register Business Owner
          </Button>
        )}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Drawer
          open={open}
          onClose={handleCancel}
          title="Register Business Owner"
          placement="bottom"
          height="100%"
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
          destroyOnHidden
        >
          {content}
          <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {showPrefillButton && (
              <Button onClick={handleFillDemoData} style={{ fontSize: 13 }}>
                Fill demo
              </Button>
            )}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              {currentStep > 0 && (
                <Button onClick={handleBack}>
                  Back
                </Button>
              )}
              {currentStep === 0 && (
                <Button type="primary" onClick={handleContinue} disabled={!canSubmit}>
                  Continue
                </Button>
              )}
              {currentStep === 1 && (
                <Button type="primary" onClick={handleContinue}>
                  Continue
                </Button>
              )}
              {currentStep === 2 && (
                <Button type="primary" onClick={handleSubmit}>
                  Register Business Owner
                </Button>
              )}
            </div>
          </div>
        </Drawer>
        {stepUpModal}
      </>
    )
  }

  return (
    <>
      <Modal
        open={open}
        onCancel={handleCancel}
        title="Register Business Owner"
        footer={footerContent}
        width={600}
        destroyOnHidden
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '70vh' } }}
      >
        {content}
      </Modal>
      {stepUpModal}
    </>
  )
}
