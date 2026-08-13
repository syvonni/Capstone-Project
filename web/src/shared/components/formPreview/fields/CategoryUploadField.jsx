import { useEffect, useRef } from 'react'
import { Form } from 'antd'
import { Radio, Row, Col, Button, Typography } from 'antd'
import DocumentUpload from './shared/DocumentUpload'
import MetadataFields from './shared/MetadataFields'
import DocumentViewer from '@/shared/components/document/DocumentViewer'
import DocumentPreviewModal from '@/shared/components/document/DocumentPreviewModal'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'
import {
  getFileUrlFromFormValue,
  getPersistedDocumentUrl,
  detectFileType,
} from '@/features/business-owner/utils/formUtils'
import { useFieldContext } from './FieldContext'

const { Text } = Typography

export default function CategoryUploadField() {
  const {
    field,
    fieldName,
    form,
    applicationId,
    onDocumentCid,
    onSaveDraft,
    documents,
    effectiveReadOnly,
    rules,
    metadataBoxStyle,
    requestChangeBorder,
    label,
    previewModal,
    setPreviewModal,
    token,
    onViewDocument,
  } = useFieldContext()

  const canUpload = Boolean(applicationId && onDocumentCid && !effectiveReadOnly)
  const categoryFieldName = `${fieldName}_category`
  const metadataFieldName = `${fieldName}_metadata`
  const documentKey = field.documentKey || fieldName

  // Watch the registered field values so the component re-renders when they change.
  const watchedCategoryValue = Form.useWatch(categoryFieldName, form)
  const watchedFileValue = Form.useWatch(fieldName, form)

  // In read-only mode the category/file Form.Items are not mounted, so useWatch
  // may not see their values. Fall back to a direct form read for display.
  const categoryValue = effectiveReadOnly
    ? form.getFieldValue(categoryFieldName)
    : watchedCategoryValue
  const fileValue = effectiveReadOnly
    ? form.getFieldValue(fieldName)
    : watchedFileValue

  // Clear the file when the category changes (not on initial mount where the ref is undefined).
  const previousCategory = useRef()
  useEffect(() => {
    if (effectiveReadOnly) {
      previousCategory.current = categoryValue
      return
    }
    if (previousCategory.current !== undefined && categoryValue !== previousCategory.current) {
      form.setFieldValue(fieldName, [])
      if (onDocumentCid) {
        onDocumentCid(documentKey, null)
      }
    }
    previousCategory.current = categoryValue
  }, [effectiveReadOnly, categoryValue, documentKey, fieldName, form, onDocumentCid])

  const getOptionId = (option) => {
    const isObject = typeof option === 'object'
    return isObject ? (option.id ?? option.label) : option
  }

  const isOptionSelected = (option) => {
    const id = getOptionId(option)
    // Use loose equality to handle number/string mismatches between form data
    // and option definitions (e.g., backend returns "1" but option id is 1).
    return categoryValue == id || String(categoryValue) === String(id)
  }

  const options = field.dropdownOptions || []
  const selectedOption = options.find((option) => isOptionSelected(option))
  const selectedId = selectedOption ? getOptionId(selectedOption) : categoryValue

  const isSelectedObject = typeof selectedOption === 'object'
  const selectedOptionLabel = isSelectedObject ? (selectedOption.label ?? selectedOption.id) : selectedOption
  const selectedDefinition = isSelectedObject ? selectedOption.definition : ''
  const selectedWhereToGet = isSelectedObject ? selectedOption.whereToGet : ''
  const selectedMetadataFields =
    (isSelectedObject && selectedOption.metadataFields) ? selectedOption.metadataFields : field.metadataFields

  // Resolve the uploaded document URL for read-only display.
  const allFormValues = form.getFieldsValue(true) || {}
  let documentUrl = null

  if (typeof fileValue === 'string' && fileValue.trim()) {
    documentUrl = resolveIpfsUrl(fileValue.trim()) || fileValue.trim()
  } else if (Array.isArray(fileValue) && fileValue.length > 0) {
    const first = fileValue[0]
    const cid = first?.cid || first?.ipfsCid || first?.response?.cid || first?.url
    if (cid) {
      documentUrl = resolveIpfsUrl(cid) || cid
    }
    if (!documentUrl && first?.originFileObj instanceof File) {
      documentUrl = URL.createObjectURL(first.originFileObj)
    }
  }

  if (!documentUrl) {
    const persistedUrl =
      getFileUrlFromFormValue(fileValue) || getPersistedDocumentUrl(documents, field, allFormValues)
    if (persistedUrl) {
      documentUrl = resolveIpfsUrl(persistedUrl) || persistedUrl
    }
  }

  const previewableFile = documentUrl
    ? {
        url: documentUrl,
        name: field.label || fieldName,
        type: detectFileType(documentUrl, field.label || fieldName, field.validation?.acceptedFileTypes),
        isBlob: typeof documentUrl === 'string' && documentUrl.startsWith('blob:'),
      }
    : null

  const handleChangeSelection = () => {
    form.setFieldValue(categoryFieldName, null)
    form.setFieldValue(fieldName, [])
    if (onDocumentCid) {
      onDocumentCid(documentKey, null)
    }
  }

  // Read-only view: show the selected option in a clean white card, avoiding
  // the greyed-out disabled Radio.Button look that tints the whole card.
  if (effectiveReadOnly) {
    return (
      <>
        <div style={{ marginBottom: 8 }}>{label}</div>
        <div style={{ ...metadataBoxStyle, ...requestChangeBorder }}>
          {selectedOption ? (
            <>
              <Text style={{ display: 'block' }}>
                {selectedOptionLabel}
              </Text>
              {selectedDefinition && (
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  {selectedDefinition} {selectedWhereToGet && `- ${selectedWhereToGet}`}
                </Text>
              )}
              <div style={{ marginTop: 12 }}>
                {previewableFile ? (
                  <DocumentViewer
                    url={previewableFile.url}
                    label={previewableFile.name}
                    onViewDocument={({ url, label: docLabel, type, isBlob }) =>
                      onViewDocument
                        ? onViewDocument({ open: true, url, label: docLabel, type, isBlob })
                        : setPreviewModal({ open: true, url, label: docLabel, type, isBlob })
                    }
                    isBlob={previewableFile.isBlob}
                    acceptedFileTypes={field.validation?.acceptedFileTypes}
                  />
                ) : (
                  <Text type="secondary">Not uploaded</Text>
                )}
              </div>
              {selectedMetadataFields && selectedMetadataFields.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <MetadataFields
                    form={form}
                    token={token}
                    metadataFieldName={metadataFieldName}
                    metadataFields={selectedMetadataFields}
                    effectiveReadOnly={effectiveReadOnly}
                  />
                </div>
              )}
            </>
          ) : (
            <Text type="secondary">Not selected</Text>
          )}
        </div>
        <DocumentPreviewModal
          open={previewModal.open}
          onClose={() =>
            setPreviewModal({ open: false, url: null, label: '', type: 'other', isBlob: false })
          }
          url={previewModal.url}
          label={previewModal.label}
          type={previewModal.type}
          isBlob={previewModal.isBlob}
        />
      </>
    )
  }

  return (
    <>
      <div style={{ marginBottom: 8 }}>{label}</div>
      <div style={metadataBoxStyle}>
        <Form.Item
          name={categoryFieldName}
          style={{ marginBottom: 0 }}
        >
          <Radio.Group
            style={{ width: '100%' }}
          >
            <Row gutter={[8, 8]}>
              {options.map((option, idx) => {
                const isObject = typeof option === 'object'
                const id = getOptionId(option)
                const optionLabel = isObject ? (option.label ?? option.id) : option
                const definition = isObject ? option.definition : ''
                const whereToGet = isObject ? option.whereToGet : ''
                const optionMetadataFields = (isObject && option.metadataFields) ? option.metadataFields : field.metadataFields
                const isSelected = isOptionSelected(option)

                // Hide unselected options when one is selected.
                // If we can’t match the saved category to a current option,
                // fall back to showing all options instead of a blank field.
                if (selectedId && !isSelected) return null

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
                        <Text style={{ display: 'block', marginBottom: 4 }}>{optionLabel}</Text>
                        {definition && !previewableFile && (
                          <Text type="secondary" style={{ display: 'block' }}>
                            {definition} {isSelected && whereToGet && `- ${whereToGet}`}
                          </Text>
                        )}
                        {isSelected && (
                          <div style={{ marginTop: 12 }}>
                            <DocumentUpload
                              field={field}
                              fieldName={fieldName}
                              form={form}
                              applicationId={applicationId}
                              canUpload={canUpload}
                              onDocumentCid={onDocumentCid}
                              onSaveDraft={onSaveDraft}
                              effectiveReadOnly={effectiveReadOnly}
                              rules={rules}
                              dependencies={[categoryFieldName]}
                              previewModal={previewModal}
                              setPreviewModal={setPreviewModal}
                            />
                            {optionMetadataFields && optionMetadataFields.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <MetadataFields
                                  form={form}
                                  token={token}
                                  metadataFieldName={metadataFieldName}
                                  metadataFields={optionMetadataFields}
                                  effectiveReadOnly={effectiveReadOnly}
                                />
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
        </Form.Item>
        {selectedId && (
          <Button onClick={handleChangeSelection} style={{ marginTop: 8, padding: 0 }} block>
            Change selection
          </Button>
        )}
      </div>
    </>
  )
}
