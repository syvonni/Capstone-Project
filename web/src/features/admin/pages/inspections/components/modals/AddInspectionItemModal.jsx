/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Typography, App } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createInspectionItem } from '@/features/admin/services/inspectionItemService'
import { getViolations } from '@/features/admin/services/violationService'
import { useNameValidation } from '@/shared/hooks/useNameValidation'

const { Text } = Typography

export default function AddInspectionItemModal({ open, onClose, onSuccess }) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [violations, setViolations] = useState([])
  const [loadingViolations, setLoadingViolations] = useState(false)
  const [violationMode, setViolationMode] = useState('select')
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { validateName, isValidating, error: nameError, clearError } = useNameValidation('InspectionItem')

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        setLoadingViolations(true)
        const data = await getViolations({ isActive: true })
        // Filter violations to only show unassigned ones
        const filteredViolations = data?.filter(v => {
          const inspectionItemId = typeof v.inspectionItemId === 'object' ? v.inspectionItemId._id : v.inspectionItemId
          return !inspectionItemId
        }) || []
        setViolations(filteredViolations.sort((a, b) => a.name.localeCompare(b.name)))
      } catch (error) {
        console.error('Failed to fetch violations:', error)
      } finally {
        setLoadingViolations(false)
      }
    }

    if (open) {
      fetchViolations()
      form.resetFields()
      clearError()
    }
  }, [open, form, clearError])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      await runWithStepUp(async (stepUpToken) => {
        await createInspectionItem(values, { stepUpToken })
      })

      message.success('Inspection item created successfully')
      form.resetFields()
      setViolationMode('select')
      onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create inspection item:', error)
        message.error(error.message || 'Failed to create inspection item')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDebugFill = () => {
    form.setFieldsValue({
      name: 'Test Inspection Item',
      question: 'Is this a test inspection item?',
      notes: 'This is a test inspection item for debugging purposes',
      violationMode: 'create',
      violationName: 'Test Violation',
      violationDescription: 'This is a test violation for debugging purposes',
      violationSeverity: 'major',
      violationNotes: 'Admin notes for testing',
      violationCorrectiveAction: 'Fix the test violation',
      penaltyAmount: 5000,
      violationLegalBasis: [
        {
          url: 'https://officialgazette.gov.ph/2023/01/01/act-no-12345/',
          title: 'Republic Act No. 12345 - Sample Law',
          description: 'This is a sample legal reference for testing purposes'
        }
      ],
      legalBasis: [
        {
          url: 'https://nfpa.org/codes-and-standards/',
          title: 'NFPA 101 - Life Safety Code',
          description: 'Sample NFPA reference for testing'
        }
      ]
    })
    setViolationMode('create')
  }

  return (
    <>
      <ResponsiveModal
        title="Add Inspection Item"
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="debug" onClick={handleDebugFill} style={{ marginRight: 8 }}>
            Debug Fill
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Add Inspection Item
          </Button>,
        ]}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              name="name"
              label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              validateStatus={nameError ? 'error' : ''}
              help={nameError}
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input
                placeholder="Enter inspection item name"
                onBlur={(e) => validateName(e.target.value)}
                disabled={isValidating}
              />
            </Form.Item>
            
            <Form.Item
              name="question"
              label={<span>Question<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: true, message: 'Please enter a question' }]}
            >
              <Input.TextArea rows={4} placeholder="Enter inspection question" />
            </Form.Item>
            
            <Form.Item
              name="notes"
              label="Notes"
            >
              <Input.TextArea rows={3} placeholder="Enter additional notes" />
            </Form.Item>

            <Text style={{ marginBottom: 8, display: 'block' }}>Inspection Item Legal Basis</Text>
            <Form.List name="legalBasis">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      style={{
                        marginBottom: 16,
                        padding: 16,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 8,
                        background: token.colorBgContainer,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Form.Item
                          name={[field.name, 'url']}
                          label="URL"
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="https://nfpa.org/..." />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'title']}
                          label="Title"
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="e.g., NFPA 10 - Portable Fire Extinguishers" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'description']}
                          label="Description"
                          style={{ marginBottom: 0 }}
                        >
                          <Input.TextArea rows={2} placeholder="Brief description of the legal reference" />
                        </Form.Item>
                        <Button
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                          block
                        >
                          Remove Legal Basis
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Legal Basis
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Form.Item
              name="violationMode"
              label={<span>Violation Mode<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              initialValue="select"
              rules={[{ required: true, message: 'Please select a violation mode' }]}
            >
              <Select 
                placeholder="Select violation mode"
                onChange={(value) => setViolationMode(value)}
              >
                <Select.Option value="select">Select existing violation</Select.Option>
                <Select.Option value="create">Create new violation</Select.Option>
              </Select>
            </Form.Item>

            {violationMode === 'select' ? (
              <Form.Item
                name="violationId"
                label={<span>Violation<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                rules={[{ required: true, message: 'Please select a violation' }]}
              >
                <Select 
                  placeholder="Select a violation"
                  loading={loadingViolations}
                  showSearch
                  optionFilterProp="children"
                >
                  {violations.map((violation) => (
                    <Select.Option key={violation._id} value={violation._id}>
                      {violation.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  name="violationName"
                  label={<span>Violation Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                  rules={[{ required: true, message: 'Please enter a violation name' }]}
                >
                  <Input placeholder="e.g., Blocked Fire Exit" />
                </Form.Item>

                <Form.Item
                  name="violationDescription"
                  label="Violation Description"
                >
                  <Input.TextArea rows={3} placeholder="Description of this violation" />
                </Form.Item>

                <Form.Item
                  name="violationSeverity"
                  label={<span>Violation Severity<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                  rules={[{ required: true, message: 'Please select a severity' }]}
                >
                  <Select placeholder="Select severity">
                    <Select.Option value="minor">Minor</Select.Option>
                    <Select.Option value="major">Major</Select.Option>
                    <Select.Option value="critical">Critical</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="violationNotes"
                  label="Violation Notes"
                >
                  <Input.TextArea rows={2} placeholder="Additional notes or comments" />
                </Form.Item>

                <Form.Item
                  name="violationCorrectiveAction"
                  label="Corrective Action"
                >
                  <Input.TextArea rows={3} placeholder="Required action to fix this violation" />
                </Form.Item>

                <Form.Item
                  name="penaltyAmount"
                  label="Penalty Amount (₱)"
                >
                  <Input type="number" placeholder="e.g., 10000" />
                </Form.Item>

                <Text style={{ marginBottom: 8, display: 'block' }}>Violation Legal Basis</Text>
                <Form.List name="violationLegalBasis">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <div
                          key={field.key}
                          style={{
                            marginBottom: 16,
                            padding: 16,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            background: token.colorBgContainer,
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Form.Item
                              name={[field.name, 'url']}
                              label="URL"
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="https://officialgazette.gov.ph/..." />
                            </Form.Item>
                            <Form.Item
                              name={[field.name, 'title']}
                              label="Title"
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="e.g., RA 1234 - Law Name" />
                            </Form.Item>
                            <Form.Item
                              name={[field.name, 'description']}
                              label="Description"
                              style={{ marginBottom: 0 }}
                            >
                              <Input.TextArea rows={2} placeholder="Brief description of the legal reference" />
                            </Form.Item>
                            <Button
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(field.name)}
                              block
                            >
                              Remove Legal Basis
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          Add Legal Basis
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              </>
            )}
          </Form>
      </ResponsiveModal>
      {stepUpModal}
    </>
  )
}
