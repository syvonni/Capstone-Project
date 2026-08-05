/**
 * FORM DEFINITIONS CONSTANTS
 * 
 * This file contains form definitions for rendering forms in the frontend.
 * These are reference constants that mirror the backend seedFormDefinitions.js seeder.
 * 
 * When backend integration is complete, these constants can be removed and replaced
 * with API calls to fetch form definitions from the database.
 */

// Helper function to slugify label to key (camelCase)
function slugifyLabelToKey(label) {
  if (!label || typeof label !== 'string') return ''
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('') || ''
}

// Helper function to auto-generate keys for form items
function autoGenerateKeys(items) {
  return items.map(item => {
    const newItem = { ...item }
    if (!newItem.key || newItem.key === '') {
      newItem.key = slugifyLabelToKey(newItem.label)
    }
    // Auto-generate keys for metadata fields
    if (newItem.metadataFields && newItem.metadataFields.length > 0) {
      newItem.metadataFields = newItem.metadataFields.map(metaField => {
        if (!metaField.key || metaField.key === '') {
          return { ...metaField, key: `metadata_${slugifyLabelToKey(metaField.label)}` }
        }
        return metaField
      })
    }
    // Auto-generate keys for dropdown options
    if (newItem.dropdownOptions && newItem.dropdownOptions.length > 0) {
      newItem.dropdownOptions = newItem.dropdownOptions.map(option => {
        if (typeof option === 'object' && (!option.id || option.id === '')) {
          return { ...option, id: slugifyLabelToKey(option.label) }
        }
        return option
      })
    }
    return newItem
  })
}

// Helper function to create form items
function item(label, type = 'file', opts = {}) {
  const base = {
    label,
    type,
    required: opts.required !== undefined ? opts.required : true,
    notes: opts.notes || opts.helpText || '',
    helpText: opts.helpText || '',
    placeholder: opts.placeholder || '',
    span: opts.span || 24,
    validation: opts.validation || {},
    dropdownSource: opts.dropdownSource || 'static',
    dropdownOptions: opts.dropdownOptions || [],
    metadataFields: opts.metadataFields || [],
  }
  if (type === 'download') {
    base.downloadFileName = opts.downloadFileName || ''
    base.downloadFileSize = opts.downloadFileSize || 0
    base.downloadFileType = opts.downloadFileType || 'pdf'
    base.downloadFileUrl = opts.downloadFileUrl || ''
  }
  if (type === 'repeatable_group') {
    base.groupFields = opts.groupFields || []
    base.minRows = opts.minRows ?? 1
    base.maxRows = opts.maxRows ?? 20
  }
  if (opts.showWhen) {
    base.showWhen = opts.showWhen
  }
  if (opts.source) {
    base.source = opts.source
  }
  return base
}

