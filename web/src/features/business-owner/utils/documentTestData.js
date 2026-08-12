import dayjs from 'dayjs'

const PERMIT_TEST_DATA_CONFIG = {
  'unified-business-permit': {
    defaultIdType: 'philippinePassport',
    defaultBusinessType: 'soleProprietorship',
    defaultPremisesType: 'leaseContract',
    idNumberPrefix: 'P',
    registrationPrefix: 'DTI',
  },
  'cooperative-permit': {
    defaultRegistrationType: 'newRegistration',
    registrationPrefix: 'CDA',
  },
  'association-foundation-permit': {
    defaultRegistrationType: 'secRegistration',
    registrationPrefix: 'SEC',
  },
  // Other permits use generic patterns
  'chainsaw-permit': {},
  'firecrackers-stallholders-permit': {},
  'bazaar-festival-vendors-permit': {},
  'peddlers-permit': {},
  'promotions-exhibitors-permit': {},
  'cemetery-stallholders-permit': {},
  'fish-trap-fish-pen-permit': {},
  'fish-pond-permit': {},
}

function generateMetadataValue(metadataField, permitConfig) {
  const label = (metadataField.label || '').toLowerCase()
  const type = metadataField.type

  // Number fields
  if (type === 'number') {
    if (label.includes('rental') || label.includes('monthly')) return 15000
    if (label.includes('value') || label.includes('building')) return 500000
    if (label.includes('area') || label.includes('sqm')) return 150
    if (label.includes('capital')) return 500000
    if (label.includes('employee')) return 10
    return 100
  }

  // Address fields
  if (type === 'address') {
    return {
      streetAddress: '123 Rizal Street',
      province: '015500000',
      provinceName: 'Pangasinan',
      city: '015503000',
      cityName: 'City of Alaminos',
      barangay: '015503021',
      barangayName: 'Poblacion',
      postalCode: '2404',
    }
  }

  // Address_alaminos fields
  if (type === 'address_alaminos') {
    return {
      streetAddress: '123 Rizal Street',
      barangay: '015503021',
      barangayName: 'Poblacion',
      postalCode: '2404',
    }
  }

  // CTC-related metadata
  if (label.includes('ctc number')) {
    return `CTC-2024-${Math.floor(100000 + Math.random() * 900000)}`
  }
  if (label.includes('clearance number')) {
    return `BC-2024-${Math.floor(100000 + Math.random() * 900000)}`
  }
  if (label.includes('date issued')) {
    return dayjs().subtract(3, 'month').format('YYYY-MM-DD')
  }
  if (label.includes('place issued') || label.includes('barangay name')) {
    return 'City of Alaminos'
  }

  // ID-related metadata
  if (label.includes('id number')) {
    const prefix = permitConfig.idNumberPrefix || 'ID'
    return `${prefix}${Math.floor(100000000 + Math.random() * 900000000)}`
  }
  if (label.includes('date of issue')) {
    return dayjs().subtract(2, 'year').format('YYYY-MM-DD')
  }
  if (label.includes('expiry date')) {
    return dayjs().add(5, 'year').format('YYYY-MM-DD')
  }

  // Registration-related metadata
  if (label.includes('registration number') || label.includes('cda registration number')) {
    const prefix = permitConfig.registrationPrefix || 'REG'
    return `${prefix}-${Math.floor(1000000000 + Math.random() * 9000000000)}`
  }
  if (label.includes('date of registration')) {
    return dayjs().subtract(1, 'year').format('YYYY-MM-DD')
  }

  // Contract-related metadata
  if (label.includes('contract number')) {
    return `LC-2024-${Math.floor(100000 + Math.random() * 900000)}`
  }
  if (label.includes('date of contract')) {
    return dayjs().subtract(1, 'year').format('YYYY-MM-DD')
  }
  if (label.includes('property address') || label.includes('landlord address')) {
    return '123 Rizal Street, Poblacion, City of Alaminos, Pangasinan 2404'
  }
  if (label.includes('landlord name')) {
    return 'Maria Santos'
  }
  if (label.includes('monthly rental')) {
    return 15000
  }

  // Default fallback
  return `Test ${metadataField.label || 'Value'}`
}

function generateCategoryUploadTestData(field, permitConfig) {
  const testData = {}
  const fieldName = field.key
  const metadataFieldName = `${fieldName}_metadata`

  // Select the first option by default (or permit-specific default)
  const firstOption = field.dropdownOptions?.[0]
  if (firstOption) {
    const isObject = typeof firstOption === 'object'
    const optionId = isObject ? (firstOption.id ?? firstOption.label) : firstOption
    testData[`${fieldName}_category`] = optionId

    // Generate metadata for the selected option using nested structure
    const metadataFields = isObject
      ? (firstOption.metadataFields || field.metadataFields)
      : field.metadataFields
    if (metadataFields?.length) {
      testData[metadataFieldName] = {}
      metadataFields.forEach(metaField => {
        const metaKey = metaField.key || metaField.label
        testData[metadataFieldName][metaKey] = generateMetadataValue(metaField, permitConfig)
      })
    }
  }

  return testData
}

function generateFileFieldTestData(field, permitConfig) {
  const testData = {}
  const fieldName = field.key
  const metadataFieldName = `${fieldName}_metadata`

  // Don't set testData[fieldName] = undefined - this causes Object.assign to overwrite values

  // Generate metadata if present using nested structure
  if (field.metadataFields) {
    testData[metadataFieldName] = {}
    field.metadataFields.forEach(metaField => {
      const metaKey = metaField.key || metaField.label
      testData[metadataFieldName][metaKey] = generateMetadataValue(metaField, permitConfig)
    })
  }

  return testData
}

export {
  PERMIT_TEST_DATA_CONFIG,
  generateMetadataValue,
  generateCategoryUploadTestData,
  generateFileFieldTestData,
}
