import { useState, useEffect } from 'react'
import { Form, Input, Button, App, Typography, theme, Select, Switch, InputNumber } from 'antd'
import { PlusOutlined, MinusCircleOutlined, UpOutlined, DownOutlined, SettingOutlined } from '@ant-design/icons'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createPostRequirement } from '@/features/admin/services/postRequirementService'
import { useNameValidation } from '@/shared/hooks/useNameValidation'

const { Text } = Typography
const { useToken } = theme

const { TextArea } = Input

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
]

// Generate a unique key for fields
function createFieldKey() {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default function AddPostRequirementModal({ open, onClose, onSuccess }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { token } = useToken()
  const [expandedFields, setExpandedFields] = useState({})
  const { validateName, isValidating, error: nameError, clearError } = useNameValidation('PostRequirement')

  const toggleFieldExpanded = (fieldKey) => {
    setExpandedFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }))
  }

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

      if (!values.legalBasis || values.legalBasis.length === 0) {
        message.error('At least one legal basis is required')
        return
      }

      // Validate legal basis items
      for (const item of values.legalBasis) {
        if (!item.url || item.url.trim() === '') {
          message.error('All legal basis items must have a URL')
          return
        }
        if (!item.title || item.title.trim() === '') {
          message.error('All legal basis items must have a title')
          return
        }
      }

      setLoading(true)

      await runWithStepUp(async (stepUpToken) => {
        await createPostRequirement(values, { stepUpToken })
      })

      message.success('Post-requirement created successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create post-requirement:', error)
        message.error(error.message || 'Failed to create post-requirement')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  const handleDebugFill = () => {
    form.setFieldsValue({
      name: 'Test Post Requirement',
      description: 'This is a test post requirement for debugging purposes',
      notes: 'Admin notes for testing purposes - this is a guide for administrators',
      legalBasis: [
        {
          url: 'https://officialgazette.gov.ph/2023/01/01/act-no-12345/',
          title: 'Republic Act No. 12345 - Sample Law',
          description: 'This is a sample legal reference for testing purposes'
        }
      ]
    })
  }

  return (
    <>
      <ResponsiveModal
        open={open}
        onCancel={handleCancel}
        title="Add Post Requirement"
        footer={[
          <Button key="debug" onClick={handleDebugFill} style={{ marginRight: 8 }}>
            Debug Fill
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Add Post Requirement
          </Button>,
        ]}
        width={600}
        destroyOnHidden
      >
        <Text>Enter the post-requirement details below.</Text>
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
                placeholder="e.g., Real Property Tax Clearance"
                onBlur={(e) => validateName(e.target.value)}
                disabled={isValidating}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea placeholder="Description of this post-requirement" rows={3} />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea placeholder="Admin notes, guides, or comments (for admin reference only)" rows={3} />
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
                          label={<span>Title<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                          rules={[{ required: true, message: 'Title is required' }]}
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

            <Text style={{ marginBottom: 8, display: 'block', marginTop: 24 }}>Custom Fields</Text>
            <Form.List name="customFields">
              {(fields, { add, remove, move }) => (
                <>
                  {fields.map((field, index) => {
                    const fieldData = form.getFieldValue(['customFields', index]) || {}
                    const isExpanded = expandedFields[field.key] || false

                    return (
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
                        {/* Compact row */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: isExpanded ? 12 : 0 }}>
                          <Form.Item
                            name={[field.name, 'label']}
                            style={{ flex: 1, marginBottom: 0 }}
                            rules={[{ required: true, message: 'Label is required' }]}
                          >
                            <Input placeholder="Field label (e.g., License Number)" />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'type']}
                            style={{ width: 140, marginBottom: 0 }}
                            rules={[{ required: true, message: 'Type is required' }]}
                          >
                            <Select
                              placeholder="Type"
                              options={FIELD_TYPES}
                              onChange={() => toggleFieldExpanded(field.key)}
                            />
                          </Form.Item>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Form.Item
                              name={[field.name, 'required']}
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch size="small" />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 12 }}>Req</Text>
                          </div>
                          <Button
                            type="text"
                            icon={<SettingOutlined />}
                            onClick={() => toggleFieldExpanded(field.key)}
                            style={{ color: isExpanded ? token.colorPrimary : undefined }}
                          />
                          <Button
                            type="text"
                            icon={<UpOutlined />}
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                          />
                          <Button
                            type="text"
                            icon={<DownOutlined />}
                            disabled={index === fields.length - 1}
                            onClick={() => move(index, index + 1)}
                          />
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        </div>

                        {/* Expanded options */}
                        {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                            <Form.Item
                              name={[field.name, 'key']}
                              label="Field Key"
                              style={{ marginBottom: 0 }}
                              rules={[{ required: true, message: 'Key is required' }]}
                            >
                              <Input placeholder="Unique identifier (auto-generated from label)" />
                            </Form.Item>
                            <Form.Item
                              name={[field.name, 'placeholder']}
                              label="Placeholder"
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="Helper text for the field" />
                            </Form.Item>

                            {/* Type-specific options */}
                            {fieldData.type === 'text' || fieldData.type === 'textarea' ? (
                              <>
                                <Form.Item
                                  name={[field.name, 'maxLength']}
                                  label="Max Length"
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber placeholder="Optional" style={{ width: '100%' }} min={1} />
                                </Form.Item>
                                <Form.Item
                                  name={[field.name, 'pattern']}
                                  label="Pattern (regex)"
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="Optional validation pattern" />
                                </Form.Item>
                              </>
                            ) : null}

                            {fieldData.type === 'number' ? (
                              <>
                                <div style={{ display: 'flex', gap: 12 }}>
                                  <Form.Item
                                    name={[field.name, 'min']}
                                    label="Min Value"
                                    style={{ flex: 1, marginBottom: 0 }}
                                  >
                                    <InputNumber placeholder="Optional" style={{ width: '100%' }} />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'max']}
                                    label="Max Value"
                                    style={{ flex: 1, marginBottom: 0 }}
                                  >
                                    <InputNumber placeholder="Optional" style={{ width: '100%' }} />
                                  </Form.Item>
                                </div>
                                <Form.Item
                                  name={[field.name, 'step']}
                                  label="Step"
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber placeholder="Optional" style={{ width: '100%' }} min={0.01} step={0.01} />
                                </Form.Item>
                              </>
                            ) : null}

                            {fieldData.type === 'boolean' ? (
                              <Form.Item
                                name={[field.name, 'defaultValue']}
                                label="Default Value"
                                style={{ marginBottom: 0 }}
                              >
                                <Select
                                  placeholder="Optional"
                                  options={[
                                    { value: true, label: 'Yes' },
                                    { value: false, label: 'No' },
                                  ]}
                                />
                              </Form.Item>
                            ) : null}

                            {fieldData.type === 'select' ? (
                              <>
                                <Text type="secondary" style={{ fontSize: 12 }}>Options</Text>
                                <Form.List name={[field.name, 'options']}>
                                  {(optFields, { add: addOpt, remove: removeOpt }) => (
                                    <>
                                      {optFields.map((optField, _optIndex) => (
                                        <div key={optField.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                          <Form.Item
                                            name={[optField.name, 'value']}
                                            style={{ flex: 1, marginBottom: 0 }}
                                            rules={[{ required: true, message: 'Value is required' }]}
                                          >
                                            <Input placeholder="Value" />
                                          </Form.Item>
                                          <Form.Item
                                            name={[optField.name, 'label']}
                                            style={{ flex: 1, marginBottom: 0 }}
                                            rules={[{ required: true, message: 'Label is required' }]}
                                          >
                                            <Input placeholder="Label" />
                                          </Form.Item>
                                          <Button
                                            type="text"
                                            danger
                                            icon={<MinusCircleOutlined />}
                                            onClick={() => removeOpt(optField.name)}
                                          />
                                        </div>
                                      ))}
                                      <Button
                                        type="dashed"
                                        onClick={() => addOpt({ value: '', label: '' })}
                                        block
                                        icon={<PlusOutlined />}
                                      >
                                        Add Option
                                      </Button>
                                    </>
                                  )}
                                </Form.List>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add({
                        key: createFieldKey(),
                        label: '',
                        type: 'text',
                        required: false,
                        placeholder: '',
                      })}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add Custom Field
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form>
      </ResponsiveModal>
      {stepUpModal}
    </>
  )
}