// ─── Regular Business Permit Form ─────
export const UNIFIED_BUSINESS_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload government-issued IDs, business registration certificates, and other required documents to verify your business eligibility and compliance with LGU regulations',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Valid Government-Issued ID of the Business Owner', 'category_upload', {
        helpText: 'Upload a valid government-issued ID to verify your identity and business ownership for permit application',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
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
      }),
      item('Business Registration Certificate', 'category_upload', {
        helpText: 'Upload your business registration certificate to verify your business legal status and ownership for permit application',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
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
      }),
      item('Proof of Business Premises', 'category_upload', {
        required: false,
        helpText: 'Upload proof of your right to use the business premises to verify your business location compliance with LGU zoning regulations',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
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
      }),
      item('Occupancy Permit', 'category_upload', {
        required: true,
        helpText: 'Upload occupancy certificate to verify your building meets safety and building code requirements for business operation',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        dropdownOptions: [
          {
            label: 'Own Building',
            definition: 'You own the building where your business operates',
            whereToGet: 'You can acquire this from the City Engineering Office or Building Official',
            metadataFields: [
              { label: 'Permit Number', type: 'text', required: true, placeholder: 'Enter permit number' },
              { label: 'Date Issued', type: 'date', required: true },
              { label: 'Building Name/Number', type: 'text', required: true, placeholder: 'Enter building name or number' },
              { label: 'Floor Area (sqm)', type: 'text', required: false, placeholder: 'Enter floor area in sqm' },
              { label: 'Building Value (₱)', type: 'number', required: false, placeholder: 'Enter declared building value' },
            ],
          },
          {
            label: 'Leased Property',
            definition: 'You lease the property where your business operates',
            whereToGet: 'You can acquire this from the building owner',
            metadataFields: [
              { label: 'Permit Number', type: 'text', required: true, placeholder: 'Enter permit number' },
              { label: 'Date Issued', type: 'date', required: true },
              { label: 'Building Name/Number', type: 'text', required: true, placeholder: 'Enter building name or number' },
              { label: 'Floor Area (sqm)', type: 'text', required: false, placeholder: 'Enter floor area in sqm' },
              { label: 'Monthly Rental (₱)', type: 'number', required: true, placeholder: 'Enter monthly rental amount' },
              { label: 'Landlord Name', type: 'text', required: true, placeholder: 'Enter landlord name' },
              { label: 'Landlord Address', type: 'address', required: true },
            ],
          },
        ],
      }),
      item('Barangay Business Clearance', 'file', {
        helpText: 'Upload barangay clearance to verify your business operates within the barangay jurisdiction and complies with local requirements',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
      }),
      item('Community Tax Certificate (CTC / Cedula)', 'file', {
        helpText: 'Upload CTC to verify you have paid your community tax obligations to the LGU',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
      }),
    ]),
  },
  {
    sectionName: 'Business Information',
    description: 'Provide your business name, address, contact information, and tax identification number for official business registration and tax purposes',
    notes: '',
    items: autoGenerateKeys([
      item('Business / Trade / Doing Business As Name', 'text', {
        helpText: 'As registered with DTI / SEC / CDA',
        placeholder: 'Enter business name',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Business address', 'address_alaminos', {
        required: true,
        helpText: 'Physical location of the business',
      }),
      item('Business telephone / mobile number', 'text', {
        required: false,
        placeholder: 'e.g. 09171234567',
        validation: { maxLength: 15 },
        span: 12,
      }),
      item('Business email', 'text', {
        required: false,
        placeholder: 'e.g. business@example.com',
        validation: { maxLength: 200 },
        span: 12,
      }),
      item('TIN (Tax Identification Number)', 'text', {
        placeholder: 'e.g. 123-456-789-000',
        validation: { minLength: 9, maxLength: 20 },
        span: 24,
      }),
    ]),
  },
  {
    sectionName: 'Line of Business',
    type: 'lob_section',
    description: 'Select your business category and classification to determine applicable fees and requirements.',
    notes: 'This section uses prebuilt LOB selection interface',
  }
]

// ─── Temporary Permit Forms (separate forms for each type) ──────────────────────────

// Cooperative Permit
export const COOPERATIVE_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your cooperative eligibility and compliance with local cooperative regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Cooperative Development Authority Registration', 'category_upload', {
        helpText: 'Upload your CDA registration certificate to verify your cooperative is legally registered with the Cooperative Development Authority',
        whereToGet: 'You can acquire this from the CDA regional office or via CDA online registration system',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        dropdownOptions: [
          {
            label: 'NEW Registration',
            definition: 'Certificate of Registration for newly registered cooperatives',
            whereToGet: 'You can acquire this from the CDA regional office upon initial registration',
            metadataFields: [
              { label: 'CDA Registration Number', type: 'text', required: true, placeholder: 'Enter CDA registration number' },
              { label: 'Date of Registration', type: 'date', required: true },
            ],
          },
          {
            label: 'RENEWAL Registration',
            definition: 'Certificate of Registration for cooperative renewals',
            whereToGet: 'You can acquire this from the CDA regional office upon renewal',
            metadataFields: [
              { label: 'CDA Registration Number', type: 'text', required: true, placeholder: 'Enter CDA registration number' },
              { label: 'Date of Renewal', type: 'date', required: true },
            ],
          },
        ],
      }),
      item('Certificate of Compliance from City Cooperatives Office', 'file', {
        helpText: 'Upload certificate of compliance from the City Cooperatives Office to verify your cooperative meets local cooperative standards',
        whereToGet: 'You can acquire this from the City Cooperatives Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Contract of Lease and xerox copy of Mayor\'s Permit of Lessor (if lessee)', 'file', {
        required: false,
        helpText: 'Upload contract of lease and lessor\'s Mayor\'s Permit if you are leasing the property for your cooperative operations',
        whereToGet: 'You can acquire the contract of lease from your landlord and the Mayor\'s Permit from the City Mayor\'s Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your cooperative operations, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of cooperative or activity',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the cooperative or activity is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary activities, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the cooperative activities...',
        validation: { maxLength: 1000 },
      }),
    ]),
  },
]

