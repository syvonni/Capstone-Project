import { fetchWithFallback } from '@/lib/http.js'

const APPLICATIONS_BASE_PATH = '/api/business/applications'

/**
 * Upload a single file (to IPFS)
 * @param {string} applicationId - Application ID
 * @param {File} file - File to upload
 * @param {string} fieldName - Field name for the document
 */
export async function uploadFile(applicationId, file, fieldName = 'file') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fieldName', fieldName)

  const response = await fetchWithFallback(`${APPLICATIONS_BASE_PATH}/${applicationId}/documents/upload-file`, {
    method: 'POST',
    body: formData,
  })

  if (!response || !response.ok) {
    const err = await response?.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Failed to upload file')
  }

  const json = await response.json()
  return json
}
