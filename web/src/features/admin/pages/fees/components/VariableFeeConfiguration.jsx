import { Form, InputNumber, Typography, Input, Select, Divider, Button, theme } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'

const { Text } = Typography
const { TextArea } = Input

const UNIT_OPTIONS_BY_METHOD = {
  floor_area: [
    { value: 'sqm', label: 'sqm' },
    { value: 'hectare', label: 'hectare' },
  ],
  capitalization: [
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
    { value: 'sqm', label: 'sqm' },
    { value: 'hectare', label: 'hectare' },
    { value: 'custom', label: 'custom' },
  ],
  bracketed: [
    { value: 'sqm', label: 'sqm' },
    { value: 'hectare', label: 'hectare' },
    { value: 'boarder', label: 'boarder' },
    { value: 'vehicle', label: 'vehicle' },
    { value: 'truck', label: 'truck' },
    { value: 'custom', label: 'Custom...' },
  ],
  classification: [
    { value: 'classification', label: 'classification' },
  ],
  yes_no: [
    { value: 'yes_no', label: 'yes/no' },
  ],
}

const CALCULATION_METHOD_OPTIONS = [
  { value: 'floor_area', label: 'Floor Area' },
  { value: 'capitalization', label: 'Capitalization' },
  { value: 'bracketed', label: 'Bracketed' },
  { value: 'classification', label: 'Classification' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'custom', label: 'Custom' },
]

