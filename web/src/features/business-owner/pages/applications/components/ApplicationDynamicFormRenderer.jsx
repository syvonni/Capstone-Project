import React, { useState } from 'react'
import dayjs from 'dayjs'
import { Form } from '@/shared/components/AppForm'
import { filterSectionsByFormValues } from '../../../utils/formUtils.js'
import {
  Input,
  Select,
  DatePicker,
  InputNumber,
  Upload,
  Checkbox,
  Radio,
  Typography,
  Button,
  Row,
  Col,
  Card,
  Divider,
  theme,
  App,
  Grid,
} from 'antd'

const { RangePicker } = DatePicker
import {
  UploadOutlined,
} from '@ant-design/icons'
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields'
import AlaminosAddressFields from '@/shared/components/AlaminosAddressFields'
import LobSection from '@/shared/components/formPreview/LobSection'
import { uploadFile } from '@/features/business-owner/services/businessRegistrationService'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'
import {
  getFileIcon,
  formatFileSize,
  getFileUrlFromFormValue,
  getPersistedDocumentUrl,
  buildValidationRules,
  detectFileType,
} from '../../../utils/formUtils.js'
import { DownloadOutlined } from '@ant-design/icons'
import RepeatableGroupField from './ApplicationRepeatableGroupField.jsx'
import DocumentPreviewModal from '@/shared/components/DocumentPreviewModal'
import DocumentViewer from '@/shared/components/DocumentViewer'
import { useFileUpload } from '../hooks/useFileUpload'

const { Text, Title } = Typography


