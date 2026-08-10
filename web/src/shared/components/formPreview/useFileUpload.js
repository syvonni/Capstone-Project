import { useState, useEffect } from 'react'

export function useFileUpload(formValue, fieldName) {
  const [uploading, setUploading] = useState(false)
  const [localFileList, setLocalFileList] = useState([])

  // Sync local file list with form value
  useEffect(() => {
    if (Array.isArray(formValue) && formValue.length > 0) {
      setLocalFileList(formValue)
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
