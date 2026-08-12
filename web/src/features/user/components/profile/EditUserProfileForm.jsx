import { useState } from 'react';
import { Form } from 'antd';
import {
  Input,
  Card,
  Button,
  Row,
  Col,
  Space,
  Alert,
  Skeleton,
  Select,
  DatePicker,
  Typography,
  theme,
  Grid,
} from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  InfoCircleOutlined,
  UserOutlined,
  HomeOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useEditUserProfileForm } from '@/features/user/hooks/useEditUserProfileForm';
import {
  firstNameRules,
  lastNameRules,
  middleNameRules,
  suffixRules,
  phoneNumberRules,
} from '@/features/authentication/utils/validations';
import {
  pisSexRules,
  pisDateOfBirthRules,
  pisMaritalStatusRules,
  pisPlaceOfBirthRules,
  pisNationalityRules,
  pisEducationRules,
  pisFatherNameRules,
  pisMotherNameRules,
} from '@/features/authentication/utils/validations/pisRules';
import { useAuthSession } from '@/features/authentication';
import { preventNonNumericKeyDown, sanitizePhonePaste, sanitizePhoneInput } from '@/shared/forms';
import { formatPhoneNumber } from '@/shared/utils/phoneFormatter.js';
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields';

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'separated', label: 'Separated' },
];

const EDUCATION_OPTIONS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High School' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'college', label: 'College' },
  { value: 'postgraduate', label: 'Postgraduate' },
];

const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const PROFILE_SECTIONS = [
  { key: 'basic', label: 'Basic information', icon: <UserOutlined /> },
  { key: 'address', label: 'Address', icon: <HomeOutlined /> },
  { key: 'pis', label: 'Other information', icon: <IdcardOutlined /> },
];