// Association/Foundation Permit
export const ASSOCIATION_FOUNDATION_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your association or foundation eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Registration Certificate', 'category_upload', {
        helpText: 'Upload your registration certificate to verify your organization is legally registered with the appropriate government agency',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        dropdownOptions: [
          {
            label: 'SEC Registration',
            definition: 'Securities and Exchange Commission registration for corporations, partnerships, and associations',
            whereToGet: 'You can acquire this from the SEC office or via SEC online registration system',
            metadataFields: [
              { label: 'SEC Registration Number', type: 'text', required: true, placeholder: 'Enter SEC registration number' },
              { label: 'Date of Registration', type: 'date', required: true },
            ],
          },
          {
            label: 'DOLE Registration',
            definition: 'Department of Labor and Employment registration for labor organizations and worker associations',
            whereToGet: 'You can acquire this from the DOLE regional office',
            metadataFields: [
              { label: 'DOLE Registration Number', type: 'text', required: true, placeholder: 'Enter DOLE registration number' },
              { label: 'Date of Registration', type: 'date', required: true },
            ],
          },
        ],
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your association or foundation operations, including organization name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of association/foundation or activity',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the association/foundation or activity is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary activities, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the association/foundation activities...',
        validation: { maxLength: 1000 },
      }),
    ]),
  },
]

// Chainsaw Permit
export const CHAINSAW_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your chainsaw permit eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Certification of Chainsaw Ownership', 'file', {
        helpText: 'Upload certification of chainsaw ownership to verify you legally own the chainsaw equipment',
        whereToGet: 'You can acquire this from the DENR or local environment office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Stencil of Chainsaw Serial No.', 'file', {
        helpText: 'Upload a clear stencil or rubbing of the chainsaw serial number for equipment identification',
        whereToGet: 'You can create this by placing paper over the serial number and rubbing with a pencil',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your chainsaw operations, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or activity',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the chainsaw activity is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary activities, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the chainsaw activities...',
        validation: { maxLength: 1000 },
      }),
    ]),
  },
]

// Firecrackers Stallholders Permit
export const FIRECRACKERS_STALLHOLDERS_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your firecrackers stallholder eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Letter of Approval by City Market and Cemetery Section Head with assessment of fees', 'file', {
        helpText: 'Upload letter of approval from the City Market and Cemetery Section Head with fee assessment',
        whereToGet: 'You can acquire this from the City Market and Cemetery Section Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Authenticated photocopy of Dealers/Manufacturer\'s License of Source from Camp Crame', 'file', {
        helpText: 'Upload authenticated photocopy of the dealer\'s or manufacturer\'s license from PNP-Camp Crame to verify legal sourcing of firecrackers',
        whereToGet: 'You can acquire this from the Philippine National Police (PNP) at Camp Crame',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Authorization/Certification of Dealers/Licensee of Source', 'file', {
        helpText: 'Upload authorization or certification from your dealer or licensee confirming your source of firecrackers',
        whereToGet: 'You can acquire this from your authorized firecrackers dealer or licensee',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Fireworks Retailers Seminar Certificate', 'file', {
        helpText: 'Upload certificate of completion from the Fireworks Retailers Seminar to verify you have completed safety training',
        whereToGet: 'You can acquire this by attending the Fireworks Retailers Seminar conducted by PNP or LGU',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      })
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your firecrackers stall, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or stall',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the stall will be located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary permits, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the firecrackers stall activity...',
        validation: { maxLength: 1000 },
      }),
    ],
  )},
]

