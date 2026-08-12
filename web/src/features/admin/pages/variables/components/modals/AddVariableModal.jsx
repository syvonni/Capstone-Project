import { useState, useEffect } from 'react'
import { Form, Input, InputNumber, Button, App, Typography, theme, Select } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createVariable } from '@/features/admin/services/variableService'
import { getChecklists } from '@/features/admin/services/checklistService'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'
import { useNameValidation } from '@/shared/hooks/useNameValidation'

const { Text } = Typography
const { useToken } = theme
const { TextArea } = Input

const CALCULATION_METHODS = [
  { label: 'Per Unit/Door', value: 'per_unit' },
  { label: 'Percentage of Value', value: 'percentage' },
  { label: 'Bracketed (Graduated)', value: 'bracketed' },
  { label: 'Classification', value: 'classification' },
  { label: 'Yes/No', value: 'yes_no' },
  { label: 'Custom', value: 'custom' },
]

const CATEGORIES = [
  { label: 'All', value: 'ALL' },
  { label: 'Construction', value: 'CON' },
  { label: 'Retail', value: 'RET' },
  { label: 'Food Service', value: 'FDS' },
  { label: 'Manufacturing', value: 'MFG' },
  { label: 'Transportation', value: 'TRN' },
  { label: 'Utilities', value: 'UTL' },
  { label: 'Mining', value: 'MIN' },
  { label: 'Real Estate', value: 'RES' },
  { label: 'Agriculture', value: 'AGR' },
  { label: 'Services', value: 'SVC' },
  { label: 'Education', value: 'EDU' },
  { label: 'Entertainment', value: 'ENT' },
  { label: 'Wholesale', value: 'WHL' },
]

const UNIT_OPTIONS_BY_METHOD = {
  per_unit: [
    { value: 'per fixture', label: 'per fixture' },
    { value: 'per electrical point', label: 'per electrical point' },
    { value: 'per meter', label: 'per meter' },
    { value: 'per 50 linear meters', label: 'per 50 linear meters' },
    { value: 'per establishment', label: 'per establishment' },
    { value: 'per inspection', label: 'per inspection' },
    { value: 'per application', label: 'per application' },
    { value: 'per amendment', label: 'per amendment' },
    { value: 'per vehicle', label: 'per vehicle' },
    { value: 'per truck', label: 'per truck' },
    { value: 'per certificate', label: 'per certificate' },
    { value: 'per professional', label: 'per professional' },
    { value: 'per student', label: 'per student' },
    { value: 'per guest per night', label: 'per guest per night' },
    { value: 'per agency', label: 'per agency' },
    { value: 'per guard', label: 'per guard' },
    { value: 'per survey', label: 'per survey' },
    { value: 'per facility', label: 'per facility' },
    { value: 'per employee', label: 'per employee' },
    { value: 'per test', label: 'per test' },
  ],
  percentage: [
    { value: 'of capitalization', label: 'of capitalization' },
    { value: 'of restoration cost', label: 'of restoration cost' },
    { value: 'of actual construction cost', label: 'of actual construction cost' },
    { value: 'of license to operate fee', label: 'of license to operate fee' },
    { value: 'of renewal fee', label: 'of renewal fee' },
  ],
  custom: [
    { value: 'custom', label: 'Custom (specify in description)' },
  ],
  bracketed: [
    { value: 'sqm', label: 'sqm' },
    { value: 'bed', label: 'bed' },
    { value: 'boarder', label: 'boarder' },
    { value: 'room', label: 'room' },
    { value: 'storey', label: 'storey' },
    { value: 'vehicle', label: 'vehicle' },
    { value: 'employee', label: 'employee' },
    { value: 'student', label: 'student' },
    { value: 'guest', label: 'guest' },
    { value: 'unit', label: 'unit' },
    { value: 'door', label: 'door' },
    { value: 'fixture', label: 'fixture' },
    { value: 'meter', label: 'meter' },
    { value: 'hectare', label: 'hectare' },
  ],
  classification: [
    { value: 'per classification', label: 'per classification' },
  ],
  yes_no: [
    { value: 'per item', label: 'per item' },
  ],
}

