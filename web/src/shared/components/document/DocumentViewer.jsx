import { Typography, Upload } from 'antd'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'
import { detectFileType } from '@/features/business-owner/utils/formUtils'

const { Text } = Typography

export default function DocumentViewer({ url, label, onViewDocument, _token, isBlob = false, acceptedFileTypes }) {
  if (!url || url.trim() === '') {
    return <Text type="secondary">Not uploaded</Text>
  }

  const resolvedUrl = resolveIpfsUrl(url)
  if (!resolvedUrl) {
    return <Text type="secondary">Not available</Text>
  }

  // Use detectFileType for more robust type detection
  // Default to 'image' for unknown types to enable zoom (consistent with AppealLetterModal behavior)
  const docType = detectFileType(resolvedUrl, label, acceptedFileTypes) || 'image'

  const openModal = () => {
    if (onViewDocument) {
      onViewDocument({ url: resolvedUrl, label: label || 'Document', type: docType, isBlob })
    } else {
      window.open(resolvedUrl, '_blank')
    }
  }

  const fileList = [{
    uid: '1',
    name: label || 'Document',
    url: resolvedUrl,
    status: 'done'
  }]

  return (
    <Upload
      listType="picture-card"
      fileList={fileList}
      onPreview={(_file) => openModal()}
      showUploadList={{ showRemoveIcon: false }}
    />
  )
}
