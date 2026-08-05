import { useEffect } from 'react'
import { Typography, Form, Input, Select, DatePicker, Row, Col, Button, Drawer, Modal, theme, Grid, Divider, Descriptions } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields'

const { Text } = Typography
const { useBreakpoint } = Grid

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

export default function BusinessOwnerEditInfoModal({ open, onClose, _businessOwner, form, onSubmit, hasChanges, changedFields, resetChangeTracking, handleValuesChange, initializeEditForm }) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.lg

  // Extract address fields for PhilippineAddressFields auto-matching
  const initialProvince = _businessOwner?.address?.province || ''
  const initialCity = _businessOwner?.address?.city || ''
  const initialBarangay = _businessOwner?.address?.barangay || ''
  const initialStreet = _businessOwner?.address?.street || ''
  const initialPostalCode = _businessOwner?.address?.zipCode || ''

  // Initialize form and reset change tracking when modal opens
  useEffect(() => {
    if (open) {
      const init = async () => {
        if (initializeEditForm) await initializeEditForm()
        if (resetChangeTracking) resetChangeTracking()
      }
      init()
    }
  }, [open, initializeEditForm, resetChangeTracking])

  const formContent = (
    <>
      <Text style={{ display: 'block', marginBottom: 24 }}>
        Update the business owner&apos;s personal information. Changes will be logged for audit purposes and the business owner will be notified via email.
      </Text>
      <Text type="secondary" style={{ display: 'block', marginTop: 0, marginBottom: 16, fontWeight: 500 }}>Basic Information</Text>
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        onValuesChange={handleValuesChange}
      >
        <Form.Item name="firstName" label={<span>First Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
          <Input />
        </Form.Item>
        <Form.Item name="middleName" label="Middle Name">
          <Input />
        </Form.Item>
        <Form.Item name="lastName" label={<span>Last Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
          <Input />
        </Form.Item>
        <Form.Item name="suffix" label="Suffix">
          <Input />
        </Form.Item>
        <Form.Item name="phoneNumber" label={<span>Phone Number<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
          <Input />
        </Form.Item>
        <Divider />
        <Text type="secondary" style={{ display: 'block', marginTop: 8, marginBottom: 16, fontWeight: 500 }}>Address</Text>
        <Row gutter={0}>
          <PhilippineAddressFields
            form={form}
            required
            namePrefix="address"
            initialProvince={initialProvince}
            initialCity={initialCity}
            initialBarangay={initialBarangay}
            initialStreet={initialStreet}
            initialPostalCode={initialPostalCode}
          />
        </Row>
        <Divider />
        <Text type="secondary" style={{ display: 'block', marginTop: 8, marginBottom: 16, fontWeight: 500 }}>Personal Information</Text>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item name="sex" label={<span>Sex<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <Select placeholder="Select sex" options={SEX_OPTIONS} allowClear />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="maritalStatus" label={<span>Marital Status<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <Select placeholder="Select status" options={MARITAL_STATUS_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="dateOfBirth" label={<span>Date of Birth<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <DatePicker style={{ width: '100%' }} placeholder="Select date" />
            </Form.Item>
          </Col>
        </Row>
        <Divider />
        <Text type="secondary" style={{ display: 'block', marginTop: 8, marginBottom: 16, fontWeight: 500 }}>Background</Text>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item name="placeOfBirth" label={<span>Place of Birth<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="nationality" label={<span>Nationality<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="highestEducationalAttainment" label={<span>Highest Educational Attainment<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <Select placeholder="Select education level" options={EDUCATION_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Divider />
        <Text type="secondary" style={{ display: 'block', marginTop: 8, marginBottom: 16, fontWeight: 500 }}>Family Information</Text>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item name="fatherName" label={<span>Father&apos;s Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="motherName" label={<span>Mother&apos;s Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>} rules={[{ required: false }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="distinctiveMark" label="Distinctive Mark">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Divider />
        {hasChanges && changedFields.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontWeight: 500 }}>Changes to be saved:</Text>
            <Descriptions column={1} size="small" bordered>
              {changedFields.map((change, index) => (
                <Descriptions.Item key={index} label={change.field}>
                  <Text type="secondary" style={{ textDecoration: 'line-through', marginRight: 8 }}>{change.from}</Text>
                  <Text>→ {change.to}</Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </div>
        )}
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button type="primary" htmlType="submit" disabled={!hasChanges} icon={<SaveOutlined />}>Save Changes</Button>
          </div>
        )}
      </Form>
    </>
  )

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title="Edit Business Owner Information"
        placement="bottom"
        height="100%"
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        destroyOnHidden
      >
        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
          {formContent}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <Button type="primary" onClick={() => form.submit()} disabled={!hasChanges} icon={<SaveOutlined />}>Save Changes</Button>
        </div>
      </Drawer>
    )
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Edit Business Owner Information"
      footer={null}
      width={600}
      destroyOnHidden
    >
      <div style={{ padding: 16 }}>
        {formContent}
      </div>
    </Modal>
  )
}
