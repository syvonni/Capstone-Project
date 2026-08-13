import { Typography, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import DocumentViewer from '@/shared/components/document/DocumentViewer'

const { Text } = Typography
const { useToken } = theme

/**
 * ApplicationAppealDetailsModal - A reusable modal for viewing a submitted appeal
 *
 * Used by both business owners (their own appeal) and LGU officers (reviewing the appeal).
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {Object} props.appeal - Appeal object with { description, evidence, createdAt }
 * @param {Function} [props.onViewDocument] - Optional callback to open a document preview
 */
export default function ApplicationAppealDetailsModal({ open, onCancel, appeal, onViewDocument }) {
  const { token } = useToken()

  const formatTimestamp = (date) => {
    if (!date) return null
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (!appeal) {
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
          <Text type="secondary" style={{ fontSize: 12 }}>Appeal Letter</Text>
          <div style={{ marginTop: 4, padding: 12, background: token.colorBgLayout, borderRadius: 8 }}>
            <Text>{appeal.description || 'No description provided.'}</Text>
          </div>
        </div>
        {appeal.evidence && appeal.evidence.length > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Supporting Documents</Text>
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {appeal.evidence.map((file, index) => {
                const rawUrl = typeof file === 'string' ? file : file.url
                const fileName = typeof file === 'string' ? `Document ${index + 1}` : file.name || `Document ${index + 1}`
                return (
                  <div key={index}>
                    <Text style={{ fontSize: 13 }}>{fileName}</Text>
                    <div style={{ marginTop: 2 }}>
                      <DocumentViewer url={rawUrl} label={fileName} onViewDocument={onViewDocument} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          {appeal.createdAt && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              Submitted on {formatTimestamp(appeal.createdAt)}
            </Text>
          )}
          {(appeal.status === 'approved' || appeal.status === 'rejected') && appeal.resolvedAt && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Resolved on {formatTimestamp(appeal.resolvedAt)}
            </Text>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}
