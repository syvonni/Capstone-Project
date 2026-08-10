import { useState, useEffect } from 'react'
import { Form, Input, InputNumber, Button, message, Typography, theme, Select } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createVariableFeeRule } from '@/features/admin/services/feeService'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'
import { useNameValidation } from '@/shared/hooks/useNameValidation'

const { Text } = Typography
const { useToken } = theme

const { TextArea } = Input

const CALCULATION_METHODS = [
  { label: 'Floor Area Based', value: 'floor_area' },
  { label: 'Capitalization Based', value: 'capitalization' },
  { label: 'Gross Sales Based', value: 'gross_sales' },
  { label: 'Per Unit/Door', value: 'per_unit' },
  { label: 'Percentage of Value', value: 'percentage' },
  { label: 'Bracketed (Graduated)', value: 'bracketed' },
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
  floor_area: [
    { value: 'per sqm', label: 'per sqm' },
    { value: 'per sqm of sign', label: 'per sqm of sign' },
    { value: 'per sqm of land area', label: 'per sqm of land area' },
    { value: 'per sqm of GFA', label: 'per sqm of GFA' },
    { value: 'per sqm per month', label: 'per sqm per month' },
    { value: 'per hectare', label: 'per hectare' },
    { value: 'per hectare per annum', label: 'per hectare per annum' },
  ],
  percentage: [
    { value: 'of capitalization', label: 'of capitalization' },
    { value: 'of restoration cost', label: 'of restoration cost' },
    { value: 'of actual construction cost', label: 'of actual construction cost' },
    { value: 'of license to operate fee', label: 'of license to operate fee' },
    { value: 'of renewal fee', label: 'of renewal fee' },
  ],
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
  capitalization: [
    { value: 'of capitalization', label: 'of capitalization' },
  ],
  gross_sales: [
    { value: 'of gross sales', label: 'of gross sales' },
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
}

export default function AddVariableFeeModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [selectedCalculationMethod, setSelectedCalculationMethod] = useState('floor_area')
  const [selectedUnit, setSelectedUnit] = useState('')
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { token } = useToken()
  const { validateName, isValidating, error: nameError, clearError } = useNameValidation('VariableFeeRule')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
      setSelectedCalculationMethod('floor_area')
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
      if (!values.name || !values.calculationMethod) {
        message.error('Please fill in all required fields')
        return
      }

      // For bracketed method, baseRate is not required, but brackets are
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

      setLoading(true)

      await runWithStepUp(async (stepUpToken) => {
        await createVariableFeeRule(values, { stepUpToken })
      })

      message.success('Variable fee created successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create variable fee:', error)
        message.error(error.message || 'Failed to create variable fee')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <>
      <ResponsiveModal
        open={open}
        onCancel={handleCancel}
        title="Add Variable Fee"
        footer={[
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Create Variable Fee
          </Button>,
        ]}
        width={600}
        destroyOnHidden
      >
        <Text>Enter the variable fee details below.</Text>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
            <Form.Item
              name="name"
              label={<span>Variable Fee Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              validateStatus={nameError ? 'error' : ''}
              help={nameError}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Fee name is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input
                placeholder="Enter fee name"
                onBlur={(e) => validateName(e.target.value)}
                disabled={isValidating}
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label={<span>Admin Notes</span>}
            >
              <TextArea placeholder="Enter notes" rows={2} />
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
              <TextArea placeholder="Enter question to display to business owners (e.g., What is your total floor area in square meters?)" rows={2} />
            </Form.Item>

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
              name="unit"
              label={<span>Unit<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
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

          </Form>
      </ResponsiveModal>
      {stepUpModal}
    </>
  )
}
