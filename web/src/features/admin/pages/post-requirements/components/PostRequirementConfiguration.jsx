import { Form, Input, Typography, Button, Select, Switch, InputNumber } from 'antd'
import { PlusOutlined, MinusCircleOutlined, UpOutlined, DownOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { getChecklists } from '@/features/admin/services/checklistService'

const { Text } = Typography
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

export default function PostRequirementConfiguration({ form, handleFormValuesChange, token }) {
  const [checklists, setChecklists] = useState([])
  const [loadingChecklists, setLoadingChecklists] = useState(false)
  const [expandedFields, setExpandedFields] = useState({})

  const toggleFieldExpanded = (fieldKey) => {
    setExpandedFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }))
  }

  useEffect(() => {
    const fetchChecklists = async () => {
      setLoadingChecklists(true)
      try {
        const items = await getChecklists({ isActive: true })
        setChecklists(items || [])
      } catch (error) {
        console.error('Failed to fetch checklists:', error)
      } finally {
        setLoadingChecklists(false)
      }
    }
    fetchChecklists()
  }, [])
  return (
    <Form 
      form={form} 
      layout="vertical" 
      requiredMark={false}
      onValuesChange={handleFormValuesChange}
    >
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: 'Name is required' }]}
      >
        <Input placeholder="e.g., Real Property Tax Clearance" />
      </Form.Item>

      <Form.Item
        label="Description"
        name="description"
      >
        <TextArea rows={3} placeholder="Description of this post-requirement" />
      </Form.Item>

      <Form.Item
        label="Notes"
        name="notes"
      >
        <TextArea rows={3} placeholder="Admin notes, guides, or comments (for staff reference only)" />
      </Form.Item>

      <Form.Item
        label="Associated Checklist"
        name="checklistId"
      >
        <Select
          placeholder="Select a checklist to associate with this post requirement"
          loading={loadingChecklists}
          allowClear
          options={checklists.map(c => ({
            value: c._id,
            label: c.name,
          }))}
        />
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
  )
}
