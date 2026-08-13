import { resolveIpfsUrl } from '@/lib/ipfsUtils';
import {
  getFileUrlFromFormValue,
  getPersistedDocumentUrl,
  detectFileType,
} from '@/features/business-owner/utils/formUtils';
import { Form } from 'antd';
import { Typography } from 'antd';
import DocumentViewer from '@/shared/components/document/DocumentViewer';
import DocumentPreviewModal from '@/shared/components/document/DocumentPreviewModal';
import DocumentUpload from './shared/DocumentUpload';
import MetadataFields from './shared/MetadataFields';
import { useFieldContext } from './FieldContext';

const { Text } = Typography;

export default function FileField() {
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
    requestChangeBorder,
    metadataBoxStyle,
    label,
    previewModal,
    setPreviewModal,
    token,
    onViewDocument,
  } = useFieldContext();

  const canUpload = Boolean(applicationId && onDocumentCid && !effectiveReadOnly);
  const metadataFieldName = `${fieldName}_metadata`;
  const fieldValue = form.getFieldValue(fieldName);
  const allFormValues = form.getFieldsValue(true) || {};

  let documentUrl = null;
  const wasExplicitlyCleared = Array.isArray(fieldValue) && fieldValue.length === 0;

  if (typeof fieldValue === 'string' && fieldValue.trim()) {
    documentUrl = resolveIpfsUrl(fieldValue.trim()) || fieldValue.trim();
  } else if (Array.isArray(fieldValue) && fieldValue.length > 0) {
    const first = fieldValue[0];
    const cid = first?.cid || first?.ipfsCid || first?.response?.cid || first?.url;
    if (cid) {
      documentUrl = resolveIpfsUrl(cid) || cid;
    }
    if (!documentUrl && first?.originFileObj instanceof File) {
      documentUrl = URL.createObjectURL(first.originFileObj);
    }
  }

  if (!documentUrl && !wasExplicitlyCleared) {
    const persistedUrl =
      getFileUrlFromFormValue(fieldValue) ||
      getPersistedDocumentUrl(documents, field, allFormValues);
    if (persistedUrl) {
      documentUrl = resolveIpfsUrl(persistedUrl) || persistedUrl;
    }
  }

  const previewableFiles = [];
  if (documentUrl) {
    previewableFiles.push({
      key: field.documentKey || fieldName,
      name: field.label || fieldName,
      url: documentUrl,
      type: detectFileType(
        documentUrl,
        field.label || fieldName,
        field.validation?.acceptedFileTypes
      ),
      isBlob: typeof documentUrl === 'string' && documentUrl.startsWith('blob:'),
    });
  }

  if (effectiveReadOnly) {
    return (
      <>
        <div style={{ marginBottom: 8 }}>{label}</div>
        <div style={{ ...metadataBoxStyle, ...requestChangeBorder }}>
          <Form.Item style={{ marginBottom: 0 }}>
            {previewableFiles.length > 0 ? (
              <div style={{ position: 'relative' }}>
                <DocumentViewer
                  url={previewableFiles[0].url}
                  label={previewableFiles[0].name}
                  onViewDocument={({ url, label: docLabel, type, isBlob }) =>
                    onViewDocument
                      ? onViewDocument({ open: true, url, label: docLabel, type, isBlob })
                      : setPreviewModal({ open: true, url, label: docLabel, type, isBlob })
                  }
                  isBlob={previewableFiles[0].isBlob}
                  acceptedFileTypes={field.validation?.acceptedFileTypes}
                />
              </div>
            ) : (
              <Text type="secondary">Not uploaded</Text>
            )}
          </Form.Item>
          {field.metadataFields && field.metadataFields.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <MetadataFields
                form={form}
                token={token}
                metadataFieldName={metadataFieldName}
                metadataFields={field.metadataFields}
                effectiveReadOnly={effectiveReadOnly}
              />
            </div>
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
    );
  }

  return (
    <>
      <div style={{ marginBottom: 8 }}>{label}</div>
      <div style={metadataBoxStyle}>
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
          previewModal={previewModal}
          setPreviewModal={setPreviewModal}
        />
        <MetadataFields
          form={form}
          token={token}
          metadataFieldName={metadataFieldName}
          metadataFields={field.metadataFields}
          effectiveReadOnly={effectiveReadOnly}
        />
      </div>
    </>
  );
}
