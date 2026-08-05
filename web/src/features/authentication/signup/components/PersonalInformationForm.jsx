// PersonalInformationForm.jsx — Reusable personal information form component
// Extracted from UserSignUpForm.jsx (lines 142-263) for officer-initiated registration
// Reference: /web/src/features/authentication/signup/UserSignUpForm.jsx
import { Form, Input, Select, DatePicker, Row, Col, theme } from 'antd'

import {
  emailRules,
  emailDuplicateRule,
  firstNameRules,
  lastNameRules,
  middleNameRules,
  suffixRules,
  phoneNumberRules,
  phoneDuplicateRule,
} from '@/features/authentication/utils/validations'
import {
  pisSexRules,
  pisMaritalStatusRules,
  pisDateOfBirthRules,
  pisPlaceOfBirthRules,
  pisNationalityRules,
  pisFatherNameRules,
  pisMotherNameRules,
  pisEducationRules,
} from '@/features/authentication/utils/validations/pisRules'

import { preventNonNumericKeyDown, sanitizePhonePaste, sanitizePhoneInput } from '@/shared/forms'
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields'

const { useToken } = theme

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'separated', label: 'Separated' },
]

const EDUCATION_OPTIONS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High School' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'college', label: 'College' },
  { value: 'postgraduate', label: 'Postgraduate' },
]

export default function PersonalInformationForm({ form, showNameFields = true, showAccountInfo = true, showPIS = true, checkDuplicateFn }) {
  const { token } = useToken()

  // Build email rules with duplicate check if function provided
  const emailRulesWithCheck = checkDuplicateFn
    ? [...emailRules, emailDuplicateRule(checkDuplicateFn)]
    : emailRules

  // Build phone rules with duplicate check if function provided
  const phoneRulesWithCheck = checkDuplicateFn
    ? [...phoneNumberRules, phoneDuplicateRule(checkDuplicateFn)]
    : phoneNumberRules

  return (
    <>
      {/* Name fields - conditionally rendered based on showNameFields prop */}
      {showNameFields && (
        <>
          <Form.Item name="firstName" label={<span>First Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={firstNameRules}>
            <Input placeholder="First name"/>
          </Form.Item>
          <Form.Item name="lastName" label={<span>Last Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={lastNameRules}>
            <Input placeholder="Last name" />
          </Form.Item>
          <Form.Item name="middleName" label={<span>Middle Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={middleNameRules}>
            <Input placeholder="Middle name" />
          </Form.Item>
          <Form.Item name="suffix" label="Suffix (optional)" rules={suffixRules}>
            <Input placeholder="e.g. Jr., Sr., III" />
          </Form.Item>
        </>
      )}

      {/* Account Information Fields */}
      {showAccountInfo && (
        <>
          <Form.Item name="email" label={<span>Email<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={emailRulesWithCheck}>
            <Input placeholder="Email address" />
          </Form.Item>
          <Form.Item name="phoneNumber" label={<span>Phone Number<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={phoneRulesWithCheck}>
            <Input
              placeholder="Mobile number"
              inputMode="numeric"
              pattern="[0-9]*"
              onKeyDown={preventNonNumericKeyDown}
              onPaste={sanitizePhonePaste}
              onInput={sanitizePhoneInput}
            />
          </Form.Item>
        </>
      )}

      {/* PIS (Personal Information Sheet) Fields */}
      {showPIS && (
        <>
          <Row gutter={0}>
            <PhilippineAddressFields form={form} required namePrefix="address" />
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="sex" label={<span>Sex<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisSexRules}>
                <Select placeholder="Select sex" options={SEX_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="maritalStatus" label={<span>Marital Status<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisMaritalStatusRules}>
                <Select placeholder="Select status" options={MARITAL_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="dateOfBirth" label={<span>Date of Birth<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisDateOfBirthRules}>
                <DatePicker style={{ width: '100%' }} placeholder="Select date" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="placeOfBirth" label={<span>Place of Birth<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisPlaceOfBirthRules}>
                <Input placeholder="Place of birth" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="nationality" label={<span>Nationality<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisNationalityRules}>
                <Input placeholder="e.g. Filipino" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="highestEducationalAttainment" label={<span>Education<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisEducationRules}>
                <Select placeholder="Select education level" options={EDUCATION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="fatherName" label={<span>Father&apos;s Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisFatherNameRules}>
                <Input placeholder="Full name of father" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="motherName" label={<span>Mother&apos;s Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={pisMotherNameRules}>
                <Input placeholder="Full name of mother" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="distinctiveMark" label="Distinctive Mark (optional)">
                <Input placeholder="e.g. scar on left hand" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </>
  )
}
