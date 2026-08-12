import { useState, useEffect } from 'react'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'

export function useFileUpload(formValue, fieldName) {
  const [uploading, setUploading] = useState(false)
  const [localFileList, setLocalFileList] = useState([])

  // Sync local file list with form value
  useEffect(() => {
    if (Array.isArray(formValue) && formValue.length > 0) {
      setLocalFileList(formValue)
    } else if (typeof formValue === 'string' && formValue.trim()) {
      // Reconstruct file list from CID string (after save, form value becomes CID)
      const cid = formValue.trim()
      setLocalFileList([{
        uid: cid,
        name: fieldName || 'uploaded-file',
        status: 'done',
        cid,
        url: resolveIpfsUrl(cid) || cid,
      }])
    } else {
      setLocalFileList([])
    }
  }, [formValue, fieldName])

  return {
    uploading,
    setUploading,
    localFileList,
    setLocalFileList,
  }
}
