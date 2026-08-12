import { Upload, Form } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { uploadFile } from '@/features/business-owner/services/businessRegistrationService'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'
import { detectFileType } from '@/features/business-owner/utils/formUtils'
import DocumentPreviewModal from '@/shared/components/document/DocumentPreviewModal'
import { useFileUpload } from '../../useFileUpload'
import { useFieldContext } from '../FieldContext'

export default function DocumentUpload({
  field,
  fieldName,
  form,
  applicationId,
  canUpload,
  onDocumentCid,
  onSaveDraft,
  effectiveReadOnly,
  rules,
  dependencies,
  previewModal,
  setPreviewModal,
}) {
  const { message } = useFieldContext()
  const { uploading, setUploading, localFileList, setLocalFileList } = useFileUpload(
    form.getFieldValue(fieldName),
    fieldName,
  )

  const documentKey = field.documentKey || fieldName

  const handleBeforeUpload = canUpload
    ? async (file) => {
        setUploading(true)
        try {
          message.loading({ content: `Uploading ${file.name}...`, key: `upload-${fieldName}`, duration: 0 })
          const res = await uploadFile(applicationId, file, documentKey)
          const cid = res?.cid || res?.ipfsCid
          if (cid && onDocumentCid) {
            onDocumentCid(documentKey, cid)
          }
          const uploadedFile = {
            uid: file.uid,
            name: file.name,
            status: 'done',
            cid,
            url: resolveIpfsUrl(cid) || cid,
          }
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
      }
    : () => false

  const handleChange = ({ fileList: newFileList }) => {
    setLocalFileList(newFileList)
    if (newFileList.length === 0) {
      form.setFieldValue(fieldName, [])
      if (onDocumentCid) {
        onDocumentCid(documentKey, null)
      }
    }
  }

  const handleRemove = () => {
    form.setFieldValue(fieldName, [])
    setLocalFileList([])
    if (onDocumentCid) {
      onDocumentCid(documentKey, null)
    }
    form.validateFields([fieldName]).catch(() => {})
    if (typeof onSaveDraft === 'function') {
      setTimeout(() => onSaveDraft(), 100)
    }
    return false
  }

  const handlePreview = () => {
    const previewFile = localFileList[0]
    const fileType = detectFileType(previewFile.url, previewFile.name, field.validation?.acceptedFileTypes)
    setPreviewModal({
      open: true,
      url: previewFile.url,
      label: previewFile.name,
      type: fileType,
      isBlob: typeof previewFile.url === 'string' && previewFile.url.startsWith('blob:'),
    })
  }

  const accept = field.validation?.acceptedFileTypes
    ?.split(',')
    .map((t) => `.${t.trim()}`)
    .join(',')

  return (
    <>
      <Form.Item
        name={fieldName}
        rules={rules}
        dependencies={dependencies}
        style={{ display: 'none' }}
      />
      <Upload
        listType="picture-card"
        beforeUpload={handleBeforeUpload}
        maxCount={1}
        fileList={localFileList}
        onChange={handleChange}
        onRemove={handleRemove}
        onPreview={handlePreview}
        accept={accept}
        disabled={!canUpload || uploading || (localFileList.length > 0 && effectiveReadOnly)}
      >
        {localFileList.length === 0 && (
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>Upload</div>
          </div>
        )}
      </Upload>
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
