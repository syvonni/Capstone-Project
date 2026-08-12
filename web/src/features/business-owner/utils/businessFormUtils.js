import dayjs from 'dayjs'
import { resolveIpfsUrl } from '@/lib/ipfsUtils'
import { PERMIT_TEST_DATA_CONFIG, generateCategoryUploadTestData, generateFileFieldTestData } from './documentTestData.js'

function createMockFile(fieldName) {
  const fileName = `${fieldName.replace(/[^a-zA-Z0-9]/g, '_')}_sample.pdf`
  const mockContent = new Blob(['Mock PDF content for testing'], { type: 'application/pdf' })
  const file = new File([mockContent], fileName, { type: 'application/pdf' })

  return {
    uid: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: fileName,
    status: 'done',
    originFileObj: file,
    type: 'application/pdf',
    size: mockContent.size,
    isTestFile: true, // Flag to identify test files
  }
}

function formDataWithDayjs(formData, definition, documents = {}) {
  if (!formData || typeof formData !== 'object') return formData
  const dateKeys = new Set()
  const fileKeys = new Set()
  const repeatableDateKeys = {}
  const repeatableFileKeys = {}
  ;(definition?.sections || []).forEach((section) => {
    (section.items || []).forEach((item) => {
      const key = item.key || item.label
      if (item.type === 'date') dateKeys.add(key)
      if (item.type === 'date_range') {
        // Add both _start and _end variants for date_range fields
        dateKeys.add(`${key}_start`)
        dateKeys.add(`${key}_end`)
      }
      if (item.type === 'file') fileKeys.add(key)
      if (item.type === 'repeatable_group' && item.groupFields?.length) {
        const groupDateKeys = new Set()
        const groupFileKeys = new Set()
        item.groupFields.forEach((gf) => {
          if (gf.type === 'date') groupDateKeys.add(gf.key || gf.label)
          if (gf.type === 'date_range') {
            groupDateKeys.add(`${gf.key || gf.label}_start`)
            groupDateKeys.add(`${gf.key || gf.label}_end`)
          }
          if (gf.type === 'file') groupFileKeys.add(gf.key || gf.label)
        })
        if (groupDateKeys.size) repeatableDateKeys[key] = groupDateKeys
        if (groupFileKeys.size) repeatableFileKeys[key] = groupFileKeys
      }
    })
  })
  const out = { ...formData }
  
  // Convert top-level date fields to Dayjs
  dateKeys.forEach((k) => {
    const v = out[k]
    if (v != null && v !== '' && !dayjs.isDayjs(v)) {
      const d = dayjs(v)
      out[k] = d.isValid() ? d : undefined
    }
  })
  
  // Convert nested metadata date fields to Dayjs (e.g., fieldName_metadata.metaFieldKey)
  // Only convert values that are actually date strings, not all values
  Object.keys(out).forEach((key) => {
    if (key.endsWith('_metadata') && typeof out[key] === 'object' && out[key] !== null) {
      Object.keys(out[key]).forEach((metaKey) => {
        const v = out[key][metaKey]
        // Only convert if it's a string that looks like a date (ISO format or YYYY-MM-DD)
        if (v != null && v !== '' && typeof v === 'string' && !dayjs.isDayjs(v)) {
          if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
            const d = dayjs(v)
            out[key][metaKey] = d.isValid() ? d : undefined
          }
        }
        // Don't touch objects (like addresses) - leave them as-is
      })
    }
  })
  
  // Convert file field CID strings back to Upload component format
  fileKeys.forEach((k) => {
    const v = out[k]
    // First try to get CID from formData
    let cid = null
    let url = null

    if (typeof v === 'string' && v.trim()) {
      const trimmed = v.trim()
      // Check if it's a CID string (Qm... or bafy...)
      if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
        cid = trimmed
        url = resolveIpfsUrl(cid) || cid
      } else if (trimmed.includes('/ipfs/')) {
        // Extract CID from full URL like http://localhost:8080/ipfs/Qm...
        const match = trimmed.match(/\/ipfs\/([a-zA-Z0-9]+)/)
        if (match) {
          cid = match[1]
          url = trimmed
        } else {
          url = trimmed
        }
      } else {
        // Assume it's a CID and try to resolve it
        cid = trimmed
        url = resolveIpfsUrl(trimmed) || trimmed
      }
    } else if (Array.isArray(v) && v.length > 0) {
      // Handle array of Upload objects that might be missing url field
      if (typeof v[0] === 'object' && v[0] !== null) {
        const first = v[0]
        cid = first?.cid || first?.ipfsCid
        if (cid) {
          url = resolveIpfsUrl(cid) || cid
        } else if (first?.url) {
          url = first.url
        }
      } else if (typeof v[0] === 'string') {
        // Array of CID strings or URLs
        const trimmed = v[0].trim()
        if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
          cid = trimmed
          url = resolveIpfsUrl(cid) || cid
        } else if (trimmed.includes('/ipfs/')) {
          const match = trimmed.match(/\/ipfs\/([a-zA-Z0-9]+)/)
          if (match) {
            cid = match[1]
            url = trimmed
          } else {
            url = trimmed
          }
        } else {
          url = trimmed
        }
      }
    }

    // If still no CID, try to get from documents/lguDocuments
    if (!cid && documents) {
      const docCid = documents[k] || documents[`${k}IpfsCid`]
      if (docCid && typeof docCid === 'string' && docCid.trim()) {
        cid = docCid.trim()
        url = resolveIpfsUrl(cid) || cid
      }
    }

    // Convert to Upload format if we have a CID or URL
    if (cid || url) {
      out[k] = [{
        uid: `file-${k}`,
        name: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim(),
        status: 'done',
        cid,
        url,
        thumbUrl: url // Ant Design Upload uses thumbUrl for preview thumbnail
      }]
    } else if (Array.isArray(v) && v.length > 0) {
      // Handle array of Upload objects that might be missing url field
      if (typeof v[0] === 'object' && v[0] !== null) {
        out[k] = v.map((item, _idx) => {
          if (item.url && item.thumbUrl) {
            // Already has url and thumbUrl, return as-is
            return item
          }
          // Missing url field, add it from cid
          const cid = item.cid || item.ipfsCid
          if (cid) {
            const url = resolveIpfsUrl(cid) || cid
            return {
              ...item,
              url,
              thumbUrl: url
            }
          }
          return item
        })
      } else if (typeof v[0] === 'string') {
        // Array of CID strings or URLs - convert to Upload format
        out[k] = v.map((item, _idx) => {
          const trimmed = item.trim()
          let cid, url
          if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
            cid = trimmed
            url = resolveIpfsUrl(cid) || cid
          } else if (trimmed.includes('/ipfs/')) {
            const match = trimmed.match(/\/ipfs\/([a-zA-Z0-9]+)/)
            if (match) {
              cid = match[1]
              url = trimmed
            } else {
              url = trimmed
            }
          } else {
            url = trimmed
          }
          return {
            uid: `file-${k}-${_idx}`,
            name: `${k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()} ${_idx + 1}`,
            status: 'done',
            cid,
            url,
            thumbUrl: url
          }
        })
      }
    }
  })
  Object.keys(repeatableDateKeys).forEach((listKey) => {
    if (!Array.isArray(out[listKey])) return
    out[listKey] = out[listKey].map((row) => {
      if (!row || typeof row !== 'object') return row
      const r = { ...row }
      repeatableDateKeys[listKey].forEach((fk) => {
        const v = r[fk]
        if (v != null && v !== '' && !dayjs.isDayjs(v)) {
          const d = dayjs(v)
          r[fk] = d.isValid() ? d : undefined
        }
      })
      // Convert file fields in repeatable groups
      if (repeatableFileKeys[listKey]) {
        repeatableFileKeys[listKey].forEach((fk) => {
          const v = r[fk]
          if (typeof v === 'string' && v.trim()) {
            const trimmed = v.trim()
            let cid, url
            if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
              cid = trimmed
              url = resolveIpfsUrl(cid) || cid
            } else if (trimmed.includes('/ipfs/')) {
              const match = trimmed.match(/\/ipfs\/([a-zA-Z0-9]+)/)
              if (match) {
                cid = match[1]
                url = trimmed
              } else {
                url = trimmed
              }
            } else {
              url = trimmed
            }
            r[fk] = [{
              uid: `file-${fk}`,
              name: fk.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim(),
              status: 'done',
              cid,
              url,
              thumbUrl: url
            }]
          } else if (Array.isArray(v) && v.length > 0) {
            // Handle array of Upload objects that might be missing url field
            if (typeof v[0] === 'object' && v[0] !== null) {
              r[fk] = v.map((item, _idx) => {
                if (item.url && item.thumbUrl) {
                  return item
                }
                const cid = item.cid || item.ipfsCid
                if (cid) {
                  const url = resolveIpfsUrl(cid) || cid
                  return {
                    ...item,
                    url,
                    thumbUrl: url
                  }
                }
                return item
              })
            } else if (typeof v[0] === 'string') {
              r[fk] = v.map((item, idx) => {
                const trimmed = item.trim()
                let cid, url
                if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
                  cid = trimmed
                  url = resolveIpfsUrl(cid) || cid
                } else if (trimmed.includes('/ipfs/')) {
                  const match = trimmed.match(/\/ipfs\/([a-zA-Z0-9]+)/)
                  if (match) {
                    cid = match[1]
                    url = trimmed
                  } else {
                    url = trimmed
                  }
                } else {
                  url = trimmed
                }
                return {
                  uid: `file-${fk}-${idx}`,
                  name: `${fk.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()} ${idx + 1}`,
                  status: 'done',
                  cid,
                  url,
                  thumbUrl: url
                }
              })
            }
          }
        })
      }
      return r
    })
  })
  
  return out
}

