/**
 * Business Industries Taxonomy
 *
 * Data based on General Trias, Cavite business classifications.
 * Each entry maps a tax code to a business industry category.
 *
 * These values must stay in sync with:
 * - Fee configuration schedules
 * - Business permit application forms
 */

const LINE_OF_BUSINESS = [
  {
    taxCode: "RET",
    lineOfBusiness: "retail",
    name: "Retail",
    description: "Selling goods directly to consumers through physical stores or online platforms",
  },
  {
    taxCode: "WHL",
    lineOfBusiness: "wholesale",
    name: "Wholesale",
    description: "Selling goods in bulk to retailers and other businesses",
  },
  {
    taxCode: "FDS",
    lineOfBusiness: "food_service",
    name: "Food Service",
    description: "Preparing and serving food and beverages to customers",
  },
  {
    taxCode: "ACM",
    lineOfBusiness: "accommodation",
    name: "Accommodation",
    description: "Providing lodging and short-term stays for travelers",
  },
  {
    taxCode: "MFG",
    lineOfBusiness: "manufacturing",
    name: "Manufacturing",
    description: "Transforming raw materials into finished products through industrial processes",
  },
  {
    taxCode: "SVC",
    lineOfBusiness: "services",
    name: "Services",
    description: "Providing professional and personal services to individuals and businesses",
  },
  {
    taxCode: "FIN",
    lineOfBusiness: "financial",
    name: "Financial",
    description: "Banking, lending, and investment activities",
  },
  {
    taxCode: "RES",
    lineOfBusiness: "real_estate",
    name: "Real Estate",
    description: "Property buying, selling, and leasing activities",
  },
  {
    taxCode: "TRN",
    lineOfBusiness: "transportation",
    name: "Transportation",
    description: "Moving people and goods through various modes of transport",
  },
  {
    taxCode: "AGR",
    lineOfBusiness: "agriculture",
    name: "Agriculture",
    description: "Crop production, livestock raising, and aquaculture activities",
  },
  {
    taxCode: "CON",
    lineOfBusiness: "construction",
    name: "Construction",
    description: "Building and infrastructure development projects",
  },
  {
    taxCode: "MIN",
    lineOfBusiness: "mining",
    name: "Mining",
    description: "Extraction of minerals and quarrying activities",
  },
  {
    taxCode: "UTL",
    lineOfBusiness: "utilities",
    name: "Utilities",
    description: "Providing essential public services such as water, electricity, and waste management",
  },
];

// Extract unique category keys for enum validation
const LINE_OF_BUSINESS_CATEGORIES = LINE_OF_BUSINESS.map(
  (l) => l.lineOfBusiness,
);

// Quick lookup by taxCode
const LINE_OF_BUSINESS_BY_TAX_CODE = Object.fromEntries(
  LINE_OF_BUSINESS.map((l) => [l.taxCode, l]),
);

// Quick lookup by category
const LINE_OF_BUSINESS_BY_CATEGORY = Object.fromEntries(
  LINE_OF_BUSINESS.map((l) => [l.lineOfBusiness, l]),
);

export {
  LINE_OF_BUSINESS,
  LINE_OF_BUSINESS_CATEGORIES,
  LINE_OF_BUSINESS_BY_TAX_CODE,
  LINE_OF_BUSINESS_BY_CATEGORY,
};
