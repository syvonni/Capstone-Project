const mongoose = require("mongoose");
const PostRequirement = require("../models/PostRequirement");
const Lob = require("../models/Lob");
const Checklist = require("../models/Checklist");
const { seedPostRequirementViolations } = require("./seedPostRequirementViolations");
const { seedPostRequirementInspectionItems } = require("./seedPostRequirementInspectionItems");
const { seedPostRequirementChecklists } = require("./seedPostRequirementChecklists");

/**
 * Post Requirements Seeder
 *
 * Seeds post requirements that are external agency certificates, permits, and clearances
 * that businesses need to claim after their business permit is approved.
 *
 * Structure:
 * - _id: Temporary code for LOB mappings (not stored in database)
 * - name: Display name of the post requirement
 * - question: Conditional question to determine if this post requirement applies (optional)
 * - description: User-facing description of the post requirement
 * - notes: Admin reference explaining the post requirement (staff only)
 * - legalBasis: Array of legal references (url, title, description)
 *
 * IMPORTANT: Post requirements are external agency-issued certificates/permits/clearances only.
 * Internal documents (Risk Management Plans, Site Master Files, SOPs) are inspection requirements,
 * not post requirements. See Rule 10 in seeder-improvements-guide.md.
 *
 * Usage: Import POST_REQUIREMENTS from seedPostRequirements.js for LOB_POST_REQUIREMENT_MAPPINGS
 */

