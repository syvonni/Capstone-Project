/** Get a single displayable file URL from form value (string CID/URL or fileList item with cid/url) */
export function getFileUrlFromFormValue(value) {
  if (value == null) return ''
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]
    if (first && typeof first === 'object') {
      // Try multiple possible property names for CID/URL
      const cid = first.cid || first.ipfsCid || first.response?.cid || first.response?.ipfsCid
      const url = first.url || first.response?.url
      if (url && typeof url === 'string') return url
      if (cid && typeof cid === 'string') return cid
      // Debug: log the structure if we can't find CID/URL
      console.log('Debug - file object structure:', first)
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    // Handle a single file object (e.g. { cid, url, response })
    const cid = value.cid || value.ipfsCid || value.response?.cid || value.response?.ipfsCid
    const url = value.url || value.response?.url
    if (url && typeof url === 'string') return url
    if (cid && typeof cid === 'string') return cid
    console.log('Debug - single file object structure:', value)
  }
  return ''
}
