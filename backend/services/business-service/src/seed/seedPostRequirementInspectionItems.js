const mongoose = require("mongoose");
const InspectionItem = require("../models/InspectionItem");

/**
 * Post Requirement Inspection Items Seeder
 *
 * Seeds inspection items specific to post requirement compliance verification.
 * These items are used to check if businesses have valid post-approval certificates/permits.
 *
 * Structure:
 * - name: Display name of the inspection item
 * - question: Specific question to ask during inspection
 * - notes: Inspector guidance on what to check
 * - violationName: Name of the violation if this check fails
 * - legalBasis: Array of legal references (url, title, description)
 */

const POST_REQUIREMENT_INSPECTION_ITEMS = [
  // Batch 1: AMLC, Animal Welfare, ATH, BAI, BFAR, BIR ATP, BOI, BPI, BSP
  {
    name: 'AMLC Registration Status',
    question: 'Is the business registered with the Anti-Money Laundering Council?',
    notes: 'Check for AMLC registration certificate or confirmation letter. Required for covered persons under RA 9160.',
    violationName: 'Absence of AMLC Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/09/29/republic-act-no-9160/',
        title: 'RA 9160 - Anti-Money Laundering Act of 2001',
        description: 'Section 9: Covered persons must register with AMLC'
      }
    ]
  },
  {
    name: 'AMLC Registration Validity',
    question: 'Is the AMLC registration current and not expired?',
    notes: 'Check the registration date and renewal status. AMLC registration must be maintained while operating as a covered person.',
    violationName: 'Expired AMLC Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/09/29/republic-act-no-9160/',
        title: 'RA 9160 - Anti-Money Laundering Act of 2001',
        description: 'Section 9: Registration must be maintained while operating as a covered person'
      }
    ]
  },
  {
    name: 'Animal Welfare Seminar Certificate',
    question: 'Does the business have a valid Animal Welfare Seminar certificate?',
    notes: 'Check for certificate of attendance from BAI/DA-RFOs or BAI-recognized organization. Required for animal handlers.',
    violationName: 'Absence of Animal Welfare Seminar Certificate',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/',
        title: 'RA 8485 - Animal Welfare Act of 1998',
        description: 'Section 6: Animal handlers must complete animal welfare seminar'
      }
    ]
  },
  {
    name: 'Authorization to Haul',
    question: 'Does the business have valid Authorization to Haul from DENR/MGB?',
    notes: 'Check for authorization document for hauling mineral products. Required under RA 7942.',
    violationName: 'Absence of Authorization to Haul',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 27: Authorization required for hauling and transporting mineral products'
      }
    ]
  },
  {
    name: 'Authorization to Haul Validity',
    question: 'Is the Authorization to Haul current and not expired?',
    notes: 'Check the authorization validity period. Must be renewed as per DENR/MGB regulations.',
    violationName: 'Expired Authorization to Haul',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 27: Authorization must be valid and current'
      }
    ]
  },
  {
    name: 'BAI Registration',
    question: 'Is the business registered with the Bureau of Animal Industry?',
    notes: 'Check for BAI registration certificate. Required for veterinary clinics, hospitals, and animal facilities.',
    violationName: 'Absence of BAI Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/',
        title: 'RA 8485 - Animal Welfare Act of 1998',
        description: 'Section 7: Veterinary clinics and animal facilities must register with BAI'
      }
    ]
  },
  {
    name: 'BFAR Registration',
    question: 'Is the business registered with the Bureau of Fisheries and Aquatic Resources?',
    notes: 'Check for BFAR registration certificate. Required for fisheries-related businesses.',
    violationName: 'Absence of BFAR Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/02/25/republic-act-no-8550/',
        title: 'RA 8550 - Philippine Fisheries Code of 1998',
        description: 'Section 29: Fisheries-related businesses must register with BFAR'
      }
    ]
  },
  {
    name: 'BIR Authority to Print',
    question: 'Does the business have valid Authority to Print from BIR?',
    notes: 'Check for ATP document. Required for commercial printing of official receipts, sales invoices, and other accountable forms.',
    violationName: 'Absence of BIR Authority to Print',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1997/12/11/republic-act-no-8424/',
        title: 'RA 8424 - National Internal Revenue Code of 1997',
        description: 'Section 238: Authority to Print required for commercial printing of accountable forms'
      }
    ]
  },
  {
    name: 'BIR Authority to Print Validity',
    question: 'Is the BIR Authority to Print current and not expired?',
    notes: 'Check the ATP validity period. Must be renewed every 3 years.',
    violationName: 'Expired BIR Authority to Print',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1997/12/11/republic-act-no-8424/',
        title: 'RA 8424 - National Internal Revenue Code of 1997',
        description: 'Section 238: ATP must be valid and current'
      }
    ]
  },
  {
    name: 'BOI Registration',
    question: 'Is the business registered with the Board of Investments?',
    notes: 'Check for BOI registration certificate. Required for export-oriented or priority projects for tax incentives.',
    violationName: 'Absence of BOI Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1987/07/16/executive-order-no-226-s-1987/',
        title: 'EO 226 - Omnibus Investments Code of 1987',
        description: 'Article 20: Registration with BOI required for tax incentives'
      }
    ]
  },
  {
    name: 'BPI Accreditation',
    question: 'Is the business accredited by the Bureau of Plant Industry?',
    notes: 'Check for BPI accreditation certificate. Required for plant nursery operators.',
    violationName: 'Absence of BPI Accreditation',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/',
        title: 'RA 7308 - Seed Industry Development Act of 1992',
        description: 'Section 12: Plant nursery operators must be accredited by BPI'
      }
    ]
  },
  {
    name: 'BPI License',
    question: 'Does the business have a valid BPI license?',
    notes: 'Check for BPI license. Required for certain plant-related operations.',
    violationName: 'Absence of BPI License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/',
        title: 'RA 7308 - Seed Industry Development Act of 1992',
        description: 'Section 12: BPI license required for plant-related operations'
      }
    ]
  },
  {
    name: 'BSP Pawnshop Authority',
    question: 'Does the business have valid authority from BSP for pawnshop operations?',
    notes: 'Check for BSP authority certificate. Required for pawnshop operations.',
    violationName: 'Absence of BSP Pawnshop Authority',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/Regulations/Issuances/Pawnshops',
        title: 'BSP Circular No. 224 - Pawnshop Regulations',
        description: 'Section 3: Authority from BSP required for pawnshop operations'
      }
    ]
  },
  {
    name: 'BSP Certificate Authority',
    question: 'Does the business have valid Certificate of Authority from BSP?',
    notes: 'Check for BSP Certificate of Authority. Required for certain financial operations.',
    violationName: 'Absence of BSP Certificate Authority',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/Regulations/Issuances/Financial',
        title: 'BSP Regulations on Financial Institutions',
        description: 'Certificate of Authority required for financial operations'
      }
    ]
  },
  // Batch 2: CAAP, CNC, CHED, Congressional Franchise, Demolition Permit, DENR permits, DepEd permits, DHSUD permits, DICT, DMW, DOE, DOH permits, DOLE, DOT, DSWD, DTI permits, E-pharmacy
  {
    name: 'CAAP Height Clearance',
    question: 'Does the business have valid CAAP Height Clearance?',
    notes: 'Check for height clearance document from CAAP. Required for structures near airports.',
    violationName: 'Absence of CAAP Height Clearance',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/03/12/republic-act-no-9497/',
        title: 'RA 9497 - Civil Aviation Authority Act of 2008',
        description: 'Section 30: Height clearance required for structures near airports'
      }
    ]
  },
  {
    name: 'CAAP RPAS Operator Certificate',
    question: 'Does the business have valid CAAP RPAS Operator Certificate?',
    notes: 'Check for RPAS operator certificate. Required for drone operations.',
    violationName: 'Absence of CAAP RPAS Operator Certificate',
    legalBasis: [
      {
        url: 'https://www.caap.gov.ph/',
        title: 'CAAP Memorandum Circular No. 12-2018',
        description: 'RPAS operator certificate required for commercial drone operations'
      }
    ]
  },
  {
    name: 'Certificate of Non-Coverage',
    question: 'Does the business have valid Certificate of Non-Coverage?',
    notes: 'Check for CNC from DENR-EMB. Required for projects not requiring ECC.',
    violationName: 'Absence of CNC',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1586/',
        title: 'PD 1586 - Philippine Environmental Impact Statement System',
        description: 'Section 4: CNC required for projects not requiring ECC'
      }
    ]
  },
  {
    name: 'CHED Recognition Permit',
    question: 'Does the business have valid CHED Recognition Permit?',
    notes: 'Check for CHED recognition document. Required for higher education institutions.',
    violationName: 'Absence of CHED Recognition Permit',
    legalBasis: [
      {
        url: 'https://www.ched.gov.ph/',
        title: 'RA 7722 - Higher Education Act of 1994',
        description: 'Section 8: CHED recognition required for higher education institutions'
      }
    ]
  },
  {
    name: 'Congressional Franchise',
    question: 'Does the business have valid Congressional Franchise?',
    notes: 'Check for congressional franchise document. Required for public utilities.',
    violationName: 'Absence of Congressional Franchise',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1987/02/11/1987-constitution/',
        title: '1987 Constitution Article XII',
        description: 'Section 11: Congressional franchise required for public utilities'
      }
    ]
  },
  {
    name: 'Demolition Permit',
    question: 'Does the business have valid Demolition Permit?',
    notes: 'Check for demolition permit from local government. Required before demolition work.',
    violationName: 'Absence of Demolition Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/08/18/presidential-decree-no-1096/',
        title: 'PD 1096 - National Building Code',
        description: 'Section 301: Demolition permit required before demolition work'
      }
    ]
  },
  {
    name: 'DENR Certificate of Non-Coverage',
    question: 'Does the business have valid DENR Certificate of Non-Coverage?',
    notes: 'Check for DENR CNC. Required for projects not requiring ECC.',
    violationName: 'Absence of DENR CNC',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1586/',
        title: 'PD 1586 - Philippine Environmental Impact Statement System',
        description: 'Section 4: CNC required for projects not requiring ECC'
      }
    ]
  },
  {
    name: 'DENR Permit to Operate Air Installation',
    question: 'Does the business have valid DENR Permit to Operate Air Installation?',
    notes: 'Check for PTO-AIR from DENR. Required for air pollution sources.',
    violationName: 'Absence of DENR PTO-AIR',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1181/',
        title: 'PD 1181 - Pollution Control Law',
        description: 'Section 6: PTO-AIR required for air pollution sources'
      }
    ]
  },
  {
    name: 'DENR Pollution Management Program Implementation Notice',
    question: 'Does the business have valid DENR PMPIN?',
    notes: 'Check for PMPIN document. Required for pollution control.',
    violationName: 'Absence of DENR PMPIN',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/25/republic-act-no-9275/',
        title: 'RA 9275 - Philippine Clean Air Act',
        description: 'Section 14: PMPIN required for pollution control'
      }
    ]
  },
  {
    name: 'DENR Wastewater Discharge Permit',
    question: 'Does the business have valid DENR Wastewater Discharge Permit?',
    notes: 'Check for wastewater discharge permit. Required for facilities discharging wastewater.',
    violationName: 'Absence of DENR Wastewater Discharge Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/25/republic-act-no-9275/',
        title: 'RA 9275 - Philippine Clean Water Act',
        description: 'Section 8: Wastewater discharge permit required'
      }
    ]
  },
  {
    name: 'DENR Wood Processing Permit',
    question: 'Does the business have valid DENR Wood Processing Permit?',
    notes: 'Check for wood processing permit. Required for wood-based industries.',
    violationName: 'Absence of DENR Wood Processing Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1975/05/20/presidential-decree-no-705/',
        title: 'PD 705 - Forestry Reform Code',
        description: 'Section 77: Wood processing permit required'
      }
    ]
  },
  {
    name: 'DepEd Permit',
    question: 'Does the business have valid DepEd Permit?',
    notes: 'Check for DepEd permit. Required for educational institutions.',
    violationName: 'Absence of DepEd Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: DepEd permit required for educational institutions'
      }
    ]
  },
  {
    name: 'DepEd Recognition',
    question: 'Does the business have valid DepEd Recognition?',
    notes: 'Check for DepEd recognition document. Required for schools.',
    violationName: 'Absence of DepEd Recognition',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: DepEd recognition required for schools'
      }
    ]
  },
  {
    name: 'DepEd-CHED Joint Permit',
    question: 'Does the business have valid DepEd-CHED Joint Permit?',
    notes: 'Check for joint permit. Required for certain educational programs.',
    violationName: 'Absence of DepEd-CHED Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: Joint permit required for certain programs'
      }
    ]
  },
  {
    name: 'DHSUD Broker Registration',
    question: 'Does the business have valid DHSUD Broker Registration?',
    notes: 'Check for broker registration. Required for real estate brokers.',
    violationName: 'Absence of DHSUD Broker Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 29: DHSUD broker registration required'
      }
    ]
  },
  {
    name: 'DHSUD License to Sell',
    question: 'Does the business have valid DHSUD License to Sell?',
    notes: 'Check for license to sell. Required for real estate projects.',
    violationName: 'Absence of DHSUD License to Sell',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 28: License to Sell required for projects'
      }
    ]
  },
  {
    name: 'DHSUD Project Registration',
    question: 'Does the business have valid DHSUD Project Registration?',
    notes: 'Check for project registration. Required for housing projects.',
    violationName: 'Absence of DHSUD Project Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 28: Project registration required'
      }
    ]
  },
  {
    name: 'DICT PEMEDES Authority',
    question: 'Does the business have valid DICT PEMEDES Authority?',
    notes: 'Check for PEMEDES authority. Required for medical device establishments.',
    violationName: 'Absence of DICT PEMEDES Authority',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 37: DICT PEMEDES authority required'
      }
    ]
  },
  {
    name: 'DMW License',
    question: 'Does the business have valid DMW License?',
    notes: 'Check for DMW license. Required for recruitment agencies.',
    violationName: 'Absence of DMW License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/02/13/republic-act-no-8042/',
        title: 'RA 8042 - Migrant Workers and Overseas Filipinos Act',
        description: 'Section 23: DMW license required for recruitment'
      }
    ]
  },
  {
    name: 'DOE Certificate of Compliance',
    question: 'Does the business have valid DOE Certificate of Compliance?',
    notes: 'Check for DOE COC. Required for energy-related facilities.',
    violationName: 'Absence of DOE Certificate of Compliance',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act',
        description: 'Section 42: DOE COC required for energy facilities'
      }
    ]
  },
  {
    name: 'DOH License to Operate',
    question: 'Does the business have valid DOH License to Operate?',
    notes: 'Check for DOH LTO. Required for health facilities.',
    violationName: 'Absence of DOH LTO',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: DOH LTO required for health facilities'
      }
    ]
  },
  {
    name: 'DOH Operating Permit',
    question: 'Does the business have valid DOH Operating Permit?',
    notes: 'Check for operating permit. Required for health establishments.',
    violationName: 'Absence of DOH Operating Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: Operating permit required'
      }
    ]
  },
  {
    name: 'DOH Permit',
    question: 'Does the business have valid DOH Permit?',
    notes: 'Check for DOH permit. Required for health-related businesses.',
    violationName: 'Absence of DOH Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: DOH permit required'
      }
    ]
  },
  {
    name: 'DOH Permit to Construct',
    question: 'Does the business have valid DOH Permit to Construct?',
    notes: 'Check for permit to construct. Required for health facility construction.',
    violationName: 'Absence of DOH Permit to Construct',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 25: Permit to construct required'
      }
    ]
  },
  {
    name: 'DOLE Registration DO174',
    question: 'Does the business have valid DOLE Registration under DO174?',
    notes: 'Check for DOLE registration. Required for establishments.',
    violationName: 'Absence of DOLE Registration DO174',
    legalBasis: [
      {
        url: 'https://www.dole.gov.ph/',
        title: 'DOLE Department Order No. 174',
        description: 'Establishment registration required under DO174'
      }
    ]
  },
  {
    name: 'DOT Accreditation',
    question: 'Does the business have valid DOT Accreditation?',
    notes: 'Check for DOT accreditation. Required for tourism establishments.',
    violationName: 'Absence of DOT Accreditation',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/',
        title: 'RA 9593 - Tourism Act of 2009',
        description: 'Section 38: DOT accreditation required for tourism establishments'
      }
    ]
  },
  {
    name: 'DSWD Permit',
    question: 'Does the business have valid DSWD Permit?',
    notes: 'Check for DSWD permit. Required for social welfare agencies.',
    violationName: 'Absence of DSWD Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1997/02/10/republic-act-no-8432/',
        title: 'RA 8432 - Magna Carta for Disabled Persons',
        description: 'Section 5: DSWD permit required for social welfare agencies'
      }
    ]
  },
  {
    name: 'DTI Accreditation',
    question: 'Does the business have valid DTI Accreditation?',
    notes: 'Check for DTI accreditation. Required for certain businesses.',
    violationName: 'Absence of DTI Accreditation',
    legalBasis: [
      {
        url: 'https://www.dti.gov.ph/',
        title: 'DTI Accreditation Guidelines',
        description: 'DTI accreditation required for specific business types'
      }
    ]
  },
  {
    name: 'DTI Freight Forwarding Accreditation',
    question: 'Does the business have valid DTI Freight Forwarding Accreditation?',
    notes: 'Check for freight forwarding accreditation. Required for logistics companies.',
    violationName: 'Absence of DTI Freight Forwarding Accreditation',
    legalBasis: [
      {
        url: 'https://www.dti.gov.ph/',
        title: 'DTI Freight Forwarding Accreditation Rules',
        description: 'Accreditation required for freight forwarding'
      }
    ]
  },
  {
    name: 'DTI GTIDO Registration',
    question: 'Does the business have valid DTI GTIDO Registration?',
    notes: 'Check for GTIDO registration. Required for trading companies.',
    violationName: 'Absence of DTI GTIDO Registration',
    legalBasis: [
      {
        url: 'https://www.dti.gov.ph/',
        title: 'DTI GTIDO Registration Guidelines',
        description: 'GTIDO registration required for trading'
      }
    ]
  },
  {
    name: 'E-Pharmacy License to Operate',
    question: 'Does the business have valid E-Pharmacy License to Operate?',
    notes: 'Check for e-pharmacy LTO. Required for online pharmacies.',
    violationName: 'Absence of E-Pharmacy LTO',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/',
        title: 'RA 9711 - FDA Act of 2008',
        description: 'Section 21: E-pharmacy LTO required for online pharmacies'
      }
    ]
  },
  // Batch 3: ERC, FPA, HLURB, Liquor License, LLDA, LTFRB, LTO, Medical Device Retailer, MGB permits, NBDB, NFA, NMIS, NPC, NTC, NWRB
  {
    name: 'ERC Certificate',
    question: 'Does the business have valid ERC Certificate?',
    notes: 'Check for ERC certificate. Required for energy-related operations.',
    violationName: 'Absence of ERC Certificate',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act',
        description: 'Section 37: ERC certificate required for energy operations'
      }
    ]
  },
  {
    name: 'ERC CPCN',
    question: 'Does the business have valid ERC Certificate of Public Convenience and Necessity?',
    notes: 'Check for ERC CPCN. Required for public utility operations.',
    violationName: 'Absence of ERC CPCN',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/',
        title: 'RA 9136 - Electric Power Industry Reform Act',
        description: 'Section 37: CPCN required for public utility operations'
      }
    ]
  },
  {
    name: 'FPA Commercial Applicator License',
    question: 'Does the business have valid FPA Commercial Applicator License?',
    notes: 'Check for FPA license. Required for commercial pesticide applicators.',
    violationName: 'Absence of FPA Commercial Applicator License',
    legalBasis: [
      {
        url: 'https://www.fpa.gov.ph/',
        title: 'FPA Act of 1977',
        description: 'FPA license required for commercial pesticide application'
      }
    ]
  },
  {
    name: 'FPA License to Operate',
    question: 'Does the business have valid FPA License to Operate?',
    notes: 'Check for FPA LTO. Required for fertilizer and pesticide businesses.',
    violationName: 'Absence of FPA LTO',
    legalBasis: [
      {
        url: 'https://www.fpa.gov.ph/',
        title: 'FPA Act of 1977',
        description: 'FPA LTO required for fertilizer and pesticide businesses'
      }
    ]
  },
  {
    name: 'HLURB Registration',
    question: 'Does the business have valid HLURB Registration?',
    notes: 'Check for HLURB registration. Required for housing projects.',
    violationName: 'Absence of HLURB Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/',
        title: 'RA 11201 - Real Estate Service Act',
        description: 'Section 28: HLURB registration required for housing projects'
      }
    ]
  },
  {
    name: 'Liquor License',
    question: 'Does the business have valid Liquor License?',
    notes: 'Check for liquor license. Required for establishments serving alcoholic beverages.',
    violationName: 'Absence of Liquor License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/03/21/republic-act-no-6969/',
        title: 'RA 6969 - Toxic Substances and Hazardous Wastes',
        description: 'Liquor license required for establishments serving alcohol'
      }
    ]
  },
  {
    name: 'LLDA Discharge Permit',
    question: 'Does the business have valid LLDA Discharge Permit?',
    notes: 'Check for LLDA discharge permit. Required for facilities discharging into Laguna Lake.',
    violationName: 'Absence of LLDA Discharge Permit',
    legalBasis: [
      {
        url: 'https://www.llda.gov.ph/',
        title: 'LLDA Act of 1966',
        description: 'Discharge permit required for Laguna Lake discharges'
      }
    ]
  },
  {
    name: 'LTFRB Certificate of Public Convenience',
    question: 'Does the business have valid LTFRB Certificate of Public Convenience?',
    notes: 'Check for LTFRB CPC. Required for public transportation operations.',
    violationName: 'Absence of LTFRB CPC',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'CPC required for public transportation'
      }
    ]
  },
  {
    name: 'LTFRB Franchise',
    question: 'Does the business have valid LTFRB Franchise?',
    notes: 'Check for LTFRB franchise. Required for public utility vehicle operations.',
    violationName: 'Absence of LTFRB Franchise',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'Franchise required for PUV operations'
      }
    ]
  },
  {
    name: 'LTO Accreditation',
    question: 'Does the business have valid LTO Accreditation?',
    notes: 'Check for LTO accreditation. Required for driving schools and related businesses.',
    violationName: 'Absence of LTO Accreditation',
    legalBasis: [
      {
        url: 'https://www.lto.gov.ph/',
        title: 'LTO Accreditation Guidelines',
        description: 'LTO accreditation required for driving schools'
      }
    ]
  },
  {
    name: 'LTO Vehicle Registration',
    question: 'Does the business have valid LTO Vehicle Registration?',
    notes: 'Check for vehicle registration. Required for business vehicles.',
    violationName: 'Absence of LTO Vehicle Registration',
    legalBasis: [
      {
        url: 'https://www.lto.gov.ph/',
        title: 'LTO Vehicle Registration Requirements',
        description: 'Vehicle registration required for all vehicles'
      }
    ]
  },
  {
    name: 'Medical Device Retailer License to Operate',
    question: 'Does the business have valid Medical Device Retailer License to Operate?',
    notes: 'Check for medical device retailer LTO. Required for selling medical devices.',
    violationName: 'Absence of Medical Device Retailer LTO',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/',
        title: 'RA 9711 - FDA Act of 2008',
        description: 'Section 21: Medical device retailer LTO required'
      }
    ]
  },
  {
    name: 'MGB Exploration Permit',
    question: 'Does the business have valid MGB Exploration Permit?',
    notes: 'Check for exploration permit. Required for mineral exploration activities.',
    violationName: 'Absence of MGB Exploration Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Exploration permit required for mineral activities'
      }
    ]
  },
  {
    name: 'MGB Mineral Agreement',
    question: 'Does the business have valid MGB Mineral Agreement?',
    notes: 'Check for mineral agreement. Required for mining operations.',
    violationName: 'Absence of MGB Mineral Agreement',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Mineral agreement required for mining operations'
      }
    ]
  },
  {
    name: 'MGB Permit',
    question: 'Does the business have valid MGB Permit?',
    notes: 'Check for MGB permit. Required for mining-related activities.',
    violationName: 'Absence of MGB Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: MGB permit required for mining activities'
      }
    ]
  },
  {
    name: 'NBDB Publisher Registration',
    question: 'Does the business have valid NBDB Publisher Registration?',
    notes: 'Check for NBDB registration. Required for book publishers.',
    violationName: 'Absence of NBDB Publisher Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2013/06/21/republic-act-no-10372/',
        title: 'RA 10372 - Book Publishing Industry Development Act',
        description: 'Section 12: NBDB registration required for publishers'
      }
    ]
  },
  {
    name: 'NFA Accreditation',
    question: 'Does the business have valid NFA Accreditation?',
    notes: 'Check for NFA accreditation. Required for rice and grain businesses.',
    violationName: 'Absence of NFA Accreditation',
    legalBasis: [
      {
        url: 'https://www.nfa.gov.ph/',
        title: 'NFA Accreditation Guidelines',
        description: 'NFA accreditation required for grain businesses'
      }
    ]
  },
  {
    name: 'NFA License',
    question: 'Does the business have valid NFA License?',
    notes: 'Check for NFA license. Required for rice and grain trading.',
    violationName: 'Absence of NFA License',
    legalBasis: [
      {
        url: 'https://www.nfa.gov.ph/',
        title: 'NFA License Requirements',
        description: 'NFA license required for grain trading'
      }
    ]
  },
  {
    name: 'NFA Registration',
    question: 'Does the business have valid NFA Registration?',
    notes: 'Check for NFA registration. Required for rice and grain businesses.',
    violationName: 'Absence of NFA Registration',
    legalBasis: [
      {
        url: 'https://www.nfa.gov.ph/',
        title: 'NFA Registration Guidelines',
        description: 'NFA registration required for grain businesses'
      }
    ]
  },
  {
    name: 'NMIS Accreditation',
    question: 'Does the business have valid NMIS Accreditation?',
    notes: 'Check for NMIS accreditation. Required for meat establishments.',
    violationName: 'Absence of NMIS Accreditation',
    legalBasis: [
      {
        url: 'https://www.nmis.gov.ph/',
        title: 'NMIS Accreditation Guidelines',
        description: 'NMIS accreditation required for meat establishments'
      }
    ]
  },
  {
    name: 'NPC Registration',
    question: 'Does the business have valid NPC Registration?',
    notes: 'Check for NPC registration. Required for nuclear-related activities.',
    violationName: 'Absence of NPC Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2001/04/13/republic-act-no-5207/',
        title: 'RA 5207 - Atomic Energy Regulatory Act',
        description: 'NPC registration required for nuclear activities'
      }
    ]
  },
  {
    name: 'NTC Certificate of Public Convenience and Necessity',
    question: 'Does the business have valid NTC Certificate of Public Convenience and Necessity?',
    notes: 'Check for NTC CPCN. Required for telecommunications operations.',
    violationName: 'Absence of NTC CPCN',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'CPCN required for telecommunications'
      }
    ]
  },
  {
    name: 'NTC Certificate',
    question: 'Does the business have valid NTC Certificate?',
    notes: 'Check for NTC certificate. Required for telecommunications equipment.',
    violationName: 'Absence of NTC Certificate',
    legalBasis: [
      {
        url: 'https://www.ntc.gov.ph/',
        title: 'NTC Certificate Requirements',
        description: 'NTC certificate required for telecom equipment'
      }
    ]
  },
  {
    name: 'NTC Provisional Authority CPCN',
    question: 'Does the business have valid NTC Provisional Authority CPCN?',
    notes: 'Check for NTC PA-CPCN. Required for provisional telecommunications operations.',
    violationName: 'Absence of NTC PA-CPCN',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'PA-CPCN required for provisional telecom operations'
      }
    ]
  },
  {
    name: 'NWRB Certificate of Public Convenience',
    question: 'Does the business have valid NWRB Certificate of Public Convenience?',
    notes: 'Check for NWRB CPC. Required for water utility operations.',
    violationName: 'Absence of NWRB CPC',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/23/republic-act-no-9275/',
        title: 'RA 9275 - Water Code of the Philippines',
        description: 'CPC required for water utility operations'
      }
    ]
  },
  {
    name: 'NWRB Water Permit',
    question: 'Does the business have valid NWRB Water Permit?',
    notes: 'Check for NWRB water permit. Required for water extraction and use.',
    violationName: 'Absence of NWRB Water Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/06/23/republic-act-no-9275/',
        title: 'RA 9275 - Water Code of the Philippines',
        description: 'Water permit required for water extraction'
      }
    ]
  },
  // Batch 4: PCAB, PDEA, PEZA, Pharmacist, PhilHealth, PNP, PRC licenses, Quarry permits, School accreditation, SEC, Signage permits, Subdivision permits, TESDA, Weights & Measures
  {
    name: 'PCAB License',
    question: 'Does the business have valid PCAB License?',
    notes: 'Check for PCAB license. Required for construction contractors.',
    violationName: 'Absence of PCAB License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2010/02/10/republic-act-no-10066/',
        title: 'RA 10066 - Safety Law of the Philippines',
        description: 'Section 32: PCAB license required for contractors'
      }
    ]
  },
  {
    name: 'PDEA S2 License',
    question: 'Does the business have valid PDEA S2 License?',
    notes: 'Check for PDEA S2 license. Required for handling controlled substances.',
    violationName: 'Absence of PDEA S2 License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2002/06/07/republic-act-no-9165/',
        title: 'RA 9165 - Comprehensive Dangerous Drugs Act',
        description: 'Section 22: PDEA S2 license required for controlled substances'
      }
    ]
  },
  {
    name: 'PEZA Registration',
    question: 'Does the business have valid PEZA Registration?',
    notes: 'Check for PEZA registration. Required for export-oriented businesses.',
    violationName: 'Absence of PEZA Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/02/20/republic-act-no-7916/',
        title: 'RA 7916 - Special Economic Zone Act',
        description: 'Section 13: PEZA registration required for ecozone businesses'
      }
    ]
  },
  {
    name: 'Pharmacist in Charge Credential',
    question: 'Does the business have valid Pharmacist in Charge Credential?',
    notes: 'Check for pharmacist credential. Required for pharmacies.',
    violationName: 'Absence of Pharmacist in Charge Credential',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/',
        title: 'RA 9711 - FDA Act of 2008',
        description: 'Section 21: Pharmacist credential required for pharmacies'
      }
    ]
  },
  {
    name: 'PhilHealth Accreditation',
    question: 'Does the business have valid PhilHealth Accreditation?',
    notes: 'Check for PhilHealth accreditation. Required for health facilities.',
    violationName: 'Absence of PhilHealth Accreditation',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/',
        title: 'RA 11223 - Universal Health Care Act',
        description: 'Section 27: PhilHealth accreditation required for health facilities'
      }
    ]
  },
  {
    name: 'PNP FEO License',
    question: 'Does the business have valid PNP FEO License?',
    notes: 'Check for PNP FEO license. Required for firearms and explosives businesses.',
    violationName: 'Absence of PNP FEO License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2013/12/11/republic-act-no-10591/',
        title: 'RA 10591 - Comprehensive Firearms and Ammunition Regulation Act',
        description: 'Section 29: PNP FEO license required for firearms businesses'
      }
    ]
  },
  {
    name: 'PNP SOSIA License',
    question: 'Does the business have valid PNP SOSIA License?',
    notes: 'Check for PNP SOSIA license. Required for security agencies.',
    violationName: 'Absence of PNP SOSIA License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1992/03/20/republic-act-no-7483/',
        title: 'RA 7483 - Private Security Agency Law',
        description: 'Section 27: PNP SOSIA license required for security agencies'
      }
    ]
  },
  {
    name: 'PRC Electrical License',
    question: 'Does the business have valid PRC Electrical License?',
    notes: 'Check for PRC electrical license. Required for electrical practitioners.',
    violationName: 'Absence of PRC Electrical License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2004/08/26/republic-act-no-9292/',
        title: 'RA 9292 - Electrical Engineering Law',
        description: 'Section 27: PRC license required for electrical practitioners'
      }
    ]
  },
  {
    name: 'PRC License',
    question: 'Does the business have valid PRC License?',
    notes: 'Check for PRC license. Required for regulated professions.',
    violationName: 'Absence of PRC License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2022/04/13/republic-act-no-11598/',
        title: 'RA 11598 - PRC Modernization Act',
        description: 'Section 31: PRC license required for regulated professions'
      }
    ]
  },
  {
    name: 'PRC Plumbing License',
    question: 'Does the business have valid PRC Plumbing License?',
    notes: 'Check for PRC plumbing license. Required for plumbing practitioners.',
    violationName: 'Absence of PRC Plumbing License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1999/05/19/republic-act-no-8551/',
        title: 'RA 8551 - Plumbing Law',
        description: 'Section 26: PRC license required for plumbing practitioners'
      }
    ]
  },
  {
    name: 'PRC Broker License',
    question: 'Does the business have valid PRC Broker License?',
    notes: 'Check for PRC broker license. Required for real estate brokers.',
    violationName: 'Absence of PRC Broker License',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/',
        title: 'RA 9646 - Real Estate Service Act',
        description: 'Section 29: PRC broker license required'
      }
    ]
  },
  {
    name: 'Quarry Permit',
    question: 'Does the business have valid Quarry Permit?',
    notes: 'Check for quarry permit. Required for quarrying operations.',
    violationName: 'Absence of Quarry Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Quarry permit required for quarrying'
      }
    ]
  },
  {
    name: 'School Accreditation',
    question: 'Does the business have valid School Accreditation?',
    notes: 'Check for school accreditation. Required for educational institutions.',
    violationName: 'Absence of School Accreditation',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/',
        title: 'BP 232 - Education Act of 1982',
        description: 'Section 13: School accreditation required for educational institutions'
      }
    ]
  },
  {
    name: 'SEC Certificate of Authority for Lending',
    question: 'Does the business have valid SEC Certificate of Authority for Lending?',
    notes: 'Check for SEC CA. Required for lending companies.',
    violationName: 'Absence of SEC CA Lending',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1998/03/20/republic-act-no-8799/',
        title: 'RA 8799 - Lending Company Regulation Act',
        description: 'Section 6: SEC CA required for lending companies'
      }
    ]
  },
  {
    name: 'Signage Permit',
    question: 'Does the business have valid Signage Permit?',
    notes: 'Check for signage permit. Required for business signage.',
    violationName: 'Absence of Signage Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/08/18/presidential-decree-no-1096/',
        title: 'PD 1096 - National Building Code',
        description: 'Section 701: Signage permit required for business signage'
      }
    ]
  },
  {
    name: 'Subdivision Development Permit',
    question: 'Does the business have valid Subdivision Development Permit?',
    notes: 'Check for subdivision development permit. Required for housing projects.',
    violationName: 'Absence of Subdivision Development Permit',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/',
        title: 'RA 11201 - Real Estate Service Act',
        description: 'Section 28: Subdivision development permit required'
      }
    ]
  },
  {
    name: 'Condominium Project Approval',
    question: 'Does the business have valid Condominium Project Approval?',
    notes: 'Check for condominium project approval. Required for condominium developments.',
    violationName: 'Absence of Condominium Project Approval',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/',
        title: 'RA 11201 - Real Estate Service Act',
        description: 'Section 28: Condominium project approval required'
      }
    ]
  },
  {
    name: 'TESDA Registration',
    question: 'Does the business have valid TESDA Registration?',
    notes: 'Check for TESDA registration. Required for technical vocational institutions.',
    violationName: 'Absence of TESDA Registration',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2024/02/26/republic-act-no-11927/',
        title: 'RA 11927 - TESDA Act of 2024',
        description: 'Section 29: TESDA registration required for TVET institutions'
      }
    ]
  },
  {
    name: 'Weights and Measures Seal',
    question: 'Does the business have valid Weights and Measures Seal?',
    notes: 'Check for weights and measures seal. Required for weighing scales.',
    violationName: 'Absence of Weights and Measures Seal',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/06/01/presidential-decree-no-939/',
        title: 'PD 939 - Weights and Measures Law',
        description: 'Section 14: Weights and measures seal required for scales'
      }
    ]
  },
];

