const mongoose = require("mongoose");
const Checklist = require("../models/Checklist");
const PostRequirement = require("../models/PostRequirement");

/**
 * Post Requirement Checklists Seeder
 *
 * Seeds checklists specific to post requirement compliance verification.
 * Each checklist corresponds to one post requirement and contains inspection items.
 *
 * Structure:
 * - name: Display name of the checklist
 * - description: Description of the checklist
 * - notes: Inspector guidance
 * - legalBasis: Array of legal references (url, title, description)
 * - items: Array of inspection items with inspectionItemName and order
 */

const POST_REQUIREMENT_CHECKLISTS = [
  // Batch 1: AMLC, Animal Welfare, ATH, BAI, BFAR, BIR ATP, BOI, BPI, BSP
  {
    name: 'AMLC Registration Compliance',
    description: 'AMLC registration and validity checklist',
    notes: 'Covers AMLC registration requirements under RA 9160 for covered persons',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/09/29/republic-act-no-9160/',
        title: 'RA 9160 - Anti-Money Laundering Act of 2001',
        description: 'Section 9: Covered persons must register with AMLC'
      }
    ],
    items: [
      { inspectionItemName: 'AMLC Registration Status', order: 1 },
      { inspectionItemName: 'AMLC Registration Validity', order: 2 },
    ]
  },
  {
    name: 'Animal Welfare Seminar Compliance',
    description: 'Animal Welfare Seminar certificate checklist',
    notes: 'Covers Animal Welfare Seminar certificate requirements under RA 8485',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/',
        title: 'RA 8485 - Animal Welfare Act of 1998',
        description: 'Section 6: Animal handlers must complete animal welfare seminar'
      }
    ],
    items: [
      { inspectionItemName: 'Animal Welfare Seminar Certificate', order: 1 },
    ]
  },
  {
    name: 'Authorization to Haul Compliance',
    description: 'Authorization to Haul validity checklist',
    notes: 'Covers Authorization to Haul requirements under RA 7942 for mineral product transport',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 27: Authorization required for hauling and transporting mineral products'
      }
    ],
    items: [
      { inspectionItemName: 'Authorization to Haul', order: 1 },
      { inspectionItemName: 'Authorization to Haul Validity', order: 2 },
    ]
  },
  {
    name: 'BAI Registration Compliance',
    description: 'BAI registration checklist',
    notes: 'Covers BAI registration requirements under RA 8485 for veterinary clinics and animal facilities',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/',
        title: 'RA 8485 - Animal Welfare Act of 1998',
        description: 'Section 7: Veterinary clinics and animal facilities must register with BAI'
      }
    ],
    items: [
      { inspectionItemName: 'BAI Registration', order: 1 },
    ]
  },
  {
    name: 'BFAR Registration Compliance',
    description: 'BFAR registration checklist',
    notes: 'Covers BFAR registration requirements under RA 8550 for fisheries-related businesses',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/25/republic-act-no-8550/',
        title: 'RA 8550 - Philippine Fisheries Code of 1998',
        description: 'Section 29: Fisheries-related businesses must register with BFAR'
      }
    ],
    items: [
      { inspectionItemName: 'BFAR Registration', order: 1 },
    ]
  },
  {
    name: 'BIR Authority to Print Compliance',
    description: 'BIR Authority to Print validity checklist',
    notes: 'Covers BIR Authority to Print requirements under RA 8424 for commercial printing of accountable forms',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1997/12/11/republic-act-no-8424/',
        title: 'RA 8424 - National Internal Revenue Code of 1997',
        description: 'Section 238: Authority to Print required for commercial printing of accountable forms'
      }
    ],
    items: [
      { inspectionItemName: 'BIR Authority to Print', order: 1 },
      { inspectionItemName: 'BIR Authority to Print Validity', order: 2 },
    ]
  },
  {
    name: 'BOI Registration Compliance',
    description: 'BOI registration checklist',
    notes: 'Covers BOI registration requirements under EO 226 for export-oriented or priority projects',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1987/07/16/executive-order-no-226-s-1987/',
        title: 'EO 226 - Omnibus Investments Code of 1987',
        description: 'Article 20: Registration with BOI required for tax incentives'
      }
    ],
    items: [
      { inspectionItemName: 'BOI Registration', order: 1 },
    ]
  },
  {
    name: 'BPI Accreditation Compliance',
    description: 'BPI accreditation checklist',
    notes: 'Covers BPI accreditation requirements under RA 7308 for plant nursery operators',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/',
        title: 'RA 7308 - Seed Industry Development Act of 1992',
        description: 'Section 12: Plant nursery operators must be accredited by BPI'
      }
    ],
    items: [
      { inspectionItemName: 'BPI Accreditation', order: 1 },
    ]
  },
  {
    name: 'BPI License Compliance',
    description: 'BPI license checklist',
    notes: 'Covers BPI license requirements under RA 7308 for plant-related operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/',
        title: 'RA 7308 - Seed Industry Development Act of 1992',
        description: 'Section 12: BPI license required for plant-related operations'
      }
    ],
    items: [
      { inspectionItemName: 'BPI License', order: 1 },
    ]
  },
  {
    name: 'BSP Pawnshop Authority Compliance',
    description: 'BSP pawnshop authority checklist',
    notes: 'Covers BSP authority requirements for pawnshop operations',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/Regulations/Issuances/Pawnshops',
        title: 'BSP Circular No. 224 - Pawnshop Regulations',
        description: 'Section 3: Authority from BSP required for pawnshop operations'
      }
    ],
    items: [
      { inspectionItemName: 'BSP Pawnshop Authority', order: 1 },
    ]
  },
  {
    name: 'BSP Certificate Authority Compliance',
    description: 'BSP Certificate of Authority checklist',
    notes: 'Covers BSP Certificate of Authority requirements for financial operations',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/Regulations/Issuances/Financial',
        title: 'BSP Regulations on Financial Institutions',
        description: 'Certificate of Authority required for financial operations'
      }
    ],
    items: [
      { inspectionItemName: 'BSP Certificate Authority', order: 1 },
    ]
  },
  // Batch 2: CAAP, CNC, CHED, Congressional Franchise, Demolition Permit, DENR permits, DepEd permits, DHSUD permits, DICT, DMW, DOE, DOH permits, DOLE, DOT, DSWD, DTI permits, E-pharmacy
  {
    name: 'CAAP Height Clearance Compliance',
    description: 'CAAP Height Clearance validity checklist',
    notes: 'Covers CAAP height clearance requirements under RA 9497 for structures near airports',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/03/12/republic-act-no-9497/',
        title: 'RA 9497 - Civil Aviation Authority Act of 2008',
        description: 'Section 30: Height clearance required for structures near airports'
      }
    ],
    items: [
      { inspectionItemName: 'CAAP Height Clearance', order: 1 }
    ]
  },
  {
    name: 'CAAP RPAS Operator Certificate Compliance',
    description: 'CAAP RPAS Operator Certificate validity checklist',
    notes: 'Covers RPAS operator certificate requirements for drone operations',
    legalBasis: [
      {
        url: 'https://www.caap.gov.ph/',
        title: 'CAAP Memorandum Circular No. 12-2018',
        description: 'RPAS operator certificate required for commercial drone operations'
      }
    ],
    items: [
      { inspectionItemName: 'CAAP RPAS Operator Certificate', order: 1 }
    ]
  },
  {
    name: 'CNC Compliance',
    description: 'Certificate of Non-Coverage validity checklist',
    notes: 'Covers CNC requirements under PD 1586 for projects not requiring ECC',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1586/',
        title: 'PD 1586 - Philippine Environmental Impact Statement System',
        description: 'Section 4: CNC required for projects not requiring ECC'
      }
    ],
    items: [
      { inspectionItemName: 'Certificate of Non-Coverage', order: 1 }
    ]
  },
  {
    name: 'CHED Recognition Permit Compliance',
    description: 'CHED Recognition Permit validity checklist',
    notes: 'Covers CHED recognition requirements under RA 7722 for higher education institutions',
    legalBasis: [
      {
        url: 'https://www.ched.gov.ph/',
        title: 'RA 7722 - Higher Education Act of 1994',
        description: 'Section 8: CHED recognition required for higher education institutions'
      }
    ],
    items: [
      { inspectionItemName: 'CHED Recognition Permit', order: 1 }
    ]
  },
  {
    name: 'Congressional Franchise Compliance',
    description: 'Congressional Franchise validity checklist',
    notes: 'Covers congressional franchise requirements under 1987 Constitution for public utilities',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1987/02/11/1987-constitution/',
        title: '1987 Constitution Article XII',
        description: 'Section 11: Congressional franchise required for public utilities'
      }
    ],
    items: [
      { inspectionItemName: 'Congressional Franchise', order: 1 }
    ]
  },
  {
    name: 'Demolition Permit Compliance',
    description: 'Demolition Permit validity checklist',
    notes: 'Covers demolition permit requirements under PD 1096',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/08/18/presidential-decree-no-1096/',
        title: 'PD 1096 - National Building Code',
        description: 'Section 301: Demolition permit required before demolition work'
      }
    ],
    items: [
      { inspectionItemName: 'Demolition Permit', order: 1 }
    ]
  },
  {
    name: 'DENR CNC Compliance',
    description: 'DENR Certificate of Non-Coverage validity checklist',
    notes: 'Covers DENR CNC requirements under PD 1586',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1586/',
        title: 'PD 1586 - Philippine Environmental Impact Statement System',
        description: 'Section 4: CNC required for projects not requiring ECC'
      }
    ],
    items: [
      { inspectionItemName: 'DENR Certificate of Non-Coverage', order: 1 }
    ]
  },
  {
    name: 'DENR PTO-AIR Compliance',
    description: 'DENR Permit to Operate Air Installation validity checklist',
    notes: 'Covers PTO-AIR requirements under PD 1181 for air pollution sources',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1181/',
        title: 'PD 1181 - Pollution Control Law',
        description: 'Section 6: PTO-AIR required for air pollution sources'
      }
    ],
    items: [
      { inspectionItemName: 'DENR Permit to Operate Air Installation', order: 1 }
    ]
  },
  {
    name: 'DENR PMPIN Compliance',
    description: 'DENR Pollution Management Program Implementation Notice validity checklist',
    notes: 'Covers PMPIN requirements under RA 9275 for pollution control',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/25/republic-act-no-9275/',
        title: 'RA 9275 - Philippine Clean Air Act',
        description: 'Section 14: PMPIN required for pollution control'
      }
    ],
    items: [
      { inspectionItemName: 'DENR Pollution Management Program Implementation Notice', order: 1 }
    ]
  },
  {
    name: 'DENR Wastewater Discharge Permit Compliance',
    description: 'DENR Wastewater Discharge Permit validity checklist',
    notes: 'Covers wastewater discharge permit requirements under RA 9275',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/25/republic-act-no-9275/',
        title: 'RA 9275 - Philippine Clean Water Act',
        description: 'Section 8: Wastewater discharge permit required'
      }
    ],
    items: [
      { inspectionItemName: 'DENR Wastewater Discharge Permit', order: 1 }
    ]
  },
  {
    name: 'DENR Wood Processing Permit Compliance',
    description: 'DENR Wood Processing Permit validity checklist',
    notes: 'Covers wood processing permit requirements under PD 705',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1975/05/20/presidential-decree-no-705/',
        title: 'PD 705 - Forestry Reform Code',
        description: 'Section 77: Wood processing permit required'
      }
    ],
    items: [
      { inspectionItemName: 'DENR Wood Processing Permit', order: 1 }
    ]
  },
  {
    name: 'DepEd Permit Compliance',
    description: 'DepEd Permit validity checklist',
    notes: 'Covers DepEd permit requirements under BP 232 for educational institutions',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: DepEd permit required for educational institutions'
      }
    ],
    items: [
      { inspectionItemName: 'DepEd Permit', order: 1 }
    ]
  },
  {
    name: 'DepEd Recognition Compliance',
    description: 'DepEd Recognition validity checklist',
    notes: 'Covers DepEd recognition requirements under BP 232 for schools',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: DepEd recognition required for schools'
      }
    ],
    items: [
      { inspectionItemName: 'DepEd Recognition', order: 1 }
    ]
  },
  {
    name: 'DepEd-CHED Joint Permit Compliance',
    description: 'DepEd-CHED Joint Permit validity checklist',
    notes: 'Covers joint permit requirements for certain educational programs',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: Joint permit required for certain programs'
      }
    ],
    items: [
      { inspectionItemName: 'DepEd-CHED Joint Permit', order: 1 }
    ]
  },
  {
    name: 'DHSUD Broker Registration Compliance',
    description: 'DHSUD Broker Registration validity checklist',
    notes: 'Covers broker registration requirements under RA 9646',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 29: DHSUD broker registration required'
      }
    ],
    items: [
      { inspectionItemName: 'DHSUD Broker Registration', order: 1 }
    ]
  },
  {
    name: 'DHSUD License to Sell Compliance',
    description: 'DHSUD License to Sell validity checklist',
    notes: 'Covers license to sell requirements under RA 9646 for real estate projects',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 28: License to Sell required for projects'
      }
    ],
    items: [
      { inspectionItemName: 'DHSUD License to Sell', order: 1 }
    ]
  },
  {
    name: 'DHSUD Project Registration Compliance',
    description: 'DHSUD Project Registration validity checklist',
    notes: 'Covers project registration requirements under RA 9646 for housing projects',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 28: Project registration required'
      }
    ],
    items: [
      { inspectionItemName: 'DHSUD Project Registration', order: 1 }
    ]
  },
  {
    name: 'DICT PEMEDES Authority Compliance',
    description: 'DICT PEMEDES Authority validity checklist',
    notes: 'Covers PEMEDES authority requirements under RA 11223 for medical device establishments',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 37: DICT PEMEDES authority required'
      }
    ],
    items: [
      { inspectionItemName: 'DICT PEMEDES Authority', order: 1 }
    ]
  },
  {
    name: 'DMW License Compliance',
    description: 'DMW License validity checklist',
    notes: 'Covers DMW license requirements under RA 8042 for recruitment agencies',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/02/13/republic-act-no-8042/',
        title: 'RA 8042 - Migrant Workers and Overseas Filipinos Act',
        description: 'Section 23: DMW license required for recruitment'
      }
    ],
    items: [
      { inspectionItemName: 'DMW License', order: 1 }
    ]
  },
  {
    name: 'DOE Certificate of Compliance Compliance',
    description: 'DOE Certificate of Compliance validity checklist',
    notes: 'Covers DOE COC requirements under RA 9136 for energy-related facilities',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act',
        description: 'Section 42: DOE COC required for energy facilities'
      }
    ],
    items: [
      { inspectionItemName: 'DOE Certificate of Compliance', order: 1 }
    ]
  },
  {
    name: 'DOH LTO Compliance',
    description: 'DOH License to Operate validity checklist',
    notes: 'Covers DOH LTO requirements under RA 11223 for health facilities',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: DOH LTO required for health facilities'
      }
    ],
    items: [
      { inspectionItemName: 'DOH License to Operate', order: 1 }
    ]
  },
  {
    name: 'DOH Operating Permit Compliance',
    description: 'DOH Operating Permit validity checklist',
    notes: 'Covers operating permit requirements under RA 11223 for health establishments',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: Operating permit required'
      }
    ],
    items: [
      { inspectionItemName: 'DOH Operating Permit', order: 1 }
    ]
  },
  {
    name: 'DOH Permit Compliance',
    description: 'DOH Permit validity checklist',
    notes: 'Covers DOH permit requirements under RA 11223 for health-related businesses',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: DOH permit required'
      }
    ],
    items: [
      { inspectionItemName: 'DOH Permit', order: 1 }
    ]
  },
  {
    name: 'DOH Permit to Construct Compliance',
    description: 'DOH Permit to Construct validity checklist',
    notes: 'Covers permit to construct requirements under RA 11223 for health facility construction',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: Permit to construct required'
      }
    ],
    items: [
      { inspectionItemName: 'DOH Permit to Construct', order: 1 }
    ]
  },
  {
    name: 'DOLE Registration DO174 Compliance',
    description: 'DOLE Registration DO174 validity checklist',
    notes: 'Covers DOLE establishment registration requirements under DO174',
    legalBasis: [
      {
        url: 'https://www.dole.gov.ph/',
        title: 'DOLE Department Order No. 174',
        description: 'Establishment registration required under DO174'
      }
    ],
    items: [
      { inspectionItemName: 'DOLE Registration DO174', order: 1 }
    ]
  },
  {
    name: 'DOT Accreditation Compliance',
    description: 'DOT Accreditation validity checklist',
    notes: 'Covers DOT accreditation requirements under RA 9593 for tourism establishments',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/',
        title: 'RA 9593 - Tourism Act of 2009',
        description: 'Section 38: DOT accreditation required for tourism establishments'
      }
    ],
    items: [
      { inspectionItemName: 'DOT Accreditation', order: 1 }
    ]
  },
  {
    name: 'DSWD Permit Compliance',
    description: 'DSWD Permit validity checklist',
    notes: 'Covers DSWD permit requirements under RA 8432 for social welfare agencies',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1997/02/10/republic-act-no-8432/',
        title: 'RA 8432 - Magna Carta for Disabled Persons',
        description: 'Section 5: DSWD permit required for social welfare agencies'
      }
    ],
    items: [
      { inspectionItemName: 'DSWD Permit', order: 1 }
    ]
  },
  {
    name: 'DTI Accreditation Compliance',
    description: 'DTI Accreditation validity checklist',
    notes: 'Covers DTI accreditation requirements for certain businesses',
    legalBasis: [
      {
        url: 'https://www.dti.gov.ph/',
        title: 'DTI Accreditation Guidelines',
        description: 'DTI accreditation required for specific business types'
      }
    ],
    items: [
      { inspectionItemName: 'DTI Accreditation', order: 1 }
    ]
  },
  {
    name: 'DTI Freight Forwarding Accreditation Compliance',
    description: 'DTI Freight Forwarding Accreditation validity checklist',
    notes: 'Covers freight forwarding accreditation requirements for logistics companies',
    legalBasis: [
      {
        url: 'https://www.dti.gov.ph/',
        title: 'DTI Freight Forwarding Accreditation Rules',
        description: 'Accreditation required for freight forwarding'
      }
    ],
    items: [
      { inspectionItemName: 'DTI Freight Forwarding Accreditation', order: 1 }
    ]
  },
  {
    name: 'DTI GTIDO Registration Compliance',
    description: 'DTI GTIDO Registration validity checklist',
    notes: 'Covers GTIDO registration requirements for trading companies',
    legalBasis: [
      {
        url: 'https://www.dti.gov.ph/',
        title: 'DTI GTIDO Registration Guidelines',
        description: 'GTIDO registration required for trading'
      }
    ],
    items: [
      { inspectionItemName: 'DTI GTIDO Registration', order: 1 }
    ]
  },
  {
    name: 'E-Pharmacy LTO Compliance',
    description: 'E-Pharmacy License to Operate validity checklist',
    notes: 'Covers e-pharmacy LTO requirements under RA 9711 for online pharmacies',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/',
        title: 'RA 9711 - FDA Act of 2008',
        description: 'Section 21: E-pharmacy LTO required for online pharmacies'
      }
    ],
    items: [
      { inspectionItemName: 'E-Pharmacy License to Operate', order: 1 }
    ]
  },
  // Batch 3: ERC, FPA, HLURB, Liquor License, LLDA, LTFRB, LTO, Medical Device Retailer, MGB permits, NBDB, NFA, NMIS, NPC, NTC, NWRB
  {
    name: 'ERC Certificate Compliance',
    description: 'ERC Certificate validity checklist',
    notes: 'Covers ERC certificate requirements under RA 9136 for energy-related operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act',
        description: 'Section 37: ERC certificate required for energy operations'
      }
    ],
    items: [
      { inspectionItemName: 'ERC Certificate', order: 1 }
    ]
  },
  {
    name: 'ERC CPCN Compliance',
    description: 'ERC Certificate of Public Convenience and Necessity validity checklist',
    notes: 'Covers ERC CPCN requirements under RA 9136 for public utility operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act',
        description: 'Section 37: CPCN required for public utility operations'
      }
    ],
    items: [
      { inspectionItemName: 'ERC CPCN', order: 1 }
    ]
  },
  {
    name: 'FPA Commercial Applicator License Compliance',
    description: 'FPA Commercial Applicator License validity checklist',
    notes: 'Covers FPA license requirements for commercial pesticide applicators',
    legalBasis: [
      {
        url: 'https://www.fpa.gov.ph/',
        title: 'FPA Act of 1977',
        description: 'FPA license required for commercial pesticide application'
      }
    ],
    items: [
      { inspectionItemName: 'FPA Commercial Applicator License', order: 1 }
    ]
  },
  {
    name: 'FPA LTO Compliance',
    description: 'FPA License to Operate validity checklist',
    notes: 'Covers FPA LTO requirements for fertilizer and pesticide businesses',
    legalBasis: [
      {
        url: 'https://www.fpa.gov.ph/',
        title: 'FPA Act of 1977',
        description: 'FPA LTO required for fertilizer and pesticide businesses'
      }
    ],
    items: [
      { inspectionItemName: 'FPA License to Operate', order: 1 }
    ]
  },
  {
    name: 'HLURB Registration Compliance',
    description: 'HLURB Registration validity checklist',
    notes: 'Covers HLURB registration requirements under RA 11201 for housing projects',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/',
        title: 'RA 11201 - Real Estate Service Act',
        description: 'Section 28: HLURB registration required for housing projects'
      }
    ],
    items: [
      { inspectionItemName: 'HLURB Registration', order: 1 }
    ]
  },
  {
    name: 'Liquor License Compliance',
    description: 'Liquor License validity checklist',
    notes: 'Covers liquor license requirements for establishments serving alcoholic beverages',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/03/21/republic-act-no-6969/',
        title: 'RA 6969 - Toxic Substances and Hazardous Wastes',
        description: 'Liquor license required for establishments serving alcohol'
      }
    ],
    items: [
      { inspectionItemName: 'Liquor License', order: 1 }
    ]
  },
  {
    name: 'LLDA Discharge Permit Compliance',
    description: 'LLDA Discharge Permit validity checklist',
    notes: 'Covers LLDA discharge permit requirements for facilities discharging into Laguna Lake',
    legalBasis: [
      {
        url: 'https://www.llda.gov.ph/',
        title: 'LLDA Act of 1966',
        description: 'Discharge permit required for Laguna Lake discharges'
      }
    ],
    items: [
      { inspectionItemName: 'LLDA Discharge Permit', order: 1 }
    ]
  },
  {
    name: 'LTFRB CPC Compliance',
    description: 'LTFRB Certificate of Public Convenience validity checklist',
    notes: 'Covers LTFRB CPC requirements under RA 10149 for public transportation operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'CPC required for public transportation'
      }
    ],
    items: [
      { inspectionItemName: 'LTFRB Certificate of Public Convenience', order: 1 }
    ]
  },
  {
    name: 'LTFRB Franchise Compliance',
    description: 'LTFRB Franchise validity checklist',
    notes: 'Covers LTFRB franchise requirements under RA 10149 for PUV operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'Franchise required for PUV operations'
      }
    ],
    items: [
      { inspectionItemName: 'LTFRB Franchise', order: 1 }
    ]
  },
  {
    name: 'LTO Accreditation Compliance',
    description: 'LTO Accreditation validity checklist',
    notes: 'Covers LTO accreditation requirements for driving schools and related businesses',
    legalBasis: [
      {
        url: 'https://www.lto.gov.ph/',
        title: 'LTO Accreditation Guidelines',
        description: 'LTO accreditation required for driving schools'
      }
    ],
    items: [
      { inspectionItemName: 'LTO Accreditation', order: 1 }
    ]
  },
  {
    name: 'LTO Vehicle Registration Compliance',
    description: 'LTO Vehicle Registration validity checklist',
    notes: 'Covers vehicle registration requirements for business vehicles',
    legalBasis: [
      {
        url: 'https://www.lto.gov.ph/',
        title: 'LTO Vehicle Registration Requirements',
        description: 'Vehicle registration required for all vehicles'
      }
    ],
    items: [
      { inspectionItemName: 'LTO Vehicle Registration', order: 1 }
    ]
  },
  {
    name: 'Medical Device Retailer LTO Compliance',
    description: 'Medical Device Retailer License to Operate validity checklist',
    notes: 'Covers medical device retailer LTO requirements under RA 9711',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/',
        title: 'RA 9711 - FDA Act of 2008',
        description: 'Section 21: Medical device retailer LTO required'
      }
    ],
    items: [
      { inspectionItemName: 'Medical Device Retailer License to Operate', order: 1 }
    ]
  },
  {
    name: 'MGB Exploration Permit Compliance',
    description: 'MGB Exploration Permit validity checklist',
    notes: 'Covers exploration permit requirements under RA 7942 for mineral exploration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Exploration permit required for mineral activities'
      }
    ],
    items: [
      { inspectionItemName: 'MGB Exploration Permit', order: 1 }
    ]
  },
  {
    name: 'MGB Mineral Agreement Compliance',
    description: 'MGB Mineral Agreement validity checklist',
    notes: 'Covers mineral agreement requirements under RA 7942 for mining operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Mineral agreement required for mining operations'
      }
    ],
    items: [
      { inspectionItemName: 'MGB Mineral Agreement', order: 1 }
    ]
  },
  {
    name: 'MGB Permit Compliance',
    description: 'MGB Permit validity checklist',
    notes: 'Covers MGB permit requirements under RA 7942 for mining-related activities',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: MGB permit required for mining activities'
      }
    ],
    items: [
      { inspectionItemName: 'MGB Permit', order: 1 }
    ]
  },
  {
    name: 'NBDB Publisher Registration Compliance',
    description: 'NBDB Publisher Registration validity checklist',
    notes: 'Covers NBDB registration requirements under RA 10372 for book publishers',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2013/06/21/republic-act-no-10372/',
        title: 'RA 10372 - Book Publishing Industry Development Act',
        description: 'Section 12: NBDB registration required for publishers'
      }
    ],
    items: [
      { inspectionItemName: 'NBDB Publisher Registration', order: 1 }
    ]
  },
  {
    name: 'NFA Accreditation Compliance',
    description: 'NFA Accreditation validity checklist',
    notes: 'Covers NFA accreditation requirements for rice and grain businesses',
    legalBasis: [
      {
        url: 'https://www.nfa.gov.ph/',
        title: 'NFA Accreditation Guidelines',
        description: 'NFA accreditation required for grain businesses'
      }
    ],
    items: [
      { inspectionItemName: 'NFA Accreditation', order: 1 }
    ]
  },
  {
    name: 'NFA License Compliance',
    description: 'NFA License validity checklist',
    notes: 'Covers NFA license requirements for rice and grain trading',
    legalBasis: [
      {
        url: 'https://www.nfa.gov.ph/',
        title: 'NFA License Requirements',
        description: 'NFA license required for grain trading'
      }
    ],
    items: [
      { inspectionItemName: 'NFA License', order: 1 }
    ]
  },
  {
    name: 'NFA Registration Compliance',
    description: 'NFA Registration validity checklist',
    notes: 'Covers NFA registration requirements for rice and grain businesses',
    legalBasis: [
      {
        url: 'https://www.nfa.gov.ph/',
        title: 'NFA Registration Guidelines',
        description: 'NFA registration required for grain businesses'
      }
    ],
    items: [
      { inspectionItemName: 'NFA Registration', order: 1 }
    ]
  },
  {
    name: 'NMIS Accreditation Compliance',
    description: 'NMIS Accreditation validity checklist',
    notes: 'Covers NMIS accreditation requirements for meat establishments',
    legalBasis: [
      {
        url: 'https://www.nmis.gov.ph/',
        title: 'NMIS Accreditation Guidelines',
        description: 'NMIS accreditation required for meat establishments'
      }
    ],
    items: [
      { inspectionItemName: 'NMIS Accreditation', order: 1 }
    ]
  },
  {
    name: 'NPC Registration Compliance',
    description: 'NPC Registration validity checklist',
    notes: 'Covers NPC registration requirements under RA 5207 for nuclear-related activities',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/04/13/republic-act-no-5207/',
        title: 'RA 5207 - Atomic Energy Regulatory Act',
        description: 'NPC registration required for nuclear activities'
      }
    ],
    items: [
      { inspectionItemName: 'NPC Registration', order: 1 }
    ]
  },
  {
    name: 'NTC CPCN Compliance',
    description: 'NTC Certificate of Public Convenience and Necessity validity checklist',
    notes: 'Covers NTC CPCN requirements under RA 10149 for telecommunications operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'CPCN required for telecommunications'
      }
    ],
    items: [
      { inspectionItemName: 'NTC Certificate of Public Convenience and Necessity', order: 1 }
    ]
  },
  {
    name: 'NTC Certificate Compliance',
    description: 'NTC Certificate validity checklist',
    notes: 'Covers NTC certificate requirements for telecommunications equipment',
    legalBasis: [
      {
        url: 'https://www.ntc.gov.ph/',
        title: 'NTC Certificate Requirements',
        description: 'NTC certificate required for telecom equipment'
      }
    ],
    items: [
      { inspectionItemName: 'NTC Certificate', order: 1 }
    ]
  },
  {
    name: 'NTC PA-CPCN Compliance',
    description: 'NTC Provisional Authority CPCN validity checklist',
    notes: 'Covers NTC PA-CPCN requirements under RA 10149 for provisional telecom operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'PA-CPCN required for provisional telecom operations'
      }
    ],
    items: [
      { inspectionItemName: 'NTC Provisional Authority CPCN', order: 1 }
    ]
  },
  {
    name: 'NWRB CPC Compliance',
    description: 'NWRB Certificate of Public Convenience validity checklist',
    notes: 'Covers NWRB CPC requirements under RA 9275 for water utility operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/23/republic-act-no-9275/',
        title: 'RA 9275 - Water Code of the Philippines',
        description: 'CPC required for water utility operations'
      }
    ],
    items: [
      { inspectionItemName: 'NWRB Certificate of Public Convenience', order: 1 }
    ]
  },
  {
    name: 'NWRB Water Permit Compliance',
    description: 'NWRB Water Permit validity checklist',
    notes: 'Covers NWRB water permit requirements under RA 9275 for water extraction',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/23/republic-act-no-9275/',
        title: 'RA 9275 - Water Code of the Philippines',
        description: 'Water permit required for water extraction'
      }
    ],
    items: [
      { inspectionItemName: 'NWRB Water Permit', order: 1 }
    ]
  },
  // Batch 4: PCAB, PDEA, PEZA, Pharmacist, PhilHealth, PNP, PRC licenses, Quarry permits, School accreditation, SEC, Signage permits, Subdivision permits, TESDA, Weights & Measures
  {
    name: 'PCAB License Compliance',
    description: 'PCAB License validity checklist',
    notes: 'Covers PCAB license requirements under RA 10066 for construction contractors',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2010/02/10/republic-act-no-10066/',
        title: 'RA 10066 - Safety Law of the Philippines',
        description: 'Section 32: PCAB license required for contractors'
      }
    ],
    items: [
      { inspectionItemName: 'PCAB License', order: 1 }
    ]
  },
  {
    name: 'PDEA S2 License Compliance',
    description: 'PDEA S2 License validity checklist',
    notes: 'Covers PDEA S2 license requirements under RA 9165 for controlled substances',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2002/06/07/republic-act-no-9165/',
        title: 'RA 9165 - Comprehensive Dangerous Drugs Act',
        description: 'Section 22: PDEA S2 license required for controlled substances'
      }
    ],
    items: [
      { inspectionItemName: 'PDEA S2 License', order: 1 }
    ]
  },
  {
    name: 'PEZA Registration Compliance',
    description: 'PEZA Registration validity checklist',
    notes: 'Covers PEZA registration requirements under RA 7916 for export-oriented businesses',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/02/20/republic-act-no-7916/',
        title: 'RA 7916 - Special Economic Zone Act',
        description: 'Section 13: PEZA registration required for ecozone businesses'
      }
    ],
    items: [
      { inspectionItemName: 'PEZA Registration', order: 1 }
    ]
  },
  {
    name: 'Pharmacist in Charge Credential Compliance',
    description: 'Pharmacist in Charge Credential validity checklist',
    notes: 'Covers pharmacist credential requirements under RA 9711 for pharmacies',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/',
        title: 'RA 9711 - FDA Act of 2008',
        description: 'Section 21: Pharmacist credential required for pharmacies'
      }
    ],
    items: [
      { inspectionItemName: 'Pharmacist in Charge Credential', order: 1 }
    ]
  },
  {
    name: 'PhilHealth Accreditation Compliance',
    description: 'PhilHealth Accreditation validity checklist',
    notes: 'Covers PhilHealth accreditation requirements under RA 11223 for health facilities',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 27: PhilHealth accreditation required for health facilities'
      }
    ],
    items: [
      { inspectionItemName: 'PhilHealth Accreditation', order: 1 }
    ]
  },
  {
    name: 'PNP FEO License Compliance',
    description: 'PNP FEO License validity checklist',
    notes: 'Covers PNP FEO license requirements under RA 10591 for firearms businesses',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2013/12/11/republic-act-no-10591/',
        title: 'RA 10591 - Comprehensive Firearms and Ammunition Regulation Act',
        description: 'Section 29: PNP FEO license required for firearms businesses'
      }
    ],
    items: [
      { inspectionItemName: 'PNP FEO License', order: 1 }
    ]
  },
  {
    name: 'PNP SOSIA License Compliance',
    description: 'PNP SOSIA License validity checklist',
    notes: 'Covers PNP SOSIA license requirements under RA 7483 for security agencies',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/20/republic-act-no-7483/',
        title: 'RA 7483 - Private Security Agency Law',
        description: 'Section 27: PNP SOSIA license required for security agencies'
      }
    ],
    items: [
      { inspectionItemName: 'PNP SOSIA License', order: 1 }
    ]
  },
  {
    name: 'PRC Electrical License Compliance',
    description: 'PRC Electrical License validity checklist',
    notes: 'Covers PRC electrical license requirements under RA 9292 for electrical practitioners',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/08/26/republic-act-no-9292/',
        title: 'RA 9292 - Electrical Engineering Law',
        description: 'Section 27: PRC license required for electrical practitioners'
      }
    ],
    items: [
      { inspectionItemName: 'PRC Electrical License', order: 1 }
    ]
  },
  {
    name: 'PRC License Compliance',
    description: 'PRC License validity checklist',
    notes: 'Covers PRC license requirements under RA 11598 for regulated professions',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2022/04/13/republic-act-no-11598/',
        title: 'RA 11598 - PRC Modernization Act',
        description: 'Section 31: PRC license required for regulated professions'
      }
    ],
    items: [
      { inspectionItemName: 'PRC License', order: 1 }
    ]
  },
  {
    name: 'PRC Plumbing License Compliance',
    description: 'PRC Plumbing License validity checklist',
    notes: 'Covers PRC plumbing license requirements under RA 8551 for plumbing practitioners',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1999/05/19/republic-act-no-8551/',
        title: 'RA 8551 - Plumbing Law',
        description: 'Section 26: PRC license required for plumbing practitioners'
      }
    ],
    items: [
      { inspectionItemName: 'PRC Plumbing License', order: 1 }
    ]
  },
  {
    name: 'PRC Broker License Compliance',
    description: 'PRC Broker License validity checklist',
    notes: 'Covers PRC broker license requirements under RA 9646 for real estate brokers',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 29: PRC broker license required'
      }
    ],
    items: [
      { inspectionItemName: 'PRC Broker License', order: 1 }
    ]
  },
  {
    name: 'Quarry Permit Compliance',
    description: 'Quarry Permit validity checklist',
    notes: 'Covers quarry permit requirements under RA 7942 for quarrying operations',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Quarry permit required for quarrying'
      }
    ],
    items: [
      { inspectionItemName: 'Quarry Permit', order: 1 }
    ]
  },
  {
    name: 'School Accreditation Compliance',
    description: 'School Accreditation validity checklist',
    notes: 'Covers school accreditation requirements under BP 232 for educational institutions',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: School accreditation required for educational institutions'
      }
    ],
    items: [
      { inspectionItemName: 'School Accreditation', order: 1 }
    ]
  },
  {
    name: 'SEC CA Lending Compliance',
    description: 'SEC Certificate of Authority for Lending validity checklist',
    notes: 'Covers SEC CA requirements under RA 8799 for lending companies',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/03/20/republic-act-no-8799/',
        title: 'RA 8799 - Lending Company Regulation Act',
        description: 'Section 6: SEC CA required for lending companies'
      }
    ],
    items: [
      { inspectionItemName: 'SEC Certificate of Authority for Lending', order: 1 }
    ]
  },
  {
    name: 'Signage Permit Compliance',
    description: 'Signage Permit validity checklist',
    notes: 'Covers signage permit requirements under PD 1096 for business signage',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/08/18/presidential-decree-no-1096/',
        title: 'PD 1096 - National Building Code',
        description: 'Section 701: Signage permit required for business signage'
      }
    ],
    items: [
      { inspectionItemName: 'Signage Permit', order: 1 }
    ]
  },
  {
    name: 'Subdivision Development Permit Compliance',
    description: 'Subdivision Development Permit validity checklist',
    notes: 'Covers subdivision development permit requirements under RA 11201 for housing projects',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/',
        title: 'RA 11201 - Real Estate Service Act',
        description: 'Section 28: Subdivision development permit required'
      }
    ],
    items: [
      { inspectionItemName: 'Subdivision Development Permit', order: 1 }
    ]
  },
  {
    name: 'Condominium Project Approval Compliance',
    description: 'Condominium Project Approval validity checklist',
    notes: 'Covers condominium project approval requirements under RA 11201 for condominium developments',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/',
        title: 'RA 11201 - Real Estate Service Act',
        description: 'Section 28: Condominium project approval required'
      }
    ],
    items: [
      { inspectionItemName: 'Condominium Project Approval', order: 1 }
    ]
  },
  {
    name: 'TESDA Registration Compliance',
    description: 'TESDA Registration validity checklist',
    notes: 'Covers TESDA registration requirements under RA 11927 for technical vocational institutions',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2024/02/26/republic-act-no-11927/',
        title: 'RA 11927 - TESDA Act of 2024',
        description: 'Section 29: TESDA registration required for TVET institutions'
      }
    ],
    items: [
      { inspectionItemName: 'TESDA Registration', order: 1 }
    ]
  },
  {
    name: 'Weights and Measures Seal Compliance',
    description: 'Weights and Measures Seal validity checklist',
    notes: 'Covers weights and measures seal requirements under PD 939 for weighing scales',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/06/01/presidential-decree-no-939/',
        title: 'PD 939 - Weights and Measures Law',
        description: 'Section 14: Weights and measures seal required for scales'
      }
    ],
    items: [
      { inspectionItemName: 'Weights and Measures Seal', order: 1 }
    ]
  },
];

