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

const INDUSTRY_CATEGORIES = [
  {
    taxCode: 'RET',
    industryCategory: 'retail',
    name: 'Retail',
    description: 'Selling goods directly to consumers through physical stores or online platforms',
    icon: 'ShopOutlined',
  },
  {
    taxCode: 'WHL',
    industryCategory: 'wholesale',
    name: 'Wholesale',
    description: 'Selling goods in bulk to retailers and other businesses',
    icon: 'InboxOutlined',
  },
  {
    taxCode: 'FDS',
    industryCategory: 'food_service',
    name: 'Food Service',
    description: 'Preparing and serving food and beverages to customers',
    icon: 'CoffeeOutlined',
  },
  {
    taxCode: 'ACM',
    industryCategory: 'accommodation',
    name: 'Accommodation',
    description: 'Providing lodging and short-term stays for travelers',
    icon: 'ApartmentOutlined',
  },
  {
    taxCode: 'MFG',
    industryCategory: 'manufacturing',
    name: 'Manufacturing',
    description: 'Transforming raw materials into finished products through industrial processes',
    icon: 'BuildOutlined',
  },
  {
    taxCode: 'SVC',
    industryCategory: 'services',
    name: 'Services',
    description: 'Providing professional and personal services to individuals and businesses',
    icon: 'CustomerServiceOutlined',
  },
  {
    taxCode: 'FIN',
    industryCategory: 'financial',
    name: 'Financial',
    description: 'Banking, lending, and investment activities',
    icon: 'BankOutlined',
  },
  {
    taxCode: 'RES',
    industryCategory: 'real_estate',
    name: 'Real Estate',
    description: 'Property buying, selling, and leasing activities',
    icon: 'HomeOutlined',
  },
  {
    taxCode: 'TRN',
    industryCategory: 'transportation',
    name: 'Transportation',
    description: 'Moving people and goods through various modes of transport',
    icon: 'CarOutlined',
  },
  {
    taxCode: 'AGR',
    industryCategory: 'agriculture',
    name: 'Agriculture',
    description: 'Crop production, livestock raising, and aquaculture activities',
    icon: 'FieldTimeOutlined',
  },
  {
    taxCode: 'CON',
    industryCategory: 'construction',
    name: 'Construction',
    description: 'Building and infrastructure development projects',
    icon: 'ToolOutlined',
  },
  {
    taxCode: 'MIN',
    industryCategory: 'mining',
    name: 'Mining',
    description: 'Extraction of minerals and quarrying activities',
    icon: 'GoldOutlined',
  },
  {
    taxCode: 'UTL',
    industryCategory: 'utilities',
    name: 'Utilities',
    description:
      'Providing essential public services such as water, electricity, and waste management',
    icon: 'ThunderboltOutlined',
  },
];

// Extract unique category keys for enum validation
const INDUSTRY_CATEGORY_KEYS = INDUSTRY_CATEGORIES.map((l) => l.industryCategory);

// Quick lookup by taxCode
const INDUSTRY_CATEGORIES_BY_TAX_CODE = Object.fromEntries(
  INDUSTRY_CATEGORIES.map((l) => [l.taxCode, l])
);

// Quick lookup by category
const INDUSTRY_CATEGORIES_BY_CATEGORY = Object.fromEntries(
  INDUSTRY_CATEGORIES.map((l) => [l.industryCategory, l])
);

export {
  INDUSTRY_CATEGORIES,
  INDUSTRY_CATEGORY_KEYS,
  INDUSTRY_CATEGORIES_BY_TAX_CODE,
  INDUSTRY_CATEGORIES_BY_CATEGORY,
};
