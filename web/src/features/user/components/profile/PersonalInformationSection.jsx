import { Form, Input, Select, DatePicker, Typography } from 'antd'
import PhilippineAddressFields from "@/shared/components/PhilippineAddressFields"
import InfoGrid from '@/shared/components/InfoGrid'
import { useEditUserProfileForm } from "@/features/user/hooks/useEditUserProfileForm.jsx"
import {
  firstNameRules,
  lastNameRules,
  middleNameRules,
  suffixRules,
  phoneNumberRules,
} from "@/features/authentication/utils/validations"
import {
  pisMaritalStatusRules,
  pisPlaceOfBirthRules,
  pisNationalityRules,
  pisEducationRules,
  pisFatherNameRules,
  pisMotherNameRules,
} from "@/features/authentication/utils/validations/pisRules"
import { useAuthSession } from "@/features/authentication"
import dayjs from 'dayjs'

const { Title } = Typography

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'legally_separated', label: 'Legally Separated' },
  { value: 'annulled', label: 'Annulled' },
  { value: 'void', label: 'Void' },
]

const EDUCATION_OPTIONS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High School' },
  { value: 'college_undergraduate', label: 'College (Undergraduate)' },
  { value: 'college_graduate', label: 'College Graduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'vocational', label: 'Vocational/Technical' },
  { value: 'others', label: 'Others' },
]

