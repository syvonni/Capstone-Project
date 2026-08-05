import { ALL_RESERVED_WORDS } from './validations/constants/reservedKeywords'

// Field type defaults for form editor
const FIELD_TYPE_DEFAULTS = {
  text: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  number: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  email: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  phone: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  date: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  textarea: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  address: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  address_alaminos: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  select: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  checkbox: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  radio: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  file: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  download: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  repeatable_group: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
  category_upload: {
    placeholder: '',
    validation: { required: false },
    dropdownSource: 'static',
    dropdownOptions: [],
  },
}

// Available field types for form editor (grouped structure)
export const FIELD_TYPES = [
  {
    label: 'Basic Input',
    options: [
      { value: 'text', label: 'Text' },
      { value: 'number', label: 'Number' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'date', label: 'Date' },
      { value: 'textarea', label: 'Textarea' },
      { value: 'address', label: 'Address' },
      { value: 'address_alaminos', label: 'Address (Alaminos)' },
    ],
  },
  {
    label: 'Selection',
    options: [
      { value: 'select', label: 'Select Dropdown' },
      { value: 'checkbox', label: 'Checkbox' },
      { value: 'radio', label: 'Radio Group' },
    ],
  },
  {
    label: 'File & Download',
    options: [
      { value: 'file', label: 'File Upload' },
      { value: 'download', label: 'Download Link' },
    ],
  },
  {
    label: 'Advanced',
    options: [
      { value: 'repeatable_group', label: 'Repeatable Group' },
      { value: 'category_upload', label: 'Category Upload' },
    ],
  },
  {
    label: 'Templates',
    options: [
      {
        value: 'id_document',
        label: 'Government ID',
        isTemplate: true,
        templateType: 'category_upload',
        templateConfig: {
          label: 'Valid Government-Issued ID',
          helpText: 'Upload a valid government-issued ID to verify your identity and business ownership for permit application',
          dropdownOptions: [
            {
              label: 'Philippine Passport',
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
            {
              label: "Driver's License",
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
            {
              label: 'SSS UMID Card',
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
            {
              label: 'PhilSys National ID',
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
            {
              label: 'Voter\'s ID',
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
            {
              label: 'Postal ID',
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
            {
              label: 'Senior Citizen ID',
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
            {
              label: 'PWD ID',
              metadataFields: [
                { label: 'ID Number', type: 'text', required: true, placeholder: 'Enter ID number' },
                { label: 'Date of Issue', type: 'date', required: true },
                { label: 'Expiry Date', type: 'date', required: false },
                { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
              ],
            },
          ],
        },
      },
      {
        value: 'business_registration',
        label: 'Business Registration',
        isTemplate: true,
        templateType: 'category_upload',
        templateConfig: {
          label: 'Business Registration Certificate',
          helpText: 'Upload your business registration certificate to verify your business legal status and ownership for permit application',
          dropdownOptions: [
            {
              label: 'Sole Proprietorship',
              definition: 'A business owned and operated by a single individual',
              whereToGet: 'you can acquire a DTI Certificate from your provincial office',
              metadataFields: [
                { label: 'Registration Number', type: 'text', required: true, placeholder: 'Enter registration number' },
                { label: 'Date of Registration', type: 'date', required: true },
              ],
            },
            {
              label: 'Corporation',
              definition: 'A legal entity separate from its owners with limited liability',
              whereToGet: 'you can acquire a SEC Registration Certificate from SEC office',
              metadataFields: [
                { label: 'Registration Number', type: 'text', required: true, placeholder: 'Enter registration number' },
                { label: 'Date of Registration', type: 'date', required: true },
              ],
            },
            {
              label: 'Partnership',
              definition: 'A business owned by two or more individuals who share profits and losses',
              whereToGet: 'you can acquire a SEC Registration Certificate from SEC office',
              metadataFields: [
                { label: 'Registration Number', type: 'text', required: true, placeholder: 'Enter registration number' },
                { label: 'Date of Registration', type: 'date', required: true },
              ],
            },
            {
              label: 'Cooperative',
              definition: 'An organization owned and operated for the benefit of its members',
              whereToGet: 'you can acquire a CDA Certificate from CDA regional office',
              metadataFields: [
                { label: 'Registration Number', type: 'text', required: true, placeholder: 'Enter registration number' },
                { label: 'Date of Registration', type: 'date', required: true },
              ],
            },
          ],
        },
      },
      {
        value: 'proof_of_premises',
        label: 'Proof of Business Premises',
        isTemplate: true,
        templateType: 'category_upload',
        templateConfig: {
          label: 'Proof of Business Premises',
          helpText: 'Upload proof of your right to use the business premises to verify your business location compliance with LGU zoning regulations',
          dropdownOptions: [
            {
              label: 'Lease Contract',
              definition: 'A written agreement between a landlord and tenant for the use of property',
              whereToGet: 'you can acquire this from your landlord or property owner',
              metadataFields: [
                { label: 'Contract Number', type: 'text', required: true, placeholder: 'Enter contract number' },
                { label: 'Date of Contract', type: 'date', required: true },
                { label: 'Property Address', type: 'address_alaminos', required: true },
                { label: 'Landlord Name', type: 'text', required: true, placeholder: 'Enter landlord name' },
                { label: 'Monthly Rental (₱)', type: 'number', required: true, placeholder: 'Enter monthly rental amount' },
                { label: 'Landlord Address', type: 'address', required: true },
              ],
            },
            {
              label: 'Contract of Sale',
              definition: 'A legal document that transfers ownership of property from seller to buyer',
              whereToGet: 'you can acquire this from the seller or through a notary public',
              metadataFields: [
                { label: 'Contract Number', type: 'text', required: true, placeholder: 'Enter contract number' },
                { label: 'Date of Contract', type: 'date', required: true },
                { label: 'Property Address', type: 'address_alaminos', required: true },
              ],
            },
            {
              label: 'Land Title',
              definition: 'A legal document proving ownership of land or property',
              whereToGet: 'you can acquire this from the Registry of Deeds or Land Registration Authority',
              metadataFields: [
                { label: 'Title Number', type: 'text', required: true, placeholder: 'Enter title number' },
                { label: 'Date of Registration', type: 'date', required: true },
                { label: 'Property Address', type: 'address_alaminos', required: true },
              ],
            },
          ],
        },
      },
      {
        value: 'occupancy_permit',
        label: 'Occupancy Permit',
        isTemplate: true,
        templateType: 'category_upload',
        templateConfig: {
          label: 'Occupancy Permit',
          helpText: 'Upload occupancy certificate to verify your building meets safety and building code requirements for business operation',
          dropdownOptions: [
            {
              label: 'Own Building',
              definition: 'You own the building where your business operates',
              whereToGet: 'You can acquire this from the City Engineering Office or Building Official',
              metadataFields: [
                { label: 'Permit Number', type: 'text', required: true, placeholder: 'Enter permit number' },
                { label: 'Date Issued', type: 'date', required: true },
                { label: 'Building Address', type: 'address_alaminos', required: true },
              ],
            },
            {
              label: 'Rented Building',
              definition: 'You rent the building where your business operates',
              whereToGet: 'You can acquire this from the City Engineering Office or Building Official',
              metadataFields: [
                { label: 'Permit Number', type: 'text', required: true, placeholder: 'Enter permit number' },
                { label: 'Date Issued', type: 'date', required: true },
                { label: 'Building Address', type: 'address_alaminos', required: true },
              ],
            },
          ],
        },
      },
      {
        value: 'barangay_clearance',
        label: 'Barangay Business Clearance',
        isTemplate: true,
        templateType: 'file',
        templateConfig: {
          label: 'Barangay Business Clearance',
          helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
          metadataFields: [
            { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
            { label: 'Date Issued', type: 'date', required: true },
            { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
          ],
        },
      },
      {
        value: 'ctc',
        label: 'Community Tax Certificate',
        isTemplate: true,
        templateType: 'file',
        templateConfig: {
          label: 'Community Tax Certificate (CTC)',
          helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
          metadataFields: [
            { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
            { label: 'Date Issued', type: 'date', required: true },
            { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
          ],
        },
      },
    ],
  },
]

// Dropdown source options
export const DROPDOWN_SOURCES = [
  { value: 'static', label: 'Static Options' },
  { value: 'dynamic', label: 'Dynamic (API)' },
]

// Field span options for grid layout
export const FIELD_SPAN_OPTIONS = [
  { value: 24, label: 'Full Width' },
  { value: 12, label: 'Half Width' },
  { value: 8, label: 'One Third' },
  { value: 6, label: 'Quarter Width' },
]

// Validation rules for form fields
export const VALIDATION_RULES = [
  { value: 'required', label: 'Required' },
  { value: 'minLength', label: 'Min Length' },
  { value: 'maxLength', label: 'Max Length' },
  { value: 'min', label: 'Min Value' },
  { value: 'max', label: 'Max Value' },
  { value: 'pattern', label: 'Pattern (Regex)' },
  { value: 'email', label: 'Email Format' },
  { value: 'phone', label: 'Phone Format' },
]

/** Generate a unique ID for fields */
export function createId() {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/** Slugify label to storage key (camelCase) */
export function slugifyLabelToKey(label) {
  if (!label || typeof label !== 'string') return ''
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('') || ''
}

/** Check if a key is a reserved word */
export function isReservedKey(key) {
  return ALL_RESERVED_WORDS.has(key)
}

/** Check if key collides with existing keys in the form */
export function hasKeyCollision(key, allFields, currentFieldId = null) {
  if (!key) return false
  return allFields.some(field => 
    field.key === key && field.id !== currentFieldId
  )
}

/** Generate a unique key from label, avoiding collisions and reserved words */
export function generateUniqueKey(label, allFields = [], currentFieldId = null) {
  let baseKey = slugifyLabelToKey(label)
  if (!baseKey) return `field_${createId().replace('field_', '')}`
  
  // Avoid reserved words
  if (isReservedKey(baseKey)) {
    baseKey = `field_${baseKey}`
  }
  
  // Avoid collisions
  let uniqueKey = baseKey
  let counter = 1
  while (hasKeyCollision(uniqueKey, allFields, currentFieldId)) {
    uniqueKey = `${baseKey}${counter}`
    counter++
  }
  
  return uniqueKey
}

/** Build a new field with type-specific defaults */
export function createFieldWithDefaults(type = 'text', overrides = {}, allFields = []) {
  const defaults = FIELD_TYPE_DEFAULTS[type] || FIELD_TYPE_DEFAULTS.text
  const base = {
    id: createId(),
    label: '',
    type,
    key: generateUniqueKey(overrides.label || '', allFields) || `field_${createId().replace('field_', '')}`,
    required: false,
    helpText: '',
    placeholder: defaults.placeholder ?? '',
    validation: { ...defaults.validation },
    dropdownSource: defaults.dropdownSource ?? 'static',
    dropdownOptions: [...(defaults.dropdownOptions || [])],
    span: 24,
    ...overrides,
  }
  if (type === 'repeatable_group') {
    base.groupFields = overrides.groupFields || []
    base.minRows = overrides.minRows ?? 1
    base.maxRows = overrides.maxRows ?? 20
  }
  return base
}

/** Apply type-specific defaults when field type changes (preserves id, label, required, helpText, span) */
export function applyFieldTypeDefaults(field, newType) {
  const defaults = FIELD_TYPE_DEFAULTS[newType] || FIELD_TYPE_DEFAULTS.text
  // Strip type-specific fields when switching away
  const { downloadFileName, downloadFileSize, downloadFileType, downloadFileUrl, groupFields, minRows, maxRows, ...rest } = field
  let base = rest
  if (newType === 'download') base = { ...rest, downloadFileName, downloadFileSize, downloadFileType, downloadFileUrl }
  if (newType === 'repeatable_group') base = { ...rest, groupFields: groupFields || [], minRows: minRows ?? 1, maxRows: maxRows ?? 20 }
  return {
    ...base,
    type: newType,
    placeholder: defaults.placeholder ?? '',
    validation: { ...defaults.validation },
    dropdownSource: defaults.dropdownSource ?? 'static',
    dropdownOptions: [...(defaults.dropdownOptions || [])],
  }
}

export function getExtFromName(fileName) {
  const parts = (fileName || '').split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

export function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
