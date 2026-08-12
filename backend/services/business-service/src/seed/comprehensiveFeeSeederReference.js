/**
 * COMPREHENSIVE FEE SEEDER REFERENCE
 *
 * This file consolidates all researched LGU fees for future seeder implementation.
 * Based on Philippine LGU fee schedules and Local Government Code provisions.
 *
 * Categories:
 * 1. Global Application Fees - Base processing fees everyone pays (formerly Administrative Fixed Fees)
 * 2. Conditional Fees - Equipment/facility-specific fees based on business type
 * 3. Variable Fee Rules - Calculated based on business metrics
 * 4. Classification Fees - Industry-specific base fees
 * 5. Tax Brackets - Progressive tax brackets based on business size (per category)
 * 6. Requirement Fees - Fees auto-created with specific requirements
 * 7. Appeal Fees - Fees for filing appeals
 *
 * NOTE: Penalty Rules have been skipped for now and will be implemented in a future phase.
 */

module.exports = {
  // ============================================
  // 1. GLOBAL APPLICATION FEES
  // Base processing fees that apply to all businesses
  //
  // IMPORTANT DECISIONS:
  // 1. Category field has been intentionally removed from global application fees.
  //    Unlike conditional/classification fees where category determines applicability,
  //    global application fees apply to ALL businesses regardless of category. The category field
  //    was redundant and did not drive any business logic.
  //
  // 2. Description field has been intentionally removed from global application fees.
  //    - Fee names are self-explanatory (e.g., "Application Fee", "Barangay Clearance Fee")
  //    - Descriptions are not displayed in the UI (panel cards show name, amount, category, timestamps)
  //    - Global application fees apply to ALL businesses by definition, so no conditional logic to explain
  //    - Removing unnecessary fields reduces maintenance burden and code complexity
  //    - If a fee name is unclear, rename the fee rather than adding a description
  // ============================================
  generalApplicationFees: [
    {
      name: "Environmental Protection Fee",
      amount: 200,
      isActive: true,
    },
  ],

  // ============================================
  // 2. CONDITIONAL FEES
  // Equipment/facility-specific fees based on business type
  //
  // IMPORTANT: The 'question' field is the user-facing question displayed to business owners
  // in the LOB application form to determine if the conditional fee applies to their business.
  // The 'notes' field is for admin reference explaining what the fee is for (regulatory basis, historical notes, etc.).
  // Example:
  //   - name: "Videoke Machine Fee"
  //   - notes: "Fee for establishments with videoke/karaoke machines. Based on Local Government Code Sec. 152."
  //   - question: "Does your business have videoke machines or similar entertainment equipment?"
  //
  // NOTE: The question field has been added to representative fees below. When implementing
  // the full seeder, ensure all conditional fees include the question field following the pattern:
  // "Does your business [have/offer/operate as] [condition]?"
  // ============================================
  conditionalFees: [
    // ENTERTAINMENT FEES
    {
      _id: "videoke-machine",
      name: "Videoke Machine Fee",
      notes: "Fee for establishments with videoke/karaoke machines",
      question:
        "Does your business have videoke machines or similar entertainment equipment?",
      amount: 3000,
      category: "ENT",
      isActive: true,
    },
    {
      _id: "swimming-pool-tax",
      name: "Swimming Pool Tax",
      notes: "Annual tax for swimming pool operations",
      question: "Does your business have a swimming pool?",
      amount: 660,
      category: "ENT",
      isActive: true,
    },
    {
      _id: "billiard-first-table",
      name: "Billiard Hall Tax - First Table",
      notes: "Tax for first billiard/pool table",
      question: "Does your business have billiard or pool tables?",
      amount: 165,
      category: "ENT",
      isActive: true,
    },
    {
      _id: "billiard-additional-tables",
      name: "Billiard Hall Tax - Additional Tables",
      notes: "Tax for additional billiard/pool tables",
      question: "Does your business have more than one billiard or pool table?",
      amount: 66,
      category: "ENT",
      isActive: true,
    },

    // TELECOMMUNICATIONS FEES

    // FOOD SERVICE EQUIPMENT FEES
    // WHOLESALE EQUIPMENT FEES
    {
      _id: "cold-storage-equipment",
      name: "Cold Storage Equipment Fee",
      notes: "Fee for cold storage equipment",
      question: "Does your business have cold storage equipment?",
      amount: 5000,
      category: "WHL",
      isActive: true,
    },
    {
      _id: "bulk-handling-equipment",
      name: "Bulk Handling Equipment Fee",
      notes: "Fee for bulk handling equipment",
      question: "Does your business have bulk handling equipment?",
      amount: 3000,
      category: "WHL",
      isActive: true,
    },

    // MINING EQUIPMENT FEES
    {
      _id: "safety-equipment",
      name: "Safety Equipment Fee",
      notes: "Fee for safety equipment in mining",
      question:
        "Does your business require safety equipment for mining operations?",
      amount: 5000,
      category: "MIN",
      isActive: true,
    },

    // PHARMACY-SPECIFIC FEES
    {
      _id: "cold-storage-pharma",
      name: "Cold Storage Fee (Pharmacy)",
      notes:
        "Fee for temperature-controlled pharmaceutical storage required by FDA",
      question:
        "Does your pharmacy store temperature-sensitive medicines requiring cold storage?",
      amount: 2000,
      category: "RET",
      isActive: true,
    },
    {
      _id: "controlled-substance",
      name: "Controlled Substance Fee",
      notes:
        "Fee for pharmacies handling regulated/controlled drugs requiring additional FDA oversight",
      question: "Does your pharmacy handle controlled or regulated substances?",
      amount: 2000,
      category: "RET",
      isActive: true,
    },
    {
      _id: "e-pharmacy",
      name: "E-Pharmacy Fee",
      notes:
        "Fee for online pharmacy operations requiring additional FDA licensing",
      question:
        "Does your pharmacy operate online or offer e-pharmacy services?",
      amount: 3000,
      category: "RET",
      isActive: true,
    },
    {
      _id: "extraction-equipment",
      name: "Extraction Equipment Fee",
      notes: "Fee for extraction equipment",
      question: "Does your business have extraction equipment?",
      amount: 8000,
      category: "MIN",
      isActive: true,
    },
  ],

  // ============================================
  // 3. VARIABLE FEE RULES
  // Calculated based on business metrics (area, capitalization, units, etc.)
  //
  // IMPORTANT RULE: Variable fee questions must be answerable by business owners
  // without requiring technical expertise, specialized equipment, or external agency data.
  //
  // ACCEPTABLE questions:
  // - "How many boarders does your boarding house accommodate?" (countable units)
  // - "What is the total floor area in square meters?" (standard business metric)
  // - "How many vehicles does your business operate?" (countable assets)
  //
  // UNACCEPTABLE questions (too technical for LGU business permit):
  // - "What is the daily wastewater discharge volume in cubic meters?" (requires engineering analysis)
  // - "What is the estimated BOD/TSS load in kilograms?" (requires laboratory testing)
  // - "What is the estimated volume of extraction in cubic meters?" (requires geological survey)
  //
  // Such technical fees should be handled by specialized agencies (LLDA, DENR, MGB) as part of
  // their separate permitting processes, not as LGU business permit variable fees.
  // ============================================
  variableFeeRules: [
    // ENTERTAINMENT FEES
    {
      _id: "salon-barber-chair-fee",
      name: "Salon/Barber Chair Fee",
      description:
        "Variable fee for salon and barbershop businesses based on the number of service chairs or stations",
      notes: "Fee for salon/barbershop based on number of chairs/stations",
      question:
        "How many barber chairs or salon stations does your business have?",
      calculationMethod: "bracketed",
      unit: "chair",
      unitSingular: "chair",
      unitPlural: "chairs",
      unitContextSingular: "salon chair",
      unitContextPlural: "salon chairs",
      brackets: [
        { minValue: 0, maxValue: 1, fixedAmount: 500 },
        { minValue: 1, rate: 300 },
      ],
      legalBasis: [
        {
          title: "Municipal Ordinance No. 2018-12",
          description:
            "An ordinance imposing fees and charges on salon and barbershop operations based on business capacity",
        },
      ],
      isActive: true,
    },

    // ACCOMMODATION FEES

    // FACILITY-BASED VARIABLE FEES (Bracketed by sqm)
    {
      _id: "parking-space-fee",
      name: "Parking Space Fee",
      description:
        "Variable fee for businesses with parking facilities based on total parking area in square meters",
      notes: "Fee for parking space based on area in sqm",
      question: "What is the total parking area in square meters?",
      calculationMethod: "bracketed",
      unit: "sqm",
      unitSingular: "sqm",
      unitPlural: "sqm",
      unitContextSingular: "sqm of parking space",
      unitContextPlural: "sqm of parking space",
      brackets: [
        { minValue: 0, maxValue: 300, fixedAmount: 750 },
        { minValue: 300, maxValue: 500, fixedAmount: 1000 },
        { minValue: 500, maxValue: 1000, fixedAmount: 2000 },
        { minValue: 1000, fixedAmount: 5000 },
      ],
      legalBasis: [
        {
          title: "Local Government Code of 1991, Sec. 152",
          description:
            "Authority of LGUs to impose reasonable fees for parking space usage and maintenance",
        },
      ],
      isActive: true,
    },
    {
      _id: "storage-area-fee",
      name: "Storage Area Fee",
      description:
        "Variable fee for businesses with warehouse or storage facilities based on floor area",
      notes: "Fee for warehouse/storage area based on area in sqm",
      question: "What is the total warehouse/storage area in square meters?",
      calculationMethod: "bracketed",
      unit: "sqm",
      unitSingular: "sqm",
      unitPlural: "sqm",
      unitContextSingular: "sqm of warehouse space",
      unitContextPlural: "sqm of warehouse space",
      brackets: [
        { minValue: 0, maxValue: 100, fixedAmount: 2000 },
        { minValue: 100, maxValue: 300, fixedAmount: 3000 },
        { minValue: 300, maxValue: 500, fixedAmount: 5000 },
        { minValue: 500, fixedAmount: 6000 },
      ],
      legalBasis: [
        {
          title: "City Ordinance No. 2019-08",
          description:
            "Regulation on warehouse and storage facility fees based on floor area",
        },
      ],
      isActive: true,
    },

    // BUILDING/CONSTRUCTION VARIABLES
    {
      _id: "boarding-capacity-fee",
      name: "Boarding Capacity",
      description:
        "Variable for boarding houses and dormitories based on the number of boarders or lodgers accommodated",
      notes:
        "Variable for boarding houses/dormitories based on number of boarders",
      question:
        "How many boarders/lodgers does your boarding house or dormitory accommodate?",
      calculationMethod: "bracketed",
      unit: "boarder",
      unitSingular: "boarder",
      unitPlural: "boarders",
      unitContextSingular: "boarding house boarder",
      unitContextPlural: "boarding house boarders",
      brackets: [
        { minValue: 1, maxValue: 10, fixedAmount: 250 },
        { minValue: 11, maxValue: 20, fixedAmount: 500 },
        { minValue: 21, fixedAmount: 750 },
      ],
      legalBasis: [
        {
          title: "Barangay Ordinance No. 2020-15",
          description:
            "Regulation of boarding houses and dormitories including capacity-based fees",
        },
      ],
      isActive: true,
    },

    // TRANSPORTATION FEES
    {
      _id: "puv-unit-fee",
      name: "Public Utility Vehicle Unit Fee",
      description:
        "Variable fee for public utility vehicle operators based on the number of vehicles (bus, jeepney, taxi)",
      notes: "Fee for PUVs (bus, jeepney, taxi) per unit based on vehicle type",
      question:
        "How many public utility vehicles (bus, jeepney, taxi) does your business operate?",
      calculationMethod: "per_unit",
      baseRate: 200,
      unit: "vehicle",
      unitSingular: "vehicle",
      unitPlural: "vehicles",
      unitContextSingular: "public utility vehicle",
      unitContextPlural: "public utility vehicles",
      legalBasis: [
        {
          title: "LTB Circular No. 2019-001",
          description:
            "Standard fees for public utility vehicle registration and operation",
        },
      ],
      isActive: true,
    },
    {
      _id: "trucking-unit-fee",
      name: "Trucking Unit Fee",
      description:
        "Variable fee for trucking and logistics businesses based on the number of trucks or hauling vehicles",
      notes: "Mayor's permit fee for trucking operations",
      question:
        "How many trucks or hauling vehicles does your business operate?",
      calculationMethod: "per_unit",
      baseRate: 400,
      unit: "truck",
      unitSingular: "truck",
      unitPlural: "trucks",
      unitContextSingular: "delivery truck",
      unitContextPlural: "delivery trucks",
      legalBasis: [
        {
          title: "Municipal Ordinance No. 2018-25",
          description:
            "Fees for trucking and logistics operations within municipal jurisdiction",
        },
      ],
      isActive: true,
    },

    // MINING FEES
    {
      _id: "mining-hectare-fee",
      name: "Mining Hectare Fee",
      description:
        "Variable fee for mining operations based on the total mining area in hectares",
      notes: "Fee for mining operations based on area in hectares",
      question: "What is the total mining area in hectares?",
      calculationMethod: "bracketed",
      unit: "hectare",
      unitSingular: "hectare",
      unitPlural: "hectares",
      unitContextSingular: "hectare of mining area",
      unitContextPlural: "hectares of mining area",
      brackets: [
        { minValue: 0, maxValue: 5, rate: 3000 },
        { minValue: 5, rate: 1000 },
      ],
      legalBasis: [
        {
          title: "DENR Administrative Order No. 2010-21",
          description:
            "Guidelines for the collection of fees from mining permit holders",
        },
      ],
      isActive: true,
    },
    // NOTE: Mining extraction fee removed - asking for estimated extraction volume in cubic meters
    // is too technical for standard business permit application. This is handled by MGB as part of
    // mining permits, not LGU business permit fees.

    // REAL ESTATE FEES
    {
      _id: "subdivision-lot-fee",
      name: "Subdivision Lot Fee",
      description:
        "Variable fee for subdivision developers based on the number of saleable lots in the project",
      notes: "Fee for subdivision developers per saleable lot",
      question: "How many saleable lots does your subdivision project have?",
      calculationMethod: "per_unit",
      baseRate: 216,
      unit: "lot",
      unitSingular: "lot",
      unitPlural: "lots",
      unitContextSingular: "subdivision lot",
      unitContextPlural: "subdivision lots",
      legalBasis: [
        {
          title: "HLURB Resolution No. 2017-01",
          description:
            "Standard fees for subdivision development and lot registration",
        },
      ],
      isActive: true,
    },
    {
      _id: "subdivision-area-fee",
      name: "Subdivision Area Fee",
      description:
        "Variable fee for subdivision developers based on the total subdivision area in hectares",
      notes: "Fee for subdivision developers based on area in hectares",
      question: "What is the total subdivision area in hectares?",
      calculationMethod: "per_unit",
      baseRate: 2880,
      unit: "hectare",
      unitSingular: "hectare",
      unitPlural: "hectares",
      unitContextSingular: "hectare of subdivision area",
      unitContextPlural: "hectares of subdivision area",
      legalBasis: [
        {
          title:
            "PD 957 - The Subdivision and Condominium Buyer's Protective Decree",
          description:
            "Regulatory framework for subdivision development including area-based fees",
        },
      ],
      isActive: true,
    },
    {
      _id: "subdivision-floor-area-fee",
      name: "Subdivision Floor Area Fee",
      description:
        "Variable fee for subdivision developers based on the total housing component floor area in square meters",
      notes:
        "Fee for subdivision developers based on housing component floor area",
      question:
        "What is the total housing component floor area in square meters?",
      calculationMethod: "per_unit",
      baseRate: 14.4,
      unit: "sqm",
      unitSingular: "sqm",
      unitPlural: "sqm",
      unitContextSingular: "sqm of floor area",
      unitContextPlural: "sqm of floor area",
      legalBasis: [
        {
          title: "Building Code of the Philippines (RA 9514)",
          description:
            "Fees based on total floor area for residential development projects",
        },
      ],
      isActive: true,
    },

    // EDUCATION FEES

    // HEALTH FEES
    {
      _id: "hospital-bed-fee",
      name: "Hospital Bed Capacity Fee",
      description:
        "Variable sanitary fee for hospitals and healthcare facilities based on bed capacity",
      notes: "Sanitary fee for hospitals based on bed capacity",
      question: "How many beds does your hospital have?",
      calculationMethod: "bracketed",
      unit: "bed",
      unitSingular: "bed",
      unitPlural: "beds",
      unitContextSingular: "hospital bed",
      unitContextPlural: "hospital beds",
      brackets: [
        { minValue: 0, maxValue: 25, fixedAmount: 165 },
        { minValue: 25, maxValue: 50, fixedAmount: 440 },
        { minValue: 50, maxValue: 100, fixedAmount: 660 },
        { minValue: 100, fixedAmount: 880 },
      ],
      legalBasis: [
        {
          title: "DOH Administrative Order No. 2012-0012",
          description:
            "Sanitary inspection fees for healthcare facilities based on bed capacity",
        },
      ],
      isActive: true,
    },

    // MANUFACTURING FEES
    {
      _id: "printing-machine-fee",
      name: "Printing Machine Fee",
      description:
        "Variable fee for printing press businesses based on the number of printing machines (photostatic, xerox, recopying, etc.)",
      notes: "Fee for printing press based on number of machines",
      question:
        "How many printing machines does your business have (photostatic, xerox, recopying, etc.)?",
      calculationMethod: "per_unit",
      baseRate: 500,
      unit: "machine",
      unitSingular: "machine",
      unitPlural: "machines",
      unitContextSingular: "printing machine",
      unitContextPlural: "printing machines",
      legalBasis: [
        {
          title: "Municipal Ordinance No. 2017-33",
          description:
            "Business permit fees for printing and publishing establishments",
        },
      ],
      isActive: true,
    },

    // RETAIL FEES
    {
      _id: "market-stall-fee",
      name: "Market Stall Fee",
      description:
        "Variable fee for market stall operators based on stall floor area in square meters",
      notes: "Fee for market stalls based on floor area",
      question: "What is the floor area of your market stall in square meters?",
      calculationMethod: "bracketed",
      unit: "sqm",
      unitSingular: "sqm",
      unitPlural: "sqm",
      unitContextSingular: "sqm of stall area",
      unitContextPlural: "sqm of stall area",
      brackets: [
        { minValue: 0, maxValue: 6, fixedAmount: 1200 },
        { minValue: 6, maxValue: 11, fixedAmount: 1320 },
        { minValue: 11, maxValue: 13, fixedAmount: 1440 },
      ],
      legalBasis: [
        {
          title: "Market Code Ordinance No. 2016-05",
          description:
            "Market stall rental fees based on floor area classification",
        },
      ],
      isActive: true,
    },

    // REAL ESTATE FEES
    {
      _id: "hotel-room-fee",
      name: "Hotel Room Fee",
      description:
        "Variable fee for hotels and accommodation establishments based on the number of rooms",
      notes: "Fee for hotels based on number of rooms",
      question: "How many rooms does your hotel have?",
      calculationMethod: "bracketed",
      unit: "room",
      unitSingular: "room",
      unitPlural: "rooms",
      unitContextSingular: "hotel room",
      unitContextPlural: "hotel rooms",
      brackets: [
        { minValue: 0, maxValue: 5, fixedAmount: 600 },
        { minValue: 5, maxValue: 12, fixedAmount: 1000 },
        { minValue: 12, maxValue: 20, fixedAmount: 1500 },
        { minValue: 20, maxValue: 30, fixedAmount: 2000 },
        { minValue: 30, maxValue: 40, fixedAmount: 2500 },
        { minValue: 40, maxValue: 50, fixedAmount: 3000 },
        { minValue: 50, fixedAmount: 3500 },
      ],
      legalBasis: [
        {
          title: "DOT Accreditation Standards",
          description:
            "Accommodation establishment fees based on room capacity classification",
        },
      ],
      isActive: true,
    },
    {
      _id: "apartment-unit-fee",
      name: "Apartment Unit",
      description:
        "Variable for apartment rental businesses based on the number of rental units",
      notes: "Variable for apartment rentals based on number of units",
      question: "How many apartment units do you rent out?",
      calculationMethod: "per_unit",
      baseRate: 100,
      unit: "unit",
      unitSingular: "unit",
      unitPlural: "units",
      unitContextSingular: "room unit",
      unitContextPlural: "room units",
      legalBasis: [
        {
          title: "City Ordinance No. 2018-19",
          description: "Rental property registration fees per apartment unit",
        },
      ],
      isActive: true,
    },

    // ENVIRONMENTAL FEES
    // NOTE: Sewerage fees removed - these are technical environmental fees handled by LLDA/DENR
    // as part of discharge permits, not LGU business permit fees. Business owners cannot reasonably
    // provide BOD/TSS load or discharge volume data during standard business permit application.

    // FINANCIAL INSTITUTION VARIABLES (Classification-based)
    {
      _id: "bank-classification-fee",
      name: "Bank Classification",
      description:
        "Variable for banks based on bank type classification (Rural/Thrift, Commercial/Industrial, Universal)",
      notes: "Mayor's permit based on bank type classification",
      question: "What type of bank is this?",
      calculationMethod: "classification",
      unit: "classification",
      unitSingular: "classification",
      unitPlural: "classifications",
      unitContextSingular: "bank type classification",
      unitContextPlural: "bank type classifications",
      classifications: [
        {
          name: "Rural, Thrift and Savings Bank",
          fee: 2000,
          description: "Rural, thrift, and savings banks",
        },
        {
          name: "Commercial, Industrial and Development Bank",
          fee: 3000,
          description: "Commercial, industrial, and development banks",
        },
        { name: "Universal Bank", fee: 5000, description: "Universal banks" },
      ],
      legalBasis: [
        {
          title: "BSP Circular No. 898",
          description:
            "Classification and registration of banks and financial institutions",
        },
      ],
      isActive: true,
    },
    {
      _id: "lending-classification-fee",
      name: "Lending Institution Classification Fee",
      description:
        "Variable fee for lending institutions based on type (Lending Investor, Money Shop, Investment Company)",
      notes: "Mayor's permit fee based on lending institution type",
      question: "What type of lending institution is this?",
      calculationMethod: "classification",
      unit: "classification",
      unitSingular: "classification",
      unitPlural: "classifications",
      unitContextSingular: "lending institution type",
      unitContextPlural: "lending institution types",
      classifications: [
        {
          name: "Lending Investor",
          fee: 2000,
          description: "Lending investor companies",
        },
        {
          name: "Money Shop",
          fee: 3000,
          description: "Money shop/pawning services",
        },
        {
          name: "Investment Company",
          fee: 5000,
          description: "Investment and financing companies",
        },
      ],
      legalBasis: [
        {
          title: "BSP Circular No. 898",
          description:
            "Classification and registration of banks and financial institutions",
        },
      ],
      isActive: true,
    },
    {
      _id: "pawnshop-classification-fee",
      name: "Pawnshop Classification Fee",
      description:
        "Variable fee for pawnshops based on type (Single-Branch, Multi-Branch, Franchise)",
      notes: "Mayor's permit fee based on pawnshop type",
      question: "What type of pawnshop is this?",
      calculationMethod: "classification",
      unit: "classification",
      unitSingular: "classification",
      unitPlural: "classifications",
      unitContextSingular: "pawnshop type",
      unitContextPlural: "pawnshop types",
      classifications: [
        {
          name: "Single-Branch Pawnshop",
          fee: 2000,
          description: "Single-branch pawnshop operations",
        },
        {
          name: "Multi-Branch Pawnshop",
          fee: 3000,
          description: "Multi-branch pawnshop operations",
        },
        {
          name: "Pawnshop Franchise",
          fee: 5000,
          description: "Pawnshop franchise operations",
        },
      ],
      legalBasis: [
        {
          title: "BSP Circular No. 898",
          description:
            "Classification and registration of banks and financial institutions",
        },
      ],
      isActive: true,
    },
  ],

  // ============================================
  // 4. PENALTY RULES
  // Late payment and violation penalties
  //
  // NOTE: Penalty Rules have been skipped for now and will be implemented in a future phase.
  // ============================================
  penaltyRules: [],

  // ============================================
  // 5. CLAIMABLE DOCUMENT FEES
  // Fees auto-created when requirements are created
  // These fees are linked to specific requirements via feeId
  // The fee name matches the requirement name and cannot be edited separately
  //
  // NOTE: The following are NOT included as they are obtained outside the
  // centralized LGU business permit system:
  // - Barangay Clearance: Obtained directly from barangay offices
  // - Community Tax Certificate (CTC/Cedula): Obtained at City/Municipal Treasurer's Office
  // - Occupancy Permit: Pre-requisite for business permits, obtained from City Engineering Office
  //
  // NOTE: Fire Safety Inspection Certificate and Sanitary Permit are document fees only
  // and are not included here as claimable document fees. They exist as documents with their
  // own fee structures in the document system.
  // ============================================
  claimableDocumentFees: [],

  // ============================================
  // 6. TAX BRACKETS
  // Progressive tax brackets based on business size (capitalization, gross sales, etc.)
  // Defined per category - all LOBs in a category share the same tax brackets
  // ============================================
  taxBrackets: {
    // RETAIL CATEGORY
    RTL: {
      category: "RTL",
      categoryName: "Retail",
      capitalizationBrackets: [
        {
          _id: "rtl-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro enterprises with capitalization up to ₱150,000",
        },
        {
          _id: "rtl-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage enterprises with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "rtl-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "rtl-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "rtl-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100M",
        },
      ],
    },
    // MONTHLY MARKET STALL BRACKETS (RTL Category)
    RTL_MONTHLY: {
      category: "RTL",
      categoryName: "Retail (Monthly Market Stalls)",
      capitalizationBrackets: [
        {
          _id: "rtl-monthly-meat-poultry",
          name: "Meat & Poultry Vendor - Monthly",
          minValue: 0,
          maxValue: null,
          fixedAmount: 350,
          excessRate: null,
          excessRateType: null,
          notes: "₱350/month for meat & poultry market stalls",
          paymentFrequency: "monthly",
        },
        {
          _id: "rtl-monthly-fish",
          name: "Fish Vendor - Monthly",
          minValue: 0,
          maxValue: null,
          fixedAmount: 350,
          excessRate: null,
          excessRateType: null,
          notes: "₱350/month for fish market stalls",
          paymentFrequency: "monthly",
        },
        {
          _id: "rtl-monthly-fruits-vegetables",
          name: "Fruits & Vegetables Vendor - Monthly",
          minValue: 0,
          maxValue: null,
          fixedAmount: 350,
          excessRate: null,
          excessRateType: null,
          notes: "₱350/month for fruits & vegetables market stalls",
          paymentFrequency: "monthly",
        },
        {
          _id: "rtl-monthly-grocery",
          name: "Grocery Vendor - Monthly",
          minValue: 0,
          maxValue: null,
          fixedAmount: 300,
          excessRate: null,
          excessRateType: null,
          notes: "₱300/month for grocery market stalls",
          paymentFrequency: "monthly",
        },
        {
          _id: "rtl-monthly-dry-goods",
          name: "Dry Goods Vendor - Monthly",
          minValue: 0,
          maxValue: null,
          fixedAmount: 300,
          excessRate: null,
          excessRateType: null,
          notes: "₱300/month for dry goods market stalls",
          paymentFrequency: "monthly",
        },
      ],
    },
    // FOOD SERVICE CATEGORY
    FDS: {
      category: "FDS",
      categoryName: "Food Service",
      capitalizationBrackets: [
        {
          _id: "fds-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro food establishments with capitalization up to ₱150,000",
        },
        {
          _id: "fds-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage food establishments with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "fds-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "fds-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "fds-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "fds-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱673 for gross sales up to ₱30,000",
        },
        {
          _id: "fds-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "fds-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "fds-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 40000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱40,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "fds-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 48771,
          excessRate: 0.00495,
          excessRateType: "percentage_of_percentage",
          notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
        },
        {
          _id: "fds-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
        },
      ],
    },
    // MANUFACTURING CATEGORY
    MFG: {
      category: "MFG",
      categoryName: "Manufacturing",
      capitalizationBrackets: [
        {
          _id: "mfg-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱500 for micro manufacturers with capitalization up to ₱150,000",
        },
        {
          _id: "mfg-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱1,500 for cottage manufacturers with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "mfg-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
        },
        {
          _id: "mfg-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 75000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱75,000 + 1% of excess over ₱15,000,000",
        },
        {
          _id: "mfg-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "mfg-gs-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱500 for gross sales up to ₱30,000",
        },
        {
          _id: "mfg-gs-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "mfg-gs-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱100,000",
        },
        {
          _id: "mfg-gs-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 25000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱25,000 + 1% of excess over ₱500,000",
        },
        {
          _id: "mfg-gs-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 30000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
        },
        {
          _id: "mfg-gs-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱50M",
        },
      ],
    },
    // SERVICES CATEGORY
    SVC: {
      category: "SVC",
      categoryName: "Services",
      capitalizationBrackets: [
        {
          _id: "svc-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro service providers with capitalization up to ₱150,000",
        },
        {
          _id: "svc-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage service providers with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "svc-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "svc-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "svc-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "svc-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱673 for gross sales up to ₱30,000",
        },
        {
          _id: "svc-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "svc-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "svc-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 40000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱40,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "svc-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 48771,
          excessRate: 0.00495,
          excessRateType: "percentage_of_percentage",
          notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
        },
        {
          _id: "svc-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
        },
      ],
    },
    // FINANCIAL CATEGORY
    FIN: {
      category: "FIN",
      categoryName: "Financial",
      capitalizationBrackets: [
        {
          _id: "fin-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 1000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱1,000 for micro financial institutions with capitalization up to ₱150,000",
        },
        {
          _id: "fin-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 3000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱3,000 for cottage financial institutions with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "fin-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 10000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱10,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "fin-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 250000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱250,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "fin-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 400000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱400,000 + 30% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "fin-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 1000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱1,000 for gross sales up to ₱30,000",
        },
        {
          _id: "fin-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 3000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱3,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "fin-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 10000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱10,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "fin-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 60000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱60,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "fin-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 70000,
          excessRate: 0.004,
          excessRateType: "percentage_of_percentage",
          notes: "₱70,000 + 40% of 1% of excess over ₱9.5M",
        },
        {
          _id: "fin-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 400000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱400,000 + 30% of 1% in excess of ₱50M",
        },
      ],
    },
    // REAL ESTATE CATEGORY
    RES: {
      category: "RES",
      categoryName: "Real Estate",
      capitalizationBrackets: [
        {
          _id: "res-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro real estate businesses with capitalization up to ₱150,000",
        },
        {
          _id: "res-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage real estate businesses with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "res-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "res-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "res-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "res-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱673 for gross sales up to ₱30,000",
        },
        {
          _id: "res-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "res-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "res-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 40000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱40,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "res-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 48771,
          excessRate: 0.00495,
          excessRateType: "percentage_of_percentage",
          notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
        },
        {
          _id: "res-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
        },
      ],
    },
    // TRANSPORTATION CATEGORY
    TRN: {
      category: "TRN",
      categoryName: "Transportation",
      capitalizationBrackets: [
        {
          _id: "trn-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro transportation businesses with capitalization up to ₱150,000",
        },
        {
          _id: "trn-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage transportation businesses with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "trn-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "trn-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "trn-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "trn-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱673 for gross sales up to ₱30,000",
        },
        {
          _id: "trn-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "trn-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "trn-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 40000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱40,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "trn-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 48771,
          excessRate: 0.00495,
          excessRateType: "percentage_of_percentage",
          notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
        },
        {
          _id: "trn-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
        },
      ],
    },
    // AGRICULTURE CATEGORY
    AGR: {
      category: "AGR",
      categoryName: "Agriculture",
      capitalizationBrackets: [
        {
          _id: "agr-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱500 for micro agricultural businesses with capitalization up to ₱150,000",
        },
        {
          _id: "agr-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱1,500 for cottage agricultural businesses with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "agr-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
        },
        {
          _id: "agr-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 75000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱75,000 + 1% of excess over ₱15,000,000",
        },
        {
          _id: "agr-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "agr-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱500 for gross sales up to ₱30,000",
        },
        {
          _id: "agr-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "agr-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱100,000",
        },
        {
          _id: "agr-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 25000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱25,000 + 1% of excess over ₱500,000",
        },
        {
          _id: "agr-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 30000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
        },
        {
          _id: "agr-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱50M",
        },
      ],
    },
    // CONSTRUCTION CATEGORY
    CON: {
      category: "CON",
      categoryName: "Construction",
      capitalizationBrackets: [
        {
          _id: "con-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱500 for micro construction businesses with capitalization up to ₱150,000",
        },
        {
          _id: "con-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱1,500 for cottage construction businesses with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "con-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
        },
        {
          _id: "con-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 75000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱75,000 + 1% of excess over ₱15,000,000",
        },
        {
          _id: "con-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "con-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱500 for gross sales up to ₱30,000",
        },
        {
          _id: "con-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "con-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱100,000",
        },
        {
          _id: "con-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 25000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱25,000 + 1% of excess over ₱500,000",
        },
        {
          _id: "con-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 30000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
        },
        {
          _id: "con-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱50M",
        },
      ],
    },
    // MINING CATEGORY
    MIN: {
      category: "MIN",
      categoryName: "Mining",
      capitalizationBrackets: [
        {
          _id: "min-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱500 for micro mining operations with capitalization up to ₱150,000",
        },
        {
          _id: "min-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱1,500 for cottage mining operations with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "min-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
        },
        {
          _id: "min-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 75000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱75,000 + 1% of excess over ₱15,000,000",
        },
        {
          _id: "min-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "min-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱500 for gross sales up to ₱30,000",
        },
        {
          _id: "min-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "min-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱100,000",
        },
        {
          _id: "min-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 25000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱25,000 + 1% of excess over ₱500,000",
        },
        {
          _id: "min-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 30000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
        },
        {
          _id: "min-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱50M",
        },
      ],
    },
    // UTILITIES CATEGORY
    UTL: {
      category: "UTL",
      categoryName: "Utilities",
      capitalizationBrackets: [
        {
          _id: "utl-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro utility providers with capitalization up to ₱150,000",
        },
        {
          _id: "utl-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage utility providers with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "utl-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "utl-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "utl-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "utl-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱673 for gross sales up to ₱30,000",
        },
        {
          _id: "utl-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "utl-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "utl-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 40000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱40,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "utl-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 48771,
          excessRate: 0.00495,
          excessRateType: "percentage_of_percentage",
          notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
        },
        {
          _id: "utl-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
        },
      ],
    },
    // WHOLESALE CATEGORY
    WSL: {
      category: "WSL",
      categoryName: "Wholesale",
      capitalizationBrackets: [
        {
          _id: "wsl-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro wholesale businesses with capitalization up to ₱150,000",
        },
        {
          _id: "wsl-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage wholesale businesses with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "wsl-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "wsl-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "wsl-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "wsl-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱673 for gross sales up to ₱30,000",
        },
        {
          _id: "wsl-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "wsl-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "wsl-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 40000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱40,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "wsl-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 48771,
          excessRate: 0.00495,
          excessRateType: "percentage_of_percentage",
          notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
        },
        {
          _id: "wsl-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
        },
      ],
    },
    // ENTERTAINMENT CATEGORY
    ENT: {
      category: "ENT",
      categoryName: "Entertainment",
      capitalizationBrackets: [
        {
          _id: "ent-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱673 for micro entertainment businesses with capitalization up to ₱150,000",
        },
        {
          _id: "ent-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱2,000 for cottage entertainment businesses with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "ent-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱1,500,000",
        },
        {
          _id: "ent-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 140000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
        },
        {
          _id: "ent-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "ent-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 673,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱673 for gross sales up to ₱30,000",
        },
        {
          _id: "ent-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 2000,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "ent-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 5000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱5,000 + 1% of excess over ₱100,000",
        },
        {
          _id: "ent-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 40000,
          excessRate: 0.015,
          excessRateType: "direct",
          notes: "₱40,000 + 1.5% of excess over ₱500,000",
        },
        {
          _id: "ent-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 48771,
          excessRate: 0.00495,
          excessRateType: "percentage_of_percentage",
          notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
        },
        {
          _id: "ent-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 249246,
          excessRate: 0.00275,
          excessRateType: "percentage_of_percentage",
          notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
        },
      ],
    },
    // EDUCATION CATEGORY
    EDU: {
      category: "EDU",
      categoryName: "Education",
      capitalizationBrackets: [
        {
          _id: "edu-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱500 for micro educational institutions with capitalization up to ₱150,000",
        },
        {
          _id: "edu-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱1,500 for cottage educational institutions with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "edu-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
        },
        {
          _id: "edu-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 75000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱75,000 + 1% of excess over ₱15,000,000",
        },
        {
          _id: "edu-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "edu-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱500 for gross sales up to ₱30,000",
        },
        {
          _id: "edu-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "edu-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱100,000",
        },
        {
          _id: "edu-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 25000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱25,000 + 1% of excess over ₱500,000",
        },
        {
          _id: "edu-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 30000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
        },
        {
          _id: "edu-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱50M",
        },
      ],
    },
    // WAREHOUSE/LOGISTICS CATEGORY
    WHL: {
      category: "WHL",
      categoryName: "Warehouse/Logistics",
      capitalizationBrackets: [
        {
          _id: "whl-cap-1",
          name: "Micro",
          minValue: 0,
          maxValue: 150000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱500 for micro warehouse/logistics businesses with capitalization up to ₱150,000",
        },
        {
          _id: "whl-cap-2",
          name: "Cottage",
          minValue: 150001,
          maxValue: 1500000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes:
            "Fixed ₱1,500 for cottage warehouse/logistics businesses with capitalization ₱150,001 - ₱1,500,000",
        },
        {
          _id: "whl-cap-3",
          name: "Small",
          minValue: 1500001,
          maxValue: 15000000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
        },
        {
          _id: "whl-cap-4",
          name: "Medium",
          minValue: 15000001,
          maxValue: 100000000,
          fixedAmount: 75000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱75,000 + 1% of excess over ₱15,000,000",
        },
        {
          _id: "whl-cap-5",
          name: "Large",
          minValue: 100000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
        },
      ],
      grossSalesBrackets: [
        {
          _id: "whl-1",
          name: "Micro",
          minValue: 0,
          maxValue: 30000,
          fixedAmount: 500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱500 for gross sales up to ₱30,000",
        },
        {
          _id: "whl-2",
          name: "Cottage",
          minValue: 30001,
          maxValue: 100000,
          fixedAmount: 1500,
          excessRate: null,
          excessRateType: null,
          notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
        },
        {
          _id: "whl-3",
          name: "Small",
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 3000,
          excessRate: 0.005,
          excessRateType: "direct",
          notes: "₱3,000 + 0.5% of excess over ₱100,000",
        },
        {
          _id: "whl-4",
          name: "Medium",
          minValue: 500001,
          maxValue: 9500000,
          fixedAmount: 25000,
          excessRate: 0.01,
          excessRateType: "direct",
          notes: "₱25,000 + 1% of excess over ₱500,000",
        },
        {
          _id: "whl-5",
          name: "Large",
          minValue: 9500001,
          maxValue: 50000000,
          fixedAmount: 30000,
          excessRate: 0.003,
          excessRateType: "percentage_of_percentage",
          notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
        },
        {
          _id: "whl-6",
          name: "Very Large",
          minValue: 50000001,
          maxValue: null,
          fixedAmount: 165000,
          excessRate: 0.002,
          excessRateType: "percentage_of_percentage",
          notes: "₱165,000 + 20% of 1% in excess of ₱50M",
        },
      ],
    },
  },

  // ============================================
  // 7. APPEAL FEES
  // Fees for filing appeals
  // ============================================
  appealFees: [
    {
      name: "Application Appeal Fee",
      notes: "Fee for filing an appeal against application decisions",
      amount: 500,
      category: "appeal",
      isActive: true,
    },
  ],

  // ============================================
  // NOTES FOR IMPLEMENTATION
  // ============================================
  implementationNotes: {
    hierarchy: [
      "1. Global Application Fees - Base processing fees that apply to all businesses (formerly Administrative Fixed Fees)",
      "2. Conditional Fees - Equipment/facility-specific fees based on business type",
      "3. Variable Fee Rules - Calculated based on business metrics (area, percentage, units)",
      "4. Classification Fees - Size-based industry classification fees for fee calculation",
      "5. Penalties - Separate category for late payment/violations",
      "6. Appeals - Separate category for appeal-related fees",
    ],
    keyDistinction: [
      "Global Application Fees: Fixed amounts paid by all businesses (e.g., environmental protection, barangay clearance, business plate)",
      "Conditional Fees: Equipment/facility-specific fees based on business type (e.g., videoke machine, swimming pool, commercial kitchen)",
      "Variable Fee Rules: Scale with business metrics (floor_area, percentage, per_unit based on actual usage)",
      "Classification Fees: Size-based fees determined by business scale within each industry (micro/small/medium/large)",
      "Example: 'Environmental Protection Fee - ₱200' is a global application fee",
      "Example: 'Videoke Machine Fee - ₱3,000' is a conditional fee",
      "Example: 'Building Permit Fee - ₱7.20/sqm' is a variable fee",
      "Example: 'Small-scale Service - ₱1,500' is a classification fee based on employee count",
    ],
    classificationFeeLogic: [
      "Classification fees are NOT business types - those are PSIC codes (industryCategories.js)",
      "Classification fees ARE size/scale tiers within each industry for fee calculation",
      "Each industry category (FDS, RTL, MFG, etc.) has 3-5 size tiers (micro/cottage/small/medium/large)",
      "Size criteria varies by industry: seating (FDS), capitalization (RTL/MFG/FIN), employees (SVC), etc.",
      "User flow: Select PSIC business type → Select size tier → System applies appropriate classification fee",
    ],
    calculationMethods: [
      "floor_area - Based on square meters/hectares (building permits, zoning, signage, mining)",
      "percentage - Based on percentage of value (business tax, fire inspection, loans)",
      "per_unit - Based on count (fixtures, inspections, vehicles, events, patrons)",
      "capitalization - Based on business capitalization (mayor's permit)",
      "gross_sales - Based on annual gross sales (local business tax)",
    ],
    researchSources: [
      "National Building Code of the Philippines (PD 1096)",
      "Local Government Code (RA 7160)",
      "DENR Environmental Compliance Certificate guidelines",
      "Various LGU fee schedules (Tangub City, San Antonio Zambales, Puerto Princesa, etc.)",
      "MMDA regulations on billboards and signage",
      "permit renewal guidelines",
    ],
    nextSteps: [
      "1. Create database models for VariableFeeRule (COMPLETED)",
      "2. Update existing Fee model to support calculation methods (COMPLETED)",
      "3. Create seeder script using this reference data (IN PROGRESS)",
      "4. Implement fee calculation engine (COMPLETED)",
      "5. Update frontend to handle variable fee rules (COMPLETED)",
      "6. Add tax bracket configuration (COMPLETED - per category with progressive brackets)",
      "7. Update LOB admin UI to show PSIC classifications separately from size-based classification fees (COMPLETED)",
      "8. Create database models for Tax Brackets (COMPLETED)",
      "9. Create database models for Requirement Fees (COMPLETED)",
      "10. Create database models for Appeal Fees (COMPLETED)",
      "11. Implement Penalty Rules (SKIPPED - future phase)",
    ],
  },
};