// Mapping of checklist names to post requirement codes
const CHECKLIST_POST_REQUIREMENT_MAP = {
  'AMLC Registration Compliance': 'amlc-registration',
  'Animal Welfare Seminar Compliance': 'animal-welfare-seminar-certificate',
  'Authorization to Haul Compliance': 'ath',
  'BAI Registration Compliance': 'bai-registration',
  'BFAR Registration Compliance': 'bfar-registration',
  'BIR Authority to Print Compliance': 'bir-authority-to-print',
  'BOI Registration Compliance': 'boi-registration',
  'BPI Accreditation Compliance': 'bpi-accreditation',
  'BPI License Compliance': 'bpi-license',
  'BSP Pawnshop Authority Compliance': 'bsp-pawnshop-authority',
  'BSP Certificate Authority Compliance': 'bsp-certificate-authority',
  // Batch 2 mappings
  'CAAP Height Clearance Compliance': 'caap-height-clearance',
  'CAAP RPAS Operator Certificate Compliance': 'caap-rpas-operator-certificate',
  'CNC Compliance': 'cnc',
  'CHED Recognition Permit Compliance': 'ched-recognition-permit',
  'Congressional Franchise Compliance': 'congressional-franchise',
  'Demolition Permit Compliance': 'demolition-permit',
  'DENR CNC Compliance': 'denr-cnc',
  'DENR PTO-AIR Compliance': 'denr-pto-air',
  'DENR PMPIN Compliance': 'denr-pmpin',
  'DENR Wastewater Discharge Permit Compliance': 'denr-wastewater-discharge-permit',
  'DENR Wood Processing Permit Compliance': 'denr-wood-processing-permit',
  'DepEd Permit Compliance': 'deped-permit',
  'DepEd Recognition Compliance': 'deped-recognition',
  'DepEd-CHED Joint Permit Compliance': 'deped-ched-permit',
  'DHSUD Broker Registration Compliance': 'dhsud-broker-registration',
  'DHSUD License to Sell Compliance': 'dhsud-license-to-sell',
  'DHSUD Project Registration Compliance': 'dhsud-project-registration',
  'DICT PEMEDES Authority Compliance': 'dict-pemedes-authority',
  'DMW License Compliance': 'dmw-license',
  'DOE Certificate of Compliance Compliance': 'doe-coc',
  'DOH LTO Compliance': 'doh-lto',
  'DOH Operating Permit Compliance': 'doh-operating-permit',
  'DOH Permit Compliance': 'doh-permit',
  'DOH Permit to Construct Compliance': 'doh-permit-to-construct',
  'DOLE Registration DO174 Compliance': 'dole-registration-do174',
  'DOT Accreditation Compliance': 'dot-accreditation',
  'DSWD Permit Compliance': 'dswd-permit',
  'DTI Accreditation Compliance': 'dti-accreditation',
  'DTI Freight Forwarding Accreditation Compliance': 'dti-freight-forwarding-accreditation',
  'DTI GTIDO Registration Compliance': 'dti-gtido-registration',
  'E-Pharmacy LTO Compliance': 'e-pharmacy-lto',
  // Batch 3 mappings
  'ERC Certificate Compliance': 'erc-certificate',
  'ERC CPCN Compliance': 'erc-cpcn',
  'FPA Commercial Applicator License Compliance': 'fpa-commercial-applicator-license',
  'FPA LTO Compliance': 'fpa-lto',
  'HLURB Registration Compliance': 'hlurb-registration',
  'Liquor License Compliance': 'liquor-license',
  'LLDA Discharge Permit Compliance': 'llda-discharge-permit',
  'LTFRB CPC Compliance': 'ltfrb-cpc',
  'LTFRB Franchise Compliance': 'ltfrb-franchise',
  'LTO Accreditation Compliance': 'lto-accreditation',
  'LTO Vehicle Registration Compliance': 'lto-vehicle-registration',
  'Medical Device Retailer LTO Compliance': 'medical-device-retailer-lto',
  'MGB Exploration Permit Compliance': 'mgb-exploration-permit',
  'MGB Mineral Agreement Compliance': 'mgb-mineral-agreement',
  'MGB Permit Compliance': 'mgb-permit',
  'NBDB Publisher Registration Compliance': 'nbdb-publisher-registration',
  'NFA Accreditation Compliance': 'nfa-accreditation',
  'NFA License Compliance': 'nfa-license',
  'NFA Registration Compliance': 'nfa-registration',
  'NMIS Accreditation Compliance': 'nmis-accreditation',
  'NPC Registration Compliance': 'npc-registration',
  'NTC CPCN Compliance': 'ntc-cpcn',
  'NTC Certificate Compliance': 'ntc-certificate',
  'NTC PA-CPCN Compliance': 'ntc-pa-cpcn',
  'NWRB CPC Compliance': 'nwrb-cpc',
  'NWRB Water Permit Compliance': 'nwrb-water-permit',
  // Batch 4 mappings
  'PCAB License Compliance': 'pcab-license',
  'PDEA S2 License Compliance': 'pdea-s2-license',
  'PEZA Registration Compliance': 'peza-registration',
  'Pharmacist in Charge Credential Compliance': 'pharmacist-in-charge-credential',
  'PhilHealth Accreditation Compliance': 'philhealth-accreditation',
  'PNP FEO License Compliance': 'pnp-feo-license',
  'PNP SOSIA License Compliance': 'pnp-sosia-license',
  'PRC Electrical License Compliance': 'prc-electrical-license',
  'PRC License Compliance': 'prc-license',
  'PRC Plumbing License Compliance': 'prc-plumbing-license',
  'PRC Broker License Compliance': 'prc-broker-license',
  'Quarry Permit Compliance': 'quarry-permit',
  'School Accreditation Compliance': 'school-accreditation',
  'SEC CA Lending Compliance': 'sec-ca-lending',
  'Signage Permit Compliance': 'signage-permit',
  'Subdivision Development Permit Compliance': 'subdivision-development-permit',
  'Condominium Project Approval Compliance': 'condominium-project-approval',
  'TESDA Registration Compliance': 'tesda-registration',
  'Weights and Measures Seal Compliance': 'weights-measures-seal',
};