export default function VariableFeeConfiguration({ 
  form, 
  initialValues, 
  handleValuesChange, 
  handleCalculationMethodChange, 
  handleUnitChange,
  selectedCalculationMethod,
  selectedUnit,
  isCustomMethod,
  previewValue,
  setPreviewValue,
  token
}) {
  const { token: defaultToken } = theme.useToken()
  const finalToken = token || defaultToken

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          name="name"
          label={<span>Variable Fee Name<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
          required={false}
          rules={[{ required: true, message: 'Please enter rule name' }]}
        >
          <Input placeholder="e.g., Building Permit Fee" />
        </Form.Item>

        <Form.Item
          name="calculationMethod"
          label={<span>Calculation Method<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
          required={false}
          rules={[{ required: true, message: 'Please select calculation method' }]}
        >
          <Select
            placeholder="Select calculation method"
            onChange={handleCalculationMethodChange}
          >
            {CALCULATION_METHOD_OPTIONS.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {isCustomMethod && (
          <Form.Item
            name="customCalculationMethod"
            label={<span>Custom Method<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
            required={false}
            rules={[{ required: true, message: 'Please enter custom calculation method' }]}
          >
            <Input placeholder="e.g., Based on number of employees, vehicle weight, etc." />
          </Form.Item>
        )}

        {selectedCalculationMethod !== 'bracketed' && selectedCalculationMethod !== 'classification' && (
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="baseRate"
              label={<span>Base Rate<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[{ required: true, message: 'Please enter base rate' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter rate"
                min={0}
                precision={2}
                formatter={currencyFormatter}
                parser={currencyParser}
              />
            </Form.Item>
            <Form.Item
              name="unit"
              label={<span>Unit (Legacy)<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[{ required: true, message: 'Please select unit' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Select unit"
                disabled={!selectedCalculationMethod}
              >
                {(UNIT_OPTIONS_BY_METHOD[selectedCalculationMethod] || []).map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="unitSingular"
              label={<span>Singular Unit<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[{ required: true, message: 'Please enter singular unit' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="e.g., room, unit, sqm" />
            </Form.Item>
            <Form.Item
              name="unitPlural"
              label={<span>Plural Unit<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[{ required: true, message: 'Please enter plural unit' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="e.g., rooms, units, sqm" />
            </Form.Item>
          </div>
        )}

        {selectedCalculationMethod === 'bracketed' && (
          <>
            <Form.Item
              name="unit"
              label={<span>Unit (Legacy)<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[{ required: true, message: 'Please select unit' }]}
            >
              <Select
                placeholder="Select unit"
                onChange={handleUnitChange}
              >
                {(UNIT_OPTIONS_BY_METHOD[selectedCalculationMethod] || []).map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="unitSingular"
              label={<span>Singular Unit<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[{ required: true, message: 'Please enter singular unit' }]}
            >
              <Input placeholder="e.g., room, unit, sqm" />
            </Form.Item>
            <Form.Item
              name="unitPlural"
              label={<span>Plural Unit<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[{ required: true, message: 'Please enter plural unit' }]}
            >
              <Input placeholder="e.g., rooms, units, sqm" />
            </Form.Item>
            <Text style={{ marginBottom: 8, display: 'block' }}>Brackets<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></Text>
            <Form.List name="brackets">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      style={{
                        marginBottom: 16,
                        padding: 16,
                        border: `1px solid ${finalToken.colorBorderSecondary}`,
                        borderRadius: 8,
                        background: finalToken.colorBgContainer,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'minValue']}
                            label={<span>Min Value ({selectedUnit || 'sqm'})<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
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
                          label={<span>Fixed Amount (₱)<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
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

        {selectedCalculationMethod === 'classification' && (
          <>
            <Text style={{ marginBottom: 8, display: 'block' }}>Classifications<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></Text>
            <Form.List name="classifications">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      style={{
                        marginBottom: 16,
                        padding: 16,
                        border: `1px solid ${finalToken.colorBorderSecondary}`,
                        borderRadius: 8,
                        background: finalToken.colorBgContainer,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'name']}
                          label={<span>Classification Name<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
                          rules={[{ required: true, message: 'Classification name required' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="e.g., Rural Bank, Commercial Bank" />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'fee']}
                          label={<span>Fee (₱)<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
                          rules={[{ required: true, message: 'Fee amount required' }]}
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
                        <Form.Item
                          {...field}
                          name={[field.name, 'description']}
                          label="Description (optional)"
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="Optional description" />
                        </Form.Item>
                        <Button
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                          block
                          disabled={index === 0}
                        >
                          Remove Classification
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Classification
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </>
        )}

        <Form.Item
          name="notes"
          label="Admin Notes"
        >
          <TextArea
            placeholder="Enter notes (optional)"
            rows={2}
          />
        </Form.Item>

        <Form.Item
          name="question"
          label={<span>Question<span style={{ color: finalToken.colorError, marginLeft: 4 }}>*</span></span>}
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

        <Divider />

        {form && selectedCalculationMethod !== 'bracketed' && selectedCalculationMethod !== 'classification' && (
          <>
            <Form.Item label={`Sample Calculation Value (${form.getFieldValue('unit') || 'units'})`}>
              <InputNumber
                value={previewValue}
                onChange={setPreviewValue}
                style={{ width: '100%' }}
                min={0}
                precision={2}
                placeholder="Enter sample value"
              />
            </Form.Item>
            <div style={{ marginTop: 16 }}>
              <Text>Sample Cost Formula:</Text>
              <div style={{ marginTop: 8, padding: 12, border: `1px dashed ${finalToken.colorBorder}`, borderRadius: 8 }}>
                {selectedCalculationMethod === 'bracketed' && form.getFieldValue('brackets') && form.getFieldValue('brackets').length > 0 ? (() => {
              const brackets = form.getFieldValue('brackets')
              const matchedBracket = brackets.find(b => previewValue >= b.minValue && (b.maxValue === null || previewValue <= b.maxValue))
              if (matchedBracket) {
                const range = matchedBracket.maxValue !== null
                  ? `${matchedBracket.minValue}-${matchedBracket.maxValue} ${form.getFieldValue('unit')}`
                  : `${matchedBracket.minValue}+ ${form.getFieldValue('unit')}`
                return (
                  <Text strong>
                    Sample: {previewValue} {form.getFieldValue('unit')} falls in {range} bracket → Fixed: ₱{matchedBracket.fixedAmount?.toLocaleString() || 0}
                  </Text>
                )
              }
              return <Text strong>Sample value {previewValue} does not fall within any bracket</Text>
            })() : (
              <Text strong>
                ₱{form.getFieldValue('baseRate') || 0} × {previewValue} {form.getFieldValue('unit') || 'units'} = ₱{((form.getFieldValue('baseRate') || 0) * previewValue).toFixed(2)}
              </Text>
            )}
          </div>
        </div>
          </>
        )}
      </Form>
    </div>
  )
}