export default function EditUserProfileForm({ embedded = false, simpleLayout = false }) {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { form, isLoading, isSubmitting, handleFinish, handleValuesChange, isDirty, reload } =
    useEditUserProfileForm();
  const { role } = useAuthSession();

  const roleKey = String(role?.slug || role || '').toLowerCase();
  const isStaffRole = ['lgu_officer', 'inspector', 'staff'].includes(roleKey);
  const isBusinessOwner = roleKey === 'business_owner';

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const useSectionTabs = embedded && simpleLayout && isBusinessOwner;
  const sections = isBusinessOwner ? PROFILE_SECTIONS : [PROFILE_SECTIONS[0]];
  const inputVariant = simpleLayout ? 'filled' : undefined;
  const noHelp = simpleLayout;

  if (isLoading) {
    return (
      <div>
        <Skeleton.Input
          active
          size="large"
          style={{ width: '100%', marginBottom: 24, height: 40 }}
        />
        <Skeleton.Input
          active
          size="large"
          style={{ width: '100%', marginBottom: 24, height: 40 }}
        />
        <Skeleton.Input active size="large" style={{ width: '100%', height: 40 }} />
      </div>
    );
  }

  const content = (
    <Form
      validateTrigger="onBlur"
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      disabled={isLoading}
      onValuesChange={handleValuesChange}
      requiredMark={simpleLayout ? true : 'optional'}
      style={
        useSectionTabs
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
          : undefined
      }
    >
      {isStaffRole && (
        <Alert
          message="Profile Restrictions"
          description="Some profile fields (password, role, office, department) can only be changed by an administrator. Please contact your administrator if you need to update these fields."
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {useSectionTabs ? (
        <>
          {/* Header with title and actions at top (like AddBusinessForm) */}
          <div style={{ flexShrink: 0, marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <Title level={4} style={{ marginBottom: 4 }}>
                  General
                </Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  Update your personal details and address.
                </Paragraph>
              </div>
              <Space wrap>
                {isDirty && (
                  <Button icon={<UndoOutlined />} onClick={reload} disabled={isSubmitting}>
                    Discard
                  </Button>
                )}
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={isSubmitting}
                  disabled={isSubmitting || !isDirty}
                >
                  Save Changes
                </Button>
              </Space>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 24,
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            {/* Left panel: section tab buttons (like AddBusinessForm) */}
            <div
              style={{
                flexShrink: 0,
                width: isMobile ? '100%' : 220,
                minWidth: isMobile ? undefined : 220,
                borderRight: isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                paddingRight: isMobile ? 0 : 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                overflowY: isMobile ? 'visible' : 'auto',
              }}
            >
              {sections.map((section, idx) => (
                <Button
                  key={section.key}
                  type={idx === activeSectionIndex ? 'primary' : 'default'}
                  icon={section.icon}
                  onClick={() => setActiveSectionIndex(idx)}
                  style={{
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    fontWeight: idx === activeSectionIndex ? 600 : 400,
                    whiteSpace: 'normal',
                    height: 'auto',
                    minHeight: 40,
                    padding: '8px 12px',
                    lineHeight: 1.4,
                  }}
                >
                  {section.label}
                </Button>
              ))}
            </div>

            {/* Right panel: scrollable form content - only active section visible */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                overflow: 'auto',
                paddingTop: isMobile ? 16 : 0,
                borderTop: isMobile ? `1px solid ${token.colorBorderSecondary}` : 'none',
              }}
            >
              {/* Section 0: Basic information */}
              <div
                data-section-index={0}
                style={{ display: activeSectionIndex === 0 ? 'block' : 'none' }}
                aria-hidden={activeSectionIndex !== 0}
              >
                <Title level={5} style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>
                  Basic information
                </Title>
                <Row gutter={16}>
                  <Col xs={24} md={isBusinessOwner ? 12 : 12}>
                    <Form.Item
                      name="firstName"
                      label="First Name"
                      rules={firstNameRules}
                      help={noHelp ? undefined : 'Enter your legal first name'}
                    >
                      <Input
                        placeholder="First name"
                        variant={inputVariant}
                        showCount
                        maxLength={50}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="lastName"
                      label="Last Name"
                      rules={lastNameRules}
                      help={noHelp ? undefined : 'Enter your legal last name'}
                    >
                      <Input
                        placeholder="Last name"
                        variant={inputVariant}
                        showCount
                        maxLength={50}
                      />
                    </Form.Item>
                  </Col>
                  {isBusinessOwner && (
                    <>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="middleName"
                          label="Middle Name (optional)"
                          rules={middleNameRules}
                        >
                          <Input placeholder="Middle name" variant={inputVariant} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="suffix" label="Suffix (optional)" rules={suffixRules}>
                          <Input placeholder="e.g. Jr., Sr., III" variant={inputVariant} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="email" label="Email">
                          <Input placeholder="Email" variant={inputVariant} disabled />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="sex" label="Sex" rules={pisSexRules}>
                          <Select
                            placeholder="Select sex"
                            options={SEX_OPTIONS}
                            allowClear
                            variant={inputVariant}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="dateOfBirth"
                          label="Date of Birth (optional)"
                          rules={[pisDateOfBirthRules[1]]}
                        >
                          <DatePicker
                            style={{ width: '100%' }}
                            placeholder="Select date of birth"
                            variant={inputVariant}
                          />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  <Col xs={24} md={isBusinessOwner ? 12 : 24}>
                    <Form.Item
                      name="phoneNumber"
                      label="Phone Number"
                      rules={phoneNumberRules}
                      help={
                        noHelp ? undefined : 'Format: 09XXXXXXXXX (11 digits, starting with 09)'
                      }
                    >
                      <Input
                        placeholder="09XXXXXXXXX"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={11}
                        variant={inputVariant}
                        onKeyDown={preventNonNumericKeyDown}
                        onPaste={(e) => {
                          sanitizePhonePaste(e);
                          const pasted = e.clipboardData.getData('text');
                          const formatted = formatPhoneNumber(pasted);
                          setTimeout(() => form.setFieldValue('phoneNumber', formatted), 0);
                        }}
                        onInput={(e) => {
                          sanitizePhoneInput(e);
                          const value = e.target.value;
                          const formatted = formatPhoneNumber(value);
                          if (formatted !== value) form.setFieldValue('phoneNumber', formatted);
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Section 1: Address (business owner only) */}
              {isBusinessOwner && (
                <div
                  data-section-index={1}
                  style={{ display: activeSectionIndex === 1 ? 'block' : 'none' }}
                  aria-hidden={activeSectionIndex !== 1}
                >
                  <Title level={5} style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>
                    Address
                  </Title>
                  <Row gutter={16}>
                    <Col span={24}>
                      <PhilippineAddressFields
                        form={form}
                        namePrefix="address"
                        required={false}
                        variant={inputVariant}
                      />
                    </Col>
                  </Row>
                </div>
              )}

              {/* Section 2: Other information (business owner only) */}
              {isBusinessOwner && (
                <div
                  data-section-index={2}
                  style={{ display: activeSectionIndex === 2 ? 'block' : 'none' }}
                  aria-hidden={activeSectionIndex !== 2}
                >
                  <Title level={5} style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>
                    Other information
                  </Title>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="maritalStatus"
                        label="Marital Status"
                        rules={pisMaritalStatusRules}
                      >
                        <Select
                          placeholder="Select status"
                          options={MARITAL_STATUS_OPTIONS}
                          allowClear
                          variant={inputVariant}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="placeOfBirth"
                        label="Place of Birth"
                        rules={pisPlaceOfBirthRules}
                      >
                        <Input placeholder="Place of birth" variant={inputVariant} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="nationality" label="Nationality" rules={pisNationalityRules}>
                        <Input placeholder="e.g. Filipino" variant={inputVariant} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="highestEducationalAttainment"
                        label="Education"
                        rules={pisEducationRules}
                      >
                        <Select
                          placeholder="Select education level"
                          options={EDUCATION_OPTIONS}
                          allowClear
                          variant={inputVariant}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="fatherName" label="Father's Name" rules={pisFatherNameRules}>
                        <Input placeholder="Full name of father" variant={inputVariant} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="motherName" label="Mother's Name" rules={pisMotherNameRules}>
                        <Input placeholder="Full name of mother" variant={inputVariant} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="distinctiveMark" label="Distinctive Mark (optional)">
                        <Input placeholder="e.g. scar on left hand" variant={inputVariant} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Flat layout (non–section-tabs): all sections stacked, constrain width for readability */
        <div style={{ maxWidth: 560 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>
            Basic information
          </Title>
          <Row gutter={simpleLayout ? 16 : 24}>
            <Col xs={24} md={isBusinessOwner ? 12 : 12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={firstNameRules}
                help={noHelp ? undefined : 'Enter your legal first name'}
              >
                <Input placeholder="First name" variant={inputVariant} showCount maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={lastNameRules}
                help={noHelp ? undefined : 'Enter your legal last name'}
              >
                <Input placeholder="Last name" variant={inputVariant} showCount maxLength={50} />
              </Form.Item>
            </Col>
            {isBusinessOwner && (
              <>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="middleName"
                    label="Middle Name (optional)"
                    rules={middleNameRules}
                  >
                    <Input placeholder="Middle name" variant={inputVariant} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="suffix" label="Suffix (optional)" rules={suffixRules}>
                    <Input placeholder="e.g. Jr., Sr., III" variant={inputVariant} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="email" label="Email">
                    <Input placeholder="Email" variant={inputVariant} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="sex" label="Sex" rules={pisSexRules}>
                    <Select
                      placeholder="Select sex"
                      options={SEX_OPTIONS}
                      allowClear
                      variant={inputVariant}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="dateOfBirth"
                    label="Date of Birth (optional)"
                    rules={[pisDateOfBirthRules[1]]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="Select date of birth"
                      variant={inputVariant}
                    />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col xs={24} md={isBusinessOwner ? 12 : 24}>
              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={phoneNumberRules}
                help={noHelp ? undefined : 'Format: 09XXXXXXXXX (11 digits, starting with 09)'}
              >
                <Input
                  placeholder="09XXXXXXXXX"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  variant={inputVariant}
                  onKeyDown={preventNonNumericKeyDown}
                  onPaste={(e) => {
                    sanitizePhonePaste(e);
                    const pasted = e.clipboardData.getData('text');
                    const formatted = formatPhoneNumber(pasted);
                    setTimeout(() => form.setFieldValue('phoneNumber', formatted), 0);
                  }}
                  onInput={(e) => {
                    sanitizePhoneInput(e);
                    const value = e.target.value;
                    const formatted = formatPhoneNumber(value);
                    if (formatted !== value) form.setFieldValue('phoneNumber', formatted);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          {isBusinessOwner && (
            <>
              <Title level={5} style={{ marginTop: 32, marginBottom: 16, fontWeight: 600 }}>
                Address
              </Title>
              <Row gutter={simpleLayout ? 16 : 24} style={{ marginTop: 0 }}>
                <Col span={24}>
                  <PhilippineAddressFields
                    form={form}
                    namePrefix="address"
                    required={false}
                    variant={inputVariant}
                  />
                </Col>
              </Row>
              <Title level={5} style={{ marginTop: 32, marginBottom: 16, fontWeight: 600 }}>
                Other information
              </Title>
              <Row gutter={simpleLayout ? 16 : 24} style={{ marginTop: 0 }}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="maritalStatus"
                    label="Marital Status"
                    rules={pisMaritalStatusRules}
                  >
                    <Select
                      placeholder="Select status"
                      options={MARITAL_STATUS_OPTIONS}
                      allowClear
                      variant={inputVariant}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="placeOfBirth"
                    label="Place of Birth"
                    rules={pisPlaceOfBirthRules}
                  >
                    <Input placeholder="Place of birth" variant={inputVariant} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="nationality" label="Nationality" rules={pisNationalityRules}>
                    <Input placeholder="e.g. Filipino" variant={inputVariant} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="highestEducationalAttainment"
                    label="Education"
                    rules={pisEducationRules}
                  >
                    <Select
                      placeholder="Select education level"
                      options={EDUCATION_OPTIONS}
                      allowClear
                      variant={inputVariant}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="fatherName" label="Father's Name" rules={pisFatherNameRules}>
                    <Input placeholder="Full name of father" variant={inputVariant} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="motherName" label="Mother's Name" rules={pisMotherNameRules}>
                    <Input placeholder="Full name of mother" variant={inputVariant} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="distinctiveMark" label="Distinctive Mark (optional)">
                    <Input placeholder="e.g. scar on left hand" variant={inputVariant} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </div>
      )}

      {!useSectionTabs && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <Space>
            {isDirty && (
              <Button icon={<UndoOutlined />} onClick={reload} disabled={isSubmitting}>
                Discard Changes
              </Button>
            )}
            <Button
              type="primary"
              htmlType="submit"
              size={simpleLayout ? 'default' : 'large'}
              icon={<SaveOutlined />}
              loading={isSubmitting}
              disabled={isSubmitting || !isDirty}
            >
              Save Changes
            </Button>
          </Space>
        </div>
      )}

      {embedded && simpleLayout && !useSectionTabs && isDirty && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 24,
            padding: '12px 0',
            background: token.colorBgContainer,
            borderTop: `1px solid ${token.colorBorder}`,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Button icon={<UndoOutlined />} onClick={reload} disabled={isSubmitting}>
            Discard
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      )}
    </Form>
  );

  if (embedded) return content;

  return <Card title="Edit Profile">{content}</Card>;
}