async function seedPostRequirementChecklists() {
  let didConnect = false;
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
    
    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      console.log(`Connecting to MongoDB: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      didConnect = true;
    }

    // Load inspection items to get their IDs
    const InspectionItem = require("../models/InspectionItem");
    const inspectionItems = await InspectionItem.find({ isActive: true });
    const inspectionItemMap = new Map();
    inspectionItems.forEach(item => inspectionItemMap.set(item.name, item._id));

    // Load post requirements to get their IDs
    const postRequirements = await PostRequirement.find({ 
      code: { $in: Object.values(CHECKLIST_POST_REQUIREMENT_MAP) }
    });
    const postRequirementMap = new Map();
    postRequirements.forEach(pr => postRequirementMap.set(pr.code, pr._id));

    console.log("Clearing existing post requirement checklists...");
    await Checklist.deleteMany({});

    console.log("Seeding post requirement checklists...");
    const createdChecklists = [];
    for (const checklistData of POST_REQUIREMENT_CHECKLISTS) {
      const itemsWithIds = [];
      for (const item of checklistData.items) {
        const inspectionItemId = inspectionItemMap.get(item.inspectionItemName);
        if (!inspectionItemId) {
          console.log(`Warning: No inspection item found with name: ${item.inspectionItemName}`);
          continue;
        }
        itemsWithIds.push({
          inspectionItemId,
          order: item.order
        });
      }

      if (itemsWithIds.length === 0) {
        console.log(`Warning: Skipping checklist ${checklistData.name} - no valid inspection items`);
        continue;
      }

      const postRequirementCode = CHECKLIST_POST_REQUIREMENT_MAP[checklistData.name];
      const postRequirementId = postRequirementMap.get(postRequirementCode);

      if (!postRequirementId) {
        console.log(`Warning: No post requirement found with code: ${postRequirementCode}`);
        continue;
      }

      const checklist = await Checklist.create({
        ...checklistData,
        items: itemsWithIds,
        postRequirementId,
        isActive: true,
        version: 1,
      });
      
      // Update the PostRequirement to reference this checklist
      await PostRequirement.findByIdAndUpdate(postRequirementId, { checklistId: checklist._id });
      
      createdChecklists.push(checklist);
      console.log(`Created checklist: ${checklist.name} for post requirement: ${postRequirementCode}`);
    }

    console.log(`Created ${createdChecklists.length} post requirement checklists`);

    // Only disconnect if we connected
    if (didConnect) {
      await mongoose.disconnect();
    }
    return { createdCount: createdChecklists.length };
  } catch (err) {
    console.error("Error seeding post requirement checklists:", err);
    if (didConnect) {
      await mongoose.disconnect();
    }
    throw err;
  }
}

module.exports = { seedPostRequirementChecklists, POST_REQUIREMENT_CHECKLISTS };

if (require.main === module) {
  seedPostRequirementChecklists().catch(console.error);
}
