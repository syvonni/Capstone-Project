import { useState } from 'react'
import { Typography, Row, Col, Form, Input, DatePicker, TimePicker, Checkbox, Radio, Switch, Slider, Upload, Button, Select, theme } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields'
import AlaminosAddressFields from '@/shared/components/AlaminosAddressFields'

const { Text } = Typography
const { RangePicker } = DatePicker

export function PreviewField({ field, disabled = false, editable = false, form = null, _businessId = null, _onDocumentCid = null, _onSaveDraft = null }) {
  const { token } = theme.useToken()
  const [selectValue, setSelectValue] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [localForm] = Form.useForm()
  const actualForm = form || localForm
  const fieldName = field.key

  const renderInput = () => {
    const commonProps = {
      placeholder: field.placeholder || '',
      style: { width: '100%' },
    }

    const inputComponent = (() => {
      switch (field.type) {
        case 'text':
          return <Input {...commonProps} disabled={disabled} />
        case 'number':
          return <Input type="number" {...commonProps} disabled={disabled} />
        case 'email':
          return <Input type="email" {...commonProps} disabled={disabled} />
        case 'phone':
          return <Input type="tel" {...commonProps} disabled={disabled} />
        case 'date':
          return <DatePicker {...commonProps} style={{ width: '100%' }} disabled={disabled} />
        case 'date_range':
          return (
            <Row gutter={8}>
              <Col span={12}>
                <DatePicker placeholder="Start date" style={{ width: '100%' }} disabled={disabled} />
              </Col>
              <Col span={12}>
                <DatePicker placeholder="End date" style={{ width: '100%' }} disabled={disabled} />
              </Col>
            </Row>
          )
        case 'time':
          return <TimePicker {...commonProps} style={{ width: '100%' }} disabled={disabled} />
        case 'select':
          return (
            <Select
              {...commonProps}
              options={field.dropdownOptions?.map(opt => ({ label: opt, value: opt })) || []}
              disabled={disabled}
            />
          )
        case 'multiselect':
          return (
            <Select
              {...commonProps}
              mode="multiple"
              options={field.dropdownOptions?.map(opt => ({ label: opt, value: opt })) || []}
              disabled={disabled}
            />
          )
        case 'checkbox':
          return <Checkbox disabled={disabled}>{field.label}</Checkbox>
        case 'radio':
          return (
            <Radio.Group disabled={disabled}>
              {field.dropdownOptions?.map((opt, idx) => (
                <Radio key={idx} value={opt}>{opt}</Radio>
              ))}
            </Radio.Group>
          )
        case 'textarea':
          return <Input.TextArea {...commonProps} rows={4} disabled={disabled} />
        case 'switch':
          return <Switch disabled={disabled} />
        case 'slider':
          return <Slider disabled={disabled} />
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
                            form={actualForm}
                            namePrefix={[fieldName, metaField.key]}
                            required={metaField.required}
                            disabled={disabled}
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
                            form={actualForm}
                            namePrefix={[fieldName, metaField.key]}
                            required={metaField.required}
                            disabled={disabled}
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
                          <DatePicker style={{ width: '100%' }} disabled={disabled} />
                        ) : (
                          <Input placeholder={metaField.placeholder || ''} disabled={disabled} />
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
                    const _optionMetadataFields = isObject && option.metadataFields ? option.metadataFields : field.metadataFields
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
                              {_optionMetadataFields && _optionMetadataFields.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  {_optionMetadataFields.map((metaField, metaIdx) => {
                                    if (metaField.type === 'address') {
                                      return (
                                        <div key={metaIdx} style={{ marginBottom: 8 }}>
                                          <Text style={{ display: 'block', marginBottom: 4 }}>
                                            {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                                          </Text>
                                          <PhilippineAddressFields
                                            form={actualForm}
                                            namePrefix={[fieldName, metaField.key]}
                                            required={metaField.required}
                                            disabled={disabled}
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
                                            form={actualForm}
                                            namePrefix={[fieldName, metaField.key]}
                                            required={metaField.required}
                                            disabled={disabled}
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
                                          <DatePicker style={{ width: '100%' }} disabled={disabled} />
                                        ) : (
                                          <Input placeholder={metaField.placeholder || ''} disabled={disabled} />
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
        case 'address':
          return (
            <PhilippineAddressFields
              form={actualForm}
              namePrefix={fieldName}
              required={field.required}
              disabled={disabled}
            />
          )
        case 'address_alaminos':
          return (
            <AlaminosAddressFields
              form={actualForm}
              namePrefix={fieldName}
              required={field.required}
              disabled={disabled}
            />
          )
        default:
          return <Input {...commonProps} placeholder={`Unsupported field type: ${field.type || 'unknown'}`} disabled={disabled} />
      }
    })()

    // If editable, wrap in Form.Item
    if (editable && actualForm) {
      const rules = disabled ? [] : [{ required: field.required, message: `${field.label} is required` }]
      const fieldLabel = (
        <span>
          {field.label || '(Untitled field)'}
          {field.required && <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>}
          {field.helpText && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', fontWeight: 'normal', marginTop: 2 }}>
              {field.helpText}
            </Text>
          )}
        </span>
      )
      
      // Special handling for checkbox
      if (field.type === 'checkbox') {
        return (
          <Form.Item
            name={fieldName}
            valuePropName="checked"
            rules={rules}
          >
            {inputComponent}
          </Form.Item>
        )
      }
      
      // Special handling for address fields
      if (field.type === 'address' || field.type === 'address_alaminos') {
        return (
          <Form.Item
            name={fieldName}
            label={fieldLabel}
            rules={rules}
          >
            {inputComponent}
          </Form.Item>
        )
      }
      
      return (
        <Form.Item
          name={fieldName}
          label={fieldLabel}
          rules={rules}
        >
          {inputComponent}
        </Form.Item>
      )
    }

    return inputComponent
  }

  return (
    <div>
      {!editable && field.label && (
        <Text style={{ display: 'block', marginBottom: 4 }}>
          {field.label}
          {field.required && <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>}
        </Text>
      )}
      {!editable && field.helpText && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          {field.helpText}
        </Text>
      )}
      {renderInput()}
    </div>
  )
}