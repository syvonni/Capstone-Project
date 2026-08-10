const mongoose = require("mongoose");
const Violation = require("../models/Violation");
const Fee = require("../models/Fee");

/**
 * Post Requirement Violations Seeder
 *
 * Seeds violations specific to post requirement non-compliance.
 * These violations are triggered when inspection items for post requirements fail.
 *
 * Structure:
 * - name: Display name of the violation
 * - description: Description of the violation
 * - notes: Inspector guidance on the violation
 * - penaltyAmount: Fine amount for the violation (in PHP)
 * - severity: Severity level (minor, major, critical)
 * - legalBasis: Array of legal references (url, title, description)
 * - correctiveAction: Required action to resolve the violation
 */

const POST_REQUIREMENT_VIOLATIONS = [
  // Batch 1: AMLC, Animal Welfare, ATH, BAI, BFAR, BIR ATP, BOI, BPI, BSP
  {
    name: "Absence of AMLC Registration",
    description:
      "Business is not registered with the Anti-Money Laundering Council",
    notes:
      "AMLC registration is required for covered persons under RA 9160. Check for registration certificate.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2001/09/29/republic-act-no-9160/",
        title: "RA 9160 - Anti-Money Laundering Act of 2001",
        description: "Section 9: Covered persons must register with AMLC",
      },
    ],
    correctiveAction: "Register with AMLC immediately",
  },
  {
    name: "Expired AMLC Registration",
    description: "AMLC registration has expired or is not current",
    notes:
      "AMLC registration must be maintained while operating as a covered person. Check renewal status.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2001/09/29/republic-act-no-9160/",
        title: "RA 9160 - Anti-Money Laundering Act of 2001",
        description:
          "Section 9: Registration must be maintained while operating as a covered person",
      },
    ],
    correctiveAction: "Renew AMLC registration",
  },
  {
    name: "Absence of Animal Welfare Seminar Certificate",
    description:
      "Business does not have valid Animal Welfare Seminar certificate",
    notes:
      "Certificate of attendance from BAI/DA-RFOs or BAI-recognized organization is required for animal handlers.",
    penaltyAmount: 5000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/",
        title: "RA 8485 - Animal Welfare Act of 1998",
        description:
          "Section 6: Animal handlers must complete animal welfare seminar",
      },
    ],
    correctiveAction: "Attend Animal Welfare Seminar and obtain certificate",
  },
  {
    name: "Absence of Authorization to Haul",
    description:
      "Business does not have valid Authorization to Haul from DENR/MGB",
    notes:
      "Authorization to Haul is required for transporting mineral products under RA 7942.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description:
          "Section 27: Authorization required for hauling and transporting mineral products",
      },
    ],
    correctiveAction: "Apply for Authorization to Haul from DENR/MGB",
  },
  {
    name: "Expired Authorization to Haul",
    description: "Authorization to Haul has expired or is not current",
    notes:
      "Authorization to Haul must be valid and current. Check validity period.",
    penaltyAmount: 10000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description: "Section 27: Authorization must be valid and current",
      },
    ],
    correctiveAction: "Renew Authorization to Haul",
  },
  {
    name: "Absence of BAI Registration",
    description:
      "Business is not registered with the Bureau of Animal Industry",
    notes:
      "BAI registration is required for veterinary clinics, hospitals, and animal facilities.",
    penaltyAmount: 10000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8485/",
        title: "RA 8485 - Animal Welfare Act of 1998",
        description:
          "Section 7: Veterinary clinics and animal facilities must register with BAI",
      },
    ],
    correctiveAction: "Register with BAI",
  },
  {
    name: "Absence of BFAR Registration",
    description:
      "Business is not registered with the Bureau of Fisheries and Aquatic Resources",
    notes: "BFAR registration is required for fisheries-related businesses.",
    penaltyAmount: 10000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1998/02/25/republic-act-no-8550/",
        title: "RA 8550 - Philippine Fisheries Code of 1998",
        description:
          "Section 29: Fisheries-related businesses must register with BFAR",
      },
    ],
    correctiveAction: "Register with BFAR",
  },
  {
    name: "Absence of BIR Authority to Print",
    description: "Business does not have valid Authority to Print from BIR",
    notes:
      "ATP is required for commercial printing of official receipts, sales invoices, and other accountable forms.",
    penaltyAmount: 10000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1997/12/11/republic-act-no-8424/",
        title: "RA 8424 - National Internal Revenue Code of 1997",
        description:
          "Section 238: Authority to Print required for commercial printing of accountable forms",
      },
    ],
    correctiveAction: "Apply for BIR Authority to Print",
  },
  {
    name: "Expired BIR Authority to Print",
    description: "BIR Authority to Print has expired or is not current",
    notes: "ATP must be valid and current. Must be renewed every 3 years.",
    penaltyAmount: 5000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1997/12/11/republic-act-no-8424/",
        title: "RA 8424 - National Internal Revenue Code of 1997",
        description: "Section 238: ATP must be valid and current",
      },
    ],
    correctiveAction: "Renew BIR Authority to Print",
  },
  {
    name: "Absence of BOI Registration",
    description: "Business is not registered with the Board of Investments",
    notes:
      "BOI registration is required for export-oriented or priority projects for tax incentives.",
    penaltyAmount: 15000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1987/07/16/executive-order-no-226-s-1987/",
        title: "EO 226 - Omnibus Investments Code of 1987",
        description:
          "Article 20: Registration with BOI required for tax incentives",
      },
    ],
    correctiveAction: "Register with BOI",
  },
  {
    name: "Absence of BPI Accreditation",
    description: "Business is not accredited by the Bureau of Plant Industry",
    notes: "BPI accreditation is required for plant nursery operators.",
    penaltyAmount: 5000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/",
        title: "RA 7308 - Seed Industry Development Act of 1992",
        description:
          "Section 12: Plant nursery operators must be accredited by BPI",
      },
    ],
    correctiveAction: "Apply for BPI accreditation",
  },
  {
    name: "Absence of BPI License",
    description: "Business does not have valid BPI license",
    notes: "BPI license is required for certain plant-related operations.",
    penaltyAmount: 5000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1992/03/27/republic-act-no-7308/",
        title: "RA 7308 - Seed Industry Development Act of 1992",
        description:
          "Section 12: BPI license required for plant-related operations",
      },
    ],
    correctiveAction: "Apply for BPI license",
  },
  {
    name: "Absence of BSP Pawnshop Authority",
    description:
      "Business does not have valid authority from BSP for pawnshop operations",
    notes: "BSP authority is required for pawnshop operations.",
    penaltyAmount: 20000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.bsp.gov.ph/Regulations/Issuances/Pawnshops",
        title: "BSP Circular No. 224 - Pawnshop Regulations",
        description:
          "Section 3: Authority from BSP required for pawnshop operations",
      },
    ],
    correctiveAction: "Apply for BSP pawnshop authority",
  },
  {
    name: "Absence of BSP Certificate Authority",
    description:
      "Business does not have valid Certificate of Authority from BSP",
    notes:
      "BSP Certificate of Authority is required for certain financial operations.",
    penaltyAmount: 20000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.bsp.gov.ph/Regulations/Issuances/Financial",
        title: "BSP Regulations on Financial Institutions",
        description:
          "Certificate of Authority required for financial operations",
      },
    ],
    correctiveAction: "Apply for BSP Certificate of Authority",
  },
  // Batch 2: CAAP, CNC, CHED, Congressional Franchise, Demolition Permit, DENR permits, DepEd permits, DHSUD permits, DICT, DMW, DOE, DOH permits, DOLE, DOT, DSWD, DTI permits, E-pharmacy
  {
    name: "Absence of CAAP Height Clearance",
    description: "Business does not have valid CAAP Height Clearance",
    notes: "Height clearance required for structures near airports or airways.",
    penaltyAmount: 50000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/12/republic-act-no-9497/",
        title: "RA 9497 - Civil Aviation Authority Act of 2008",
        description:
          "Section 30: Height clearance required for structures near airports",
      },
    ],
    correctiveAction: "Apply for CAAP Height Clearance",
  },
  {
    name: "Absence of CAAP RPAS Operator Certificate",
    description: "Business does not have valid CAAP RPAS Operator Certificate",
    notes: "RPAS operator certificate required for drone operations.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.caap.gov.ph/",
        title: "CAAP Memorandum Circular No. 12-2018",
        description:
          "RPAS operator certificate required for commercial drone operations",
      },
    ],
    correctiveAction: "Apply for CAAP RPAS Operator Certificate",
  },
  {
    name: "Absence of CNC",
    description: "Business does not have valid Certificate of Non-Coverage",
    notes: "CNC required for projects not requiring ECC under PD 1586.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1586/",
        title: "PD 1586 - Philippine Environmental Impact Statement System",
        description: "Section 4: CNC required for projects not requiring ECC",
      },
    ],
    correctiveAction: "Apply for CNC from DENR-EMB",
  },
  {
    name: "Absence of CHED Recognition Permit",
    description: "Business does not have valid CHED Recognition Permit",
    notes: "CHED recognition required for higher education institutions.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.ched.gov.ph/",
        title: "RA 7722 - Higher Education Act of 1994",
        description:
          "Section 8: CHED recognition required for higher education institutions",
      },
    ],
    correctiveAction: "Apply for CHED Recognition Permit",
  },
  {
    name: "Absence of Congressional Franchise",
    description: "Business does not have valid Congressional Franchise",
    notes:
      "Congressional franchise required for public utilities and certain businesses.",
    penaltyAmount: 100000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1987/02/11/1987-constitution/",
        title: "1987 Constitution Article XII",
        description:
          "Section 11: Congressional franchise required for public utilities",
      },
    ],
    correctiveAction: "Apply for Congressional Franchise",
  },
  {
    name: "Absence of Demolition Permit",
    description: "Business does not have valid Demolition Permit",
    notes: "Demolition permit required before any demolition work.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/08/18/presidential-decree-no-1096/",
        title: "PD 1096 - National Building Code",
        description:
          "Section 301: Demolition permit required before demolition work",
      },
    ],
    correctiveAction: "Apply for Demolition Permit",
  },
  {
    name: "Absence of DENR CNC",
    description:
      "Business does not have valid DENR Certificate of Non-Coverage",
    notes: "DENR CNC required for projects not requiring ECC.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1586/",
        title: "PD 1586 - Philippine Environmental Impact Statement System",
        description: "Section 4: CNC required for projects not requiring ECC",
      },
    ],
    correctiveAction: "Apply for DENR CNC",
  },
  {
    name: "Absence of DENR PTO-AIR",
    description:
      "Business does not have valid DENR Permit to Operate Air Installation",
    notes: "PTO-AIR required for air pollution sources.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1978/06/06/presidential-decree-no-1181/",
        title: "PD 1181 - Pollution Control Law",
        description: "Section 6: PTO-AIR required for air pollution sources",
      },
    ],
    correctiveAction: "Apply for DENR PTO-AIR",
  },
  {
    name: "Absence of DENR PMPIN",
    description:
      "Business does not have valid DENR Pollution Management Program Implementation Notice",
    notes: "PMPIN required for pollution control.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2004/06/25/republic-act-no-9275/",
        title: "RA 9275 - Philippine Clean Air Act",
        description: "Section 14: PMPIN required for pollution control",
      },
    ],
    correctiveAction: "Apply for DENR PMPIN",
  },
  {
    name: "Absence of DENR Wastewater Discharge Permit",
    description:
      "Business does not have valid DENR Wastewater Discharge Permit",
    notes:
      "Wastewater discharge permit required for facilities discharging wastewater.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2004/06/25/republic-act-no-9275/",
        title: "RA 9275 - Philippine Clean Water Act",
        description: "Section 8: Wastewater discharge permit required",
      },
    ],
    correctiveAction: "Apply for DENR Wastewater Discharge Permit",
  },
  {
    name: "Absence of DENR Wood Processing Permit",
    description: "Business does not have valid DENR Wood Processing Permit",
    notes: "Wood processing permit required for wood-based industries.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/05/20/presidential-decree-no-705/",
        title: "PD 705 - Forestry Reform Code",
        description: "Section 77: Wood processing permit required",
      },
    ],
    correctiveAction: "Apply for DENR Wood Processing Permit",
  },
  {
    name: "Absence of DepEd Permit",
    description: "Business does not have valid DepEd Permit",
    notes: "DepEd permit required for educational institutions.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/",
        title: "BP 232 - Education Act of 1982",
        description:
          "Section 13: DepEd permit required for educational institutions",
      },
    ],
    correctiveAction: "Apply for DepEd Permit",
  },
  {
    name: "Absence of DepEd Recognition",
    description: "Business does not have valid DepEd Recognition",
    notes: "DepEd recognition required for schools.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/",
        title: "BP 232 - Education Act of 1982",
        description: "Section 13: DepEd recognition required for schools",
      },
    ],
    correctiveAction: "Apply for DepEd Recognition",
  },
  {
    name: "Absence of DepEd-CHED Permit",
    description: "Business does not have valid DepEd-CHED Joint Permit",
    notes: "Joint permit required for certain educational programs.",
    penaltyAmount: 40000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/",
        title: "BP 232 - Education Act of 1982",
        description: "Section 13: Joint permit required for certain programs",
      },
    ],
    correctiveAction: "Apply for DepEd-CHED Joint Permit",
  },
  {
    name: "Absence of DHSUD Broker Registration",
    description: "Business does not have valid DHSUD Broker Registration",
    notes: "Broker registration required for real estate brokers.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/",
        title: "RA 9646 - Real Estate Service Act",
        description: "Section 29: DHSUD broker registration required",
      },
    ],
    correctiveAction: "Register with DHSUD",
  },
  {
    name: "Absence of DHSUD License to Sell",
    description: "Business does not have valid DHSUD License to Sell",
    notes: "License to Sell required for real estate projects.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/",
        title: "RA 9646 - Real Estate Service Act",
        description: "Section 28: License to Sell required for projects",
      },
    ],
    correctiveAction: "Apply for DHSUD License to Sell",
  },
  {
    name: "Absence of DHSUD Project Registration",
    description: "Business does not have valid DHSUD Project Registration",
    notes: "Project registration required for housing projects.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/",
        title: "RA 9646 - Real Estate Service Act",
        description: "Section 28: Project registration required",
      },
    ],
    correctiveAction: "Register project with DHSUD",
  },
  {
    name: "Absence of DICT PEMEDES Authority",
    description: "Business does not have valid DICT PEMEDES Authority",
    notes: "PEMEDES authority required for medical device establishments.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/",
        title: "RA 11223 - Universal Health Care Act",
        description: "Section 37: DICT PEMEDES authority required",
      },
    ],
    correctiveAction: "Apply for DICT PEMEDES Authority",
  },
  {
    name: "Absence of DMW License",
    description: "Business does not have valid DMW License",
    notes: "DMW license required for recruitment agencies.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/02/13/republic-act-no-8042/",
        title: "RA 8042 - Migrant Workers and Overseas Filipinos Act",
        description: "Section 23: DMW license required for recruitment",
      },
    ],
    correctiveAction: "Apply for DMW License",
  },
  {
    name: "Absence of DOE Certificate of Compliance",
    description: "Business does not have valid DOE Certificate of Compliance",
    notes: "COC required for energy-related facilities.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/",
        title: "RA 9136 - Electric Power Industry Reform Act",
        description: "Section 42: DOE COC required for energy facilities",
      },
    ],
    correctiveAction: "Apply for DOE Certificate of Compliance",
  },
  {
    name: "Absence of DOH LTO",
    description: "Business does not have valid DOH License to Operate",
    notes: "DOH LTO required for health facilities.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/",
        title: "RA 11223 - Universal Health Care Act",
        description: "Section 25: DOH LTO required for health facilities",
      },
    ],
    correctiveAction: "Apply for DOH LTO",
  },
  {
    name: "Absence of DOH Operating Permit",
    description: "Business does not have valid DOH Operating Permit",
    notes: "Operating permit required for health establishments.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/",
        title: "RA 11223 - Universal Health Care Act",
        description: "Section 25: Operating permit required",
      },
    ],
    correctiveAction: "Apply for DOH Operating Permit",
  },
  {
    name: "Absence of DOH Permit",
    description: "Business does not have valid DOH Permit",
    notes: "DOH permit required for health-related businesses.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/",
        title: "RA 11223 - Universal Health Care Act",
        description: "Section 25: DOH permit required",
      },
    ],
    correctiveAction: "Apply for DOH Permit",
  },
  {
    name: "Absence of DOH Permit to Construct",
    description: "Business does not have valid DOH Permit to Construct",
    notes: "Permit to construct required for health facility construction.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/",
        title: "RA 11223 - Universal Health Care Act",
        description: "Section 25: Permit to construct required",
      },
    ],
    correctiveAction: "Apply for DOH Permit to Construct",
  },
  {
    name: "Absence of DOLE Registration DO174",
    description: "Business does not have valid DOLE Registration under DO174",
    notes: "DOLE registration required for establishments.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.dole.gov.ph/",
        title: "DOLE Department Order No. 174",
        description: "Establishment registration required under DO174",
      },
    ],
    correctiveAction: "Register with DOLE",
  },
  {
    name: "Absence of DOT Accreditation",
    description: "Business does not have valid DOT Accreditation",
    notes: "DOT accreditation required for tourism establishments.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/",
        title: "RA 9593 - Tourism Act of 2009",
        description:
          "Section 38: DOT accreditation required for tourism establishments",
      },
    ],
    correctiveAction: "Apply for DOT Accreditation",
  },
  {
    name: "Absence of DSWD Permit",
    description: "Business does not have valid DSWD Permit",
    notes: "DSWD permit required for social welfare agencies.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1997/02/10/republic-act-no-8432/",
        title: "RA 8432 - Magna Carta for Disabled Persons",
        description:
          "Section 5: DSWD permit required for social welfare agencies",
      },
    ],
    correctiveAction: "Apply for DSWD Permit",
  },
  {
    name: "Absence of DTI Accreditation",
    description: "Business does not have valid DTI Accreditation",
    notes: "DTI accreditation required for certain businesses.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.dti.gov.ph/",
        title: "DTI Accreditation Guidelines",
        description: "DTI accreditation required for specific business types",
      },
    ],
    correctiveAction: "Apply for DTI Accreditation",
  },
  {
    name: "Absence of DTI Freight Forwarding Accreditation",
    description:
      "Business does not have valid DTI Freight Forwarding Accreditation",
    notes: "Freight forwarding accreditation required for logistics companies.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.dti.gov.ph/",
        title: "DTI Freight Forwarding Accreditation Rules",
        description: "Accreditation required for freight forwarding",
      },
    ],
    correctiveAction: "Apply for DTI Freight Forwarding Accreditation",
  },
  {
    name: "Absence of DTI GTIDO Registration",
    description: "Business does not have valid DTI GTIDO Registration",
    notes: "GTIDO registration required for trading companies.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.dti.gov.ph/",
        title: "DTI GTIDO Registration Guidelines",
        description: "GTIDO registration required for trading",
      },
    ],
    correctiveAction: "Register with DTI GTIDO",
  },
  {
    name: "Absence of E-Pharmacy LTO",
    description: "Business does not have valid E-Pharmacy License to Operate",
    notes: "E-pharmacy LTO required for online pharmacies.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/",
        title: "RA 9711 - FDA Act of 2008",
        description:
          "Section 21: E-pharmacy LTO required for online pharmacies",
      },
    ],
    correctiveAction: "Apply for E-Pharmacy LTO",
  },
  // Batch 3: ERC, FPA, HLURB, Liquor License, LLDA, LTFRB, LTO, Medical Device Retailer, MGB permits, NBDB, NFA, NMIS, NPC, NTC, NWRB
  {
    name: "Absence of ERC Certificate",
    description: "Business does not have valid ERC Certificate",
    notes: "ERC certificate required for energy-related operations.",
    penaltyAmount: 50000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/",
        title: "RA 9136 - Electric Power Industry Reform Act",
        description:
          "Section 37: ERC certificate required for energy operations",
      },
    ],
    correctiveAction: "Apply for ERC Certificate",
  },
  {
    name: "Absence of ERC CPCN",
    description:
      "Business does not have valid ERC Certificate of Public Convenience and Necessity",
    notes: "CPCN required for public utility operations.",
    penaltyAmount: 75000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2001/06/08/republic-act-no-9136/",
        title: "RA 9136 - Electric Power Industry Reform Act",
        description: "Section 37: CPCN required for public utility operations",
      },
    ],
    correctiveAction: "Apply for ERC CPCN",
  },
  {
    name: "Absence of FPA Commercial Applicator License",
    description:
      "Business does not have valid FPA Commercial Applicator License",
    notes: "FPA license required for commercial pesticide applicators.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.fpa.gov.ph/",
        title: "FPA Act of 1977",
        description:
          "FPA license required for commercial pesticide application",
      },
    ],
    correctiveAction: "Apply for FPA Commercial Applicator License",
  },
  {
    name: "Absence of FPA LTO",
    description: "Business does not have valid FPA License to Operate",
    notes: "FPA LTO required for fertilizer and pesticide businesses.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.fpa.gov.ph/",
        title: "FPA Act of 1977",
        description: "FPA LTO required for fertilizer and pesticide businesses",
      },
    ],
    correctiveAction: "Apply for FPA LTO",
  },
  {
    name: "Absence of HLURB Registration",
    description: "Business does not have valid HLURB Registration",
    notes: "HLURB registration required for housing projects.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/",
        title: "RA 11201 - Real Estate Service Act",
        description:
          "Section 28: HLURB registration required for housing projects",
      },
    ],
    correctiveAction: "Register with HLURB",
  },
  {
    name: "Absence of Liquor License",
    description: "Business does not have valid Liquor License",
    notes:
      "Liquor license required for establishments serving alcoholic beverages.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/03/21/republic-act-no-6969/",
        title: "RA 6969 - Toxic Substances and Hazardous Wastes",
        description:
          "Liquor license required for establishments serving alcohol",
      },
    ],
    correctiveAction: "Apply for Liquor License",
  },
  {
    name: "Absence of LLDA Discharge Permit",
    description: "Business does not have valid LLDA Discharge Permit",
    notes:
      "LLDA discharge permit required for facilities discharging into Laguna Lake.",
    penaltyAmount: 40000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.llda.gov.ph/",
        title: "LLDA Act of 1966",
        description: "Discharge permit required for Laguna Lake discharges",
      },
    ],
    correctiveAction: "Apply for LLDA Discharge Permit",
  },
  {
    name: "Absence of LTFRB CPC",
    description:
      "Business does not have valid LTFRB Certificate of Public Convenience",
    notes: "CPC required for public transportation operations.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/",
        title: "RA 10149 - Public Service Act",
        description: "CPC required for public transportation",
      },
    ],
    correctiveAction: "Apply for LTFRB CPC",
  },
  {
    name: "Absence of LTFRB Franchise",
    description: "Business does not have valid LTFRB Franchise",
    notes: "Franchise required for public utility vehicle operations.",
    penaltyAmount: 75000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/",
        title: "RA 10149 - Public Service Act",
        description: "Franchise required for PUV operations",
      },
    ],
    correctiveAction: "Apply for LTFRB Franchise",
  },
  {
    name: "Absence of LTO Accreditation",
    description: "Business does not have valid LTO Accreditation",
    notes:
      "LTO accreditation required for driving schools and related businesses.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.lto.gov.ph/",
        title: "LTO Accreditation Guidelines",
        description: "LTO accreditation required for driving schools",
      },
    ],
    correctiveAction: "Apply for LTO Accreditation",
  },
  {
    name: "Absence of LTO Vehicle Registration",
    description: "Business does not have valid LTO Vehicle Registration",
    notes: "Vehicle registration required for business vehicles.",
    penaltyAmount: 10000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.lto.gov.ph/",
        title: "LTO Vehicle Registration Requirements",
        description: "Vehicle registration required for all vehicles",
      },
    ],
    correctiveAction: "Register vehicles with LTO",
  },
  {
    name: "Absence of Medical Device Retailer LTO",
    description:
      "Business does not have valid Medical Device Retailer License to Operate",
    notes: "Medical device retailer LTO required for selling medical devices.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/",
        title: "RA 9711 - FDA Act of 2008",
        description: "Section 21: Medical device retailer LTO required",
      },
    ],
    correctiveAction: "Apply for Medical Device Retailer LTO",
  },
  {
    name: "Absence of MGB Exploration Permit",
    description: "Business does not have valid MGB Exploration Permit",
    notes: "Exploration permit required for mineral exploration activities.",
    penaltyAmount: 50000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description:
          "Section 26: Exploration permit required for mineral activities",
      },
    ],
    correctiveAction: "Apply for MGB Exploration Permit",
  },
  {
    name: "Absence of MGB Mineral Agreement",
    description: "Business does not have valid MGB Mineral Agreement",
    notes: "Mineral agreement required for mining operations.",
    penaltyAmount: 100000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description:
          "Section 26: Mineral agreement required for mining operations",
      },
    ],
    correctiveAction: "Apply for MGB Mineral Agreement",
  },
  {
    name: "Absence of MGB Permit",
    description: "Business does not have valid MGB Permit",
    notes: "MGB permit required for mining-related activities.",
    penaltyAmount: 50000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description: "Section 26: MGB permit required for mining activities",
      },
    ],
    correctiveAction: "Apply for MGB Permit",
  },
  {
    name: "Absence of NBDB Publisher Registration",
    description: "Business does not have valid NBDB Publisher Registration",
    notes: "NBDB registration required for book publishers.",
    penaltyAmount: 15000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2013/06/21/republic-act-no-10372/",
        title: "RA 10372 - Book Publishing Industry Development Act",
        description: "Section 12: NBDB registration required for publishers",
      },
    ],
    correctiveAction: "Register with NBDB",
  },
  {
    name: "Absence of NFA Accreditation",
    description: "Business does not have valid NFA Accreditation",
    notes: "NFA accreditation required for rice and grain businesses.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfa.gov.ph/",
        title: "NFA Accreditation Guidelines",
        description: "NFA accreditation required for grain businesses",
      },
    ],
    correctiveAction: "Apply for NFA Accreditation",
  },
  {
    name: "Absence of NFA License",
    description: "Business does not have valid NFA License",
    notes: "NFA license required for rice and grain trading.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfa.gov.ph/",
        title: "NFA License Requirements",
        description: "NFA license required for grain trading",
      },
    ],
    correctiveAction: "Apply for NFA License",
  },
  {
    name: "Absence of NFA Registration",
    description: "Business does not have valid NFA Registration",
    notes: "NFA registration required for rice and grain businesses.",
    penaltyAmount: 20000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfa.gov.ph/",
        title: "NFA Registration Guidelines",
        description: "NFA registration required for grain businesses",
      },
    ],
    correctiveAction: "Register with NFA",
  },
  {
    name: "Absence of NMIS Accreditation",
    description: "Business does not have valid NMIS Accreditation",
    notes: "NMIS accreditation required for meat establishments.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nmis.gov.ph/",
        title: "NMIS Accreditation Guidelines",
        description: "NMIS accreditation required for meat establishments",
      },
    ],
    correctiveAction: "Apply for NMIS Accreditation",
  },
  {
    name: "Absence of NPC Registration",
    description: "Business does not have valid NPC Registration",
    notes: "NPC registration required for nuclear-related activities.",
    penaltyAmount: 100000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2001/04/13/republic-act-no-5207/",
        title: "RA 5207 - Atomic Energy Regulatory Act",
        description: "NPC registration required for nuclear activities",
      },
    ],
    correctiveAction: "Register with NPC",
  },
  {
    name: "Absence of NTC CPCN",
    description:
      "Business does not have valid NTC Certificate of Public Convenience and Necessity",
    notes: "CPCN required for telecommunications operations.",
    penaltyAmount: 100000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/",
        title: "RA 10149 - Public Service Act",
        description: "CPCN required for telecommunications",
      },
    ],
    correctiveAction: "Apply for NTC CPCN",
  },
  {
    name: "Absence of NTC Certificate",
    description: "Business does not have valid NTC Certificate",
    notes: "NTC certificate required for telecommunications equipment.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.ntc.gov.ph/",
        title: "NTC Certificate Requirements",
        description: "NTC certificate required for telecom equipment",
      },
    ],
    correctiveAction: "Apply for NTC Certificate",
  },
  {
    name: "Absence of NTC PA-CPCN",
    description: "Business does not have valid NTC Provisional Authority CPCN",
    notes: "PA-CPCN required for provisional telecommunications operations.",
    penaltyAmount: 75000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/",
        title: "RA 10149 - Public Service Act",
        description: "PA-CPCN required for provisional telecom operations",
      },
    ],
    correctiveAction: "Apply for NTC PA-CPCN",
  },
  {
    name: "Absence of NWRB CPC",
    description:
      "Business does not have valid NWRB Certificate of Public Convenience",
    notes: "CPC required for water utility operations.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2004/06/23/republic-act-no-9275/",
        title: "RA 9275 - Water Code of the Philippines",
        description: "CPC required for water utility operations",
      },
    ],
    correctiveAction: "Apply for NWRB CPC",
  },
  {
    name: "Absence of NWRB Water Permit",
    description: "Business does not have valid NWRB Water Permit",
    notes: "Water permit required for water extraction and use.",
    penaltyAmount: 40000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2004/06/23/republic-act-no-9275/",
        title: "RA 9275 - Water Code of the Philippines",
        description: "Water permit required for water extraction",
      },
    ],
    correctiveAction: "Apply for NWRB Water Permit",
  },
  // Batch 4: PCAB, PDEA, PEZA, Pharmacist, PhilHealth, PNP, PRC licenses, Quarry permits, School accreditation, SEC, Signage permits, Subdivision permits, TESDA, Weights & Measures
  {
    name: "Absence of PCAB License",
    description: "Business does not have valid PCAB License",
    notes: "PCAB license required for construction contractors.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2010/02/10/republic-act-no-10066/",
        title: "RA 10066 - Safety Law of the Philippines",
        description: "Section 32: PCAB license required for contractors",
      },
    ],
    correctiveAction: "Apply for PCAB License",
  },
  {
    name: "Absence of PDEA S2 License",
    description: "Business does not have valid PDEA S2 License",
    notes: "PDEA S2 license required for handling controlled substances.",
    penaltyAmount: 100000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2002/06/07/republic-act-no-9165/",
        title: "RA 9165 - Comprehensive Dangerous Drugs Act",
        description:
          "Section 22: PDEA S2 license required for controlled substances",
      },
    ],
    correctiveAction: "Apply for PDEA S2 License",
  },
  {
    name: "Absence of PEZA Registration",
    description: "Business does not have valid PEZA Registration",
    notes: "PEZA registration required for export-oriented businesses.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/02/20/republic-act-no-7916/",
        title: "RA 7916 - Special Economic Zone Act",
        description:
          "Section 13: PEZA registration required for ecozone businesses",
      },
    ],
    correctiveAction: "Register with PEZA",
  },
  {
    name: "Absence of Pharmacist in Charge Credential",
    description: "Business does not have valid Pharmacist in Charge Credential",
    notes: "Pharmacist credential required for pharmacies.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/06/18/republic-act-no-9711/",
        title: "RA 9711 - FDA Act of 2008",
        description:
          "Section 21: Pharmacist credential required for pharmacies",
      },
    ],
    correctiveAction: "Obtain Pharmacist in Charge Credential",
  },
  {
    name: "Absence of PhilHealth Accreditation",
    description: "Business does not have valid PhilHealth Accreditation",
    notes: "PhilHealth accreditation required for health facilities.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2018/12/20/republic-act-no-11223/",
        title: "RA 11223 - Universal Health Care Act",
        description:
          "Section 27: PhilHealth accreditation required for health facilities",
      },
    ],
    correctiveAction: "Apply for PhilHealth Accreditation",
  },
  {
    name: "Absence of PNP FEO License",
    description: "Business does not have valid PNP FEO License",
    notes: "PNP FEO license required for firearms and explosives businesses.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2013/12/11/republic-act-no-10591/",
        title:
          "RA 10591 - Comprehensive Firearms and Ammunition Regulation Act",
        description:
          "Section 29: PNP FEO license required for firearms businesses",
      },
    ],
    correctiveAction: "Apply for PNP FEO License",
  },
  {
    name: "Absence of PNP SOSIA License",
    description: "Business does not have valid PNP SOSIA License",
    notes: "PNP SOSIA license required for security agencies.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1992/03/20/republic-act-no-7483/",
        title: "RA 7483 - Private Security Agency Law",
        description:
          "Section 27: PNP SOSIA license required for security agencies",
      },
    ],
    correctiveAction: "Apply for PNP SOSIA License",
  },
  {
    name: "Absence of PRC Electrical License",
    description: "Business does not have valid PRC Electrical License",
    notes: "PRC electrical license required for electrical practitioners.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2004/08/26/republic-act-no-9292/",
        title: "RA 9292 - Electrical Engineering Law",
        description:
          "Section 27: PRC license required for electrical practitioners",
      },
    ],
    correctiveAction: "Obtain PRC Electrical License",
  },
  {
    name: "Absence of PRC License",
    description: "Business does not have valid PRC License",
    notes: "PRC license required for regulated professions.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2022/04/13/republic-act-no-11598/",
        title: "RA 11598 - PRC Modernization Act",
        description:
          "Section 31: PRC license required for regulated professions",
      },
    ],
    correctiveAction: "Obtain PRC License",
  },
  {
    name: "Absence of PRC Plumbing License",
    description: "Business does not have valid PRC Plumbing License",
    notes: "PRC plumbing license required for plumbing practitioners.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1999/05/19/republic-act-no-8551/",
        title: "RA 8551 - Plumbing Law",
        description:
          "Section 26: PRC license required for plumbing practitioners",
      },
    ],
    correctiveAction: "Obtain PRC Plumbing License",
  },
  {
    name: "Absence of PRC Broker License",
    description: "Business does not have valid PRC Broker License",
    notes: "PRC broker license required for real estate brokers.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2019/02/14/republic-act-no-9646/",
        title: "RA 9646 - Real Estate Service Act",
        description: "Section 29: PRC broker license required",
      },
    ],
    correctiveAction: "Obtain PRC Broker License",
  },
  {
    name: "Absence of Quarry Permit",
    description: "Business does not have valid Quarry Permit",
    notes: "Quarry permit required for quarrying operations.",
    penaltyAmount: 50000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description: "Section 26: Quarry permit required for quarrying",
      },
    ],
    correctiveAction: "Apply for Quarry Permit",
  },
  {
    name: "Absence of School Accreditation",
    description: "Business does not have valid School Accreditation",
    notes: "School accreditation required for educational institutions.",
    penaltyAmount: 30000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1982/01/17/batas-pambansa-blng-232/",
        title: "BP 232 - Education Act of 1982",
        description:
          "Section 13: School accreditation required for educational institutions",
      },
    ],
    correctiveAction: "Apply for School Accreditation",
  },
  {
    name: "Absence of SEC CA Lending",
    description:
      "Business does not have valid SEC Certificate of Authority for Lending",
    notes: "SEC CA required for lending companies.",
    penaltyAmount: 50000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1998/03/20/republic-act-no-8799/",
        title: "RA 8799 - Lending Company Regulation Act",
        description: "Section 6: SEC CA required for lending companies",
      },
    ],
    correctiveAction: "Apply for SEC CA Lending",
  },
  {
    name: "Absence of Signage Permit",
    description: "Business does not have valid Signage Permit",
    notes: "Signage permit required for business signage.",
    penaltyAmount: 10000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/08/18/presidential-decree-no-1096/",
        title: "PD 1096 - National Building Code",
        description:
          "Section 701: Signage permit required for business signage",
      },
    ],
    correctiveAction: "Apply for Signage Permit",
  },
  {
    name: "Absence of Subdivision Development Permit",
    description: "Business does not have valid Subdivision Development Permit",
    notes: "Subdivision development permit required for housing projects.",
    penaltyAmount: 75000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/",
        title: "RA 11201 - Real Estate Service Act",
        description: "Section 28: Subdivision development permit required",
      },
    ],
    correctiveAction: "Apply for Subdivision Development Permit",
  },
  {
    name: "Absence of Condominium Project Approval",
    description: "Business does not have valid Condominium Project Approval",
    notes:
      "Condominium project approval required for condominium developments.",
    penaltyAmount: 75000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2020/08/28/republic-act-no-11201/",
        title: "RA 11201 - Real Estate Service Act",
        description: "Section 28: Condominium project approval required",
      },
    ],
    correctiveAction: "Apply for Condominium Project Approval",
  },
  {
    name: "Absence of TESDA Registration",
    description: "Business does not have valid TESDA Registration",
    notes: "TESDA registration required for technical vocational institutions.",
    penaltyAmount: 25000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2024/02/26/republic-act-no-11927/",
        title: "RA 11927 - TESDA Act of 2024",
        description:
          "Section 29: TESDA registration required for TVET institutions",
      },
    ],
    correctiveAction: "Register with TESDA",
  },
  {
    name: "Absence of Weights and Measures Seal",
    description: "Business does not have valid Weights and Measures Seal",
    notes: "Weights and measures seal required for weighing scales.",
    penaltyAmount: 10000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1976/06/01/presidential-decree-no-939/",
        title: "PD 939 - Weights and Measures Law",
        description:
          "Section 14: Weights and measures seal required for scales",
      },
    ],
    correctiveAction: "Obtain Weights and Measures Seal",
  },
];