export default function PersonalInformationSection({ isEditMode = false, form: externalForm, handleValuesChange: externalHandleValuesChange, profileValues: externalProfileValues = {} }) {
  const { currentUser } = useAuthSession()
  const role = currentUser?.role
  const roleKey = String(role?.slug || role || '').toLowerCase()
  const isBusinessOwner = roleKey === 'business_owner'
  const isStaffOrAdmin = roleKey === 'staff' || roleKey === 'admin'
  const showExtendedFields = isBusinessOwner || isStaffOrAdmin
  
  // Use external form/hook if provided (for UserSettingsView with edit mode), otherwise use internal (for ProfileSettingsLayout read-only)
  const {
    form: internalForm,
    handleValuesChange: internalHandleValuesChange,
    profileValues: internalProfileValues,
  } = useEditUserProfileForm()
  
  const form = externalForm || internalForm
  const handleValuesChange = externalHandleValuesChange || internalHandleValuesChange
  const profileValues = externalProfileValues || internalProfileValues

  // Read-only view using InfoGrid - reads from loaded profile data, not the form
  // store (the form has no registered fields while the Form is unmounted).
  const renderReadOnlyView = () => {
    const items = []
    const formValues = profileValues

    // Identity section
    items.push(
      { label: 'First Name', value: formValues.firstName || 'N/A' },
      { label: 'Last Name', value: formValues.lastName || 'N/A' }
    )

    if (showExtendedFields) {
      items.push(
        { label: 'Middle Name', value: formValues.middleName || 'N/A' },
        { label: 'Suffix', value: formValues.suffix || 'N/A' },
        { label: 'Sex', value: formValues.sex || 'N/A' },
        { label: 'Date of Birth', value: formValues.dateOfBirth ? dayjs(formValues.dateOfBirth).format('MMM D, YYYY') : 'N/A' },
        { label: 'Email', value: formValues.email || 'N/A' }
      )
    }

    items.push({ label: 'Phone Number', value: formValues.phoneNumber || 'N/A' })

    if (showExtendedFields) {
      items.push({ type: 'divider' })

      // Personal Info section
      items.push(
        { label: 'Marital Status', value: formValues.maritalStatus || 'N/A' },
        { label: 'Place of Birth', value: formValues.placeOfBirth || 'N/A' },
        { label: 'Nationality', value: formValues.nationality || 'N/A' },
        { label: 'Education', value: formValues.highestEducationalAttainment || 'N/A' },
        { label: "Father's Name", value: formValues.fatherName || 'N/A' },
        { label: "Mother's Name", value: formValues.motherName || 'N/A' },
        { label: 'Distinctive Mark', value: formValues.distinctiveMark || 'N/A' }
      )

      items.push({ type: 'divider' })

      // Address section
      const addr = formValues.address || {}
      items.push(
        { label: 'Street Address', value: addr.streetAddress || 'N/A' },
        { label: 'Barangay', value: addr.barangayName || 'N/A' },
        { label: 'City', value: addr.cityName || 'N/A' },
        { label: 'Province', value: addr.provinceName || 'N/A' },
        { label: 'Postal Code', value: addr.postalCode || 'N/A' }
      )
    }

    return (
      <InfoGrid items={items} />
    )
  }

  // Edit mode using Form
  const renderEditForm = () => {
    return (
      <div>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          style={{ width: 400, margin: '0 auto' }}
        >
          <Title level={5} style={{ marginBottom: 16 }}>Identity</Title>
          <Form.Item 
            name="firstName" 
            label="First Name" 
            rules={firstNameRules} 
            help={undefined}
          >
            <Input placeholder="First name" showCount maxLength={50} />
          </Form.Item>
          <Form.Item 
            name="lastName" 
            label="Last Name" 
            rules={lastNameRules} 
            help={undefined}
          >
            <Input placeholder="Last name" showCount maxLength={50} />
          </Form.Item>
          
          {showExtendedFields && (
            <>
              <Form.Item name="middleName" label="Middle Name (optional)" rules={middleNameRules}>
                <Input placeholder="Middle name" />
              </Form.Item>
              <Form.Item name="suffix" label="Suffix (optional)" rules={suffixRules}>
                <Input placeholder="e.g. Jr., Sr., III" />
              </Form.Item>
              <Form.Item name="email" label="Email">
                <Input placeholder="Email" />
              </Form.Item>
              <Form.Item name="sex" label="Sex">
                <Select placeholder="Select sex" options={SEX_OPTIONS} allowClear />
              </Form.Item>
              <Form.Item name="dateOfBirth" label="Date of Birth (optional)">
                <DatePicker style={{ width: '100%' }} placeholder="Select date of birth" />
              </Form.Item>
            </>
          )}
          
          <Form.Item 
            name="phoneNumber" 
            label="Phone Number" 
            rules={phoneNumberRules}
            help={undefined}
          >
            <Input
              placeholder="09XXXXXXXXX"
             
              showCount
              maxLength={11}
            />
          </Form.Item>

          {showExtendedFields && (
            <>
              <Title level={5} style={{ marginBottom: 16, marginTop: 24 }}>Personal Information</Title>
              <Form.Item name="maritalStatus" label="Marital Status" rules={pisMaritalStatusRules}>
                <Select placeholder="Select status" options={MARITAL_STATUS_OPTIONS} allowClear />
              </Form.Item>
              <Form.Item name="placeOfBirth" label="Place of Birth" rules={pisPlaceOfBirthRules}>
                <Input placeholder="Place of birth" />
              </Form.Item>
              <Form.Item name="nationality" label="Nationality" rules={pisNationalityRules}>
                <Input placeholder="e.g. Filipino" />
              </Form.Item>
              <Form.Item name="highestEducationalAttainment" label="Education" rules={pisEducationRules}>
                <Select placeholder="Select education level" options={EDUCATION_OPTIONS} allowClear />
              </Form.Item>
              <Form.Item name="fatherName" label="Father's Name" rules={pisFatherNameRules}>
                <Input placeholder="Full name of father" />
              </Form.Item>
              <Form.Item name="motherName" label="Mother's Name" rules={pisMotherNameRules}>
                <Input placeholder="Full name of mother" />
              </Form.Item>
              <Form.Item name="distinctiveMark" label="Distinctive Mark (optional)">
                <Input placeholder="e.g. scar on left hand" />
              </Form.Item>

              <Title level={5} style={{ marginBottom: 16, marginTop: 24 }}>Address</Title>
              <PhilippineAddressFields 
                form={form} 
                namePrefix="address" 
                required={false} 
                
                compactLayout={true}
              />
            </>
          )}
        </Form>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {isEditMode ? renderEditForm() : renderReadOnlyView()}
    </div>
  )
}