function DynamicField({ field, form, token, readOnly, businessId, onDocumentCid, onSaveDraft, formDataKey, documents = {}, revisionFieldKeys, fieldReviewDecisions }) {
  const { message } = App.useApp()
  const fieldName = field.key
  const rules = buildValidationRules(field)
  const [previewModal, setPreviewModal] = useState({ open: false, url: null, label: '', type: 'other', isBlob: false })

  const formValue = form.getFieldValue(fieldName)
  const { uploading, setUploading, localFileList, setLocalFileList } = useFileUpload(formValue, fieldName)

  // In revision mode, a field is editable only if it's NOT in the locked set
  // revisionFieldKeys contains the LOCKED fields (not the editable ones)
  // Note: revisionFieldKeys includes section prefix (e.g., "0.activityName"), but fieldName does not
  const isFieldLocked = revisionFieldKeys && 
    Array.from(revisionFieldKeys).some(key => key.endsWith(`.${fieldName}`) || key === fieldName)
  
  // For address fields, check if any sub-field is in locked keys
  const isAddressField = field.type === 'address' || field.type === 'address_alaminos'
  const hasAddressSubFieldLocked = isAddressField && revisionFieldKeys && 
    Array.from(revisionFieldKeys).some(key => key.startsWith(fieldName) || key.endsWith(`.${fieldName}`))
  
  // Address fields are locked if any sub-field is in locked keys
  const effectiveReadOnly = readOnly || (revisionFieldKeys && (isFieldLocked || hasAddressSubFieldLocked))

  // Check if this field has a request_changes status in fieldReviewDecisions
  // Note: fieldReviewDecisions keys include section prefix (e.g., "1.ctc"), but fieldName does not
  const matchingKey = fieldReviewDecisions && 
    Object.keys(fieldReviewDecisions).find(key => 
      (key.endsWith(`.${fieldName}`) || key === fieldName) && 
      fieldReviewDecisions[key].status === 'request_changes'
    )
  
  const hasRequestChange = !!matchingKey
  const changeReason = matchingKey ? (fieldReviewDecisions[matchingKey]?.requestOther || fieldReviewDecisions[matchingKey]?.requestCode) : null
  
  // For address fields, check if any sub-field has request_changes
  const addressMatchingKey = isAddressField && fieldReviewDecisions && 
    Object.keys(fieldReviewDecisions).find(key => 
      (key.startsWith(fieldName) || key.endsWith(`.${fieldName}`)) && 
      fieldReviewDecisions[key].status === 'request_changes'
    )
  
  const hasAddressRequestChange = !!addressMatchingKey
  const addressChangeReason = addressMatchingKey ? (fieldReviewDecisions[addressMatchingKey]?.requestOther || fieldReviewDecisions[addressMatchingKey]?.requestCode) : null

  const label = (
    <span>
      {(hasRequestChange || hasAddressRequestChange) && (changeReason || addressChangeReason) && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', fontWeight: 'normal', marginBottom: 4, color: token.colorVolcano }}>
          Requested Change: {isAddressField ? addressChangeReason : changeReason}
        </Text>
      )}
      {field.label || '(Untitled field)'}
      {field.required && <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>}
      {field.helpText && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', fontWeight: 'normal', marginTop: 2 }}>
          {field.helpText}
        </Text>
      )}
    </span>
  )

  switch (field.type) {
    case 'text':
      return (
        <Form.Item
          name={fieldName}
          label={label}
          rules={effectiveReadOnly ? [] : rules}
          style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}
        >
          <Input placeholder={field.placeholder || ''} disabled={effectiveReadOnly} readOnly={effectiveReadOnly} />
        </Form.Item>
      )

    case 'textarea':
      return (
        <Form.Item
          name={fieldName}
          label={label}
          rules={effectiveReadOnly ? [] : rules}
          style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}
        >
          <Input.TextArea placeholder={field.placeholder || ''} disabled={effectiveReadOnly} readOnly={effectiveReadOnly} />
        </Form.Item>
      )

    case 'number':
      return (
        <Form.Item
          name={fieldName}
          label={label}
          rules={effectiveReadOnly ? [] : rules}
          style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}
        >
          <InputNumber
            placeholder={field.placeholder || ''}
            style={{ width: '100%' }}
            min={field.validation?.minValue}
            max={field.validation?.maxValue}
            disabled={effectiveReadOnly}
            readOnly={effectiveReadOnly}
          />
        </Form.Item>
      )

    case 'date':
      return (
        <Form.Item
          name={fieldName}
          label={label}
          rules={effectiveReadOnly ? [] : [
            ...rules,
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve()
                if (dayjs.isDayjs(value)) {
                  return Promise.resolve()
                }
                if (typeof value === 'string' || value instanceof Date) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('Invalid date format'))
              }
            }
          ]}
          getValueFromEvent={(value) => {
            // Ensure we always return a dayjs object or null
            if (!value) return null
            return dayjs.isDayjs(value) ? value : dayjs(value)
          }}
          normalize={(value) => {
            // Normalize value to dayjs
            if (!value) return null
            if (dayjs.isDayjs(value)) return value
            if (typeof value === 'string') {
              const parsed = dayjs(value)
              return parsed.isValid() ? parsed : null
            }
            if (value instanceof Date) {
              return dayjs(value)
            }
            return null
          }}
          getValueProps={(value) => {
            // Ensure DatePicker receives valid dayjs object or null
            if (!value) return null
            if (dayjs.isDayjs(value)) return { value }
            if (typeof value === 'string') {
              const parsed = dayjs(value)
              return parsed.isValid() ? { value: parsed } : null
            }
            if (value instanceof Date) {
              return { value: dayjs(value) }
            }
            return null
          }}
          style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}
        >
          <DatePicker
            style={{ width: '100%' }}
            disabled={effectiveReadOnly}
            format="YYYY-MM-DD"
          />
        </Form.Item>
      )

    case 'date_range': {
      const startFieldName = `${fieldName}_start`
      const endFieldName = `${fieldName}_end`
      
      return (
        <div style={hasRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}>
          <Form.Item label={label} style={{ marginBottom: '8px' }} />
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                name={startFieldName}
                rules={effectiveReadOnly ? [] : [
                  ...(field.required ? [{ required: true, message: 'Please select start date' }] : []),
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve()
                      if (dayjs.isDayjs(value)) return Promise.resolve()
                      if (typeof value === 'string' || value instanceof Date) return Promise.resolve()
                      return Promise.reject(new Error('Invalid date format'))
                    }
                  }
                ]}
                style={{ marginBottom: 0 }}
              >
                <DatePicker
                  placeholder="Start date"
                  style={{ width: '100%' }}
                  disabled={effectiveReadOnly}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={endFieldName}
                dependencies={[startFieldName]}
                rules={effectiveReadOnly ? [] : [
                  ...(field.required ? [{ required: true, message: 'Please select end date' }] : []),
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve()
                      if (dayjs.isDayjs(value)) return Promise.resolve()
                      if (typeof value === 'string' || value instanceof Date) return Promise.resolve()
                      return Promise.reject(new Error('Invalid date format'))
                    }
                  },
                  {
                    validator: (_, value) => {
                      const startDate = form.getFieldValue(startFieldName)
                      if (!startDate || !value) return Promise.resolve()
                      if (dayjs(value).isBefore(dayjs(startDate), 'day')) {
                        return Promise.reject(new Error('End date must be after or equal to start date'))
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
                style={{ marginBottom: 0 }}
              >
                <DatePicker
                  placeholder="End date"
                  style={{ width: '100%' }}
                  disabled={effectiveReadOnly}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      )
    }

    case 'select':
      return (
        <Form.Item
          name={fieldName}
          label={label}
          rules={effectiveReadOnly ? [] : rules}
          style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}
        >
          <Select
            addonBefore="Select"
            placeholder={field.placeholder || 'Select...'}
            style={{ width: '100%' }}
            options={(field.dropdownOptions || []).map((o) => {
              const isObject = typeof o === 'object'
              return {
                value: isObject ? o.id : o,
                label: isObject ? o.label : o
              }
            })}
            showSearch={!effectiveReadOnly}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            disabled={effectiveReadOnly}
          />
        </Form.Item>
      )

    case 'multiselect':
      return (
        <Form.Item
          name={fieldName}
          label={label}
          rules={effectiveReadOnly ? [] : rules}
          style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}
        >
          <Select
            mode="multiple"
            addonBefore="Select"
            placeholder={field.placeholder || 'Select one or more...'}
            style={{ width: '100%' }}
            options={(field.dropdownOptions || []).map((o) => {
              const isObject = typeof o === 'object'
              return {
                value: isObject ? o.id : o,
                label: isObject ? o.label : o
              }
            })}
            showSearch={!effectiveReadOnly}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            disabled={effectiveReadOnly}
          />
        </Form.Item>
      )

    case 'file': {
      const canUpload = Boolean(businessId && onDocumentCid && !effectiveReadOnly)
      const fieldValue = form.getFieldValue(fieldName)
      const metadataFieldName = `${fieldName}_metadata`

      const allFormValues = form.getFieldsValue(true) || {}

      // Get the SINGLE best URL for this field - prioritize form value, then documents prop
      let documentUrl = null

      // Check if user explicitly cleared this field (empty array means removed)
      const wasExplicitlyCleared = Array.isArray(fieldValue) && fieldValue.length === 0

      // Try form value first (could be CID string or file array)
      if (typeof fieldValue === 'string' && fieldValue.trim()) {
        documentUrl = resolveIpfsUrl(fieldValue.trim()) || fieldValue.trim()
      } else if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        const first = fieldValue[0]
        // Prioritize cid over url to avoid double-resolving
        const cid = first?.cid || first?.ipfsCid || first?.response?.cid || first?.url
        if (cid) {
          documentUrl = resolveIpfsUrl(cid) || cid
        }
        // Also handle local file blobs
        if (!documentUrl && first?.originFileObj instanceof File) {
          documentUrl = URL.createObjectURL(first.originFileObj)
        }
      }

      // Fallback to documents prop - but NOT if user explicitly cleared the field
      if (!documentUrl && !wasExplicitlyCleared) {
        const persistedUrl = getFileUrlFromFormValue(fieldValue) || getPersistedDocumentUrl(documents, field, allFormValues)
        if (persistedUrl) {
          documentUrl = resolveIpfsUrl(persistedUrl) || persistedUrl
        }
      }

      // Build single previewable file entry (no duplicates)
      const previewableFiles = []
      if (documentUrl) {
        previewableFiles.push({
          key: field.documentKey || fieldName,
          name: field.label || fieldName,
          url: documentUrl,
          type: detectFileType(documentUrl, field.label || fieldName, field.validation?.acceptedFileTypes),
          isBlob: typeof documentUrl === 'string' && documentUrl.startsWith('blob:'),
        })
      }

      return (
       <>
          {effectiveReadOnly ? (
            <>
              <div style={hasRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}>
                <Form.Item label={label}>
                  {previewableFiles.length > 0 ? (
                    <div style={{ position: 'relative' }}>
                      <DocumentViewer
                        url={previewableFiles[0].url}
                        label={previewableFiles[0].name}
                        onViewDocument={({ url, label, type, isBlob }) => setPreviewModal({ open: true, url, label, type, isBlob })}
                        isBlob={previewableFiles[0].isBlob}
                        acceptedFileTypes={field.validation?.acceptedFileTypes}
                      />
                    </div>
                  ) : (
                    <Text type="secondary">Not uploaded</Text>
                  )}
                </Form.Item>
              </div>
              <DocumentPreviewModal
                open={previewModal.open}
                onClose={() => setPreviewModal({ open: false, url: null, label: '', type: 'other', isBlob: false })}
                url={previewModal.url}
                label={previewModal.label}
                type={previewModal.type}
                isBlob={previewModal.isBlob}
              />
            </>
          ) : (
            <>
              <div style={hasRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : field.metadataFields && field.metadataFields.length > 0 ? { border: `1px solid ${token.colorBorder}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}>
                <Form.Item label={label} rules={rules} style={{ marginBottom: field.metadataFields && field.metadataFields.length > 0 ? 12 : 0 }}>
                  <Upload
                    listType="picture-card"
                    beforeUpload={canUpload ? async (file) => {
                      setUploading(true)
                      try {
                        message.loading({ content: `Uploading ${file.name}...`, key: `upload-${fieldName}`, duration: 0 })
                        const res = await uploadFile(businessId, file, field.documentKey || fieldName)
                        const cid = res?.cid || res?.ipfsCid
                        if (cid && onDocumentCid) {
                          onDocumentCid(field.documentKey || fieldName, cid)
                        }
                        const uploadedFile = { uid: file.uid, name: file.name, status: 'done', cid, url: resolveIpfsUrl(cid) || cid }
                        form.setFieldValue(fieldName, [uploadedFile])
                        setLocalFileList([uploadedFile])
                        message.success({ content: `${file.name} uploaded`, key: `upload-${fieldName}` })
                        // Auto-save draft after successful upload so document persists on refresh
                        if (typeof onSaveDraft === 'function') {
                          setTimeout(() => onSaveDraft(), 100)
                        }
                      } catch (err) {
                        message.error({ content: err?.message || 'Upload failed', key: `upload-${fieldName}` })
                        form.setFieldValue(fieldName, [])
                        setLocalFileList([])
                      } finally {
                        setUploading(false)
                      }
                      return false
                    } : () => false}
                    maxCount={1}
                    fileList={localFileList}
                    onChange={({ fileList: newFileList }) => {
                      setLocalFileList(newFileList)
                      if (newFileList.length === 0) {
                        form.setFieldValue(fieldName, [])
                        if (onDocumentCid) {
                          onDocumentCid(field.documentKey || fieldName, null)
                        }
                      }
                    }}
                    onRemove={(_file) => {
                      form.setFieldValue(fieldName, [])
                      setLocalFileList([])
                      if (onDocumentCid) {
                        onDocumentCid(field.documentKey || fieldName, null)
                      }
                      // Force form validation update to trigger section completion recalculation
                      form.validateFields([fieldName]).catch(() => {})
                      // Auto-save draft after file removal so deletion persists on refresh
                      if (typeof onSaveDraft === 'function') {
                        setTimeout(() => onSaveDraft(), 100)
                      }
                      return false
                    }}
                    onPreview={(_file) => {
                      const previewFile = localFileList[0]
                      const fileType = detectFileType(previewFile.url, previewFile.name, field.validation?.acceptedFileTypes)
                      setPreviewModal({
                        open: true,
                        url: previewFile.url,
                        label: previewFile.name,
                        type: fileType,
                        isBlob: typeof previewFile.url === 'string' && previewFile.url.startsWith('blob:')
                      })
                    }}
                    accept={field.validation?.acceptedFileTypes?.split(',').map(t => `.${t.trim()}`).join(',')}
                    disabled={!canUpload || uploading || (localFileList.length > 0 && effectiveReadOnly)}
                  >
                    {localFileList.length === 0 && (
                      <div>
                        <UploadOutlined />
                        <div style={{ marginTop: 8 }}>Upload</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
                {/* Render metadata fields if defined */}
                {field.metadataFields && field.metadataFields.length > 0 && (
                  <div>
                    {field.metadataFields.map((metaField, metaIdx) => {
                      if (metaField.type === 'address') {
                        return (
                          <div key={metaIdx} style={{ marginBottom: 8 }}>
                            <Text style={{ display: 'block', marginBottom: 4 }}>
                              {metaField.label} {metaField.required && <span style={{ color: token.colorError }}>*</span>}
                            </Text>
                            <PhilippineAddressFields
                              form={form}
                              namePrefix={[metadataFieldName, metaField.key]}
                              required={metaField.required}
                              disabled={effectiveReadOnly}
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
                              namePrefix={[metadataFieldName, metaField.key]}
                              required={metaField.required}
                              disabled={effectiveReadOnly}
                            />
                          </div>
                        )
                      }
                      return (
                        <Form.Item
                          key={metaIdx}
                          name={[metadataFieldName, metaField.key]}
                          label={metaField.label}
                          rules={effectiveReadOnly ? [] : [
                            ...(metaField.required ? [{ required: true, message: `Please enter ${metaField.label.toLowerCase()}` }] : []),
                            ...(metaField.type === 'text' && metaField.validation ? [metaField.validation] : [])
                          ]}
                          style={{ marginBottom: 8 }}
                        >
                          {metaField.type === 'date' ? (
                            <DatePicker style={{ width: '100%' }} disabled={effectiveReadOnly} />
                          ) : (
                            <Input placeholder={metaField.placeholder || ''} disabled={effectiveReadOnly} />
                          )}
                        </Form.Item>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <DocumentPreviewModal
            open={previewModal.open}
            onClose={() => setPreviewModal({ open: false, url: null, label: '', type: 'other', isBlob: false })}
            url={previewModal.url}
            label={previewModal.label}
            type={previewModal.type}
            isBlob={previewModal.isBlob}
          />
        </>
      )
    }

    case 'category_upload': {
      const canUpload = Boolean(businessId && onDocumentCid && !effectiveReadOnly)
      const categoryFieldName = `${fieldName}_category`
      const metadataFieldName = `${fieldName}_metadata`

      return (
        <div style={hasRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : field.metadataFields && field.metadataFields.length > 0 ? { border: `1px solid ${token.colorBorder}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}>
          <Form.Item label={label} style={{ marginBottom: field.metadataFields && field.metadataFields.length > 0 ? 12 : 12 }}>
            <Form.Item
              name={categoryFieldName}
              rules={effectiveReadOnly ? [] : [{ required: field.required, message: 'Please select category' }]}
              style={{ marginBottom: '8px' }}
            >
              {({ getFieldValue }) => {
                const categoryValue = getFieldValue(categoryFieldName)
                const fileValue = getFieldValue(fieldName)
                const hasFile = fileValue && fileValue.length > 0
                return (
                  <div>
                    <Radio.Group disabled={effectiveReadOnly} style={{ width: '100%' }}>
                      <Row gutter={[8, 8]}>
                        {(field.dropdownOptions || []).map((option, idx) => {
                          const isObject = typeof option === 'object'
                          const id = isObject ? option.id : option
                          const label = isObject ? option.label : option
                          const definition = isObject ? option.definition : ''
                          const whereToGet = isObject ? option.whereToGet : ''
                          const optionMetadataFields = isObject && option.metadataFields ? option.metadataFields : field.metadataFields
                          const isSelected = categoryValue === id
                          // Hide unselected options when one is selected
                          if (categoryValue && !isSelected) return null
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
                                  <Text strong style={{ display: 'block', marginBottom: 4 }}>{label}</Text>
                                  {definition && !hasFile && (
                                    <Text type="secondary" style={{ display: 'block' }}>{definition} {isSelected && whereToGet && `- ${whereToGet}`}</Text>
                                  )}
                                  {isSelected && (
                                    <div style={{ marginTop: 12 }}>
                                      <Form.Item
                                        name={fieldName}
                                        dependencies={[categoryFieldName]}
                                        rules={effectiveReadOnly ? [] : rules}
                                        style={{ marginBottom: 0 }}
                                      >
                                        <Upload
                                          listType="picture-card"
                                          beforeUpload={canUpload ? async (file) => {
                                            setUploading(true)
                                            try {
                                              message.loading({ content: `Uploading ${file.name}...`, key: `upload-${fieldName}`, duration: 0 })
                                              const res = await uploadFile(businessId, file, field.documentKey || fieldName)
                                              const cid = res?.cid || res?.ipfsCid
                                              if (cid && onDocumentCid) {
                                                onDocumentCid(field.documentKey || fieldName, cid)
                                              }
                                              const uploadedFile = { uid: file.uid, name: file.name, status: 'done', cid, url: resolveIpfsUrl(cid) || cid }
                                              form.setFieldValue(fieldName, [uploadedFile])
                                              setLocalFileList([uploadedFile])
                                              message.success({ content: `${file.name} uploaded`, key: `upload-${fieldName}` })
                                              if (typeof onSaveDraft === 'function') {
                                                setTimeout(() => onSaveDraft(), 100)
                                              }
                                            } catch (err) {
                                              message.error({ content: err?.message || 'Upload failed', key: `upload-${fieldName}` })
                                              form.setFieldValue(fieldName, [])
                                              setLocalFileList([])
                                            } finally {
                                              setUploading(false)
                                            }
                                            return false
                                          } : () => false}
                                          maxCount={1}
                                          fileList={localFileList}
                                          onChange={({ fileList: newFileList }) => {
                                            setLocalFileList(newFileList)
                                            if (newFileList.length === 0) {
                                              form.setFieldValue(fieldName, [])
                                              if (onDocumentCid) {
                                                onDocumentCid(field.documentKey || fieldName, null)
                                              }
                                            }
                                          }}
                                          onRemove={(_file) => {
                                            form.setFieldValue(fieldName, [])
                                            setLocalFileList([])
                                            if (onDocumentCid) {
                                              onDocumentCid(field.documentKey || fieldName, null)
                                            }
                                            form.validateFields([fieldName]).catch(() => {})
                                            if (typeof onSaveDraft === 'function') {
                                              setTimeout(() => onSaveDraft(), 100)
                                            }
                                            return false
                                          }}
                                          onPreview={(_file) => {
                                            const previewFile = localFileList[0]
                                            const fileType = detectFileType(previewFile.url, previewFile.name, field.validation?.acceptedFileTypes)
                                            setPreviewModal({
                                              open: true,
                                              url: previewFile.url,
                                              label: previewFile.name,
                                              type: fileType,
                                              isBlob: typeof previewFile.url === 'string' && previewFile.url.startsWith('blob:')
                                            })
                                          }}
                                          accept={field.validation?.acceptedFileTypes?.split(',').map(t => `.${t.trim()}`).join(',')}
                                          disabled={!canUpload || uploading || (localFileList.length > 0 && effectiveReadOnly)}
                                        >
                                          {localFileList.length === 0 && (
                                            <div>
                                              <UploadOutlined />
                                              <div style={{ marginTop: 8 }}>Upload</div>
                                            </div>
                                          )}
                                        </Upload>
                                      </Form.Item>
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
                                                    namePrefix={[metadataFieldName, metaField.key]}
                                                    required={metaField.required}
                                                    disabled={effectiveReadOnly}
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
                                                    namePrefix={[metadataFieldName, metaField.key]}
                                                    required={metaField.required}
                                                    disabled={effectiveReadOnly}
                                                  />
                                                </div>
                                              )
                                            }
                                            return (
                                              <Form.Item
                                                key={metaIdx}
                                                name={[metadataFieldName, metaField.key]}
                                                label={metaField.label}
                                                rules={effectiveReadOnly ? [] : [
                                                  ...(metaField.required ? [{ required: true, message: `Please enter ${metaField.label.toLowerCase()}` }] : []),
                                                  ...(metaField.type === 'text' && metaField.validation ? [metaField.validation] : [])
                                                ]}
                                                style={{ marginBottom: 8 }}
                                              >
                                                {metaField.type === 'date' ? (
                                                  <DatePicker style={{ width: '100%' }} disabled={effectiveReadOnly} />
                                                ) : (
                                                  <Input placeholder={metaField.placeholder || ''} disabled={effectiveReadOnly} />
                                                )}
                                              </Form.Item>
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
                    {categoryValue && !effectiveReadOnly && (
                      <Button
                        onClick={() => {
                          form.setFieldValue(categoryFieldName, null)
                          form.setFieldValue(fieldName, [])
                          setLocalFileList([])
                          if (onDocumentCid) {
                            onDocumentCid(field.documentKey || fieldName, null)
                          }
                        }}
                        style={{ marginTop: 8, padding: 0 }}
                      >
                        Change selection
                      </Button>
                    )}
                  </div>
                )
              }}
            </Form.Item>
          </Form.Item>
          <DocumentPreviewModal
            open={previewModal.open}
            onClose={() => setPreviewModal({ open: false, url: null, label: '', type: 'other', isBlob: false })}
            url={previewModal.url}
            label={previewModal.label}
            type={previewModal.type}
            isBlob={previewModal.isBlob}
          />
        </div>
      )
    }

    case 'download':
      return (
        <Form.Item label={label} style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: token.colorFillQuaternary,
              borderRadius: token.borderRadius,
              border: `1px dashed ${token.colorBorder}`,
            }}
          >
            <span style={{ fontSize: 24, color: token.colorPrimary }}>
              {React.createElement(getFileIcon(field.downloadFileType))}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, display: 'block' }}>{field.downloadFileName || 'Template file'}</Text>
              {field.downloadFileSize > 0 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {field.downloadFileType?.toUpperCase()} · {formatFileSize(field.downloadFileSize)}
                </Text>
              )}
            </div>
            {field.downloadFileUrl && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                href={field.downloadFileUrl}
                target="_blank"
              >
                Download
              </Button>
            )}
          </div>
        </Form.Item>
      )

    case 'checkbox':
      return (
        <Form.Item name={fieldName} valuePropName="checked" rules={effectiveReadOnly ? [] : rules} style={{ marginBottom: '16px' }}>
          <Checkbox disabled={effectiveReadOnly}>{field.placeholder || field.label}</Checkbox>
        </Form.Item>
      )

    case 'address':
      return (
        <div style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}>
          <Form.Item label={label}>
            <Row gutter={[16, 0]}>
              <PhilippineAddressFields
                form={form}
                namePrefix={field.key || field.label}
                disabled={effectiveReadOnly}
              />
            </Row>
          </Form.Item>
        </div>
      )

    case 'address_alaminos':
      return (
        <div style={hasRequestChange || hasAddressRequestChange ? { border: `1px dashed ${token.colorVolcano}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' } : { marginBottom: '16px' }}>
          <Form.Item label={label}>
            <Row gutter={[16, 0]}>
              <AlaminosAddressFields
                form={form}
                namePrefix={field.key || field.label}
                required={field.required}
                disabled={effectiveReadOnly}
              />
            </Row>
          </Form.Item>
        </div>
      )

    case 'repeatable_group':
      return (
        <Form.Item label={label} style={{ marginBottom: '16px' }}>
          <RepeatableGroupField field={field} form={form} token={token} readOnly={effectiveReadOnly} />
        </Form.Item>
      )

    case 'ai_lob_recommendation':
      return (
        <Form.Item label={label} style={{ marginBottom: '16px' }}>
          <LobSection isEditMode={effectiveReadOnly} />
        </Form.Item>
      )

    default:
      return (
        <Form.Item name={fieldName} label={label} rules={effectiveReadOnly ? [] : rules} style={{ marginBottom: '16px' }}>
          <Input
            placeholder={field.placeholder || `Unsupported field type: ${field.type || 'unknown'}`}
            disabled={effectiveReadOnly}
            readOnly={effectiveReadOnly}
          />
        </Form.Item>
      )
  }
}

function renderSectionContent(section, sIdx, form, token, isMobile, readOnly, businessId, onDocumentCid, onSaveDraft, formDataKey, documents, revisionFieldKeys, fieldReviewDecisions, renderedFieldKeys) {
  // Deduplicate items by key to prevent duplicate rendering
  const seenKeys = new Set()
  const uniqueItems = (section.items || []).filter((item) => {
    const fieldKey = item.key || item.label
    if (!fieldKey) return true
    // Skip if already rendered in this render cycle
    if (renderedFieldKeys && renderedFieldKeys.has(fieldKey)) return false
    if (seenKeys.has(fieldKey)) return false
    seenKeys.add(fieldKey)
    if (renderedFieldKeys) renderedFieldKeys.add(fieldKey)
    return true
  })

  return (
    <React.Fragment key={sIdx}>
      {section.source && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Source: {section.source}
        </Text>
      )}
      {section.notes && (
        <Text style={{  display: 'block', marginBottom: 12 }}>
          {section.notes}
        </Text>
      )}
      
      <Divider style={{ margin: '0 0 16px 0' }} />
      <Row gutter={[16, 0]}>
        {uniqueItems.map((item, fIdx) => {
          const colSpan = isMobile ? 24 : Math.min(Math.max(Number(item.span || 24), 1), 24)
          const fieldKey = item.key || item.label || `field-${fIdx}`

          if (item.type === 'address' || item.type === 'address_alaminos') {
            return (
              <Col key={`${sIdx}-${fieldKey}`} span={24}>
                <DynamicField field={item} form={form} token={token} readOnly={readOnly} businessId={businessId} onDocumentCid={onDocumentCid} onSaveDraft={onSaveDraft} formDataKey={formDataKey} documents={documents} revisionFieldKeys={revisionFieldKeys} fieldReviewDecisions={fieldReviewDecisions} />
              </Col>
            )
          }
          return (
            <Col key={`${sIdx}-${fieldKey}`} xs={24} sm={24} md={colSpan}>
              <DynamicField field={item} form={form} token={token} readOnly={readOnly} businessId={businessId} onDocumentCid={onDocumentCid} onSaveDraft={onSaveDraft} formDataKey={formDataKey} documents={documents} revisionFieldKeys={revisionFieldKeys} fieldReviewDecisions={fieldReviewDecisions} />
            </Col>
          )
        })}
      </Row>
    </React.Fragment>
  )
}

export default function DynamicFormRenderer({
  definition,
  form,
  formValues = {},
  isMobile = false,
  activeSectionIndex,
  readOnly = false,
  businessId = null,
  onDocumentCid = null,
  onSaveDraft = null,
  formDataKey = null,
  documents = {},
  revisionFieldKeys,
  fieldReviewDecisions,
  containerVariant = undefined,
  customPadding = undefined,
}) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()

  if (!definition) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">No form definition loaded.</Text>
      </div>
    )
  }

  const sections = definition.sections || []
  const visibleSections = filterSectionsByFormValues(sections, formValues)

  if (!visibleSections.length) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">
          {formValues && sections?.length > 0
            ? 'No sections match the current form values.'
            : 'No form content available.'}
        </Text>
      </div>
    )
  }

  // Step mode: render all sections so all Form.Items stay mounted (for full validation on submit),
  // but only display the active section
  if (typeof activeSectionIndex === 'number' && activeSectionIndex >= 0) {
    const idx = Math.min(activeSectionIndex, visibleSections.length - 1)
    const section = visibleSections[idx]
    const renderedFieldKeys = new Set()
    return (
      <div>
        {section.description ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 500, color: token.colorTextSecondary }}>
              Section description
            </div>
            <div style={{ fontSize: 12, marginBottom: 16, color: token.colorText }}>
              {section.description}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, marginBottom: 4, color: token.colorTextSecondary }}>
            Section description
          </div>
        )}
        {visibleSections.map((sec, sIdx) => (
          <div
            key={sIdx}
            data-section-index={sIdx}
            style={{ display: sIdx === idx ? 'block' : 'none' }}
            aria-hidden={sIdx !== idx}
          >
            {renderSectionContent(sec, sIdx, form, token, isMobile, readOnly, businessId, onDocumentCid, onSaveDraft, formDataKey, documents, revisionFieldKeys, fieldReviewDecisions, renderedFieldKeys)}
          </div>
        ))}
      </div>
    )
  }

  // Default: all sections as cards
  const renderedFieldKeys = new Set()
  return (
    <div>
      {visibleSections.map((section, sIdx) => (
        <Card
          key={sIdx}
          size={containerVariant}
          style={{ marginBottom: 16 }}
          styles={customPadding ? {
            body: { padding: screens.md ? '16px' : '24px' }
          } : undefined}
        >
          {section.description ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: token.colorTextSecondary }}>
                Section description
              </div>
              <div style={{  marginBottom: 16, }}>
                {section.description}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 16, color: token.colorTextSecondary }}>
              Section description
            </div>
          )}
          {renderSectionContent(section, sIdx, form, token, isMobile, readOnly, businessId, onDocumentCid, onSaveDraft, formDataKey, documents, revisionFieldKeys, fieldReviewDecisions, renderedFieldKeys)}
        </Card>
      ))}
    </div>
  )
}