async function seedPostRequirementViolations() {
  let didConnect = false;
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";

    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      console.log(`Connecting to MongoDB: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      didConnect = true;
    }

    console.log("Clearing existing post requirement violations...");
    await Violation.deleteMany({});

    console.log("Seeding post requirement violations...");
    const createdViolations = [];
    const createdFees = [];

    for (const violationData of POST_REQUIREMENT_VIOLATIONS) {
      // Create or find penalty fee for this violation
      const penaltyFeeName = `${violationData.name} Penalty`;
      let penaltyFee = await Fee.findOne({
        name: penaltyFeeName,
        category: "penalty",
      });

      if (!penaltyFee && violationData.penaltyAmount) {
        // Create new penalty fee if it doesn't exist
        penaltyFee = await Fee.create({
          name: penaltyFeeName,
          amount: violationData.penaltyAmount,
          category: "penalty",
          isActive: true,
          version: 1,
        });
        createdFees.push(penaltyFee);
        console.log(
          `  + Created penalty fee: ${penaltyFeeName} (₱${violationData.penaltyAmount})`,
        );
      }

      // Create violation (remove penaltyAmount from data before creating)
      const { penaltyAmount, ...violationFields } = violationData;
      const violation = await Violation.create({
        ...violationFields,
        feeId: penaltyFee?._id || null,
      });
      createdViolations.push(violation);
    }

    console.log(
      `Created ${createdViolations.length} post requirement violations and ${createdFees.length} penalty fees`,
    );

    // Only disconnect if we connected
    if (didConnect) {
      await mongoose.disconnect();
    }
    return {
      createdCount: createdViolations.length,
      feesCreated: createdFees.length,
    };
  } catch (err) {
    console.error("Error seeding post requirement violations:", err);
    if (didConnect) {
      await mongoose.disconnect();
    }
    throw err;
  }
}

module.exports = { seedPostRequirementViolations, POST_REQUIREMENT_VIOLATIONS };

if (require.main === module) {
  seedPostRequirementViolations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
