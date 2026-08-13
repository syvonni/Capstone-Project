/**
 * INDUSTRY SECTION TEMPLATES
 * 
 * Starter section templates for temporary permit forms, keyed by PSIC 2019
 * industry letter (a-u). These are admin-only starter templates used when
 * pre-filling a new temporary permit form. They are NOT live form definitions;
 * actual permit form definitions are fetched from the backend API.
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
    isBusinessName: opts.isBusinessName ?? false,
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
  return base
}

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
