import { Upload, Button, Typography } from 'antd'
import { UploadOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileOutlined } from '@ant-design/icons'

const { Text } = Typography

const FILE_ICON_MAP = {
  pdf: <FilePdfOutlined />,
  doc: <FileWordOutlined />,
  docx: <FileWordOutlined />,
  xls: <FileExcelOutlined />,
  xlsx: <FileExcelOutlined />,
}

function getFileIcon(ext) {
  return FILE_ICON_MAP[ext?.toLowerCase()] || <FileOutlined />
}

function getExtFromName(fileName) {
  const parts = (fileName || '').split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DownloadConfig({ field, onUpdate, token, _definitionId, _setUploading }) {
  const handleTemplateUpload = async (info) => {
    const file = info.file
    const ext = getExtFromName(file.name)
    const label = field.label || file.name.replace(/\.[^/.]+$/, '')

    // Use local preview URL (IPFS upload not implemented)
    onUpdate({
      ...field,
      label,
      downloadFileName: file.name,
      downloadFileSize: file.size,
      downloadFileType: ext || 'pdf',
      downloadFileUrl: URL.createObjectURL(file),
    })
  }

  return (
    <>
      <div>
        <Text style={{ display: 'block', marginBottom: 4 }}>
          Template file (applicants will download this)
        </Text>
        {field.downloadFileName ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: token.colorFillQuaternary,
              borderRadius: token.borderRadius,
            }}
          >
            <span style={{ fontSize: 22, color: token.colorPrimary }}>
              {getFileIcon(field.downloadFileType)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, display: 'block' }} ellipsis>{field.downloadFileName}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {field.downloadFileType?.toUpperCase()}{field.downloadFileSize ? ` · ${formatFileSize(field.downloadFileSize)}` : ''}
              </Text>
            </div>
            <Upload
              beforeUpload={() => false}
              showUploadList={false}
              onChange={handleTemplateUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              maxCount={1}
            >
              <Button type="link">Replace</Button>
            </Upload>
          </div>
        ) : (
          <Upload.Dragger
            beforeUpload={() => false}
            showUploadList={false}
            onChange={handleTemplateUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            maxCount={1}
            style={{ padding: '12px 0' }}
          >
            <p style={{ marginBottom: 4 }}>
              <UploadOutlined style={{ fontSize: 20, color: token.colorTextSecondary }} />
            </p>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Click or drag a file here to upload the template
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              PDF, DOC, DOCX, XLS, XLSX
            </Text>
          </Upload.Dragger>
        )}
      </div>
    </>
  )
}