function generateTestDataForField(field, permitConfig = {}) {
  const fieldName = field.key

  switch (field.type) {
    case 'text':
      if (fieldName.toLowerCase().includes('business') && fieldName.toLowerCase().includes('name')) return 'ABC Trading Corp.'
      if (fieldName.toLowerCase().includes('tin')) return '123-456-789-000'
      if (fieldName.toLowerCase().includes('phone') || fieldName.toLowerCase().includes('mobile') || fieldName.toLowerCase().includes('contact')) return '09171234567'
      if (fieldName.toLowerCase().includes('email')) return 'juan.delacruz@example.com'
      if (fieldName.toLowerCase().includes('number') || fieldName.toLowerCase().includes('no')) return 'TEST-2024-001'
      if (fieldName.toLowerCase().includes('name')) return 'Juan Dela Cruz'
      return `Test ${field.label || 'Value'}`

    case 'textarea':
      if (fieldName.toLowerCase().includes('description') || fieldName.toLowerCase().includes('details')) {
        return `This is a sample description for ${field.label || 'this field'}. The business operates in accordance with all local regulations and requirements.`
      }
      return `This is sample text for ${field.label || 'this field'}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`

    case 'number':
      if (fieldName.toLowerCase().includes('capital')) return 500000
      if (fieldName.toLowerCase().includes('employee') || fieldName.toLowerCase().includes('worker')) return 10
      if (fieldName.toLowerCase().includes('gross') || fieldName.toLowerCase().includes('revenue')) return 1200000
      if (fieldName.toLowerCase().includes('area') || fieldName.toLowerCase().includes('sqm')) return 150
      if (fieldName.toLowerCase().includes('rental') || fieldName.toLowerCase().includes('monthly')) return 15000
      if (fieldName.toLowerCase().includes('value') || fieldName.toLowerCase().includes('building')) return 500000
      return 100

    case 'date': {
      const key = (fieldName || '').toLowerCase()
      if (key.includes('birth') || key.includes('dob')) {
        return dayjs().subtract(30, 'year')
      }
      if (key.includes('registration') || key.includes('application') || key.includes('dateofapplication')) {
        return dayjs().subtract(1, 'year')
      }
      return dayjs().subtract(1, 'month')
    }

    case 'date_range':
      return undefined // Handled separately in generateTestDataForDefinition

    case 'select':
      if (field.dropdownOptions?.length > 0) {
        const firstOption = field.dropdownOptions[0]
        return typeof firstOption === 'object' ? firstOption.id : firstOption
      }
      return null

    case 'multiselect':
      if (field.dropdownOptions?.length > 0) {
        return field.dropdownOptions.slice(0, Math.min(2, field.dropdownOptions.length)).map(opt => 
          typeof opt === 'object' ? opt.id : opt
        )
      }
      return []

    case 'checkbox':
      return true

    case 'file':
      // Return metadata-only data for file fields
      return generateFileFieldTestData(field, permitConfig)

    case 'category_upload':
      // Return metadata-only data for category_upload fields
      return generateCategoryUploadTestData(field, permitConfig)

    case 'required_documents':
      // This is a section type, not a field type - handle at section level
      return undefined

    case 'download':
      // Download fields don't need test data - they're for templates
      return undefined

    case 'address':
    case 'address_alaminos':
      return undefined

    case 'lob_section':
      // LOB section is handled separately by the LOB selection component
      return undefined

    case 'repeatable_group': {
      const groupFields = field.groupFields || []
      if (groupFields.length === 0) return [{}]
      const row = {}
      groupFields.forEach(gf => {
        const gfName = gf.key || gf.label
        if (gf.type === 'select' && gf.dropdownOptions?.length > 0) {
          const firstOption = gf.dropdownOptions[0]
          row[gfName] = typeof firstOption === 'object' ? firstOption.id : firstOption
        } else if (gf.type === 'date') {
          row[gfName] = dayjs().subtract(1, 'month')
        } else if (gf.type === 'number') {
          row[gfName] = 100
        } else {
          row[gfName] = `Test ${gf.label || 'Value'}`
        }
      })
      return [row]
    }

    default:
      return `Test ${field.label || 'Value'}`
  }
}

