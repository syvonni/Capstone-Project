import { useState, useEffect } from 'react'
import { Form, Input, Button, App, Typography, theme, Select, InputNumber } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createViolation } from '@/features/admin/services/violationService'
import { SEVERITY_LEVELS } from '../../constants/violations.constants'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'
import { useNameValidation } from '@/shared/hooks/useNameValidation'

const { Text } = Typography
const { useToken } = theme

const { TextArea } = Input

export default function AddViolationModal({ open, onClose, onSuccess }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { token } = useToken()
  const { validateName, isValidating, error: nameError, clearError } = useNameValidation('Violation')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
      clearError()
    }
  }, [open, form, clearError])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Manual validation for required fields
      if (!values.name || values.name.trim() === '') {
        message.error('Name is required')
        return
      }

      if (!values.severity) {
        message.error('Severity is required')
        return
      }

      setLoading(true)

      await runWithStepUp(async (stepUpToken) => {
        await createViolation(values, { stepUpToken })
      })

      message.success('Violation created successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create violation:', error)
        message.error(error.message || 'Failed to create violation')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDebugFill = () => {
    form.setFieldsValue({
      name: 'Missing Fire Extinguisher',
      description: 'No fire extinguisher present on premises',
      notes: 'Ensure fire extinguisher is visible and accessible',
      severity: 'major',
      penaltyAmount: 10000,
      legalBasis: [
        {
          url: 'https://officialgazette.gov.ph/2023/01/01/act-no-12345/',
          title: 'Republic Act No. 12345 - Fire Code',
          description: 'Fire safety requirements for commercial establishments'
        }
      ],
      correctiveAction: 'Install fire extinguisher in visible location'
    })
  }

  return (
    <>
      <ResponsiveModal
        open={open}
        onCancel={onClose}
        title="Add Violation"
        footer={[
          <Button key="debug" onClick={handleDebugFill} style={{ marginRight: 8 }}>
            Debug Fill
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Add Violation
          </Button>,
        ]}
        width={700}
        destroyOnHidden
      >
        <Text>Enter the violation details below.</Text>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
            <Form.Item
              name="name"
              label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              validateStatus={nameError ? 'error' : ''}
              help={nameError}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Name is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input
                placeholder="e.g., Missing Fire Extinguisher"
                onBlur={(e) => validateName(e.target.value)}
                disabled={isValidating}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea placeholder="Description of this violation" rows={3} />
            </Form.Item>



            <Form.Item
              name="severity"
              label={<span>Severity<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: true, message: 'Severity is required' }]}
            >
              <Select placeholder="Select severity">
                {SEVERITY_LEVELS.map(level => (
                  <Select.Option key={level.value} value={level.value}>{level.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="penaltyAmount"
              label="Penalty Amount (₱)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                placeholder="Enter penalty amount"
                formatter={currencyFormatter}
                parser={currencyParser}
              />
            </Form.Item>
            <Form.Item
              name="correctiveAction"
              label="Corrective Action"
            >
              <TextArea placeholder="Required action to fix this violation" rows={3} />
            </Form.Item>
            <Text style={{ marginBottom: 8, display: 'block' }}>Legal Basis</Text>
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
                          <TextArea rows={2} placeholder="Brief description of the legal reference" />
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
              name="notes"
              label="Notes"
            >
              <TextArea placeholder="Additional notes or comments" rows={2} />
            </Form.Item>
          </Form>
      </ResponsiveModal>
      {stepUpModal}
    </>
  )
}
