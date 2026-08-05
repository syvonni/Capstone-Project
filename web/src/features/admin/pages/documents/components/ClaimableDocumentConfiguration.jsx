import { Form, Input, Typography, Upload, Button, Select, theme } from 'antd'
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import SelectWithAddon from '@/shared/components/formEditor/SelectWithAddon'

const { Text } = Typography
const { TextArea } = Input

// Mock form fields data - maps form IDs to their available fields
const MOCK_FORM_FIELDS = {
  'form-1': {
    name: 'Regular Permit Form',
    fields: ['Approved Date', 'Business Name', 'Business Address', 'Owner Name', 'Contact Number', 'Email']
  },
  'form-2': {
    name: 'Renewal Form',
    fields: ['Approved Date', 'Business Name', 'Previous Permit Number', 'Renewal Period', 'Owner Name']
  },
  'form-3': {
    name: 'Mayor\'s Permit Form',
    fields: ['Approved Date', 'Business Name', 'Location', 'Business Type', 'Mayor Signature']
  },
  'form-4': {
    name: 'Cessation Form',
    fields: ['Approved Date', 'Business Name', 'Cessation Date', 'Reason', 'Clearance Status']
  }
}

export default function ClaimableDocumentConfiguration({
  form,
  handleFormValuesChange,
  templateHtml,
  setTemplateHtml,
  templateImages = [],
  setTemplateImages,
  templateTexts = [],
  setTemplateTexts,
  formDefinitions = [],
  loadingForms = false,
  checklists = [],
  loadingChecklists = false,
  saving = false,
  htmlUploadInputRef,
  setPreviewModal
}) {
  const { token } = theme.useToken()

  return (
    <div style={{ padding: '24px', overflow: 'auto', height: '100%' }}>
      <Form
        form={form}
        layout="vertical"
        disabled={saving}
        onValuesChange={handleFormValuesChange}
      >
        <Form.Item
          name="name"
          label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          required={false}
          rules={[{ required: true, message: 'Please enter document name' }]}
        >
          <Input placeholder="e.g., Fire Safety Inspection Certificate" />
        </Form.Item>

        <Form.Item
          name="formIds"
          label={<span>Associated Forms<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          required={false}
          rules={[{ required: true, message: 'Please select at least one form' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select forms"
            loading={loadingForms}
            options={formDefinitions.map(form => ({
              label: form.name,
              value: form._id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="checklistId"
          label="Checklist"
        >
          <Select
            placeholder="Select a checklist to associate with this document (optional)"
            loading={loadingChecklists}
            allowClear
            options={checklists.map(c => ({
              value: c._id?.toString(),
              label: c.name,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea rows={4} placeholder="Add any additional notes..." />
        </Form.Item>

        {/* HTML Template Section */}
        <div style={{ marginTop: 24 }}>
          <Form.Item
            label={<span>HTML Document Template<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
            rules={[{ required: true, message: 'HTML template is required' }]}
            required={false}
          >
            {templateHtml ? (
              <div
                style={{
                  width: '100%',
                  padding: 16,
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: 8,
                  background: token.colorBgContainer,
                }}
              >
                
                <div
                  style={{
                    maxHeight: 200,
                    overflow: 'auto',
                    background: token.colorBgLayout,
                    padding: 12,
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: token.colorTextSecondary,
                  }}
                >
                  {templateHtml.substring(0, 500)}
                  {templateHtml.length > 500 && '...'}
                </div>
                <input
                  type="file"
                  accept=".html"
                  style={{ display: 'none' }}
                  ref={htmlUploadInputRef}
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        setTemplateHtml(ev.target.result)
                      }
                      reader.readAsText(file)
                    }
                  }}
                />
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => htmlUploadInputRef.current?.click()}
                  style={{ marginTop: 12 }}
                  block
                >
                  Replace HTML
                </Button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".html"
                  style={{ display: 'none' }}
                  ref={htmlUploadInputRef}
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        setTemplateHtml(ev.target.result)
                      }
                      reader.readAsText(file)
                    }
                  }}
                />
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => htmlUploadInputRef.current?.click()}
                  block
                >
                  Upload HTML Document
                </Button>
              </div>
            )}
          </Form.Item>

          <Form.Item
            label="Template Image Attributes"
          >
            {templateImages.map((img, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 16,
                  padding: 16,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 8,
                  background: token.colorBgContainer,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 auto' }}>
                    {img.file ? (
                      <Upload
                        accept="image/*"
                        listType="picture-card"
                        fileList={[img.file]}
                        onChange={(info) => {
                          const { file } = info
                          const newImages = [...templateImages]
                          newImages[index].file = file
                          if (file.status === 'done' || file.originFileObj) {
                            const url = file.originFileObj ? URL.createObjectURL(file.originFileObj) : file.url || file.thumbUrl || null
                            newImages[index].path = url
                          }
                          setTemplateImages(newImages)
                        }}
                        beforeUpload={() => false}
                        maxCount={1}
                        onPreview={(file) => {
                          const url = file.originFileObj ? URL.createObjectURL(file.originFileObj) : file.url || file.thumbUrl || null
                          setPreviewModal({ open: true, url, label: img.name || img.attributeName, type: 'image' })
                        }}
                      />
                    ) : img.path ? (
                      <div
                        role="button"
                        tabIndex={0}
                        style={{
                          width: 104,
                          height: 104,
                          border: `1px solid ${token.colorBorder}`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          background: token.colorBgContainer,
                        }}
                        onClick={() => setPreviewModal({ open: true, url: img.path, label: img.name || img.attributeName, type: 'image' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setPreviewModal({ open: true, url: img.path, label: img.name || img.attributeName, type: 'image' })
                          }
                        }}
                      >
                        <div style={{ textAlign: 'center', padding: 8 }}>
                          <UploadOutlined style={{ fontSize: 24, color: token.colorTextSecondary }} />
                          <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                            {img.name || img.attributeName}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Upload
                        accept="image/*"
                        listType="picture-card"
                        fileList={[]}
                        onChange={(info) => {
                          const { file } = info
                          const newImages = [...templateImages]
                          newImages[index].file = file
                          if (file.status === 'done' || file.originFileObj) {
                            const url = file.originFileObj ? URL.createObjectURL(file.originFileObj) : file.url || file.thumbUrl || null
                            newImages[index].path = url
                          }
                          setTemplateImages(newImages)
                        }}
                        beforeUpload={() => false}
                        maxCount={1}
                      >
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8 }}>Upload</div>
                        </div>
                      </Upload>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Input
                      placeholder="Attribute Name"
                      value={img.attributeName}
                      onChange={(e) => {
                        const newImages = [...templateImages]
                        newImages[index].attributeName = e.target.value
                        setTemplateImages(newImages)
                      }}
                      addonBefore="Attribute: {{"
                      addonAfter="}}"
                    />
                    <Input
                      addonBefore="Display Name:"
                      placeholder="Display Name"
                      value={img.name}
                      onChange={(e) => {
                        const newImages = [...templateImages]
                        newImages[index].name = e.target.value
                        setTemplateImages(newImages)
                      }}
                    />
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const newImages = templateImages.filter((_, i) => i !== index)
                        setTemplateImages(newImages)
                      }}
                      block
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {templateImages.length === 0 && (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 24 }}>
                No image attributes defined. Click &quot;Add Image Attribute&quot; to create one.
              </Text>
            )}

            <div style={{ marginTop: 16 }}>
              <Button
                type="dashed"
                onClick={() => {
                  setTemplateImages([
                    ...templateImages,
                    { attributeName: '', name: '', path: '', file: null },
                  ])
                }}
                icon={<PlusOutlined />}
                block
              >
                Add Image Attribute
              </Button>
            </div>
          </Form.Item>
        </div>

        {/* Text Attributes Section */}
        <div style={{ marginTop: 24 }}>
          <Form.Item
            label="Text Attributes"
          >
            {templateTexts.map((textAttr, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 16,
                  padding: 16,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 8,
                  background: token.colorBgContainer,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Source Type Selector */}
                <SelectWithAddon
                  addonBefore="Source Type:"
                  placeholder="Select source type"
                  style={{ width: '100%' }}
                  value={textAttr.sourceType || 'form_field'}
                  onChange={(value) => {
                    const newTexts = [...templateTexts]
                    newTexts[index] = {
                      ...newTexts[index],
                      sourceType: value,
                      // Reset source-specific fields when type changes
                      bindings: value === 'form_field' ? newTexts[index].bindings || [] : undefined,
                      sourceKey: (value === 'system' || value === 'business_profile') ? newTexts[index].sourceKey || '' : undefined,
                      staticValue: value === 'static' ? newTexts[index].staticValue || '' : undefined,
                    }
                    setTemplateTexts(newTexts)
                  }}
                  options={[
                    { value: 'form_field', label: 'Form Field' },
                    { value: 'system', label: 'System Value' },
                    { value: 'business_profile', label: 'Business Profile' },
                    { value: 'static', label: 'Static Text' },
                  ]}
                />

                {/* Form Field Mode */}
                {textAttr.sourceType === 'form_field' && (
                  <SelectWithAddon
                    addonBefore="Form Field:"
                    placeholder="Select form field"
                    style={{ width: '100%' }}
                    value={textAttr.bindings?.[0]?.fieldKey || ''}
                    onChange={(value) => {
                      const newTexts = [...templateTexts]
                      const selectedFormIds = form.getFieldValue('formIds') || []
                      if (selectedFormIds.length > 0) {
                        newTexts[index].bindings = [{
                          formId: selectedFormIds[0],
                          sectionIndex: 0,
                          sectionName: 'General',
                          fieldKey: value,
                        }]
                      }
                      setTemplateTexts(newTexts)
                    }}
                    options={(() => {
                      const selectedFormIds = form.getFieldValue('formIds') || []
                      const options = []
                      
                      selectedFormIds.forEach(formId => {
                        const formInfo = formDefinitions.find(f => f._id === formId)
                        
                        if (formInfo && formInfo.sections) {
                          const formGroup = {
                            label: formInfo.name || 'Untitled Form',
                            options: []
                          }
                          
                          formInfo.sections.forEach((section) => {
                            section.items?.forEach(item => {
                              if (item.key) {
                                formGroup.options.push({
                                  label: `${section.sectionName} - ${item.label} (${item.key})`,
                                  value: item.key,
                                  key: `${formInfo._id}_${item.key}`, // Unique React key
                                })
                              }
                            })
                            
                            // Also include groupFields from repeatable_group items
                            section.items?.forEach(item => {
                              if (item.type === 'repeatable_group' && item.groupFields) {
                                item.groupFields.forEach(groupField => {
                                  if (groupField.key) {
                                    formGroup.options.push({
                                      label: `${section.sectionName} - ${item.label} > ${groupField.label} (${groupField.key})`,
                                      value: groupField.key,
                                      key: `${formInfo._id}_${groupField.key}`, // Unique React key
                                    })
                                  }
                                })
                              }
                            })
                            
                            // Also include metadataFields from category_upload items
                            section.items?.forEach(item => {
                              if (item.type === 'category_upload' && item.metadataFields) {
                                item.metadataFields.forEach(metaField => {
                                  if (metaField.key) {
                                    formGroup.options.push({
                                      label: `${section.sectionName} - ${item.label} > ${metaField.label} (${metaField.key})`,
                                      value: metaField.key,
                                      key: `${formInfo._id}_${metaField.key}`, // Unique React key
                                    })
                                  }
                                })
                              }
                            })
                          })
                          
                          if (formGroup.options.length > 0) {
                            options.push(formGroup)
                          }
                        }
                      })
                      
                      return options
                    })()}
                  />
                )}

                {/* System Mode */}
                {textAttr.sourceType === 'system' && (
                  <SelectWithAddon
                    addonBefore="System Field:"
                    placeholder="Select system field"
                    style={{ width: '100%' }}
                    value={textAttr.sourceKey || ''}
                    onChange={(value) => {
                      const newTexts = [...templateTexts]
                      newTexts[index].sourceKey = value
                      setTemplateTexts(newTexts)
                    }}
                    options={[
                      { value: 'applicationReferenceNumber', label: 'Application Reference Number' },
                      { value: 'applicationStatus', label: 'Application Status' },
                    ]}
                  />
                )}

                {/* Business Profile Mode */}
                {textAttr.sourceType === 'business_profile' && (
                  <SelectWithAddon
                    addonBefore="Business Field:"
                    placeholder="Select business field"
                    style={{ width: '100%' }}
                    value={textAttr.sourceKey || ''}
                    onChange={(value) => {
                      const newTexts = [...templateTexts]
                      newTexts[index].sourceKey = value
                      setTemplateTexts(newTexts)
                    }}
                    options={[
                      { value: 'registeredBusinessName', label: 'Registered Business Name' },
                      { value: 'businessTradeName', label: 'Business Trade Name' },
                      { value: 'businessAddress', label: 'Business Address' },
                      { value: 'businessType', label: 'Business Type' },
                      { value: 'primaryLineOfBusiness', label: 'Primary Line of Business' },
                    ]}
                  />
                )}

                {/* Static Mode */}
                {textAttr.sourceType === 'static' && (
                  <Input
                    addonBefore="Static Value:"
                    placeholder="Enter static text"
                    style={{ width: '100%' }}
                    value={textAttr.staticValue || ''}
                    onChange={(e) => {
                      const newTexts = [...templateTexts]
                      newTexts[index].staticValue = e.target.value
                      setTemplateTexts(newTexts)
                    }}
                  />
                )}

                <Input
                  placeholder="e.g., approvedDate"
                  style={{ width: '100%' }}
                  value={textAttr.attributeName}
                  onChange={(e) => {
                    const newTexts = [...templateTexts]
                    newTexts[index].attributeName = e.target.value
                    setTemplateTexts(newTexts)
                  }}
                  addonBefore="Attribute: {{"
                  addonAfter="}}"
                />

                <Input
                  addonBefore="Display Name:"
                  placeholder="Display name"
                  style={{ width: '100%' }}
                  value={textAttr.name || ''}
                  onChange={(e) => {
                    const newTexts = [...templateTexts]
                    newTexts[index].name = e.target.value
                    setTemplateTexts(newTexts)
                  }}
                />

                <Input
                  addonBefore="Preview Text:"
                  placeholder="e.g., January 15, 2024"
                  style={{ width: '100%' }}
                  value={textAttr.previewText || ''}
                  onChange={(e) => {
                    const newTexts = [...templateTexts]
                    newTexts[index].previewText = e.target.value
                    setTemplateTexts(newTexts)
                  }}
                />

                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const newTexts = templateTexts.filter((_, i) => i !== index)
                    setTemplateTexts(newTexts)
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <Button
                type="dashed"
                onClick={() => {
                  setTemplateTexts([
                    ...templateTexts,
                    { 
                      attributeName: '', 
                      name: '', 
                      previewText: '', 
                      sourceType: 'form_field',
                      bindings: [],
                    },
                  ])
                }}
                icon={<PlusOutlined />}
                block
              >
                Add Text Attribute
              </Button>
            </div>
          </Form.Item>
        </div>
      </Form>
    </div>
  )
}
