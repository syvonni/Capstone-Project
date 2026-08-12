import { Typography, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import DocumentViewer from '@/shared/components/document/DocumentViewer'

const { Text } = Typography
const { useToken } = theme

export default function AppealDetailsModal({ open, onCancel, appealDetails }) {
  const { token } = useToken()
  
  if (!appealDetails) {
    return (
      <ResponsiveModal
        title="Appeal Details"
        open={open}
        onCancel={onCancel}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Text type="secondary">No appeal details available.</Text>
        </div>
      </ResponsiveModal>
    )
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <ResponsiveModal
      title="Appeal Details"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Submitted On</Text>
          <div style={{ marginTop: 4 }}>
            <Text>{formatDate(appealDetails.createdAt)}</Text>
          </div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Appeal Letter</Text>
          <div style={{ marginTop: 4, padding: 12, background: token.colorBgLayout, borderRadius: 8 }}>
            <Text>{appealDetails.description || 'No description provided.'}</Text>
          </div>
        </div>
        {appealDetails.evidence && appealDetails.evidence.length > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Supporting Documents</Text>
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {appealDetails.evidence.map((file, index) => {
                const rawUrl = typeof file === 'string' ? file : file.url
                const fileName = typeof file === 'string' ? `Document ${index + 1}` : file.name || `Document ${index + 1}`
                return (
                  <div key={index}>
                    <Text style={{ fontSize: 13 }}>{fileName}</Text>
                    <div style={{ marginTop: 2 }}>
                      <DocumentViewer url={rawUrl} label={fileName} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  )
}