export default function AddVariableModal({ open, onClose, onSuccess }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { token } = useToken()
  const [checklists, setChecklists] = useState([])
  const [loadingChecklists, setLoadingChecklists] = useState(false)
  const [selectedCalculationMethod, setSelectedCalculationMethod] = useState('per_unit')
  const [selectedUnit, setSelectedUnit] = useState('')
  const { validateName, isValidating, error: nameError, clearError } = useNameValidation('Variable')

  // Fetch checklists on mount
  useEffect(() => {
    const fetchChecklists = async () => {
      setLoadingChecklists(true)
      try {
        const items = await getChecklists({ isActive: true })
        setChecklists(items)
      } catch (error) {
        console.error('Failed to fetch checklists:', error)
      } finally {
        setLoadingChecklists(false)
      }
    }
    fetchChecklists()
  }, [])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
      setSelectedCalculationMethod('per_unit')
      setSelectedUnit('')
      clearError()
    }
  }, [open, form, clearError])

  const handleCalculationMethodChange = (value) => {
    setSelectedCalculationMethod(value)
    form.setFieldValue('unit', '')
    setSelectedUnit('')
    // Initialize with one bracket when switching to bracketed method
    if (value === 'bracketed') {
      form.setFieldValue('brackets', [{ minValue: 0, maxValue: null, fixedAmount: 0 }])
    } else {
      form.setFieldValue('brackets', [])
    }
  }

  const handleUnitChange = (value) => {
    setSelectedUnit(value)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Manual validation for required fields
      if (!values.name || values.name.trim() === '') {
        message.error('Name is required')
        return
      }

      if (!values.question || values.question.trim() === '') {
        message.error('Question is required')
        return
      }

      if (!values.calculationMethod) {
        message.error('Calculation method is required')
        return
      }

      // For bracketed method, brackets are required
      if (values.calculationMethod === 'bracketed') {
        if (!values.brackets || values.brackets.length === 0) {
          message.error('Please add at least one bracket')
          return
        }
        // Validate brackets
        for (let i = 0; i < values.brackets.length; i++) {
          const bracket = values.brackets[i]
          if (!bracket.minValue && bracket.minValue !== 0) {
            message.error(`Bracket ${i + 1}: Min value is required`)
            return
          }
          if (!bracket.fixedAmount && bracket.fixedAmount !== 0) {
            message.error(`Bracket ${i + 1}: Fixed amount is required`)
            return
          }
        }
      } else {
        // For non-bracketed methods, baseRate is required
        if (values.baseRate === undefined || values.baseRate === null || values.baseRate === '') {
          message.error('Base rate is required')
          return
        }
      }

      if (!values.feeUnit) {
        message.error('Fee unit is required')
        return
      }

      if (!values.categories || values.categories.length === 0) {
        message.error('At least one category is required')
        return
      }

      setLoading(true)

      await runWithStepUp(async (stepUpToken) => {
        await createVariable(values, { stepUpToken })
      })

      message.success('Variable created successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create variable:', error)
        message.error(error.message || 'Failed to create variable')
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
      name: 'Test Variable',
      description: 'This is a test variable for debugging purposes',
      question: 'What is the test value?',
      notes: 'Admin notes for testing purposes - this is a guide for administrators',
      unit: 'sqm',
      unitSingular: 'square meter',
      unitPlural: 'square meters',
      unitContextSingular: 'per square meter',
      unitContextPlural: 'per square meters',
      calculationMethod: 'per_unit',
      baseRate: 100,
      feeUnit: 'per fixture',
      categories: ['ALL'],
      legalBasis: [
        {
          url: 'https://officialgazette.gov.ph/2023/01/01/act-no-12345/',
          title: 'Republic Act No. 12345 - Sample Law',
          description: 'This is a sample legal reference for testing purposes'
        }
      ]
    })
    setSelectedCalculationMethod('per_unit')
    setSelectedUnit('per fixture')
  }

  return (
    <>
      <ResponsiveModal
        open={open}
        onCancel={handleCancel}
        title="Add Variable"
        footer={[
          <Button key="debug" onClick={handleDebugFill} style={{ marginRight: 8 }}>
            Debug Fill
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Add Variable
          </Button>,
        ]}
        width={600}
        destroyOnHidden
      >
        <Text>Enter the variable details below.</Text>
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
                placeholder="e.g., Parking Space Fee"
                onBlur={(e) => validateName(e.target.value)}
                disabled={isValidating}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label={<span>Description<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Description is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <TextArea placeholder="Description of this variable" rows={3} />
            </Form.Item>

            <Form.Item
              name="question"
              label={<span>Question<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Question is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input placeholder="e.g., What is the total parking area in square meters?" />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea placeholder="Admin notes, guides, or comments (for staff reference only)" rows={3} />
            </Form.Item>

            <Text style={{ marginBottom: 8, display: 'block' }}>Unit Configuration</Text>
            <Form.Item
              name="unit"
              label={<span>Unit (generic)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: true, message: 'Unit is required' }]}
            >
              <Input
                placeholder="e.g., sqm"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="unitSingular"
              label={<span>Unit (singular form)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: true, message: 'Unit singular form is required' }]}
            >
              <Input
                placeholder="e.g., square meter"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="unitPlural"
              label={<span>Unit (plural form)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[{ required: true, message: 'Unit plural form is required' }]}
            >
              <Input
                placeholder="e.g., square meters"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="unitContextSingular"
              label={<span>Context-specific unit (singular)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Context-specific unit (singular) is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input
                placeholder="e.g., per square meter"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="unitContextPlural"
              label={<span>Context-specific unit (plural)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Context-specific unit (plural) is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input
                placeholder="e.g., per square meters"
                allowClear
              />
            </Form.Item>

            <Text style={{ marginBottom: 8, display: 'block' }}>Fee Calculation</Text>
            <Form.Item
              name="calculationMethod"
              label={<span>Calculation Method<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.reject('Calculation method is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Select placeholder="Select calculation method" options={CALCULATION_METHODS} onChange={handleCalculationMethodChange} />
            </Form.Item>

            {selectedCalculationMethod !== 'bracketed' && (
              <Form.Item
                name="baseRate"
                label={<span>Base Rate<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                rules={[
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject('Base rate is required')
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter base rate"
                  min={0}
                  precision={2}
                  formatter={currencyFormatter}
                  parser={currencyParser}
                />
              </Form.Item>
            )}

            <Form.Item
              name="feeUnit"
              label={<span>Fee Unit<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.reject('Unit is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Select
                placeholder="Select unit"
                disabled={!selectedCalculationMethod}
                onChange={handleUnitChange}
              >
                {(UNIT_OPTIONS_BY_METHOD[selectedCalculationMethod] || []).map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {selectedCalculationMethod === 'bracketed' && (
              <>
                <Text style={{ marginBottom: 8, display: 'block' }}>Brackets<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></Text>
                <Form.List name="brackets">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field, index) => (
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
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Form.Item
                                {...field}
                                name={[field.name, 'minValue']}
                                label={<span>Min Value ({selectedUnit || 'sqm'})<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                                rules={[{ required: true, message: 'Min value required' }]}
                                style={{ marginBottom: 0, flex: 1 }}
                              >
                                <InputNumber placeholder={`Min ${selectedUnit || 'sqm'}`} min={0} style={{ width: '100%' }} />
                              </Form.Item>
                              <Form.Item
                                {...field}
                                name={[field.name, 'maxValue']}
                                label={`Max Value (${selectedUnit || 'sqm'})`}
                                style={{ marginBottom: 0, flex: 1 }}
                              >
                                <InputNumber placeholder={`Max ${selectedUnit || 'sqm'} (optional)`} min={0} style={{ width: '100%' }} />
                              </Form.Item>
                            </div>
                            <Form.Item
                              {...field}
                              name={[field.name, 'fixedAmount']}
                              label={<span>Fixed Amount (₱)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                              rules={[{ required: true, message: 'Fixed amount required' }]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                placeholder="Amount"
                                min={0}
                                precision={2}
                                formatter={currencyFormatter}
                                parser={currencyParser}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                            <Button
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(field.name)}
                              block
                              disabled={index === 0}
                            >
                              Remove Bracket
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          Add Bracket
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              </>
            )}

            <Form.Item
              name="categories"
              label={<span>Applicable Categories<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.length === 0) {
                      return Promise.reject('At least one category is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Select mode="multiple" placeholder="Select applicable categories" options={CATEGORIES} />
            </Form.Item>

            <Form.Item
              name="checklistId"
              label="Checklist"
            >
              <Select
                placeholder="Select a checklist to associate with this variable (optional)"
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
          </Form>
      </ResponsiveModal>
      {stepUpModal}
    </>
  )
}