// Bazaar/Festival Vendors Permit
export const BAZAAR_FESTIVAL_VENDORS_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your bazaar/festival vendor eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Certification from City Tourism Office (Lucap Wharf only)', 'file', {
        required: false,
        helpText: 'Upload certification from the City Tourism Office if your stall will be located at Lucap Wharf',
        whereToGet: 'You can acquire this from the City Tourism Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Letter of Approval by City Market and Cemetery Section Head with assessment of fees', 'file', {
        helpText: 'Upload letter of approval from the City Market and Cemetery Section Head with fee assessment',
        whereToGet: 'You can acquire this from the City Market and Cemetery Section Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your bazaar or festival stall, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or stall',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the stall will be located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary permits, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the bazaar/festival stall activity...',
        validation: { maxLength: 1000 },
      }),
    ],
  )},
]

// Peddlers Permit
export const PEDDLERS_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your peddler eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Certification from City Tourism Office (Lucap Wharf only)', 'file', {
        required: false,
        helpText: 'Upload certification from the City Tourism Office if your peddling activity will be at Lucap Wharf',
        whereToGet: 'You can acquire this from the City Tourism Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Letter of Approval by City Market and Cemetery Section Head with assessment of fees', 'file', {
        helpText: 'Upload letter of approval from the City Market and Cemetery Section Head with fee assessment',
        whereToGet: 'You can acquire this from the City Market and Cemetery Section Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your peddling activities, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or activity',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the peddling activity is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary activities, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the peddling activity...',
        validation: { maxLength: 1000 },
      }),
    ],
  )},
]

// Promotions/Exhibitors Permit
export const PROMOTIONS_EXHIBITORS_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your promotion/exhibitor eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Request letter approved by City Administrator', 'file', {
        helpText: 'Upload your request letter that has been approved by the City Administrator for your promotional or exhibition activity',
        whereToGet: 'You can acquire this by submitting a request letter to the City Administrator\'s Office for approval',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Letter of Approval by City Market and Cemetery Section Head with assessment of fees', 'file', {
        helpText: 'Upload letter of approval from the City Market and Cemetery Section Head with fee assessment for your activity',
        whereToGet: 'You can acquire this from the City Market and Cemetery Section Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your promotional or exhibition activity, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or activity',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the promotion/exhibition is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary activities, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the promotion/exhibition activity...',
        validation: { maxLength: 1000 },
      }),
    ],
  )},
]

// Cemetery Stallholders Permit
export const CEMETERY_STALLHOLDERS_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your cemetery stallholder eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Letter of Approval by City Market and Cemetery Section Head with assessment of fees', 'file', {
        helpText: 'Upload letter of approval from the City Market and Cemetery Section Head with fee assessment for your cemetery stall',
        whereToGet: 'You can acquire this from the City Market and Cemetery Section Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your cemetery stall, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or stall',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the cemetery stall is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary permits, specify the start and end dates',
      }),
      item('Brief description of activity', 'text', {
        required: false,
        placeholder: 'Describe the cemetery stall activity...',
        validation: { maxLength: 1000 },
      }),
    ],
  )},
]

// Fish Trap/Fish Pen Permit
export const FISH_TRAP_FISH_PEN_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your fish trap/fish pen eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Certification from the Brgy. Captain & duly noted by CFARMC Chairman', 'file', {
        helpText: 'Upload certification from the Barangay Captain duly noted by the CFARMC Chairman to verify community approval for your fishery operation',
        whereToGet: 'You can acquire this from your barangay captain and have it noted by the CFARMC Chairman',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Certification from City Agriculturist (City Agriculture Office)', 'file', {
        helpText: 'Upload certification from the City Agriculturist to verify technical feasibility and compliance with fishery regulations',
        whereToGet: 'You can acquire this from the City Agriculture Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Contract of Lease (NEW) from City Agriculture Office', 'file', {
        required: false,
        helpText: 'Upload contract of lease from the City Agriculture Office for new fish trap or fish pen installations',
        whereToGet: 'You can acquire this from the City Agriculture Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Assessment of fees (City Agriculture Office)', 'file', {
        helpText: 'Upload fee assessment from the City Agriculture Office for your fish trap or fish pen operation',
        whereToGet: 'You can acquire this from the City Agriculture Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your fish trap or fish pen operation, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or activity',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the fish trap/pen is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary activities, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the fish trap/pen activity...',
        validation: { maxLength: 1000 },
      }),
    ],
  )},
]

