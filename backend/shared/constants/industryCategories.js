/**
 * Line of Business Taxonomy & PSIC Code Mappings
 *
 * Placeholder data based on General Trias, Cavite business classifications.
 * Each entry maps a tax code to a line-of-business category with detailed
 * sub-lines and corresponding PSIC 2019 codes.
 *
 * These values must stay in sync with:
 * - Fee configuration schedules
 * - Business permit application forms
 */

const INDUSTRY_CATEGORIES = [
  {
    taxCode: "RET",
    industryCategory: "retail",
    detailedLines: [
      "Sari-sari store",
      "Convenience store",
      "General merchandise",
      "Hardware & construction supplies",
      "Pharmacy / drugstore",
      "Clothing & apparel",
      "Electronics & gadgets",
      "Auto parts & accessories",
      "Fuel / gasoline station",
      "Agricultural supplies",
    ],
    psicCodes: [
      "4711",
      "4719",
      "4721",
      "4730",
      "4741",
      "4751",
      "4752",
      "4761",
      "4773",
      "4789",
    ],
  },
  {
    taxCode: "WHL",
    industryCategory: "wholesale",
    detailedLines: [
      "Agricultural raw materials",
      "Food & beverages (wholesale)",
      "Household goods (wholesale)",
      "Industrial machinery & equipment",
      "Construction materials (wholesale)",
      "Chemicals & fertilizers",
    ],
    psicCodes: ["4610", "4620", "4631", "4632", "4641", "4649"],
  },
  {
    taxCode: "FDS",
    industryCategory: "food_service",
    detailedLines: [
      "Restaurant / eatery",
      "Catering services",
      "Food cart / food stall",
      "Bakery / pastry shop",
      "Coffee shop / milk tea",
      "Bar / nightclub",
      "Canteen / commissary",
    ],
    psicCodes: ["5610", "5621", "5629", "5630"],
  },
  {
    taxCode: "MFG",
    industryCategory: "manufacturing",
    detailedLines: [
      "Food processing",
      "Garments & textiles",
      "Furniture & woodworks",
      "Metal fabrication",
      "Plastics & rubber products",
      "Printing & publishing",
      "Chemical products",
      "Electronics assembly",
      "Fireworks / pyrotechnics",
    ],
    psicCodes: [
      "1010",
      "1020",
      "1040",
      "1311",
      "1410",
      "1621",
      "2211",
      "2220",
      "1811",
      "2610",
      "2040",
    ],
  },
  {
    taxCode: "SVC",
    industryCategory: "services",
    detailedLines: [
      "Salon / barbershop",
      "Laundry services",
      "Repair shop (electronics, appliances)",
      "Tutorial / review center",
      "IT / BPO services",
      "Legal services",
      "Accounting / bookkeeping",
      "Medical / dental clinic",
      "Veterinary clinic",
      "Security agency",
      "Manpower / recruitment agency",
      "Advertising services",
    ],
    psicCodes: [
      "9602",
      "9601",
      "9521",
      "8549",
      "6201",
      "6910",
      "6920",
      "8610",
      "7500",
      "8010",
      "7810",
      "7310",
    ],
  },
  {
    taxCode: "FIN",
    industryCategory: "financial",
    detailedLines: [
      "Lending / financing company",
      "Pawnshop",
      "Money changer / remittance",
      "Insurance agency",
      "Cooperative (credit)",
      "Microfinance institution",
    ],
    psicCodes: ["6419", "6492", "6612", "6511", "6430", "6492"],
  },
  {
    taxCode: "RES",
    industryCategory: "real_estate",
    detailedLines: [
      "Real estate brokerage",
      "Property leasing / rental",
      "Subdivision developer",
      "Boarding house / dormitory",
      "Apartment / condominium rental",
    ],
    psicCodes: ["6810", "6820", "4100", "5510", "5510"],
  },
  {
    taxCode: "TRN",
    industryCategory: "transportation",
    detailedLines: [
      "Trucking / hauling",
      "Passenger transport (jeepney, bus, UV express)",
      "Delivery / courier service",
      "Freight forwarding",
      "Warehouse / storage",
      "Parking lot operation",
    ],
    psicCodes: ["4923", "4922", "5320", "5229", "5210", "5221"],
  },
  {
    taxCode: "AGR",
    industryCategory: "agriculture",
    detailedLines: [
      "Crop farming",
      "Livestock / poultry raising",
      "Aquaculture / fishpond",
      "Plant nursery",
      "Rice / corn milling",
      "Agricultural services (spraying, harvesting)",
    ],
    psicCodes: ["0111", "0141", "0321", "0130", "1061", "0161"],
  },
  {
    taxCode: "CON",
    industryCategory: "construction",
    detailedLines: [
      "General contractor",
      "Specialty trade contractor",
      "Electrical installation",
      "Plumbing & HVAC",
      "Painting & finishing",
      "Demolition services",
    ],
    psicCodes: ["4100", "4290", "4321", "4322", "4330", "4311"],
  },
  {
    taxCode: "MIN",
    industryCategory: "mining",
    detailedLines: [
      "Sand & gravel quarrying",
      "Stone quarrying",
      "Non-metallic mineral mining",
    ],
    psicCodes: ["0810", "0810", "0899"],
  },
  {
    taxCode: "UTL",
    industryCategory: "utilities",
    detailedLines: [
      "Water distribution",
      "Electric power distribution",
      "Waste collection & disposal",
      "Sewerage services",
    ],
    psicCodes: ["3600", "3510", "3811", "3700"],
  },
];

// Extract unique category keys for enum validation
const INDUSTRY_CATEGORY_KEYS = INDUSTRY_CATEGORIES.map(
  (l) => l.industryCategory,
);

// Quick lookup by taxCode
const INDUSTRY_CATEGORIES_BY_TAX_CODE = Object.fromEntries(
  INDUSTRY_CATEGORIES.map((l) => [l.taxCode, l]),
);

// Quick lookup by category
const INDUSTRY_CATEGORIES_BY_CATEGORY = Object.fromEntries(
  INDUSTRY_CATEGORIES.map((l) => [l.industryCategory, l]),
);

module.exports = {
  INDUSTRY_CATEGORIES,
  INDUSTRY_CATEGORY_KEYS,
  INDUSTRY_CATEGORIES_BY_TAX_CODE,
  INDUSTRY_CATEGORIES_BY_CATEGORY,
};
