import { useState } from 'react'
import { Typography, Row, Col, Form, Input, DatePicker, TimePicker, Checkbox, Radio, Switch, Slider, Upload, Button, Select, theme } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields'
import AlaminosAddressFields from '@/shared/components/AlaminosAddressFields'

const { Text } = Typography
const { RangePicker } = DatePicker

export function PreviewField({ field, disabled = false }) {
  const { token } = theme.useToken()
  const [selectValue, setSelectValue] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [form] = Form.useForm()

  const renderInput = () => {
    const commonProps = {
      placeholder: field.placeholder || '',
      style: { width: '100%' },
    }

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} />
      case 'number':
        return <Input type="number" {...commonProps} />
      case 'email':
        return <Input type="email" {...commonProps} />
      case 'phone':
        return <Input type="tel" {...commonProps} />
      case 'date':
        return <DatePicker {...commonProps} style={{ width: '100%' }} />
      case 'date_range':
        return (
          <Row gutter={8}>
            <Col span={12}>
              <DatePicker placeholder="Start date" style={{ width: '100%' }} />
            </Col>
            <Col span={12}>
              <DatePicker placeholder="End date" style={{ width: '100%' }} />
            </Col>
          </Row>
        )
      case 'time':
        return <TimePicker {...commonProps} style={{ width: '100%' }} />
      case 'select':
        return (
          <Select
            {...commonProps}
            options={field.dropdownOptions?.map(opt => ({ label: opt, value: opt })) || []}
          />
        )
      case 'multiselect':
        return (
          <Select
            {...commonProps}
            mode="multiple"
            options={field.dropdownOptions?.map(opt => ({ label: opt, value: opt })) || []}
          />
        )
      case 'checkbox':
        return <Checkbox>{field.label}</Checkbox>
      case 'radio':
        return (
          <Radio.Group>
            {field.dropdownOptions?.map((opt, idx) => (
              <Radio key={idx} value={opt}>{opt}</Radio>
            ))}
          </Radio.Group>
        )
      case 'textarea':
        return <Input.TextArea {...commonProps} rows={4} />
      case 'switch':
        return <Switch />
      case 'slider':
        return <Slider />
      case 'file':
        return (
          <div style={field.metadataFields && field.metadataFields.length > 0 ? { border: `1px solid ${token.colorBorder}`, padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column' }}>
            <Upload listType="picture-card" disabled={disabled}>
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
            {/* Render metadata fields if defined */}
            {field.metadataFields && field.metadataFields.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {field.metadataFields.map((metaField, metaIdx) => {
                  if (metaField.type === 'address') {
                    return (
                      <div key={metaIdx} style={{ marginBottom: 8 }}>
                        <Text style={{ display: 'block', marginBottom: 4 }}>
                          {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                        </Text>
                        <PhilippineAddressFields
                          form={form}
                          namePrefix={[field.key, metaField.key]}
                          required={metaField.required}
                          disabled={false}
                        />
                      </div>
                    )
                  }
                  if (metaField.type === 'address_alaminos') {
                    return (
                      <div key={metaIdx} style={{ marginBottom: 8 }}>
                        <Text style={{ display: 'block', marginBottom: 4 }}>
                          {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                        </Text>
                        <AlaminosAddressFields
                          form={form}
                          namePrefix={[field.key, metaField.key]}
                          required={metaField.required}
                          disabled={false}
                        />
                      </div>
                    )
                  }
                  return (
                    <div key={metaIdx} style={{ marginBottom: 8 }}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>
                        {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                      </Text>
                      {metaField.type === 'date' ? (
                        <DatePicker style={{ width: '100%' }} />
                      ) : (
                        <Input placeholder={metaField.placeholder || ''} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      case 'category_upload':
        return (
          <div style={field.metadataFields && field.metadataFields.length > 0 ? { display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column' }}>
            <Radio.Group
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            >
              <Row gutter={[8, 8]}>
                {(field.dropdownOptions || []).map((option, idx) => {
                  const isObject = typeof option === 'object'
                  const id = isObject ? (option.id || option.label) : option
                  const label = isObject ? option.label : option
                  const definition = isObject ? option.definition : ''
                  const whereToGet = isObject ? option.whereToGet : ''
                  const optionMetadataFields = isObject && option.metadataFields ? option.metadataFields : field.metadataFields
                  const isSelected = selectValue === id
                  const hasFileForOption = uploadedFiles[id] && uploadedFiles[id].length > 0
                  // Hide unselected options when one is selected
                  if (selectValue && !isSelected) return null
                  return (
                    <Col key={idx} span={24}>
                      <Radio.Button
                        value={id}
                        style={{
                          width: '100%',
                          height: 'auto',
                          padding: '12px 16px',
                          textAlign: 'left',
                          display: 'block',
                          whiteSpace: 'normal',
                          borderColor: isSelected ? token.colorBorder : undefined,
                        }}
                      >
                        <div>
                          <Text style={{ display: 'block', marginBottom: 4 }}>{label}</Text>
                          {definition && !hasFileForOption && (
                            <Text type="secondary" style={{ display: 'block' }}>{definition} {isSelected && whereToGet && `- ${whereToGet}`}</Text>
                          )}
                          {isSelected && (
                            <div style={{ marginTop: 12 }}>
                              <Upload
                                listType="picture-card"
                                disabled={disabled}
                                fileList={uploadedFiles[id] || []}
                                onChange={({ fileList }) => setUploadedFiles({ ...uploadedFiles, [id]: fileList })}
                              >
                                {(uploadedFiles[id] || []).length === 0 && (
                                  <div>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 8 }}>Upload</div>
                                  </div>
                                )}
                              </Upload>
                              {/* Render metadata fields if defined */}
                              {optionMetadataFields && optionMetadataFields.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  {optionMetadataFields.map((metaField, metaIdx) => {
                                    if (metaField.type === 'address') {
                                      return (
                                        <div key={metaIdx} style={{ marginBottom: 8 }}>
                                          <Text style={{ display: 'block', marginBottom: 4 }}>
                                            {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                                          </Text>
                                          <PhilippineAddressFields
                                            form={form}
                                            namePrefix={[field.key, metaField.key]}
                                            required={metaField.required}
                                            disabled={false}
                                          />
                                        </div>
                                      )
                                    }
                                    if (metaField.type === 'address_alaminos') {
                                      return (
                                        <div key={metaIdx} style={{ marginBottom: 8 }}>
                                          <Text style={{ display: 'block', marginBottom: 4 }}>
                                            {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                                          </Text>
                                          <AlaminosAddressFields
                                            form={form}
                                            namePrefix={[field.key, metaField.key]}
                                            required={metaField.required}
                                            disabled={false}
                                          />
                                        </div>
                                      )
                                    }
                                    return (
                                      <div key={metaIdx} style={{ marginBottom: 8 }}>
                                        <Text style={{ display: 'block', marginBottom: 4 }}>
                                          {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                                        </Text>
                                        {metaField.type === 'date' ? (
                                          <DatePicker style={{ width: '100%' }} />
                                        ) : (
                                          <Input placeholder={metaField.placeholder || ''} />
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Radio.Button>
                    </Col>
                  )
                })}
              </Row>
            </Radio.Group>
            {selectValue && (
              <Button
                onClick={() => {
                  setSelectValue(null)
                  setUploadedFiles({})
                }}
                style={{ padding: 0 }}
              >
                Change selection
              </Button>
            )}
          </div>
        )
      default:
        return <Input {...commonProps} />
    }
  }

  // Handle address fields specially - they have their own label structure
  if (field.type === 'address' || field.type === 'address_alaminos') {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: field.helpText ? 0 : 8 }}>
          <Text>
            {field.label || '(Untitled field)'} {field.required && <span style={{ color: token.colorError }}>*</span>}
          </Text>
        </div>
        {field.helpText && (
          <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
            {field.helpText}
          </Text>
        )}
        <Form form={form} layout="vertical">
          <Form.Item style={{ marginBottom: 8 }}>
            <Row gutter={[12, 0]}>
              {field.type === 'address' ? (
                <PhilippineAddressFields
                  form={form}
                  namePrefix={field.key}
                  required={field.required}
                  disabled={false}
                />
              ) : (
                <Col span={24}>
                  <AlaminosAddressFields
                    form={form}
                    namePrefix={field.key}
                    required={field.required}
                    disabled={false}
                  />
                </Col>
              )}
            </Row>
          </Form.Item>
        </Form>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 24}}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: field.helpText ? 0 : 8 }}>
        <Text>
          {field.label || '(Untitled field)'} {field.required && <span style={{ color: token.colorError }}>*</span>}
        </Text>
      </div>
      {field.helpText && (
        <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
          {field.helpText}
        </Text>
      )}
      {renderInput()}
    </div>
  )
}