// Fish Pond Permit
export const FISH_POND_PERMIT_SECTIONS = [
  {
    sectionName: 'Required Documents',
    type: 'required_documents',
    description: 'Upload the required documents to verify your fish pond eligibility and compliance with LGU regulations.',
    notes: 'Applicant/owner details are taken from the PIS (account registration)',
    items: autoGenerateKeys([
      item('Community Tax Certificate (CTC)', 'file', {
        helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
        whereToGet: 'You can acquire this from your local City Treasurer\'s Office',
        metadataFields: [
          { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Barangay Clearance where business is located', 'file', {
        helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
        whereToGet: 'You can acquire this from your barangay captain\'s office',
        metadataFields: [
          { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
          { label: 'Date Issued', type: 'date', required: true },
          { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
        ],
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Tax Declaration of property (Photocopy)', 'file', {
        helpText: 'Upload photocopy of the tax declaration for the property where the fish pond is located to verify ownership or lease rights',
        whereToGet: 'You can acquire this from the City Assessor\'s Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
      item('Assessment of fees (City Agriculture Office)', 'file', {
        helpText: 'Upload fee assessment from the City Agriculture Office for your fish pond operation',
        whereToGet: 'You can acquire this from the City Agriculture Office',
        validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
      }),
    ]),
  },
  {
    sectionName: 'Activity Details',
    description: 'Provide details about your fish pond operation, including business name, location, duration, and nature of activities',
    notes: '',
    items: autoGenerateKeys([
      item('Business / activity name', 'text', {
        placeholder: 'Enter name of business or activity',
        validation: { minLength: 2, maxLength: 200 },
      }),
      item('Location of activity', 'address_alaminos', {
        required: true,
        helpText: 'Where the fish pond is located',
      }),
      item('Duration of activity', 'date_range', {
        required: false,
        helpText: 'For temporary activities, specify the start and end dates',
      }),
      item('Brief description of activity', 'textarea', {
        required: false,
        placeholder: 'Describe the fish pond activity...',
        validation: { maxLength: 1000 },
      }),
    ],
  )},
]

// ─── Industry-specific sections (PSIC 2019 letters a–u) ──────────
export const INDUSTRY_SECTIONS = {
  a: [
    // Agriculture, forestry and fishing
    {
      sectionName: 'Agriculture / Fishery / Forestry Permits',
      description: 'Department of Agriculture and related agency requirements',
      notes: '',
      items: autoGenerateKeys([
        item('Bureau of Fisheries and Aquatic Resources (BFAR) permit', 'file', {
          required: false,
          helpText: 'Required for fishing, aquaculture, and fish trading businesses',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DA / Bureau of Plant Industry (BPI) phytosanitary certificate', 'file', {
          required: false,
          helpText: 'Required for plant nurseries, seed dealers, and agricultural product exporters',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DENR permit for forestry activities', 'file', {
          required: false,
          helpText: 'Required for logging, wood processing, and NTFP collection',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Fertilizer and Pesticide Authority (FPA) license', 'file', {
          required: false,
          helpText: 'Required for dealers/distributors of fertilizers and pesticides',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  b: [
    // Mining and quarrying
    {
      sectionName: 'Mining and Quarrying Permits',
      description: 'Mines and Geosciences Bureau requirements',
      notes: '',
      items: autoGenerateKeys([
        item('Mineral Production Sharing Agreement (MPSA) or permit', 'file', {
          helpText: 'Issued by the DENR-MGB',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Environmental Compliance Certificate (ECC)', 'file', {
          helpText: 'Required for all mining operations per DAO 2003-30',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Provincial / Municipal extraction permit (quarrying)', 'file', {
          required: false,
          helpText: 'Required for sand, gravel, and quarry operations',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  c: [
    // Manufacturing
    {
      sectionName: 'Manufacturing / Industrial Compliance',
      description: 'Environmental and safety requirements for manufacturing',
      notes: '',
      items: autoGenerateKeys([
        item('DENR Environmental Compliance Certificate (ECC)', 'file', {
          required: false,
          helpText: 'Required for environmentally critical projects (ECP) or projects in ECAs',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Pollution Control Officer (PCO) accreditation', 'file', {
          required: false,
          helpText: 'Factories generating pollution must designate an accredited PCO',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Waste disposal agreement or proof of disposal service', 'file', {
          helpText: 'Contract with a DENR-accredited waste hauler/treatment facility',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('FDA License to Operate (LTO)', 'file', {
          required: false,
          helpText: 'Required for food, drug, cosmetic, and medical device manufacturers',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DOLE safety compliance certificate', 'file', {
          required: false,
          helpText: 'Required for factories with hazardous work environments per DO 198-18',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  d: [
    // Electricity, gas, steam
    {
      sectionName: 'Energy Sector Permits',
      description: 'Department of Energy and Energy Regulatory Commission requirements',
      notes: '',
      items: autoGenerateKeys([
        item('DOE Certificate of Compliance', 'file', {
          helpText: 'Required for power generation, distribution, and retail electricity suppliers',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('ERC franchise / Certificate of Public Convenience', 'file', {
          required: false,
          helpText: 'For distribution utilities and retail electricity suppliers',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Environmental Compliance Certificate (ECC)', 'file', {
          required: false,
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  e: [
    // Water supply, sewerage, waste management
    {
      sectionName: 'Water / Waste Management Permits',
      description: 'Environmental management requirements',
      notes: '',
      items: autoGenerateKeys([
        item('DENR Discharge Permit', 'file', {
          helpText: 'Required for wastewater discharge per DAO 2016-08',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DENR Hazardous Waste Generator ID', 'file', {
          required: false,
          helpText: 'Required for businesses generating hazardous waste (RA 6969)',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Water permit from NWRB', 'file', {
          required: false,
          helpText: 'National Water Resources Board permit for water extraction/supply',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Environmental Compliance Certificate (ECC)', 'file', {
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  f: [
    // Construction
    {
      sectionName: 'Construction Permits and Licenses',
      description: 'Philippine Contractors Accreditation Board and related requirements',
      notes: '',
      items: autoGenerateKeys([
        item('PCAB License', 'file', {
          required: false,
          helpText: 'Required for contractors; classification determines allowable project value',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Building Permit', 'file', {
          required: false,
          helpText: 'From the LGU Building Official, required before starting construction',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Professional Regulation Commission (PRC) licenses', 'file', {
          required: false,
          helpText: 'Engineer/Architect licenses for regulated design and construction work',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Environmental Compliance Certificate (ECC)', 'file', {
          required: false,
          helpText: 'Required for environmentally critical construction projects',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  g: [
    // Wholesale and retail trade
    {
      sectionName: 'Trade and Commerce Requirements',
      description: 'Department of Trade and Industry requirements',
      notes: '',
      items: autoGenerateKeys([
        item('DTI Business Name Registration Certificate', 'file', {
          helpText: 'Sole proprietorship registration from DTI',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Product standards certification (if applicable)', 'file', {
          required: false,
          helpText: 'Philippine Standard (PS) or Import Commodity Clearance (ICC) mark for regulated products',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('FDA product registration (if food/drugs/cosmetics)', 'file', {
          required: false,
          helpText: 'Certificate of Product Registration (CPR) from FDA',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  h: [
    // Transport and storage
    {
      sectionName: 'Transportation and Logistics Permits',
      description: 'Land Transportation Franchising and Regulatory Board requirements',
      notes: '',
      items: autoGenerateKeys([
        item('LTFRB Certificate of Public Convenience (CPC)', 'file', {
          required: false,
          helpText: 'Required for public utility vehicles (buses, jeepneys, UV express, taxis, TNVS)',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('LTO vehicle registration (OR/CR)', 'file', {
          helpText: 'Official receipt and certificate of registration for each vehicle',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Professional driver license copies', 'file', {
          helpText: 'Professional driver\'s license with appropriate restriction code',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('CAB permit (for airlines)', 'file', {
          required: false,
          helpText: 'Civil Aeronautics Board permit for domestic/international air transport',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('MARINA registration (for maritime transport)', 'file', {
          required: false,
          helpText: 'Maritime Industry Authority registration for shipping/maritime businesses',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  i: [
    // Accommodation and food service
    {
      sectionName: 'Food Safety and Sanitation',
      description: 'City/Municipal Health Office and FDA requirements',
      notes: '',
      items: autoGenerateKeys([
        item('Sanitary Permit', 'file', {
          helpText: 'Issued by the City/Municipal Health Office after sanitary inspection',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Health certificates for food handlers', 'file', {
          helpText: 'Individual health certificates for food handlers',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Food Safety Training Certificate', 'file', {
          required: false,
          helpText: 'Required for food handlers per FDA Circular 2013-010',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('FDA License to Operate (LTO)', 'file', {
          required: false,
          helpText: 'Required for food manufacturers, food supplement distributors',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DOT Accreditation (for accommodation)', 'file', {
          required: false,
          helpText: 'Department of Tourism accreditation for hotels, resorts, inns',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  j: [
    // Information and communication
    {
      sectionName: 'ICT and Telecommunications Permits',
      description: 'National Telecommunications Commission requirements',
      notes: '',
      items: autoGenerateKeys([
        item('NTC franchise/permit (for telecom operators)', 'file', {
          required: false,
          helpText: 'Required for telecommunications providers and value-added service providers',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('NPC registration (data processing)', 'file', {
          required: false,
          helpText: 'National Privacy Commission registration for personal information controllers/processors under RA 10173',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  k: [
    // Financial and insurance activities
    {
      sectionName: 'Financial Regulatory Requirements',
      description: 'Bangko Sentral ng Pilipinas, SEC, and Insurance Commission requirements',
      notes: '',
      items: autoGenerateKeys([
        item('SEC Registration and Articles of Incorporation', 'file', {
          helpText: 'Securities and Exchange Commission corporate registration',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('BSP license/authority to operate (banking)', 'file', {
          required: false,
          helpText: 'Required for banks, quasi-banks, trust entities, and money service businesses',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Insurance Commission (IC) license', 'file', {
          required: false,
          helpText: 'Required for insurance companies, brokers, and agents',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('AMLC registration (anti-money laundering)', 'file', {
          required: false,
          helpText: 'Registration with the Anti-Money Laundering Council for covered institutions',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  l: [
    // Real estate activities
    {
      sectionName: 'Real Estate Licenses',
      description: 'Professional Regulation Commission and HLURB requirements',
      notes: '',
      items: autoGenerateKeys([
        item('PRC Real Estate Broker license', 'file', {
          required: false,
          helpText: 'Required for real estate brokerage per RA 9646',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DHSUD (HLURB) License to Sell', 'file', {
          required: false,
          helpText: 'Required for real estate developers selling subdivision lots or condominium units',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  m: [
    // Professional, scientific and technical activities
    {
      sectionName: 'Professional Licenses',
      description: 'Professional Regulation Commission requirements',
      notes: '',
      items: autoGenerateKeys([
        item('PRC Professional License (applicable profession)', 'file', {
          helpText: 'E.g. CPA, lawyer, engineer, architect, doctor, etc.',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Professional Tax Receipt (PTR)', 'file', {
          helpText: 'Annual professional tax paid to the LGU',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  n: [
    // Administrative and support service activities
    {
      sectionName: 'Support Services Requirements',
      description: 'Department of Labor and Employment requirements',
      notes: '',
      items: autoGenerateKeys([
        item('DOLE registration (for manpower agencies)', 'file', {
          required: false,
          helpText: 'Required for private recruitment and placement agencies per DO 174-17',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Private Security Agency License (PSAGC)', 'file', {
          required: false,
          helpText: 'Required for private security agencies, per RA 5487',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
   )},
  ],
  o: [
    // Public administration and defence
    {
      sectionName: 'Government-Related Business Requirements',
      description: 'Government Procurement Policy Board requirements',
      notes: '',
      items: autoGenerateKeys([
        item('PhilGEPS registration', 'file', {
          required: false,
          helpText: 'Philippine Government Electronic Procurement System registration for government suppliers',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  p: [
    // Education
    {
      sectionName: 'Educational Institution Requirements',
      description: 'Department of Education, CHED, or TESDA requirements',
      notes: '',
      items: autoGenerateKeys([
        item('DepEd permit/recognition (basic education)', 'file', {
          required: false,
          helpText: 'Required for private schools offering K-12 programs',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('CHED permit/recognition (higher education)', 'file', {
          required: false,
          helpText: 'Required for colleges and universities',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('TESDA registration (technical-vocational)', 'file', {
          required: false,
          helpText: 'Required for technical-vocational training institutions',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  q: [
    // Human health and social work activities
    {
      sectionName: 'Health Facility Licenses',
      description: 'Department of Health requirements',
      notes: '',
      items: autoGenerateKeys([
        item('DOH License to Operate (LTO) health facility', 'file', {
          helpText: 'Required for hospitals, clinics, laboratories, pharmacies, etc.',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('PRC licenses for healthcare professionals', 'file', {
          helpText: 'Physician, nurse, pharmacist, medical technologist, etc.',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Dangerous Drugs Board (DDB) license (pharmacies)', 'file', {
          required: false,
          helpText: 'Required for pharmacies handling regulated drugs per RA 9165',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DSWD license (social work institutions)', 'file', {
          required: false,
          helpText: 'Required for social welfare agencies, child-caring institutions',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  r: [
    // Arts, entertainment and recreation
    {
      sectionName: 'Entertainment and Recreation Permits',
      description: 'Local government and tourism requirements',
      notes: '',
      items: autoGenerateKeys([
        item('Special Permit for amusement/entertainment (LGU)', 'file', {
          required: false,
          helpText: 'Required for bars, KTV, gaming, amusement arcades, resorts, etc.',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DOT accreditation (tourism-related)', 'file', {
          required: false,
          helpText: 'Department of Tourism accreditation for tourism enterprises',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('PAGCOR license (gaming operations)', 'file', {
          required: false,
          helpText: 'Philippine Amusement and Gaming Corporation license for gaming establishments',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  s: [
    // Other service activities
    {
      sectionName: 'Service-Specific Permits',
      description: 'Requirements vary based on specific service type',
      notes: '',
      items: autoGenerateKeys([
        item('Special permit for personal care services', 'file', {
          required: false,
          helpText: 'E.g. beauty salons, barbershops, laundry services, funeral services',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('DENR permit (automotive repair / car wash)', 'file', {
          required: false,
          helpText: 'Environmental permit for wastewater-generating service activities',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  t: [
    // Activities of households as employers
    {
      sectionName: 'Household Employer Requirements',
      description: 'Domestic worker (Kasambahay) law compliance',
      notes: '',
      items: autoGenerateKeys([
        item('Kasambahay employment contract', 'download', {
          helpText: 'Standardized employment contract per RA 10361 (Batas Kasambahay)',
          downloadFileName: 'kasambahay-employment-contract.pdf',
          downloadFileSize: 85000,
          downloadFileType: 'pdf',
          validation: { acceptedFileTypes: 'pdf', maxFileSize: 10 },
        }),
        item('SSS / PhilHealth / Pag-IBIG registration for domestic worker', 'file', {
          helpText: 'Employer must register domestic workers with mandatory agencies',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
  u: [
    // Extraterritorial organizations
    {
      sectionName: 'Extraterritorial / International Organization Requirements',
      description: 'Department of Foreign Affairs and SEC requirements',
      notes: '',
      items: autoGenerateKeys([
        item('SEC registration as foreign corporation', 'file', {
          required: false,
          helpText: 'License to do business in the Philippines for foreign entities',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
        item('Special Investor Resident Visa (SIRV) or related visa', 'file', {
          required: false,
          helpText: 'For foreign nationals representing the organization',
          validation: { acceptedFileTypes: 'pdf,jpg,png', maxFileSize: 10 },
        }),
      ],
    )},
  ],
}