function generateTestDataForDefinition(definition, category = null, _lobs = [], permitType = null) {
  const testData = {}

  if (category) {
    testData.category = category
  }

  // Get permit-specific config
  const permitConfig = PERMIT_TEST_DATA_CONFIG[permitType] || {}

  const sections = definition?.sections || []

  sections.forEach(section => {
    // Handle required_documents section type
    if (section.type === 'required_documents') {
      const items = section.items || []
      items.forEach(field => {
        const fieldName = field.key

        if (field.type === 'file') {
          const fileData = generateFileFieldTestData(field, permitConfig)
          Object.assign(testData, fileData)
        } else if (field.type === 'category_upload') {
          const categoryData = generateCategoryUploadTestData(field, permitConfig)
          Object.assign(testData, categoryData)
        } else {
          // Handle non-document fields in required_documents section
          const value = generateTestDataForField(field, permitConfig)
          if (value !== undefined && typeof value !== 'object') {
            testData[fieldName] = value
          } else if (value !== undefined && typeof value === 'object') {
            // Handle object returns (from file/category_upload)
            Object.assign(testData, value)
          }
          // Handle date_range fields separately
          if (field.type === 'date_range') {
            testData[`${fieldName}_start`] = dayjs().subtract(1, 'year')
            testData[`${fieldName}_end`] = dayjs().add(1, 'year')
          }
        }
      })
      return
    }

    // Handle regular sections
    const items = section.items || []
    items.forEach(field => {
      const fieldName = field.key
      if (field.type === 'address') {
        testData[fieldName] = {
          streetAddress: '123 Rizal Street',
          province: '015500000',
          provinceName: 'Pangasinan',
          city: '015503000',
          cityName: 'City of Alaminos',
          barangay: '015503021',
          barangayName: 'Poblacion',
          postalCode: '2404',
        }
        return
      }
      if (field.type === 'address_alaminos') {
        testData[fieldName] = {
          streetAddress: '123 Rizal Street',
          barangay: '015503021',
          barangayName: 'Poblacion',
          postalCode: '2404',
        }
        return
      }
      if (field.type === 'date_range') {
        testData[`${fieldName}_start`] = dayjs().subtract(1, 'year')
        testData[`${fieldName}_end`] = dayjs().add(1, 'year')
        return
      }
      const value = generateTestDataForField(field, permitConfig)
      if (value !== undefined && typeof value !== 'object') {
        testData[fieldName] = value
      } else if (value !== undefined && typeof value === 'object') {
        // Handle object returns (from file/category_upload)
        Object.assign(testData, value)
      }
    })
  })

  return testData
}

export { createMockFile, formDataWithDayjs, generateTestDataForField, generateTestDataForDefinition }
