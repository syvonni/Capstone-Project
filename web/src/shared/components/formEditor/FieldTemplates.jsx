import { createFieldWithDefaults } from './utils'

export const FIELD_TEMPLATES = [
  {
    templateLabel: 'Government ID',
    value: 'id_document',
    type: 'category_upload',
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
  {
    templateLabel: 'Business Registration',
    value: 'business_registration',
    type: 'category_upload',
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
  {
    templateLabel: 'Proof of Business Premises',
    value: 'proof_of_premises',
    type: 'category_upload',
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
  {
    templateLabel: 'Occupancy Permit',
    value: 'occupancy_permit',
    type: 'category_upload',
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
  {
    templateLabel: 'Barangay Business Clearance',
    value: 'barangay_clearance',
    type: 'file',
    label: 'Barangay Business Clearance',
    helpText: 'Upload barangay business clearance to verify your business has been cleared to operate in the barangay',
    metadataFields: [
      { label: 'Clearance Number', type: 'text', required: true, placeholder: 'Enter clearance number' },
      { label: 'Date Issued', type: 'date', required: true },
      { label: 'Barangay Name', type: 'text', required: true, placeholder: 'Enter barangay name' },
    ],
  },
  {
    templateLabel: 'Community Tax Certificate',
    value: 'ctc',
    type: 'file',
    label: 'Community Tax Certificate (CTC)',
    helpText: 'Upload your Community Tax Certificate to verify you have paid your local taxes for business operation',
    metadataFields: [
      { label: 'CTC Number', type: 'text', required: true, placeholder: 'Enter CTC number' },
      { label: 'Date Issued', type: 'date', required: true },
      { label: 'Place Issued', type: 'text', required: true, placeholder: 'Enter city/municipality' },
    ],
  },
]

export function addFromTemplate(templateValue, section, onUpdate) {
  const template = FIELD_TEMPLATES.find(t => t.value === templateValue)
  if (!template) return

  const newItem = createFieldWithDefaults(template.type, {
    label: template.label,
    helpText: template.helpText,
    dropdownOptions: template.dropdownOptions,
    metadataFields: template.metadataFields,
  })
  onUpdate({ ...section, items: [...section.items, newItem] })
}