async function seedPostRequirementInspectionItems() {
  let didConnect = false;
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
    
    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      console.log(`Connecting to MongoDB: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      didConnect = true;
    }

    // Load all active violations and create a name-to-id map
    const Violation = require("../models/Violation");
    const violations = await Violation.find({ isActive: true });
    const violationMap = new Map();
    violations.forEach(v => violationMap.set(v.name, v._id));

    console.log("Clearing existing post requirement inspection items...");
    await InspectionItem.deleteMany({});

    console.log("Seeding post requirement inspection items...");
    const createdItems = [];
    const updatedItems = [];
    for (const inspectionItemData of POST_REQUIREMENT_INSPECTION_ITEMS) {
      // Find matching violation by name using the map
      const violationId = violationMap.get(inspectionItemData.violationName);

      if (!violationId) {
        console.log(`Warning: No active violation found with name: ${inspectionItemData.violationName}`);
        continue;
      }

      // Check if inspection item already exists
      const existing = await InspectionItem.findOne({ name: inspectionItemData.name });
      
      let inspectionItem;
      const { violationName, ...inspectionItemFields } = inspectionItemData;
      
      if (existing) {
        // Update existing inspection item
        inspectionItem = await InspectionItem.findOneAndUpdate(
          { name: inspectionItemData.name },
          {
            ...inspectionItemFields,
            violationId: violationId
          },
          { returnDocument: 'after' }
        );
        updatedItems.push(inspectionItem);
      } else {
        // Create new inspection item
        inspectionItem = await InspectionItem.create({
          ...inspectionItemFields,
          violationId: violationId
        });
        createdItems.push(inspectionItem);
      }
    }
    console.log(`Created ${createdItems.length} post requirement inspection items`);
    console.log(`Updated ${updatedItems.length} post requirement inspection items`);

    // Only disconnect if we connected
    if (didConnect) {
      await mongoose.disconnect();
    }
    return { createdCount: createdItems.length };
  } catch (err) {
    console.error("Error seeding post requirement inspection items:", err);
    if (didConnect) {
      await mongoose.disconnect();
    }
    throw err;
  }
}

module.exports = { seedPostRequirementInspectionItems, POST_REQUIREMENT_INSPECTION_ITEMS };

if (require.main === module) {
  seedPostRequirementInspectionItems()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