const POST_REQUIREMENTS = [
  // AMLC Registration
  {
    _id: 'amlc-registration',
        name: 'AMLC Registration',
    question: 'Is your business a covered person under the Anti-Money Laundering Act?',
    description: 'Registration with Anti-Money Laundering Council for covered persons',
    notes: 'Registration with Anti-Money Laundering Council for covered persons per RA 9160',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/09/29/republic-act-no-9160/',
        title: 'RA 9160 - Anti-Money Laundering Act of 2001',
        description: 'Requires AMLC registration for covered persons'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter AMLC registration number',
        maxLength: 50
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      },
      {
        key: 'coveredPersonType',
        label: 'Covered Person Type',
        type: 'select',
        required: true,
        placeholder: 'Select covered person type',
        options: [
          { value: 'bank', label: 'Bank' },
          { value: 'insurance', label: 'Insurance Company' },
          { value: 'securities', label: 'Securities Dealer' },
          { value: 'remittance', label: 'Remittance Company' },
          { value: 'other', label: 'Other' }
        ]
      }
    ]
  },
  {
    _id: 'animal-welfare-seminar-certificate',
        name: 'Animal Welfare Seminar Certificate',
    question: null,
    description: 'Certificate of attendance from Animal Welfare Seminar',
    notes: 'Certificate of attendance from Animal Welfare Seminar conducted by BAI/DA-RFOs or BAI-recognized organization',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/',
        title: 'RA 8485 - Animal Welfare Act of 1998',
        description: 'Requires Animal Welfare Seminar certificate for animal handlers'
      }
    ],
    customFields: [
      {
        key: 'certificateNumber',
        label: 'Certificate Number',
        type: 'text',
        required: true,
        placeholder: 'Enter certificate number',
        maxLength: 50
      },
      {
        key: 'seminarDate',
        label: 'Seminar Date',
        type: 'date',
        required: true,
        placeholder: 'Select seminar date'
      },
      {
        key: 'issuingAgency',
        label: 'Issuing Agency',
        type: 'select',
        required: true,
        placeholder: 'Select issuing agency',
        options: [
          { value: 'bai', label: 'BAI' },
          { value: 'da-rfo', label: 'DA-RFO' },
          { value: 'recognized', label: 'BAI-recognized Organization' }
        ]
      }
    ]
  },
  {
    _id: 'ath',
        name: 'Authorization to Haul',
    question: null,
    description: 'Authorization from DENR/Mines and Geosciences Bureau for hauling mineral products',
    notes: 'Authorization issued by DENR/MGB for hauling materials',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Requires authorization for hauling and transporting mineral products'
      }
    ],
    customFields: [
      {
        key: 'authorizationNumber',
        label: 'Authorization Number',
        type: 'text',
        required: true,
        placeholder: 'Enter authorization number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // Animal Health Regulation (BAI)
  {
    _id: 'bai-registration',
        name: 'BAI Registration',
    question: 'Is your business a veterinary clinic, hospital, or animal facility?',
    description: 'Registration with Bureau of Animal Industry for veterinary clinics and animal facilities',
    notes: 'Registration with Bureau of Animal Industry per RA 8485 (Animal Welfare Act)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/',
        title: 'RA 8485 - Animal Welfare Act of 1998',
        description: 'Requires BAI registration for veterinary clinics and animal facilities'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter BAI registration number',
        maxLength: 50
      },
      {
        key: 'facilityType',
        label: 'Facility Type',
        type: 'select',
        required: true,
        placeholder: 'Select facility type',
        options: [
          { value: 'clinic', label: 'Veterinary Clinic' },
          { value: 'hospital', label: 'Veterinary Hospital' },
          { value: 'facility', label: 'Animal Facility' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Agriculture & Fisheries (BFAR)
  {
    _id: 'bfar-registration',
        name: 'BFAR Registration',
    question: null,
    description: 'Registration with Bureau of Fisheries and Aquatic Resources for fisheries-related businesses',
    notes: 'Registration issued by Bureau of Fisheries and Aquatic Resources',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/25/republic-act-no-8550/',
        title: 'RA 8550 - Philippine Fisheries Code of 1998',
        description: 'Requires registration with BFAR for fisheries-related businesses'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter BFAR registration number',
        maxLength: 50
      },
      {
        key: 'businessType',
        label: 'Business Type',
        type: 'select',
        required: true,
        placeholder: 'Select business type',
        options: [
          { value: 'aquaculture', label: 'Aquaculture' },
          { value: 'capture', label: 'Fish Capture' },
          { value: 'processing', label: 'Fish Processing' },
          { value: 'trading', label: 'Fish Trading' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // BIR Special Permits
  {
    _id: 'bir-authority-to-print',
        name: 'BIR Authority to Print',
    question: 'Does your business offer printing services for official receipts, sales invoices, or other accountable forms for other businesses?',
    description: 'Authority to Print from BIR for commercial printing of accountable forms',
    notes: 'Authority to Print issued by BIR per Section 238 of NIRC for commercial printing of ORs/SIs for other taxpayers',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1997/12/11/republic-act-no-8424/',
        title: 'RA 8424 - National Internal Revenue Code of 1997',
        description: 'Section 238 requires Authority to Print for commercial printing of accountable forms'
      }
    ],
    customFields: [
      {
        key: 'atpNumber',
        label: 'ATP Number',
        type: 'text',
        required: true,
        placeholder: 'Enter Authority to Print number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // Investment Promotion (BOI/PEZA)
  {
    _id: 'boi-registration',
        name: 'BOI Registration',
    question: 'Is your business export-oriented or a priority project?',
    description: 'Registration with Board of Investments for export-oriented or priority projects for tax incentives',
    notes: 'Registration with Board of Investments for export-oriented or priority projects for tax incentives',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1987/07/16/executive-order-no-226-s-1987/',
        title: 'EO 226 - Omnibus Investments Code of 1987',
        description: 'Provides for BOI registration and tax incentives for priority projects'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter BOI registration number',
        maxLength: 50
      },
      {
        key: 'projectType',
        label: 'Project Type',
        type: 'select',
        required: true,
        placeholder: 'Select project type',
        options: [
          { value: 'export', label: 'Export-Oriented' },
          { value: 'priority', label: 'Priority Project' },
          { value: 'pioneer', label: 'Pioneer Project' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },

  // Agriculture Regulation (BPI)
  {
    _id: 'bpi-accreditation',
        name: 'BPI Accreditation',
    question: 'Is your business a plant nursery producing planting materials?',
    description: 'Accreditation from Bureau of Plant Industry for plant nursery operators',
    notes: 'Accreditation issued by Bureau of Plant Industry for plant nursery operators under Seed Industry Development Act (RA 7308)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/',
        title: 'RA 7308 - Seed Industry Development Act of 1992',
        description: 'Requires BPI accreditation for plant nursery operators'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter BPI accreditation number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },
  {
    _id: 'bpi-license',
        name: 'BPI License to Operate',
    question: 'Does your business sell seeds, planting materials, or agricultural inputs?',
    description: 'License to Operate from Bureau of Plant Industry for seed dealers and plant material handlers',
    notes: 'License to Operate issued by Bureau of Plant Industry for seed dealers and plant material handlers',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/',
        title: 'RA 7308 - Seed Industry Development Act of 1992',
        description: 'Requires BPI license for seed dealers and plant material handlers'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter BPI license number',
        maxLength: 50
      },
      {
        key: 'businessType',
        label: 'Business Type',
        type: 'select',
        required: true,
        placeholder: 'Select business type',
        options: [
          { value: 'seed_dealer', label: 'Seed Dealer' },
          { value: 'plant_material', label: 'Plant Material Handler' },
          { value: 'agricultural_inputs', label: 'Agricultural Inputs' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'bsp-pawnshop-authority',
        name: 'BSP Authority to Operate (Pawnshop)',
    question: 'Is your business a pawnshop?',
    description: 'Authority to Operate from BSP for pawnshops',
    notes: 'Authority to Operate issued by BSP for pawnshops per PD 114 (Pawnshop Regulation Act)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1973/01/01/presidential-decree-no-114-s-1973/',
        title: 'PD 114 - Pawnshop Regulation Act',
        description: 'Requires BSP Authority to Operate for pawnshops'
      }
    ],
    customFields: [
      {
        key: 'authorityNumber',
        label: 'Authority Number',
        type: 'text',
        required: true,
        placeholder: 'Enter BSP authority number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // Financial Regulation (BSP)
  {
    _id: 'bsp-certificate-authority',
        name: 'BSP Certificate of Authority',
    question: 'Is your business a bank or financial institution?',
    description: 'Certificate of Authority from Bangko Sentral ng Pilipinas for banks and financial institutions',
    notes: 'Certificate of Authority issued by Bangko Sentral ng Pilipinas per RA 8791 (General Banking Law)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2000/05/23/republic-act-no-8791/',
        title: 'RA 8791 - General Banking Law of 2000',
        description: 'Requires BSP Certificate of Authority for banks and financial institutions'
      }
    ],
    customFields: [
      {
        key: 'caNumber',
        label: 'Certificate of Authority Number',
        type: 'text',
        required: true,
        placeholder: 'Enter BSP CA number',
        maxLength: 50
      },
      {
        key: 'institutionType',
        label: 'Institution Type',
        type: 'select',
        required: true,
        placeholder: 'Select institution type',
        options: [
          { value: 'bank', label: 'Bank' },
          { value: 'financial', label: 'Financial Institution' },
          { value: 'rural', label: 'Rural Bank' },
          { value: 'cooperative', label: 'Cooperative Bank' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Aviation Regulation (CAAP)
  {
    _id: 'caap-height-clearance',
        name: 'CAAP Height Clearance',
    question: null,
    description: 'Height clearance from Civil Aviation Authority of the Philippines for structures near airports',
    notes: 'Height clearance issued by Civil Aviation Authority of the Philippines',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/',
        title: 'RA 9497 - Civil Aviation Authority Act of 2008',
        description: 'Requires CAAP height clearance for structures near airports'
      }
    ],
    customFields: [
      {
        key: 'clearanceNumber',
        label: 'Clearance Number',
        type: 'text',
        required: true,
        placeholder: 'Enter CAAP clearance number',
        maxLength: 50
      },
      {
        key: 'structureHeight',
        label: 'Structure Height (meters)',
        type: 'number',
        required: true,
        placeholder: 'Enter structure height in meters',
        min: 0,
        step: 0.1
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Aviation Regulation (CAAP)
  {
    _id: 'caap-rpas-operator-certificate',
        name: 'CAAP RPAS Operator Certificate',
    question: 'Does your business use drones for agricultural spraying or commercial operations?',
    description: 'RPAS Operator Certificate from Civil Aviation Authority of the Philippines for commercial drone operations',
    notes: 'RPAS Operator Certificate issued by Civil Aviation Authority of the Philippines for commercial drone operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/',
        title: 'RA 9497 - Civil Aviation Authority Act of 2008',
        description: 'Requires CAAP certificate for commercial drone operations'
      }
    ],
    customFields: [
      {
        key: 'certificateNumber',
        label: 'Certificate Number',
        type: 'text',
        required: true,
        placeholder: 'Enter CAAP certificate number',
        maxLength: 50
      },
      {
        key: 'operationType',
        label: 'Operation Type',
        type: 'select',
        required: true,
        placeholder: 'Select operation type',
        options: [
          { value: 'agricultural', label: 'Agricultural Spraying' },
          { value: 'commercial', label: 'Commercial Operations' },
          { value: 'surveillance', label: 'Surveillance' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'cnc',
        name: 'Certificate of Non-Coverage',
    question: null,
    description: 'Certificate from DENR for projects not requiring full Environmental Compliance Certificate',
    notes: 'Certificate issued by DENR for projects not requiring ECC',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/11/presidential-decree-no-1586-s-1978/',
        title: 'PD 1586 - Environmental Impact Statement System',
        description: 'Provides for Certificate of Non-Coverage for projects not requiring full Environmental Compliance Certificate'
      }
    ],
    customFields: [
      {
        key: 'cncNumber',
        label: 'CNC Number',
        type: 'text',
        required: true,
        placeholder: 'Enter CNC number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'projectLocation',
        label: 'Project Location',
        type: 'text',
        required: true,
        placeholder: 'Enter project location',
        maxLength: 200
      }
    ]
  },

  // CHED Regulation
  {
    _id: 'ched-recognition-permit',
        name: 'CHED Recognition/Permit',
    question: 'Does your institution offer tertiary education (college/university programs)?',
    description: 'Recognition or Permit from Commission on Higher Education for tertiary education institutions',
    notes: 'Recognition or Permit issued by Commission on Higher Education per RA 7722',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1994/05/18/republic-act-no-7722/',
        title: 'RA 7722 - Higher Education Act of 1994',
        description: 'Requires CHED recognition or permit for tertiary education institutions'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit/Recognition Number',
        type: 'text',
        required: true,
        placeholder: 'Enter CHED permit/recognition number',
        maxLength: 50
      },
      {
        key: 'permitType',
        label: 'Permit Type',
        type: 'select',
        required: true,
        placeholder: 'Select permit type',
        options: [
          { value: 'recognition', label: 'Recognition' },
          { value: 'permit', label: 'Permit' },
          { value: 'authority', label: 'Authority' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Congressional Franchise
  {
    _id: 'congressional-franchise',
        name: 'Congressional Franchise',
    question: 'Is your business a public utility requiring a franchise?',
    description: 'Franchise granted by Congress for public utilities (electric, water, telecom)',
    notes: 'Franchise granted by Congress for public utilities (electric, water, telecom) per 1987 Constitution',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1987/02/02/1987-constitution/',
        title: '1987 Philippine Constitution - Article XII, Section 11',
        description: 'Requires congressional franchise for public utilities'
      }
    ],
    customFields: [
      {
        key: 'franchiseNumber',
        label: 'Franchise Number',
        type: 'text',
        required: true,
        placeholder: 'Enter franchise number',
        maxLength: 50
      },
      {
        key: 'utilityType',
        label: 'Utility Type',
        type: 'select',
        required: true,
        placeholder: 'Select utility type',
        options: [
          { value: 'electric', label: 'Electric' },
          { value: 'water', label: 'Water' },
          { value: 'telecom', label: 'Telecommunications' },
          { value: 'transport', label: 'Transport' }
        ]
      },
      {
        key: 'grantDate',
        label: 'Grant Date',
        type: 'date',
        required: true,
        placeholder: 'Select grant date'
      }
    ]
  },

  // Building Regulation (OBO)
  {
    _id: 'demolition-permit',
        name: 'Demolition Permit',
    question: 'Does your business perform demolition services?',
    description: 'Permit from Office of the Building Official for demolition work',
    notes: 'Permit issued by Office of the Building Official for demolition work under National Building Code (PD 1096)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1096-s-1977/',
        title: 'PD 1096 - National Building Code of the Philippines',
        description: 'Requires demolition permit from OBO for demolition work'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter permit number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'projectAddress',
        label: 'Project Address',
        type: 'text',
        required: true,
        placeholder: 'Enter project address',
        maxLength: 200
      }
    ]
  },

  // DENR - Specific CNC for certain businesses
  {
    _id: 'denr-cnc',
        name: 'DENR Certificate of Non-Coverage',
    question: 'Does your business discharge wastewater or use chemicals that may impact the environment?',
    description: 'Certificate of Non-Coverage from DENR-EMB for water discharge compliance',
    notes: 'Certificate of Non-Coverage from DENR-EMB for water discharge compliance (laundry, clinics, etc.)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/11/presidential-decree-no-1586-s-1978/',
        title: 'PD 1586 - Environmental Impact Statement System',
        description: 'Provides for Certificate of Non-Coverage for certain environmental impacts'
      }
    ],
    customFields: [
      {
        key: 'cncNumber',
        label: 'CNC Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DENR CNC number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'businessType',
        label: 'Business Type',
        type: 'select',
        required: true,
        placeholder: 'Select business type',
        options: [
          { value: 'laundry', label: 'Laundry' },
          { value: 'clinic', label: 'Clinic' },
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'other', label: 'Other' }
        ]
      }
    ]
  },
  {
    _id: 'denr-pto-air',
        name: 'DENR Permit to Operate (Air Pollution)',
    question: 'Does your business have air pollution sources (boilers, generators, spray booths)?',
    description: 'Permit to Operate from DENR for air pollution sources',
    notes: 'Permit to Operate for air pollution sources per Clean Air Act (RA 8749)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1999/06/23/republic-act-no-8749/',
        title: 'RA 8749 - Clean Air Act of 1999',
        description: 'Requires Permit to Operate for air pollution sources'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DENR permit number',
        maxLength: 50
      },
      {
        key: 'sourceType',
        label: 'Source Type',
        type: 'select',
        required: true,
        placeholder: 'Select source type',
        options: [
          { value: 'boiler', label: 'Boiler' },
          { value: 'generator', label: 'Generator' },
          { value: 'spray_booth', label: 'Spray Booth' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'denr-pmpin',
        name: 'DENR PMPIN (Pre-Manufacture Pre-Importation Notification)',
    question: 'Does your business manufacture or import new chemical substances?',
    description: 'Pre-Manufacture Pre-Importation Notification for new chemical substances',
    notes: 'Notification required for new chemical substances not listed in PICCS per RA 6969',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1990/10/26/republic-act-no-6969/',
        title: 'RA 6969 - Toxic Substances and Hazardous and Nuclear Wastes Control Act',
        description: 'Requires PMPIN for new chemical substances'
      }
    ],
    customFields: [
      {
        key: 'pmpinNumber',
        label: 'PMPIN Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PMPIN number',
        maxLength: 50
      },
      {
        key: 'chemicalType',
        label: 'Chemical Type',
        type: 'select',
        required: true,
        placeholder: 'Select chemical type',
        options: [
          { value: 'manufacture', label: 'Manufacture' },
          { value: 'import', label: 'Import' },
          { value: 'both', label: 'Manufacture and Import' }
        ]
      },
      {
        key: 'notificationDate',
        label: 'Notification Date',
        type: 'date',
        required: true,
        placeholder: 'Select notification date'
      }
    ]
  },
  {
    _id: 'denr-wastewater-discharge-permit',
        name: 'DENR Wastewater Discharge Permit',
    question: 'Does your business discharge wastewater?',
    description: 'Wastewater Discharge Permit from DENR for facilities with wastewater generation',
    notes: 'Wastewater Discharge Permit for facilities with wastewater generation per Clean Water Act (RA 9275)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/03/22/republic-act-no-9275/',
        title: 'RA 9275 - Philippine Clean Water Act of 2004',
        description: 'Requires Wastewater Discharge Permit for facilities discharging wastewater'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DENR permit number',
        maxLength: 50
      },
      {
        key: 'dischargeVolume',
        label: 'Discharge Volume (cubic meters/day)',
        type: 'number',
        required: true,
        placeholder: 'Enter discharge volume',
        min: 0,
        step: 0.1
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Environmental Permits (DENR - Additional)
  {
    _id: 'denr-wood-processing-permit',
        name: 'DENR Wood Processing Plant Permit',
    question: 'Does your business process lumber, veneer, plywood, or other wood products?',
    description: 'Permit from DENR for wood processing plants',
    notes: 'Permit issued by DENR for wood processing plants per RA 460 and EO 23',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1975/05/19/presidential-decree-no-705-s-1975/',
        title: 'PD 705 - Revised Forestry Code',
        description: 'Requires permit for wood processing plants'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DENR permit number',
        maxLength: 50
      },
      {
        key: 'processingType',
        label: 'Processing Type',
        type: 'select',
        required: true,
        placeholder: 'Select processing type',
        options: [
          { value: 'lumber', label: 'Lumber' },
          { value: 'veneer', label: 'Veneer' },
          { value: 'plywood', label: 'Plywood' },
          { value: 'other', label: 'Other Wood Products' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Education Regulation (DepEd - Separate permits)
  {
    _id: 'deped-permit',
        name: 'DepEd Permit',
    question: 'Does your educational institution offer basic education (K-12)?',
    description: 'Permit from Department of Education for basic education institutions',
    notes: 'Permit issued by DepEd for basic education institutions, valid for 1 school year per RA 9155',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/08/11/republic-act-no-9155/',
        title: 'RA 9155 - Governance of Basic Education Act of 2001',
        description: 'Requires DepEd permit for basic education institutions'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DepEd permit number',
        maxLength: 50
      },
      {
        key: 'schoolYear',
        label: 'School Year',
        type: 'text',
        required: true,
        placeholder: 'Enter school year (e.g., 2024-2025)',
        maxLength: 20
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'deped-recognition',
        name: 'DepEd Recognition',
    question: null,
    description: 'Recognition from Department of Education for schools with complete basic education programs',
    notes: 'Recognition issued by DepEd for schools with complete basic education programs, valid for life of corporation',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/08/11/republic-act-no-9155/',
        title: 'RA 9155 - Governance of Basic Education Act of 2001',
        description: 'Provides for DepEd recognition of schools with complete programs'
      }
    ],
    customFields: [
      {
        key: 'recognitionNumber',
        label: 'Recognition Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DepEd recognition number',
        maxLength: 50
      },
      {
        key: 'programLevel',
        label: 'Program Level',
        type: 'select',
        required: true,
        placeholder: 'Select program level',
        options: [
          { value: 'elementary', label: 'Elementary' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'k12', label: 'K-12 Complete' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Education Regulation (DepEd/CHED/TESDA)
  {
    _id: 'deped-ched-permit',
        name: 'DepEd/CHED Permit',
    question: null,
    description: 'Permit from Department of Education or Commission on Higher Education for educational institutions',
    notes: 'Permit issued by Department of Education or Commission on Higher Education',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/08/20/batas-pambansa-blg-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Requires permits for educational institutions from DepEd or CHED'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter permit number',
        maxLength: 50
      },
      {
        key: 'issuingAgency',
        label: 'Issuing Agency',
        type: 'select',
        required: true,
        placeholder: 'Select issuing agency',
        options: [
          { value: 'deped', label: 'DepEd' },
          { value: 'ched', label: 'CHED' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'dhsud-broker-registration',
        name: 'DHSUD Broker Registration',
    question: 'Does your brokerage deal with subdivision or condominium projects?',
    description: 'Registration with DHSUD for brokers dealing with subdivision or condominium projects',
    notes: 'Registration with DHSUD for brokers dealing with subdivision/condo projects per PD 957',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957-s-1976/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Requires DHSUD registration for brokers dealing with subdivision/condo projects'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DHSUD registration number',
        maxLength: 50
      },
      {
        key: 'projectType',
        label: 'Project Type',
        type: 'select',
        required: true,
        placeholder: 'Select project type',
        options: [
          { value: 'subdivision', label: 'Subdivision' },
          { value: 'condominium', label: 'Condominium' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'dhsud-license-to-sell',
        name: 'DHSUD License to Sell',
    question: 'Is your business a subdivision or condominium developer?',
    description: 'License to Sell from DHSUD for subdivision or condominium developers',
    notes: 'License to Sell issued by DHSUD before marketing subdivision/condo units per PD 957',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957-s-1976/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Requires DHSUD License to Sell before marketing subdivision/condo units'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DHSUD license number',
        maxLength: 50
      },
      {
        key: 'projectName',
        label: 'Project Name',
        type: 'text',
        required: true,
        placeholder: 'Enter project name',
        maxLength: 100
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'dhsud-project-registration',
        name: 'DHSUD Project Registration',
    question: null,
    description: 'Project registration with Department of Human Settlements and Urban Development',
    notes: 'Project registration issued by Department of Human Settlements and Urban Development',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-11201/',
        title: 'RA 11201 - Department of Human Settlements and Urban Development Act',
        description: 'Requires project registration with DHSUD'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DHSUD registration number',
        maxLength: 50
      },
      {
        key: 'projectType',
        label: 'Project Type',
        type: 'select',
        required: true,
        placeholder: 'Select project type',
        options: [
          { value: 'subdivision', label: 'Subdivision' },
          { value: 'condominium', label: 'Condominium' },
          { value: 'housing', label: 'Housing Project' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },

  // ICT Regulation (DICT)
  {
    _id: 'dict-pemedes-authority',
        name: 'DICT PEMEDES Authority',
    question: 'Is your business a delivery courier or messenger service?',
    description: 'Authority to Operate from DICT for Private Express and Messengerial Delivery Services',
    notes: 'Authority to Operate issued by DICT for Private Express and Messengerial Delivery Services under PD 240 and RA 10844',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1973/07/02/presidential-decree-no-240-s-1973/',
        title: 'PD 240 - Postal Service Code',
        description: 'Requires DICT authority for Private Express and Messengerial Delivery Services'
      },
      {
        url: 'https://www.officialgazette.gov.ph/2016/05/23/republic-act-no-10844/',
        title: 'RA 10844 - Department of Information and Communications Technology Act',
        description: 'Transfers PEMEDES authority to DICT'
      }
    ],
    customFields: [
      {
        key: 'authorityNumber',
        label: 'Authority Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DICT authority number',
        maxLength: 50
      },
      {
        key: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        placeholder: 'Select service type',
        options: [
          { value: 'courier', label: 'Courier Service' },
          { value: 'messenger', label: 'Messenger Service' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'dmw-license',
        name: 'DMW License',
    question: 'Does your business recruit Filipino workers for overseas employment?',
    description: 'License from Department of Migrant Workers for overseas recruitment agencies',
    notes: 'License issued by Department of Migrant Workers for overseas recruitment agencies per RA 8042',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/06/07/republic-act-no-8042/',
        title: 'RA 8042 - Migrant Workers and Overseas Filipinos Act of 1995',
        description: 'Requires DMW license for overseas recruitment agencies'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DMW license number',
        maxLength: 50
      },
      {
        key: 'licenseType',
        label: 'License Type',
        type: 'select',
        required: true,
        placeholder: 'Select license type',
        options: [
          { value: 'recruitment', label: 'Recruitment Agency' },
          { value: 'manning', label: 'Manning Agency' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Energy Regulation (DOE)
  {
    _id: 'doe-coc',
        name: 'DOE Certificate of Compliance',
    question: null,
    description: 'Certificate of Compliance from Department of Energy for downstream oil industry participants',
    notes: 'Certificate of Compliance issued by Department of Energy',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/06/10/republic-act-no-8479/',
        title: 'RA 8479 - Downstream Oil Industry Deregulation Act of 1998',
        description: 'Requires DOE Certificate of Compliance for downstream oil industry participants'
      }
    ],
    customFields: [
      {
        key: 'cocNumber',
        label: 'COC Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DOE COC number',
        maxLength: 50
      },
      {
        key: 'facilityType',
        label: 'Facility Type',
        type: 'select',
        required: true,
        placeholder: 'Select facility type',
        options: [
          { value: 'retail', label: 'Retail Station' },
          { value: 'depot', label: 'Depot' },
          { value: 'terminal', label: 'Terminal' },
          { value: 'refinery', label: 'Refinery' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Health Regulation (DOH - Specific LTO)
  {
    _id: 'doh-lto',
        name: 'DOH License to Operate',
    question: 'Is your business a hospital, clinic, or other health facility?',
    description: 'License to Operate from Department of Health for health facilities',
    notes: 'License to Operate issued by DOH for health facilities per RA 4226 (Hospital Licensure Act)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1965/06/19/republic-act-no-4226/',
        title: 'RA 4226 - Hospital Licensure Act',
        description: 'Requires DOH License to Operate for health facilities'
      }
    ],
    customFields: [
      {
        key: 'ltoNumber',
        label: 'LTO Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DOH LTO number',
        maxLength: 50
      },
      {
        key: 'facilityType',
        label: 'Facility Type',
        type: 'select',
        required: true,
        placeholder: 'Select facility type',
        options: [
          { value: 'hospital', label: 'Hospital' },
          { value: 'clinic', label: 'Clinic' },
          { value: 'laboratory', label: 'Laboratory' },
          { value: 'other', label: 'Other Health Facility' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Health Regulation (DOH - Operating Permit)
  {
    _id: 'doh-operating-permit',
        name: 'DOH Operating Permit',
    question: 'Is your business engaged in refuse collection or disposal services?',
    description: 'Operating Permit from regional health office for refuse collection and disposal services',
    notes: 'Operating Permit issued by regional health office for refuse collection and disposal services per PD 856 (Code of Sanitation)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856-s-1975/',
        title: 'PD 856 - Code of Sanitation of the Philippines',
        description: 'Requires DOH operating permit for refuse collection and disposal services'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DOH permit number',
        maxLength: 50
      },
      {
        key: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        placeholder: 'Select service type',
        options: [
          { value: 'collection', label: 'Refuse Collection' },
          { value: 'disposal', label: 'Refuse Disposal' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'doh-permit',
        name: 'DOH Permit',
    question: null,
    description: 'Permit from Department of Health for health-related establishments',
    notes: 'Permit issued by Department of Health',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856-s-1975/',
        title: 'PD 856 - Code of Sanitation of the Philippines',
        description: 'Authorizes DOH to issue health permits for establishments'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DOH permit number',
        maxLength: 50
      },
      {
        key: 'establishmentType',
        label: 'Establishment Type',
        type: 'select',
        required: true,
        placeholder: 'Select establishment type',
        options: [
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'food_service', label: 'Food Service' },
          { value: 'health_facility', label: 'Health Facility' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'doh-permit-to-construct',
        name: 'DOH Permit to Construct',
    question: 'Are you constructing a new hospital or making substantial alterations to an existing one?',
    description: 'Permit to Construct from DOH for new hospitals or major renovations',
    notes: 'Permit to Construct issued by DOH for new hospitals or major renovations per DOH AO 150-2004',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1965/06/19/republic-act-no-4226/',
        title: 'RA 4226 - Hospital Licensure Act',
        description: 'Requires DOH Permit to Construct for new hospitals or major renovations'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DOH permit number',
        maxLength: 50
      },
      {
        key: 'projectType',
        label: 'Project Type',
        type: 'select',
        required: true,
        placeholder: 'Select project type',
        options: [
          { value: 'new', label: 'New Hospital' },
          { value: 'renovation', label: 'Major Renovation' },
          { value: 'expansion', label: 'Expansion' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Labor Regulation (DOLE/DMW)
  {
    _id: 'dole-registration-do174',
        name: 'DOLE Registration (DO 174)',
    question: 'Is your business a local manpower contractor or subcontractor?',
    description: 'Registration with Department of Labor and Employment for legitimate job contracting',
    notes: 'Registration with DOLE under Department Order No. 174-17 for legitimate job contracting',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1974/05/01/presidential-decree-no-442-s-1974/',
        title: 'PD 442 - Labor Code of the Philippines',
        description: 'Requires DOLE registration for legitimate job contracting'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DOLE registration number',
        maxLength: 50
      },
      {
        key: 'contractorType',
        label: 'Contractor Type',
        type: 'select',
        required: true,
        placeholder: 'Select contractor type',
        options: [
          { value: 'principal', label: 'Principal Contractor' },
          { value: 'subcontractor', label: 'Subcontractor' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },

  // Tourism Regulation (DOT)
  {
    _id: 'dot-accreditation',
        name: 'DOT Accreditation',
    question: 'Is your business a tourism enterprise (hotel, resort, travel agency, tour operator)?',
    description: 'Accreditation from Department of Tourism for tourism enterprises',
    notes: 'Accreditation issued by Department of Tourism for tourism enterprises - optional but industry standard',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/',
        title: 'RA 9593 - Tourism Act of 2009',
        description: 'Provides for DOT accreditation of tourism enterprises'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DOT accreditation number',
        maxLength: 50
      },
      {
        key: 'enterpriseType',
        label: 'Enterprise Type',
        type: 'select',
        required: true,
        placeholder: 'Select enterprise type',
        options: [
          { value: 'hotel', label: 'Hotel' },
          { value: 'resort', label: 'Resort' },
          { value: 'travel_agency', label: 'Travel Agency' },
          { value: 'tour_operator', label: 'Tour Operator' }
        ]
      },
      {
        key: 'accreditationDate',
        label: 'Accreditation Date',
        type: 'date',
        required: true,
        placeholder: 'Select accreditation date'
      }
    ]
  },

  // Social Welfare (DSWD)
  {
    _id: 'dswd-permit',
        name: 'DSWD Permit',
    question: null,
    description: 'Permit from Department of Social Welfare and Development for social welfare agencies',
    notes: 'Permit issued by Department of Social Welfare and Development',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1987/06/10/executive-order-no-123-s-1987/',
        title: 'EO 123 - Reorganizing the DSWD',
        description: 'Authorizes DSWD to issue permits for social welfare agencies'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DSWD permit number',
        maxLength: 50
      },
      {
        key: 'agencyType',
        label: 'Agency Type',
        type: 'select',
        required: true,
        placeholder: 'Select agency type',
        options: [
          { value: 'residential', label: 'Residential Facility' },
          { value: 'community', label: 'Community-Based' },
          { value: 'daycare', label: 'Daycare Center' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // DTI Accreditation
  {
    _id: 'dti-accreditation',
        name: 'DTI Accreditation',
    question: null,
    description: 'Accreditation from DTI for repair shops and other specialized services',
    notes: 'Accreditation issued by DTI for repair shops and other specialized services (required by some LGUs)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2003/11/07/republic-act-no-8483/',
        title: 'RA 8483 - Revised Consumer Act of the Philippines',
        description: 'Authorizes DTI accreditation for specialized service providers'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DTI accreditation number',
        maxLength: 50
      },
      {
        key: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        placeholder: 'Select service type',
        options: [
          { value: 'repair', label: 'Repair Shop' },
          { value: 'specialized', label: 'Specialized Service' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Trade Regulation (DTI - Freight Forwarding)
  {
    _id: 'dti-freight-forwarding-accreditation',
        name: 'DTI Freight Forwarding Accreditation',
    question: 'Is your business a freight forwarder (NVOCC, IFF, or DFF)?',
    description: 'Mandatory accreditation from DTI for freight forwarders',
    notes: 'Mandatory accreditation issued by DTI under Department Administrative Order No. 24-09',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2003/11/07/republic-act-no-8483/',
        title: 'RA 8483 - Revised Consumer Act of the Philippines',
        description: 'Authorizes DTI accreditation for freight forwarders'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DTI accreditation number',
        maxLength: 50
      },
      {
        key: 'forwarderType',
        label: 'Forwarder Type',
        type: 'select',
        required: true,
        placeholder: 'Select forwarder type',
        options: [
          { value: 'nvocc', label: 'NVOCC' },
          { value: 'iff', label: 'IFF' },
          { value: 'dff', label: 'DFF' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'dti-gtido-registration',
        name: 'DTI GTIDO Registration',
    question: 'Is your business export-oriented in garments and textiles?',
    description: 'Registration with Garments and Textile Industry Development Office for export-oriented manufacturers',
    notes: 'Registration with Garments and Textile Industry Development Office for export-oriented manufacturers',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/03/01/republic-act-no-9271/',
        title: 'RA 9271 - Garments and Textile Industry Development Act',
        description: 'Requires GTIDO registration for export-oriented manufacturers'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter GTIDO registration number',
        maxLength: 50
      },
      {
        key: 'productType',
        label: 'Product Type',
        type: 'select',
        required: true,
        placeholder: 'Select product type',
        options: [
          { value: 'garments', label: 'Garments' },
          { value: 'textiles', label: 'Textiles' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },
  {
    _id: 'e-pharmacy-lto',
        name: 'E-Pharmacy LTO',
    question: 'Does your business operate online or offer e-pharmacy services?',
    description: 'License to Operate from FDA for online pharmacy operations',
    notes: 'Additional activity on existing LTO or separate pure E-Pharmacy LTO for online operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/08/18/republic-act-no-9711/',
        title: 'RA 9711 - Food and Drug Administration Act of 2009',
        description: 'Requires LTO for e-pharmacy operations per FDA guidelines'
      }
    ],
    customFields: [
      {
        key: 'ltoNumber',
        label: 'LTO Number',
        type: 'text',
        required: true,
        placeholder: 'Enter FDA LTO number',
        maxLength: 50
      },
      {
        key: 'operationType',
        label: 'Operation Type',
        type: 'select',
        required: true,
        placeholder: 'Select operation type',
        options: [
          { value: 'additional', label: 'Additional Activity' },
          { value: 'pure', label: 'Pure E-Pharmacy' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  // Environmental Permits (DENR)
  {
    _id: 'ecc',
        name: 'Environmental Compliance Certificate',
    question: null,
    description: 'Certificate from Department of Environment and Natural Resources for projects with significant environmental impact',
    notes: 'Certificate issued by DENR for projects with significant environmental impact',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/11/presidential-decree-no-1586-s-1978/',
        title: 'PD 1586 - Environmental Impact Statement System',
        description: 'Establishes the Environmental Impact Statement System including the requirement for Environmental Compliance Certificates'
      }
    ],
    customFields: [
      {
        key: 'eccNumber',
        label: 'ECC Number',
        type: 'text',
        required: true,
        placeholder: 'Enter ECC number',
        maxLength: 50
      },
      {
        key: 'projectType',
        label: 'Project Type',
        type: 'select',
        required: true,
        placeholder: 'Select project type',
        options: [
          { value: 'industrial', label: 'Industrial' },
          { value: 'infrastructure', label: 'Infrastructure' },
          { value: 'mining', label: 'Mining' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'erc-certificate',
        name: 'ERC Certificate',
    question: null,
    description: 'Certificate from Energy Regulatory Commission for electricity-related activities',
    notes: 'Certificate issued by Energy Regulatory Commission',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act of 2001',
        description: 'Requires ERC certificate for electricity-related activities'
      }
    ],
    customFields: [
      {
        key: 'certificateNumber',
        label: 'Certificate Number',
        type: 'text',
        required: true,
        placeholder: 'Enter ERC certificate number',
        maxLength: 50
      },
      {
        key: 'activityType',
        label: 'Activity Type',
        type: 'select',
        required: true,
        placeholder: 'Select activity type',
        options: [
          { value: 'generation', label: 'Generation' },
          { value: 'transmission', label: 'Transmission' },
          { value: 'distribution', label: 'Distribution' },
          { value: 'supply', label: 'Supply' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Energy Regulation (ERC)
  {
    _id: 'erc-cpcn',
        name: 'ERC Certificate of Public Convenience and Necessity',
    question: 'Is your business an electric power distributor?',
    description: 'Certificate of Public Convenience and Necessity from Energy Regulatory Commission for power distributors',
    notes: 'Certificate of Public Convenience and Necessity issued by Energy Regulatory Commission',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act of 2001',
        description: 'Requires ERC Certificate of Public Convenience and Necessity for power distributors'
      }
    ],
    customFields: [
      {
        key: 'cpcnNumber',
        label: 'CPCN Number',
        type: 'text',
        required: true,
        placeholder: 'Enter ERC CPCN number',
        maxLength: 50
      },
      {
        key: 'franchiseArea',
        label: 'Franchise Area',
        type: 'text',
        required: true,
        placeholder: 'Enter franchise area',
        maxLength: 200
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Food & Drug Regulation (FDA/DOH)
  {
    _id: 'fda-lto',
        name: 'FDA License to Operate',
    question: null,
    description: 'License to Operate from Food and Drug Administration for health product establishments',
    notes: 'License to Operate issued by FDA for health product establishments',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/08/18/republic-act-no-9711/',
        title: 'RA 9711 - Food and Drug Administration Act of 2009',
        description: 'Establishes the FDA and requires LTO for establishments handling food, drugs, cosmetics, and medical devices'
      }
    ],
    customFields: [
      {
        key: 'ltoNumber',
        label: 'LTO Number',
        type: 'text',
        required: true,
        placeholder: 'Enter FDA LTO number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      },
      {
        key: 'centerType',
        label: 'Center Type',
        type: 'select',
        required: true,
        placeholder: 'Select center type',
        options: [
          { value: 'drug', label: 'Drug Establishment' },
          { value: 'device', label: 'Medical Device Establishment' },
          { value: 'cosmetic', label: 'Cosmetic Establishment' },
          { value: 'food', label: 'Food Establishment' }
        ]
      }
    ]
  },

  // Pesticide Regulation (FPA)
  {
    _id: 'fpa-commercial-applicator-license',
        name: 'FPA Commercial Applicator License',
    question: 'Does your business provide pesticide application services?',
    description: 'License from Fertilizer and Pesticide Authority for commercial pesticide applicators',
    notes: 'License issued by Fertilizer and Pesticide Authority for commercial pesticide applicators',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/08/18/republic-act-no-9711/',
        title: 'RA 9711 - Food and Drug Administration Act of 2009',
        description: 'FPA under FDA requires license for commercial pesticide applicators'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter FPA license number',
        maxLength: 50
      },
      {
        key: 'serviceArea',
        label: 'Service Area',
        type: 'text',
        required: true,
        placeholder: 'Enter service area',
        maxLength: 200
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'fpa-lto',
        name: 'FPA License to Operate',
    question: null,
    description: 'License to Operate from Fertilizer and Pesticide Authority for fertilizer and pesticide handlers',
    notes: 'License to Operate issued by Fertilizer and Pesticide Authority for fertilizer and pesticide handlers',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/08/18/republic-act-no-9711/',
        title: 'RA 9711 - Food and Drug Administration Act of 2009',
        description: 'FPA under FDA requires LTO for fertilizer and pesticide establishments'
      }
    ],
    customFields: [
      {
        key: 'ltoNumber',
        label: 'LTO Number',
        type: 'text',
        required: true,
        placeholder: 'Enter FPA LTO number',
        maxLength: 50
      },
      {
        key: 'productType',
        label: 'Product Type',
        type: 'select',
        required: true,
        placeholder: 'Select product type',
        options: [
          { value: 'fertilizer', label: 'Fertilizer' },
          { value: 'pesticide', label: 'Pesticide' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Real Estate Regulation (DHSUD/HLURB)
  {
    _id: 'hlurb-registration',
        name: 'HLURB Registration',
    question: null,
    description: 'Registration with Housing and Land Use Regulatory Board for real estate projects',
    notes: 'Registration issued by Housing and Land Use Regulatory Board',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957-s-1976/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Requires HLURB registration for real estate projects'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter HLURB registration number',
        maxLength: 50
      },
      {
        key: 'projectType',
        label: 'Project Type',
        type: 'select',
        required: true,
        placeholder: 'Select project type',
        options: [
          { value: 'subdivision', label: 'Subdivision' },
          { value: 'condominium', label: 'Condominium' },
          { value: 'housing', label: 'Housing Project' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },

  // Local Government Permits (Health/Safety/Zoning)
  {
    _id: 'liquor-license',
        name: 'Liquor License',
    question: 'Does your business serve alcoholic beverages?',
    description: 'License from LGU for establishments serving alcohol',
    notes: 'License issued by LGU for establishments serving alcohol under local tax ordinances',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'RA 7160 - Local Government Code of 1991',
        description: 'Authorizes LGUs to issue liquor licenses under local tax ordinances'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter LGU license number',
        maxLength: 50
      },
      {
        key: 'licenseType',
        label: 'License Type',
        type: 'select',
        required: true,
        placeholder: 'Select license type',
        options: [
          { value: 'class_a', label: 'Class A' },
          { value: 'class_b', label: 'Class B' },
          { value: 'class_c', label: 'Class C' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Environmental Regulation (LLDA)
  {
    _id: 'llda-discharge-permit',
        name: 'LLDA Discharge Permit',
    question: 'Is your business located in the Laguna de Bay Region and discharges liquid waste?',
    description: 'Discharge Permit from Laguna Lake Development Authority for liquid waste discharge',
    notes: 'Discharge Permit issued by Laguna Lake Development Authority under RA 4850',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1966/06/18/republic-act-no-4850/',
        title: 'RA 4850 - Laguna Lake Development Authority Act',
        description: 'Requires LLDA Discharge Permit for liquid waste discharge in Laguna de Bay Region'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter LLDA permit number',
        maxLength: 50
      },
      {
        key: 'dischargeVolume',
        label: 'Discharge Volume (cubic meters/day)',
        type: 'number',
        required: true,
        placeholder: 'Enter discharge volume',
        min: 0,
        step: 0.1
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Transportation Regulation (LTFRB)
  {
    _id: 'ltfrb-cpc',
        name: 'LTFRB Certificate of Public Convenience',
    question: 'Does your business operate public utility vehicles (bus, taxi, jeepney, truck-for-hire)?',
    description: 'Certificate of Public Convenience from LTFRB for public transport',
    notes: 'Certificate of Public Convenience issued by LTFRB for public transport under Commonwealth Act 146',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1936/11/07/commonwealth-act-no-146/',
        title: 'CA 146 - Public Service Act',
        description: 'Requires LTFRB CPC for public transport operations'
      }
    ],
    customFields: [
      {
        key: 'cpcNumber',
        label: 'CPC Number',
        type: 'text',
        required: true,
        placeholder: 'Enter LTFRB CPC number',
        maxLength: 50
      },
      {
        key: 'vehicleType',
        label: 'Vehicle Type',
        type: 'select',
        required: true,
        placeholder: 'Select vehicle type',
        options: [
          { value: 'bus', label: 'Bus' },
          { value: 'taxi', label: 'Taxi' },
          { value: 'jeepney', label: 'Jeepney' },
          { value: 'truck', label: 'Truck-for-Hire' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Transportation Regulation (LTFRB)
  {
    _id: 'ltfrb-franchise',
        name: 'LTFRB Franchise',
    question: null,
    description: 'Franchise from Land Transportation Franchising and Regulatory Board for public utility vehicles',
    notes: 'Franchise issued by Land Transportation Franchising and Regulatory Board',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1964/06/15/republic-act-no-4160/',
        title: 'RA 4160 - An Act to Reorganize the Land Transportation Commission',
        description: 'Authorizes LTFRB to issue franchises for public utility vehicles'
      }
    ],
    customFields: [
      {
        key: 'franchiseNumber',
        label: 'Franchise Number',
        type: 'text',
        required: true,
        placeholder: 'Enter LTFRB franchise number',
        maxLength: 50
      },
      {
        key: 'route',
        label: 'Route',
        type: 'text',
        required: true,
        placeholder: 'Enter route',
        maxLength: 200
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Transportation & Driving (LTO)
  {
    _id: 'lto-accreditation',
        name: 'LTO Accreditation',
    question: null,
    description: 'Accreditation from Land Transportation Office for transportation-related establishments',
    notes: 'Accreditation issued by Land Transportation Office',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1964/06/15/republic-act-no-4136/',
        title: 'RA 4136 - Land Transportation and Traffic Code',
        description: 'Authorizes LTO to accredit transportation-related establishments'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter LTO accreditation number',
        maxLength: 50
      },
      {
        key: 'establishmentType',
        label: 'Establishment Type',
        type: 'select',
        required: true,
        placeholder: 'Select establishment type',
        options: [
          { value: 'driving_school', label: 'Driving School' },
          { value: 'clinic', label: 'Medical Clinic' },
          { value: 'workshop', label: 'Motor Vehicle Workshop' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'lto-vehicle-registration',
        name: 'LTO Vehicle Registration',
    question: 'Does your business operate motor vehicles (trucks, PUVs, delivery vehicles)?',
    description: 'Vehicle registration from Land Transportation Office for each motor vehicle',
    notes: 'Vehicle registration issued by Land Transportation Office for each motor vehicle per RA 4136',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1964/06/15/republic-act-no-4136/',
        title: 'RA 4136 - Land Transportation and Traffic Code',
        description: 'Requires vehicle registration with LTO for all motor vehicles'
      }
    ],
    customFields: [
      {
        key: 'plateNumber',
        label: 'Plate Number',
        type: 'text',
        required: true,
        placeholder: 'Enter plate number',
        maxLength: 20
      },
      {
        key: 'vehicleType',
        label: 'Vehicle Type',
        type: 'select',
        required: true,
        placeholder: 'Select vehicle type',
        options: [
          { value: 'truck', label: 'Truck' },
          { value: 'puv', label: 'Public Utility Vehicle' },
          { value: 'delivery', label: 'Delivery Vehicle' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },
  {
    _id: 'medical-device-retailer-lto',
        name: 'Medical Device Retailer LTO',
    question: 'Does your business sell or offer to sell medical devices?',
    description: 'License to Operate from FDA as Retailer of Medical Devices',
    notes: 'Separate LTO from FDA as Retailer of Medical Devices per FDA Circular No. 2021-0021',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/08/18/republic-act-no-9711/',
        title: 'RA 9711 - Food and Drug Administration Act of 2009',
        description: 'Requires separate LTO for medical device retailers per FDA Circular No. 2021-0021'
      }
    ],
    customFields: [
      {
        key: 'ltoNumber',
        label: 'LTO Number',
        type: 'text',
        required: true,
        placeholder: 'Enter FDA LTO number',
        maxLength: 50
      },
      {
        key: 'deviceCategory',
        label: 'Device Category',
        type: 'select',
        required: true,
        placeholder: 'Select device category',
        options: [
          { value: 'class_a', label: 'Class A' },
          { value: 'class_b', label: 'Class B' },
          { value: 'class_c', label: 'Class C' },
          { value: 'class_d', label: 'Class D' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Mining Regulation (MGB)
  {
    _id: 'mgb-exploration-permit',
        name: 'MGB Exploration Permit',
    question: 'Is your business engaged in mining exploration?',
    description: 'Exploration Permit from Mines and Geosciences Bureau for mining exploration',
    notes: 'Exploration Permit issued by Mines and Geosciences Bureau under RA 7942 (Philippine Mining Act)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Requires MGB exploration permit for mining exploration'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter MGB permit number',
        maxLength: 50
      },
      {
        key: 'mineralType',
        label: 'Mineral Type',
        type: 'select',
        required: true,
        placeholder: 'Select mineral type',
        options: [
          { value: 'metallic', label: 'Metallic' },
          { value: 'non_metallic', label: 'Non-Metallic' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'mgb-mineral-agreement',
        name: 'MGB Mineral Agreement',
    question: 'Is your business engaged in mining production operations?',
    description: 'Mineral Agreement from MGB for mining production operations',
    notes: 'Mineral Agreement issued by MGB for production operations under RA 7942',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Requires MGB Mineral Agreement for mining production operations'
      }
    ],
    customFields: [
      {
        key: 'agreementNumber',
        label: 'Agreement Number',
        type: 'text',
        required: true,
        placeholder: 'Enter MGB agreement number',
        maxLength: 50
      },
      {
        key: 'agreementType',
        label: 'Agreement Type',
        type: 'select',
        required: true,
        placeholder: 'Select agreement type',
        options: [
          { value: 'mps', label: 'Mineral Production Sharing' },
          { value: 'mpsaa', label: 'MPSA' },
          { value: 'ftaa', label: 'Financial or Technical Assistance' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'mgb-permit',
        name: 'MGB Permit',
    question: null,
    description: 'Permit from Mines and Geosciences Bureau for mining-related activities',
    notes: 'Permit issued by Mines and Geosciences Bureau',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Authorizes MGB to issue various mining permits and licenses'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter MGB permit number',
        maxLength: 50
      },
      {
        key: 'permitType',
        label: 'Permit Type',
        type: 'select',
        required: true,
        placeholder: 'Select permit type',
        options: [
          { value: 'exploration', label: 'Exploration' },
          { value: 'extraction', label: 'Extraction' },
          { value: 'processing', label: 'Processing' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Publishing Regulation (NBDB)
  {
    _id: 'nbdb-publisher-registration',
        name: 'NBDB Publisher Registration',
    question: 'Is your business a publisher of books or similar publications?',
    description: 'Registration with National Book Development Board for ISBN issuance and incentives',
    notes: 'Registration with National Book Development Board for ISBN issuance and incentives per RA 8047',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/06/07/republic-act-no-8047/',
        title: 'RA 8047 - Book Publishing Industry Development Act',
        description: 'Requires NBDB registration for publishers'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NBDB registration number',
        maxLength: 50
      },
      {
        key: 'publicationType',
        label: 'Publication Type',
        type: 'select',
        required: true,
        placeholder: 'Select publication type',
        options: [
          { value: 'books', label: 'Books' },
          { value: 'journals', label: 'Journals' },
          { value: 'educational', label: 'Educational Materials' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },
  {
    _id: 'nfa-accreditation',
        name: 'NFA Accreditation',
    question: 'Is your business a rice retailer with annual sales exceeding ₱2 million?',
    description: 'Accreditation from National Food Authority for large rice retailers',
    notes: 'Accreditation issued by National Food Authority for large rice retailers per RA 10611',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2013/08/23/republic-act-no-10611/',
        title: 'RA 10611 - Food Safety Act of 2013',
        description: 'Requires NFA accreditation for large rice retailers'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NFA accreditation number',
        maxLength: 50
      },
      {
        key: 'annualSales',
        label: 'Annual Sales (₱)',
        type: 'number',
        required: true,
        placeholder: 'Enter annual sales',
        min: 0,
        step: 1
      },
      {
        key: 'accreditationDate',
        label: 'Accreditation Date',
        type: 'date',
        required: true,
        placeholder: 'Select accreditation date'
      }
    ]
  },

  // Food Regulation (NFA)
  {
    _id: 'nfa-license',
        name: 'NFA License',
    question: 'Is your rice/corn mill engaged in bonded activities (accepting third-party stocks)?',
    description: 'Grains Bonded Business License from National Food Authority for mills accepting third-party stocks',
    notes: 'Grains Bonded Business License issued by National Food Authority for mills accepting third-party stocks',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2013/08/23/republic-act-no-10611/',
        title: 'RA 10611 - Food Safety Act of 2013',
        description: 'Requires NFA license for bonded grain activities'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NFA license number',
        maxLength: 50
      },
      {
        key: 'activityType',
        label: 'Activity Type',
        type: 'select',
        required: true,
        placeholder: 'Select activity type',
        options: [
          { value: 'rice_milling', label: 'Rice Milling' },
          { value: 'corn_milling', label: 'Corn Milling' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'nfa-registration',
        name: 'NFA Registration',
    question: 'Is your business engaged in rice/corn milling or related grains business?',
    description: 'Registration with National Food Authority for grains business operations',
    notes: 'Registration with National Food Authority for grains business operations under RA 10611',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2013/08/23/republic-act-no-10611/',
        title: 'RA 10611 - Food Safety Act of 2013',
        description: 'Requires NFA registration for grains business operations'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NFA registration number',
        maxLength: 50
      },
      {
        key: 'businessType',
        label: 'Business Type',
        type: 'select',
        required: true,
        placeholder: 'Select business type',
        options: [
          { value: 'rice_mill', label: 'Rice Mill' },
          { value: 'corn_mill', label: 'Corn Mill' },
          { value: 'trader', label: 'Grains Trader' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },
  {
    _id: 'nmis-accreditation',
        name: 'NMIS Accreditation',
    question: 'Does your business handle or sell meat products?',
    description: 'Accreditation from National Meat Inspection Service for meat handlers and vendors',
    notes: 'Accreditation issued by National Meat Inspection Service for meat handlers and vendors per RA 9296',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/05/12/republic-act-no-9296/',
        title: 'RA 9296 - Meat Inspection Code of the Philippines',
        description: 'Requires NMIS accreditation for meat handlers and vendors'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NMIS accreditation number',
        maxLength: 50
      },
      {
        key: 'facilityType',
        label: 'Facility Type',
        type: 'select',
        required: true,
        placeholder: 'Select facility type',
        options: [
          { value: 'cold_storage', label: 'Cold Storage' },
          { value: 'meat_shop', label: 'Meat Shop' },
          { value: 'market', label: 'Market Stall' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'non-metallic-mining-permit',
        name: 'Non-Metallic Mining Permit',
    question: null,
    description: 'Permit from DENR/Mines and Geosciences Bureau for non-metallic mining operations',
    notes: 'Permit issued by DENR/MGB for non-metallic mining operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Regulates non-metallic mining operations and permits'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter permit number',
        maxLength: 50
      },
      {
        key: 'mineralType',
        label: 'Mineral Type',
        type: 'select',
        required: true,
        placeholder: 'Select mineral type',
        options: [
          { value: 'sand_gravel', label: 'Sand and Gravel' },
          { value: 'limestone', label: 'Limestone' },
          { value: 'marble', label: 'Marble' },
          { value: 'other', label: 'Other Non-Metallic' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Data Privacy Regulation (NPC)
  {
    _id: 'npc-registration',
        name: 'NPC Registration',
    question: 'Does your business process personal data as a Personal Information Controller?',
    description: 'Registration with National Privacy Commission for Personal Information Controllers',
    notes: 'Registration with National Privacy Commission per RA 10173 (Data Privacy Act)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/',
        title: 'RA 10173 - Data Privacy Act of 2012',
        description: 'Requires NPC registration for Personal Information Controllers'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NPC registration number',
        maxLength: 50
      },
      {
        key: 'dataVolume',
        label: 'Data Volume (records)',
        type: 'number',
        required: true,
        placeholder: 'Enter number of records processed',
        min: 0,
        step: 1
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },

  // Telecommunications Regulation (NTC)
  {
    _id: 'ntc-cpcn',
        name: 'NTC Certificate of Public Convenience and Necessity',
    question: 'Is your business a telecommunications provider?',
    description: 'Certificate of Public Convenience and Necessity from NTC for telecom services',
    notes: 'Certificate of Public Convenience and Necessity issued by NTC for telecom services',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/01/republic-act-no-7925/',
        title: 'RA 7925 - Public Telecommunications Policy Act',
        description: 'Requires NTC CPCN for telecom service providers'
      }
    ],
    customFields: [
      {
        key: 'cpcnNumber',
        label: 'CPCN Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NTC CPCN number',
        maxLength: 50
      },
      {
        key: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        placeholder: 'Select service type',
        options: [
          { value: 'telephony', label: 'Telephony' },
          { value: 'internet', label: 'Internet Service' },
          { value: 'mobile', label: 'Mobile Service' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'ntc-certificate',
        name: 'NTC Certificate of Registration',
    question: null,
    description: 'Certificate of Registration from National Telecommunications Commission for telecommunications equipment and services',
    notes: 'Certificate of Registration issued by National Telecommunications Commission',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1936/11/07/commonwealth-act-no-146/',
        title: 'CA 146 - Public Service Act',
        description: 'Requires NTC registration for telecommunications equipment and services'
      }
    ],
    customFields: [
      {
        key: 'certificateNumber',
        label: 'Certificate Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NTC certificate number',
        maxLength: 50
      },
      {
        key: 'equipmentType',
        label: 'Equipment Type',
        type: 'select',
        required: true,
        placeholder: 'Select equipment type',
        options: [
          { value: 'radio', label: 'Radio Equipment' },
          { value: 'telecom', label: 'Telecommunications' },
          { value: 'broadcast', label: 'Broadcast Equipment' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Telecommunications Regulation (NTC)
  {
    _id: 'ntc-pa-cpcn',
        name: 'NTC Provisional Authority/CPCN',
    question: null,
    description: 'Provisional Authority or Certificate of Public Convenience and Necessity from NTC',
    notes: 'Provisional Authority or Certificate of Public Convenience and Necessity issued by NTC',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1936/11/07/commonwealth-act-no-146/',
        title: 'CA 146 - Public Service Act',
        description: 'Requires NTC authority for telecommunications services'
      }
    ],
    customFields: [
      {
        key: 'authorityNumber',
        label: 'Authority Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NTC authority number',
        maxLength: 50
      },
      {
        key: 'authorityType',
        label: 'Authority Type',
        type: 'select',
        required: true,
        placeholder: 'Select authority type',
        options: [
          { value: 'provisional', label: 'Provisional Authority' },
          { value: 'cpcn', label: 'CPCN' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Water Utilities Regulation (NWRB)
  {
    _id: 'nwrb-cpc',
        name: 'NWRB Certificate of Public Convenience',
    question: 'Is your business a water utility provider?',
    description: 'Certificate of Public Convenience from NWRB for water utilities',
    notes: 'Certificate of Public Convenience issued by NWRB for water utilities under PD 1067 (Water Code)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/12/31/presidential-decree-no-1067/',
        title: 'PD 1067 - Water Code of the Philippines',
        description: 'Requires NWRB CPC for water utility providers'
      }
    ],
    customFields: [
      {
        key: 'cpcNumber',
        label: 'CPC Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NWRB CPC number',
        maxLength: 50
      },
      {
        key: 'serviceArea',
        label: 'Service Area',
        type: 'text',
        required: true,
        placeholder: 'Enter service area',
        maxLength: 200
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Utilities Regulation (NWRB/ERC)
  {
    _id: 'nwrb-water-permit',
        name: 'NWRB Water Permit',
    question: null,
    description: 'Water permit from National Water Resources Board for water use and extraction',
    notes: 'Water permit issued by National Water Resources Board',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/12/31/presidential-decree-no-1067-s-1976/',
        title: 'PD 1067 - Water Code of the Philippines',
        description: 'Requires water permit from NWRB for water use and extraction'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter NWRB permit number',
        maxLength: 50
      },
      {
        key: 'waterUse',
        label: 'Water Use',
        type: 'select',
        required: true,
        placeholder: 'Select water use',
        options: [
          { value: 'domestic', label: 'Domestic' },
          { value: 'industrial', label: 'Industrial' },
          { value: 'agricultural', label: 'Agricultural' },
          { value: 'commercial', label: 'Commercial' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Construction Regulation (PCAB)
  {
    _id: 'pcab-license',
        name: 'PCAB License',
    question: null,
    description: 'License from Philippine Contractors Accreditation Board for construction contractors',
    notes: 'License issued by Philippine Contractors Accreditation Board',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2010/02/12/republic-act-no-4566/',
        title: 'RA 4566 - Contractors License Law',
        description: 'Requires PCAB license for construction contractors'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PCAB license number',
        maxLength: 50
      },
      {
        key: 'licenseCategory',
        label: 'License Category',
        type: 'select',
        required: true,
        placeholder: 'Select license category',
        options: [
          { value: 'regular', label: 'Regular' },
          { value: 'special', label: 'Special' },
          { value: 'trade', label: 'Trade' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // PDEA Regulation
  {
    _id: 'pdea-s2-license',
        name: 'PDEA S2 License',
    question: 'Does your veterinary facility handle controlled substances?',
    description: 'S2 License from Philippine Drug Enforcement Agency for facilities handling controlled substances',
    notes: 'S2 License issued by Philippine Drug Enforcement Agency for facilities handling controlled substances',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2002/06/07/republic-act-no-9165/',
        title: 'RA 9165 - Comprehensive Dangerous Drugs Act of 2002',
        description: 'Requires PDEA S2 license for facilities handling controlled substances'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PDEA S2 license number',
        maxLength: 50
      },
      {
        key: 'facilityType',
        label: 'Facility Type',
        type: 'select',
        required: true,
        placeholder: 'Select facility type',
        options: [
          { value: 'pharmacy', label: 'Pharmacy' },
          { value: 'hospital', label: 'Hospital' },
          { value: 'clinic', label: 'Clinic' },
          { value: 'laboratory', label: 'Laboratory' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'peza-registration',
        name: 'PEZA Registration',
    question: 'Is your business located in or operating within an economic zone?',
    description: 'Registration with Philippine Economic Zone Authority for economic zone locators',
    notes: 'Registration with Philippine Economic Zone Authority for economic zone locators',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/02/20/republic-act-no-7916/',
        title: 'RA 7916 - Special Economic Zone Act of 1995',
        description: 'Authorizes PEZA to register and oversee economic zone enterprises'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PEZA registration number',
        maxLength: 50
      },
      {
        key: 'zoneType',
        label: 'Zone Type',
        type: 'select',
        required: true,
        placeholder: 'Select zone type',
        options: [
          { value: 'ecozone', label: 'Ecozone' },
          { value: 'it_park', label: 'IT Park' },
          { value: 'industrial', label: 'Industrial Estate' }
        ]
      },
      {
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        required: true,
        placeholder: 'Select registration date'
      }
    ]
  },
  {
    _id: 'pharmacist-in-charge-credential',
        name: 'Pharmacist-in-Charge Credential',
    question: null,
    description: 'PRC license for pharmacist-in-charge required for pharmacies',
    notes: 'PRC license for pharmacist-in-charge required per RA 10918 Philippine Pharmacy Act',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2016/06/21/republic-act-no-10918/',
        title: 'RA 10918 - Philippine Pharmacy Act of 2016',
        description: 'Requires PRC license for pharmacist-in-charge'
      }
    ],
    customFields: [
      {
        key: 'prcLicenseNumber',
        label: 'PRC License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PRC license number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // PhilHealth Accreditation
  {
    _id: 'philhealth-accreditation',
        name: 'PhilHealth Accreditation',
    question: 'Does your health facility bill PhilHealth for services?',
    description: 'Accreditation from PhilHealth for health facilities participating in the National Health Insurance Program',
    notes: 'Accreditation issued by PhilHealth for health facilities participating in the National Health Insurance Program',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/02/24/republic-act-no-7875/',
        title: 'RA 7875 - National Health Insurance Act of 1995',
        description: 'Provides for PhilHealth accreditation of health facilities'
      }
    ],
    customFields: [
      {
        key: 'accreditationNumber',
        label: 'Accreditation Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PhilHealth accreditation number',
        maxLength: 50
      },
      {
        key: 'facilityType',
        label: 'Facility Type',
        type: 'select',
        required: true,
        placeholder: 'Select facility type',
        options: [
          { value: 'hospital', label: 'Hospital' },
          { value: 'clinic', label: 'Clinic' },
          { value: 'diagnostic', label: 'Diagnostic Center' },
          { value: 'birthing', label: 'Birthing Home' }
        ]
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // PNP Firearms and Explosives Office (FEO)
  {
    _id: 'pnp-feo-license',
        name: 'PNP-FEO License/Permit',
    question: 'Does your business manufacture, sell, distribute, or display fireworks/pyrotechnics?',
    description: 'License/Permit from PNP-FEO for fireworks/pyrotechnics businesses',
    notes: 'License/Permit issued by PNP-FEO for fireworks/pyrotechnics per RA 7183 (Manufacturer, Dealer, Retailer, or Display Operator)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/01/30/republic-act-no-7183/',
        title: 'RA 7183 - Firecrackers and Other Pyrotechnic Devices',
        description: 'Requires PNP-FEO license for fireworks/pyrotechnics businesses'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PNP-FEO license number',
        maxLength: 50
      },
      {
        key: 'licenseType',
        label: 'License Type',
        type: 'select',
        required: true,
        placeholder: 'Select license type',
        options: [
          { value: 'manufacturer', label: 'Manufacturer' },
          { value: 'dealer', label: 'Dealer' },
          { value: 'retailer', label: 'Retailer' },
          { value: 'display', label: 'Display Operator' }
        ]
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // Security Regulation (PNP)
  {
    _id: 'pnp-sosia-license',
        name: 'PNP-SOSIA License',
    question: null,
    description: 'License from Philippine National Police for security agencies',
    notes: 'License issued by Philippine National Police for security agencies',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2010/02/12/republic-act-no-5487/',
        title: 'RA 5487 - Private Security Agency Law',
        description: 'Requires licensing from PNP-SOSIA for security agencies'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PNP-SOSIA license number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // Professional Regulation (PRC - Specific Licenses)
  {
    _id: 'prc-electrical-license',
        name: 'PRC Electrical License',
    question: 'Does your business require licensed electrical practitioners?',
    description: 'PRC license for electrical engineers and practitioners',
    notes: 'PRC license for electrical engineers (Professional Electrical Engineer, Registered Electrical Engineer, Registered Master Electrician) per RA 7920',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/02/19/republic-act-no-7920/',
        title: 'RA 7920 - Electrical Engineering Law',
        description: 'Requires PRC license for electrical practitioners'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PRC license number',
        maxLength: 50
      },
      {
        key: 'licenseType',
        label: 'License Type',
        type: 'select',
        required: true,
        placeholder: 'Select license type',
        options: [
          { value: 'pee', label: 'Professional Electrical Engineer' },
          { value: 'ree', label: 'Registered Electrical Engineer' },
          { value: 'rme', label: 'Registered Master Electrician' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Professional Regulation (PRC)
  {
    _id: 'prc-license',
        name: 'PRC License',
    question: null,
    description: 'Professional license from Professional Regulation Commission for regulated professions',
    notes: 'Professional license issued by Professional Regulation Commission',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1973/06/22/presidential-decree-no-223-s-1973/',
        title: 'PD 223 - Professional Regulation Commission',
        description: 'Requires PRC license for all regulated professions'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PRC license number',
        maxLength: 50
      },
      {
        key: 'profession',
        label: 'Profession',
        type: 'select',
        required: true,
        placeholder: 'Select profession',
        options: [
          { value: 'engineer', label: 'Engineer' },
          { value: 'architect', label: 'Architect' },
          { value: 'doctor', label: 'Doctor' },
          { value: 'nurse', label: 'Nurse' },
          { value: 'accountant', label: 'Accountant' },
          { value: 'lawyer', label: 'Lawyer' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: false,
        placeholder: 'Select expiry date (if applicable)'
      }
    ]
  },
  {
    _id: 'prc-plumbing-license',
        name: 'PRC Plumbing License',
    question: 'Does your business require licensed master plumbers?',
    description: 'PRC license for Master Plumbers',
    notes: 'PRC license for Master Plumbers per RA 1378 (Plumbing Law)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1905/06/18/act-no-1368/',
        title: 'Act 1368 - Plumbing Law of the Philippines',
        description: 'Requires PRC license for Master Plumbers'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PRC license number',
        maxLength: 50
      },
      {
        key: 'licenseType',
        label: 'License Type',
        type: 'select',
        required: true,
        placeholder: 'Select license type',
        options: [
          { value: 'master_plumber', label: 'Master Plumber' },
          { value: 'journeyman', label: 'Journeyman Plumber' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Real Estate Regulation (PRC/DHSUD)
  {
    _id: 'prc-broker-license',
        name: 'PRC Real Estate Broker License',
    question: 'Is your business a real estate brokerage firm?',
    description: 'PRC license for real estate brokers',
    notes: 'License issued by PRC for real estate brokers per RA 9646 (Real Estate Service Act)',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/06/19/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act of the Philippines',
        description: 'Requires PRC license for real estate brokers'
      }
    ],
    customFields: [
      {
        key: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        required: true,
        placeholder: 'Enter PRC broker license number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },
  {
    _id: 'quarry-permit',
        name: 'Quarry Permit',
    question: null,
    description: 'Permit from DENR/Mines and Geosciences Bureau for quarry operations',
    notes: 'Permit issued by DENR/MGB for quarry operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Governs the exploration, development, utilization, and processing of mineral resources including quarry permits'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter permit number',
        maxLength: 50
      },
      {
        key: 'materialType',
        label: 'Material Type',
        type: 'select',
        required: true,
        placeholder: 'Select material type',
        options: [
          { value: 'sand', label: 'Sand' },
          { value: 'gravel', label: 'Gravel' },
          { value: 'limestone', label: 'Limestone' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Education Regulation (School Transport)
  {
    _id: 'school-accreditation',
        name: 'School Transport Accreditation',
    question: 'Does your business provide school bus services?',
    description: 'Certificate from school administrator/PTA for school transport services',
    notes: 'Certificate from school administrator/PTA required for school transport services per LTFRB guidelines',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1936/11/07/commonwealth-act-no-146/',
        title: 'CA 146 - Public Service Act',
        description: 'Requires school accreditation for school transport services per LTFRB guidelines'
      }
    ],
    customFields: [
      {
        key: 'schoolName',
        label: 'School Name',
        type: 'text',
        required: true,
        placeholder: 'Enter school name',
        maxLength: 100
      },
      {
        key: 'certificateNumber',
        label: 'Certificate Number',
        type: 'text',
        required: true,
        placeholder: 'Enter certificate number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // SEC - Certificate of Authority for Lending/Financing
  {
    _id: 'sec-ca-lending',
        name: 'SEC Certificate of Authority (Lending/Financing)',
    question: 'Is your business a lending company or financing company?',
    description: 'Certificate of Authority from SEC for lending or financing companies',
    notes: 'Certificate of Authority issued by SEC for lending companies per RA 9474 or financing companies per RA 8556',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2007/06/13/republic-act-no-9474/',
        title: 'RA 9474 - Lending Company Regulation Act of 2007',
        description: 'Requires SEC Certificate of Authority for lending companies'
      },
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8556/',
        title: 'RA 8556 - Financing Company Act of 1998',
        description: 'Requires SEC Certificate of Authority for financing companies'
      }
    ],
    customFields: [
      {
        key: 'caNumber',
        label: 'Certificate of Authority Number',
        type: 'text',
        required: true,
        placeholder: 'Enter SEC CA number',
        maxLength: 50
      },
      {
        key: 'companyType',
        label: 'Company Type',
        type: 'select',
        required: true,
        placeholder: 'Select company type',
        options: [
          { value: 'lending', label: 'Lending Company' },
          { value: 'financing', label: 'Financing Company' }
        ]
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },

  // Local Government Permits (City Engineering Office)
  {
    _id: 'signage-permit',
        name: 'Signage Permit',
    question: 'Does your business have signage or outdoor advertising?',
    description: 'Permit from City Engineering Office for business signage',
    notes: 'Permit issued by City Engineering Office for business signage - checked during inspection',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'RA 7160 - Local Government Code of 1991',
        description: 'Authorizes LGUs to issue permits for business signage'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter permit number',
        maxLength: 50
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'subdivision-development-permit',
        name: 'Subdivision Development Permit',
    question: null,
    description: 'Permit for subdivision development projects from DHSUD',
    notes: 'Permit for subdivision development projects',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957-s-1976/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Requires development permit for subdivision projects'
      }
    ],
    customFields: [
      {
        key: 'permitNumber',
        label: 'Permit Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DHSUD permit number',
        maxLength: 50
      },
      {
        key: 'projectArea',
        label: 'Project Area (hectares)',
        type: 'number',
        required: true,
        placeholder: 'Enter project area',
        min: 0,
        step: 0.01
      },
      {
        key: 'issueDate',
        label: 'Issue Date',
        type: 'date',
        required: true,
        placeholder: 'Select issue date'
      }
    ]
  },
  {
    _id: 'condominium-project-approval',
        name: 'Condominium Project Approval',
    question: null,
    description: 'Approval for condominium projects from DHSUD',
    notes: 'Approval for condominium projects',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957-s-1976/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Requires approval for condominium projects'
      }
    ],
    customFields: [
      {
        key: 'approvalNumber',
        label: 'Approval Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DHSUD approval number',
        maxLength: 50
      },
      {
        key: 'totalUnits',
        label: 'Total Units',
        type: 'number',
        required: true,
        placeholder: 'Enter total units',
        min: 1,
        step: 1
      },
      {
        key: 'approvalDate',
        label: 'Approval Date',
        type: 'date',
        required: true,
        placeholder: 'Select approval date'
      }
    ]
  },
  {
    _id: 'tesda-registration',
        name: 'TESDA Registration',
    question: null,
    description: 'Registration with Technical Education and Skills Development Authority for technical-vocational institutions',
    notes: 'Registration issued by Technical Education and Skills Development Authority',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1994/08/27/republic-act-no-7796/',
        title: 'RA 7796 - TESDA Act of 1994',
        description: 'Authorizes TESDA to register technical-vocational institutions'
      }
    ],
    customFields: [
      {
        key: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter TESDA registration number',
        maxLength: 50
      },
      {
        key: 'programType',
        label: 'Program Type',
        type: 'select',
        required: true,
        placeholder: 'Select program type',
        options: [
          { value: 'tvet', label: 'TVET Program' },
          { value: 'assess', label: 'Assessment Center' },
          { value: 'training', label: 'Training Center' }
        ]
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: true,
        placeholder: 'Select expiry date'
      }
    ]
  },

  // Trade Regulation (DTI)
  {
    _id: 'weights-measures-seal',
        name: 'Weights & Measures Seal',
    question: 'Does your business use weighing scales or measuring devices?',
    description: 'Seal from DTI for weighing scales and measuring devices',
    notes: 'Seal issued by DTI for weighing scales and measuring devices - checked during inspection',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2003/11/07/republic-act-no-8483/',
        title: 'RA 8483 - Revised Consumer Act of the Philippines',
        description: 'Requires DTI seal for weighing scales and measuring devices'
      }
    ],
    customFields: [
      {
        key: 'sealNumber',
        label: 'Seal Number',
        type: 'text',
        required: true,
        placeholder: 'Enter DTI seal number',
        maxLength: 50
      },
      {
        key: 'deviceType',
        label: 'Device Type',
        type: 'select',
        required: true,
        placeholder: 'Select device type',
        options: [
          { value: 'scale', label: 'Weighing Scale' },
          { value: 'meter', label: 'Measuring Meter' },
          { value: 'pump', label: 'Fuel Pump' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        key: 'sealDate',
        label: 'Seal Date',
        type: 'date',
        required: true,
        placeholder: 'Select seal date'
      }
    ]
  }
];

async function seedPostRequirements() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Seed post requirement violations first
    console.log("Seeding post requirement violations...");
    await seedPostRequirementViolations();

    // Seed post requirement inspection items
    console.log("Seeding post requirement inspection items...");
    await seedPostRequirementInspectionItems();

    const postRequirementDocs = [];
    const codeToIdMap = {};

    for (const pr of POST_REQUIREMENTS) {
      const postRequirement = await PostRequirement.create({
        code: pr._id,
        name: pr.name,
        description: pr.description || '',
        notes: pr.notes || '',
        isActive: true,
        legalBasis: pr.legalBasis || [],
        customFields: pr.customFields || [],
      });
      postRequirementDocs.push(postRequirement);
      codeToIdMap[pr._id] = postRequirement._id;
      console.log(`Created PostRequirement: ${pr._id} - ${pr.name}${pr.customFields?.length ? ` (${pr.customFields.length} custom fields)` : ''}`);
    }

    console.log(`Created ${postRequirementDocs.length} PostRequirement documents`);

    // Seed post requirement checklists after post requirements are created
    console.log("Seeding post requirement checklists...");
    await seedPostRequirementChecklists();

    // Update post requirements with checklist associations
    console.log("Updating post requirements with checklist associations...");
    const checklists = await Checklist.find({ isActive: true });
    const checklistMap = new Map();
    checklists.forEach(c => checklistMap.set(c.name, c._id));

    const POST_REQUIREMENT_CHECKLIST_MAP = {
      'BIR Authority to Print': 'BIR Authority to Print Compliance',
      // Batch 1 mappings
      'AMLC Registration': 'AMLC Registration Compliance',
      'Animal Welfare Seminar Certificate': 'Animal Welfare Seminar Compliance',
      'Authorization to Haul': 'Authorization to Haul Compliance',
      'BAI Registration': 'BAI Registration Compliance',
      'BFAR Registration': 'BFAR Registration Compliance',
      'BOI Registration': 'BOI Registration Compliance',
      'BPI Accreditation': 'BPI Accreditation Compliance',
      'BPI License to Operate': 'BPI License Compliance',
      'BSP Authority to Operate (Pawnshop)': 'BSP Pawnshop Authority Compliance',
      'BSP Certificate of Authority': 'BSP Certificate Authority Compliance',
      // Batch 2 mappings
      'CAAP Height Clearance': 'CAAP Height Clearance Compliance',
      'CAAP RPAS Operator Certificate': 'CAAP RPAS Operator Certificate Compliance',
      'Certificate of Non-Coverage': 'CNC Compliance',
      'CHED Recognition/Permit': 'CHED Recognition Permit Compliance',
      'Congressional Franchise': 'Congressional Franchise Compliance',
      'Demolition Permit': 'Demolition Permit Compliance',
      'DENR Certificate of Non-Coverage': 'DENR CNC Compliance',
      'DENR Permit to Operate (Air Pollution)': 'DENR PTO-AIR Compliance',
      'DENR PMPIN (Pre-Manufacture Pre-Importation Notification)': 'DENR PMPIN Compliance',
      'DENR Wastewater Discharge Permit': 'DENR Wastewater Discharge Permit Compliance',
      'DENR Wood Processing Plant Permit': 'DENR Wood Processing Permit Compliance',
      'DepEd Permit': 'DepEd Permit Compliance',
      'DepEd Recognition': 'DepEd Recognition Compliance',
      'DepEd/CHED Permit': 'DepEd-CHED Joint Permit Compliance',
      'DHSUD Broker Registration': 'DHSUD Broker Registration Compliance',
      'DHSUD License to Sell': 'DHSUD License to Sell Compliance',
      'DHSUD Project Registration': 'DHSUD Project Registration Compliance',
      'DICT PEMEDES Authority': 'DICT PEMEDES Authority Compliance',
      'DMW License': 'DMW License Compliance',
      'DOE Certificate of Compliance': 'DOE Certificate of Compliance Compliance',
      'DOH License to Operate': 'DOH LTO Compliance',
      'DOH Operating Permit': 'DOH Operating Permit Compliance',
      'DOH Permit': 'DOH Permit Compliance',
      'DOH Permit to Construct': 'DOH Permit to Construct Compliance',
      'DOLE Registration (DO 174)': 'DOLE Registration DO174 Compliance',
      'DOT Accreditation': 'DOT Accreditation Compliance',
      'DSWD Permit': 'DSWD Permit Compliance',
      'DTI Accreditation': 'DTI Accreditation Compliance',
      'DTI Freight Forwarding Accreditation': 'DTI Freight Forwarding Accreditation Compliance',
      'DTI GTIDO Registration': 'DTI GTIDO Registration Compliance',
      'E-Pharmacy LTO': 'E-Pharmacy LTO Compliance',
      // Batch 3 mappings
      'ERC Certificate': 'ERC Certificate Compliance',
      'ERC Certificate of Public Convenience and Necessity': 'ERC CPCN Compliance',
      'FPA Commercial Applicator License': 'FPA Commercial Applicator License Compliance',
      'FPA License to Operate': 'FPA LTO Compliance',
      'HLURB Registration': 'HLURB Registration Compliance',
      'Liquor License': 'Liquor License Compliance',
      'LLDA Discharge Permit': 'LLDA Discharge Permit Compliance',
      'LTFRB Certificate of Public Convenience': 'LTFRB CPC Compliance',
      'LTFRB Franchise': 'LTFRB Franchise Compliance',
      'LTO Accreditation': 'LTO Accreditation Compliance',
      'LTO Vehicle Registration': 'LTO Vehicle Registration Compliance',
      'Medical Device Retailer LTO': 'Medical Device Retailer LTO Compliance',
      'MGB Exploration Permit': 'MGB Exploration Permit Compliance',
      'MGB Mineral Agreement': 'MGB Mineral Agreement Compliance',
      'MGB Permit': 'MGB Permit Compliance',
      'Non-Metallic Mining Permit': 'MGB Permit Compliance',
      'NBDB Publisher Registration': 'NBDB Publisher Registration Compliance',
      'NFA Accreditation': 'NFA Accreditation Compliance',
      'NFA License': 'NFA License Compliance',
      'NFA Registration': 'NFA Registration Compliance',
      'NMIS Accreditation': 'NMIS Accreditation Compliance',
      'NPC Registration': 'NPC Registration Compliance',
      'NTC Certificate of Public Convenience and Necessity': 'NTC CPCN Compliance',
      'NTC Certificate of Registration': 'NTC Certificate Compliance',
      'NTC Provisional Authority/CPCN': 'NTC PA-CPCN Compliance',
      'NWRB Certificate of Public Convenience': 'NWRB CPC Compliance',
      'NWRB Water Permit': 'NWRB Water Permit Compliance',
      // Batch 4 mappings
      'PCAB License': 'PCAB License Compliance',
      'PDEA S2 License': 'PDEA S2 License Compliance',
      'PEZA Registration': 'PEZA Registration Compliance',
      'Pharmacist-in-Charge Credential': 'Pharmacist in Charge Credential Compliance',
      'PhilHealth Accreditation': 'PhilHealth Accreditation Compliance',
      'PNP-FEO License/Permit': 'PNP FEO License Compliance',
      'PNP-SOSIA License': 'PNP SOSIA License Compliance',
      'PRC Electrical License': 'PRC Electrical License Compliance',
      'PRC License': 'PRC License Compliance',
      'PRC Plumbing License': 'PRC Plumbing License Compliance',
      'PRC Real Estate Broker License': 'PRC Broker License Compliance',
      'Quarry Permit': 'Quarry Permit Compliance',
      'School Transport Accreditation': 'School Accreditation Compliance',
      'SEC Certificate of Authority (Lending/Financing)': 'SEC CA Lending Compliance',
      'Signage Permit': 'Signage Permit Compliance',
      'Subdivision Development Permit': 'Subdivision Development Permit Compliance',
      'Condominium Project Approval': 'Condominium Project Approval Compliance',
      'TESDA Registration': 'TESDA Registration Compliance',
      'Weights & Measures Seal': 'Weights and Measures Seal Compliance',
    };

    for (const pr of postRequirementDocs) {
      const checklistName = POST_REQUIREMENT_CHECKLIST_MAP[pr.name];
      if (checklistName) {
        const checklistId = checklistMap.get(checklistName);
        if (checklistId) {
          pr.checklistId = checklistId;
          await pr.save();
          console.log(`Updated PostRequirement: ${pr.code} with checklistId`);
        }
      }
    }

    // Update LOB documents using existing LOB_POST_REQUIREMENT_MAPPINGS from seedLobs.js
    console.log("Updating LOB documents with PostRequirement references...");

    const { LOB_POST_REQUIREMENT_MAPPINGS } = require("./seedLobs");
    const lobs = await Lob.find({});

    for (const lob of lobs) {
      const mapping = LOB_POST_REQUIREMENT_MAPPINGS[lob.name] || { required: [], conditional: [] };
      
      // Convert code strings to ObjectIds
      const requiredIds = mapping.required.map(code => codeToIdMap[code]).filter(id => id);
      const conditionalIds = mapping.conditional.map(code => codeToIdMap[code]).filter(id => id);

      lob.postRequirements = {
        required: requiredIds,
        conditional: conditionalIds,
      };

      await lob.save();
      console.log(`Updated LOB: ${lob.code} - ${lob.name} (${requiredIds.length} required, ${conditionalIds.length} conditional)`);
    }

    console.log(`Updated ${lobs.length} LOB documents`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    return {
      seeded: true,
      postRequirementsCreated: postRequirementDocs.length,
      lobsUpdated: lobs.length,
    };
  } catch (err) {
    console.error("Error seeding PostRequirement data:", err);
    await mongoose.disconnect();
    throw err;
  }
}

/**
 * Seed PostRequirements only if empty (idempotent)
 */
async function seedIfEmpty() {
  const count = await PostRequirement.countDocuments();
  if (count === 0) {
    return seedPostRequirements();
  }
  return {
    seeded: false,
    postRequirementsCreated: 0,
    lobsUpdated: 0,
    message: 'Collection already has data, skipping seed'
  };
}

/**
 * Get all post requirements
 */
function getPostRequirements() {
  return POST_REQUIREMENTS
}

/**
 * Get post requirement by name
 */
function getPostRequirementByName(name) {
  return POST_REQUIREMENTS.find(pr => pr.name === name)
}

module.exports = {
  seedPostRequirements,
  seedIfEmpty,
  getPostRequirements,
  getPostRequirementByName,
}
