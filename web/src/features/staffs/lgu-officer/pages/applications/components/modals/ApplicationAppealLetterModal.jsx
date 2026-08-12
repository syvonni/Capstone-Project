import { Upload } from 'antd'
import { Typography } from 'antd'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

export default function AppealLetterModal({ open, onClose, latestAppeal, setDocumentPreview }) {
  return (
    <ResponsiveModal
      title="Appeal Letter"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div>
        <div style={{ marginBottom: 16 }}>
          <Text>{latestAppeal?.description || 'No appeal letter provided.'}</Text>
        </div>
        {latestAppeal?.evidence && latestAppeal.evidence.length > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Supporting Documents</Text>
            <div style={{ marginTop: 4 }}>
              <Upload
                listType="picture-card"
                fileList={latestAppeal.evidence.map((file, index) => {
                  const rawUrl = typeof file === 'string' ? file : file.url
                  const fileName = typeof file === 'string' ? `Document ${index + 1}` : file.name || `Document ${index + 1}`
                  const resolvedUrl = resolveIpfsUrl(rawUrl)
                  const finalUrl = resolvedUrl || (rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('/')
                    ? `${import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:5000'}/uploads/${rawUrl}`
                    : rawUrl) || ''
                  return {
                    uid: `evidence-${index}`,
                    name: fileName,
                    status: 'done',
                    url: finalUrl,
                  }
                })}
                onPreview={(file) => {
                  const url = file.url
                  const lookup = `${url} ${file.name}`.toLowerCase()
                  let fileType = 'other'
                  if (lookup.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|heic|heif)/i)) {
                    fileType = 'image'
                  } else if (lookup.match(/\.(pdf)/i)) {
                    fileType = 'pdf'
                  } else {
                    fileType = 'image'
                  }
                  setDocumentPreview({ open: true, url, label: file.name, type: fileType })
                }}
                showUploadList={{ showRemoveIcon: false }}
              />
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  )
}
