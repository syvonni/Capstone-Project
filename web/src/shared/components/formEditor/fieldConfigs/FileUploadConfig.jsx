import { useEffect } from 'react'
import { Typography } from 'antd'
import { generateUniqueKey } from '../utils'
import MetadataFieldsEditor from '../MetadataFieldsEditor'

const { Text } = Typography

export default function FileUploadConfig({ field, onUpdate }) {
  // Auto-generate key from label with file_ prefix
  useEffect(() => {
    if (field.label && !field.key) {
      onUpdate({ ...field, key: `file_${generateUniqueKey(field.label)}` })
    } else if (field.label && field.key && !field.key.startsWith('file_')) {
      // Update key if label changes and key doesn't have prefix
      onUpdate({ ...field, key: `file_${generateUniqueKey(field.label)}` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.label, field.key, onUpdate])

  return (
    <>
      <MetadataFieldsEditor field={field} onUpdate={onUpdate} />
    </>
  )
}
