const mongoose = require('mongoose')
const Lob = require('../models/Lob')
const Variable = require('../models/Variable')
const ClaimableDocument = require('../models/ClaimableDocument')
const PostRequirement = require('../models/PostRequirement')
const { variableFeeRules: REFERENCE_VARIABLE_FEE_RULES } = require('./comprehensiveFeeSeederReference')
const { getPostRequirements } = require('./seedPostRequirements')

// LOB-to-fee reference mappings using actual fee customIds from comprehensiveFeeSeederReference.js
// These are semantic mappings based on business logic

const LOB_VARIABLE_MAPPINGS = {
  // RETAIL
  'Sari-sari store': ['market-stall-fee'],
  'Convenience store': ['parking-space-fee'],
  'General merchandise': ['parking-space-fee', 'storage-area-fee'],
  'Hardware & construction supplies': ['parking-space-fee', 'storage-area-fee'],
  'Pharmacy / drugstore': ['parking-space-fee', 'storage-area-fee'],
  'Clothing & apparel': ['parking-space-fee', 'storage-area-fee'],
  'Electronics & gadgets': ['parking-space-fee', 'storage-area-fee'],
  'Auto parts & accessories': ['parking-space-fee', 'storage-area-fee'],
  'Fuel / gasoline station': ['parking-space-fee', 'storage-area-fee'],
  'Agricultural supplies': ['parking-space-fee', 'storage-area-fee'],

  // WHOLESALE
  'Agricultural raw materials': ['parking-space-fee', 'storage-area-fee'],
  'Food & beverages (wholesale)': ['parking-space-fee', 'storage-area-fee'],
  'Household goods (wholesale)': ['parking-space-fee', 'storage-area-fee'],
  'Industrial machinery & equipment': ['parking-space-fee', 'storage-area-fee'],
  'Construction materials (wholesale)': ['parking-space-fee', 'storage-area-fee'],
  'Chemicals & fertilizers': ['parking-space-fee', 'storage-area-fee'],

  // FOOD SERVICE
  'Restaurant / eatery': ['parking-space-fee', 'storage-area-fee'],
  'Catering services': ['parking-space-fee', 'storage-area-fee'],
  'Food cart / food stall': [],
  'Bakery / pastry shop': ['parking-space-fee', 'storage-area-fee'],
  'Coffee shop / milk tea': ['parking-space-fee', 'storage-area-fee'],
  'Bar / nightclub': ['parking-space-fee', 'storage-area-fee'],
  'Canteen / commissary': ['parking-space-fee', 'storage-area-fee'],

  // MANUFACTURING
  'Food processing': ['parking-space-fee', 'storage-area-fee'],
  'Garments & textiles': ['parking-space-fee', 'storage-area-fee'],
  'Furniture & woodworks': ['parking-space-fee', 'storage-area-fee'],
  'Metal fabrication': ['parking-space-fee', 'storage-area-fee'],
  'Plastics & rubber products': ['parking-space-fee', 'storage-area-fee'],
  'Printing & publishing': ['printing-machine-fee', 'parking-space-fee', 'storage-area-fee'],
  'Chemical products': ['parking-space-fee', 'storage-area-fee'],
  'Electronics assembly': ['parking-space-fee', 'storage-area-fee'],
  'Fireworks / pyrotechnics': ['parking-space-fee', 'storage-area-fee'],

  // SERVICES
  'Salon / barbershop': ['salon-barber-chair-fee', 'parking-space-fee'],
  'Laundry services': ['parking-space-fee', 'storage-area-fee'],
  'Repair shop (electronics, appliances)': ['parking-space-fee'],
  'Tutorial / review center': ['parking-space-fee'],
  'IT / BPO services': ['parking-space-fee'],
  'Legal services': ['parking-space-fee'],
  'Accounting / bookkeeping': ['parking-space-fee'],
  'Medical / dental clinic': ['parking-space-fee', 'storage-area-fee'],
  'Veterinary clinic': ['parking-space-fee', 'storage-area-fee'],
  'Security agency': ['parking-space-fee', 'storage-area-fee'],
  'Manpower / recruitment agency': ['parking-space-fee'],
  'Advertising services': ['parking-space-fee'],
  'School / educational institution': ['parking-space-fee'],
  'University / college': ['parking-space-fee'],
  'Hospital': ['hospital-bed-fee', 'parking-space-fee', 'storage-area-fee'],
  'Internet cafe': ['parking-space-fee'],

  // FINANCIAL
  'Lending / financing company': ['parking-space-fee', 'lending-classification-fee'],
  'Pawnshop': ['parking-space-fee', 'storage-area-fee', 'pawnshop-classification-fee'],
  'Money changer / remittance': ['parking-space-fee'],
  'Insurance agency': ['parking-space-fee'],
  'Cooperative (credit)': ['parking-space-fee'],
  'Microfinance institution': ['parking-space-fee'],
  'Bank': ['parking-space-fee', 'storage-area-fee', 'bank-classification-fee'],

  // REAL ESTATE
  'Real estate brokerage': ['parking-space-fee'],
  'Property leasing / rental': ['parking-space-fee'],
  'Subdivision developer': ['parking-space-fee', 'storage-area-fee', 'subdivision-lot-fee', 'subdivision-area-fee', 'subdivision-floor-area-fee'],
  'Boarding house / dormitory': ['boarding-capacity-fee', 'parking-space-fee'],
  'Apartment / condominium rental': ['apartment-unit-fee', 'parking-space-fee'],

  // TRANSPORTATION
  'Trucking / hauling': ['trucking-unit-fee'],
  'Passenger transport (jeepney, bus, UV express)': ['puv-unit-fee'],
  'School bus service': ['puv-unit-fee'],
  'Delivery / courier service': ['parking-space-fee'],
  'Freight forwarding': ['parking-space-fee'],
  'Warehouse / storage': ['cold-storage-equipment', 'storage-area-fee', 'cold-storage-fee', 'lumberyard-fee'],
  'Parking lot operation': ['parking-space-fee'],
  'Travel agency': ['parking-space-fee'],
  'Tour operator': ['parking-space-fee'],

  // AGRICULTURE
  'Crop farming': ['parking-space-fee', 'storage-area-fee'],
  'Livestock / poultry raising': ['parking-space-fee', 'storage-area-fee'],
  'Aquaculture / fishpond': ['parking-space-fee', 'storage-area-fee'],
  'Plant nursery': ['parking-space-fee', 'storage-area-fee'],
  'Rice / corn milling': ['parking-space-fee', 'storage-area-fee'],
  'Agricultural services (spraying, harvesting)': ['parking-space-fee', 'storage-area-fee'],

  // CONSTRUCTION
  'General contractor': ['parking-space-fee', 'storage-area-fee'],
  'Specialty trade contractor': ['parking-space-fee', 'storage-area-fee'],
  'Electrical installation': ['parking-space-fee', 'storage-area-fee'],
  'Plumbing & HVAC': ['parking-space-fee', 'storage-area-fee'],
  'Painting & finishing': ['parking-space-fee', 'storage-area-fee'],
  'Demolition services': ['parking-space-fee', 'storage-area-fee'],

  // MINING
  'Mining operations': ['parking-space-fee', 'storage-area-fee', 'mining-hectare-fee'],
  'Sand & gravel quarrying': ['parking-space-fee', 'storage-area-fee', 'mining-hectare-fee'],
  'Stone quarrying': ['parking-space-fee', 'storage-area-fee', 'mining-hectare-fee'],
  'Non-metallic mineral mining': ['parking-space-fee', 'storage-area-fee', 'mining-hectare-fee'],

  // UTILITIES
  'Water distribution': ['parking-space-fee', 'storage-area-fee'],
  'Electric power distribution': ['parking-space-fee', 'storage-area-fee'],
  'Waste collection & disposal': ['parking-space-fee', 'storage-area-fee'],
  'Sewerage services': ['parking-space-fee', 'storage-area-fee'],

  // EDUCATION
  'School / educational institution': ['parking-space-fee'],

  // TOURISM
  'Hotel / resort': ['hotel-room-fee', 'parking-space-fee', 'storage-area-fee'],
  'Tourist destination / attraction': ['parking-space-fee'],
}


// Post requirement mappings by specific LOB name
// Post requirements are external agency certificates, permits, and clearances that businesses need to claim after permit approval
// Uses _id values from seedPostRequirements.js
const LOB_POST_REQUIREMENT_MAPPINGS = {
  // RETAIL
  'Hardware & construction supplies': {
    required: ['ecc'],
    conditional: ['signage-permit']
  },
  'Pharmacy / drugstore': {
    required: ['fda-lto', 'pharmacist-in-charge-credential'],
    conditional: ['medical-device-retailer-lto', 'e-pharmacy-lto']
  },
  'Clothing & apparel': {
    required: [],
    conditional: ['signage-permit']
  },
  'Electronics & gadgets': {
    required: [],
    conditional: ['signage-permit']
  },
  'Auto parts & accessories': {
    required: [],
    conditional: ['signage-permit']
  },
  'Fuel / gasoline station': {
    required: [],
    conditional: ['signage-permit', 'doe-coc']
  },
  'Agricultural supplies': {
    required: ['fpa-lto'],
    conditional: ['signage-permit', 'bpi-license']
  },
  'Meat & poultry vendor': {
    required: [],
    conditional: ['weights-measures-seal', 'nmis-accreditation']
  },
  'Fish vendor': {
    required: [],
    conditional: ['weights-measures-seal', 'bfar-registration']
  },
  'Fruits & vegetables vendor': {
    required: [],
    conditional: ['weights-measures-seal']
  },
  'Rice retailer': {
    required: [],
    conditional: ['weights-measures-seal', 'nfa-accreditation']
  },
  'Grocery vendor': {
    required: [],
    conditional: ['weights-measures-seal']
  },
  'Dry goods vendor': {
    required: [],
    conditional: ['weights-measures-seal']
  },
  // WHOLESALE
  'Agricultural raw materials': {
    required: [],
    conditional: []
  },
  'Food & beverages (wholesale)': {
    required: ['fda-lto'],
    conditional: []
  },
  'Household goods (wholesale)': {
    required: [],
    conditional: []
  },
  'Industrial machinery & equipment': {
    required: ['ecc'],
    conditional: []
  },
  'Construction materials (wholesale)': {
    required: [],
    conditional: []
  },
  'Chemicals & fertilizers': {
    required: ['fpa-lto'],
    conditional: []
  },
  // FOOD SERVICE
  'Restaurant / eatery': {
    required: [],
    conditional: []
  },
  'Catering services': {
    required: [],
    conditional: []
  },
  'Food cart / food stall': {
    required: [],
    conditional: []
  },
  'Bakery / pastry shop': {
    required: [],
    conditional: ['fda-lto']
  },
  'Coffee shop / milk tea': {
    required: [],
    conditional: []
  },
  'Bar / nightclub': {
    required: [],
    conditional: ['liquor-license']
  },
  'Canteen / commissary': {
    required: [],
    conditional: []
  },
  // MANUFACTURING
  'Food processing': {
    required: ['fda-lto'],
    conditional: []
  },
  'Garments & textiles': {
    required: [],
    conditional: ['dti-gtido-registration', 'ecc']
  },
  'Furniture & woodworks': {
    required: [],
    conditional: ['denr-wood-processing-permit', 'pcab-license']
  },
  'Metal fabrication': {
    required: [],
    conditional: ['ecc', 'pcab-license']
  },
  'Plastics & rubber products': {
    required: [],
    conditional: ['ecc', 'denr-pto-air', 'denr-wastewater-discharge-permit']
  },
  'Printing & publishing': {
    required: [],
    conditional: ['nbdb-publisher-registration', 'bir-authority-to-print']
  },
  'Chemical products': {
    required: ['fda-lto'],
    conditional: ['denr-pmpin', 'ecc', 'denr-pto-air']
  },
  'Electronics assembly': {
    required: [],
    conditional: ['boi-registration', 'peza-registration', 'ecc']
  },
  'Fireworks / pyrotechnics': {
    required: [],
    conditional: ['pnp-feo-license']
  },
  // ACCOMMODATION
  'Hotel / resort': {
    required: [],
    conditional: ['dot-accreditation']
  },
  'Boarding house / dormitory': {
    required: [],
    conditional: []
  },
  'Apartment / condominium rental': {
    required: [],
    conditional: []
  },
  // REAL ESTATE
  'Real estate brokerage': {
    required: ['prc-broker-license', 'dhsud-broker-registration'],
    conditional: []
  },
  'Property leasing / rental': {
    required: [],
    conditional: []
  },
  'Subdivision developer': {
    required: ['dhsud-license-to-sell'],
    conditional: ['ecc', 'pcab-license']
  },
  // CONSTRUCTION
  'Demolition services': {
    required: ['demolition-permit'],
    conditional: ['pcab-license']
  },
  'General contractor': {
    required: [],
    conditional: ['pcab-license']
  },
  'Specialty trade contractor': {
    required: [],
    conditional: ['pcab-license']
  },
  'Electrical installation': {
    required: [],
    conditional: ['pcab-license', 'prc-electrical-license']
  },
  'Plumbing & HVAC': {
    required: [],
    conditional: ['pcab-license', 'prc-plumbing-license']
  },
  'Painting & finishing': {
    required: [],
    conditional: ['pcab-license']
  },
  // MINING
  'Mining operations': {
    required: [],
    conditional: ['mgb-exploration-permit', 'mgb-mineral-agreement', 'ecc']
  },
  'Sand & gravel quarrying': {
    required: [],
    conditional: ['mgb-exploration-permit', 'mgb-mineral-agreement', 'ecc']
  },
  'Stone quarrying': {
    required: [],
    conditional: ['mgb-exploration-permit', 'mgb-mineral-agreement', 'ecc']
  },
  'Non-metallic mineral mining': {
    required: [],
    conditional: ['mgb-exploration-permit', 'mgb-mineral-agreement', 'ecc']
  },
  // AGRICULTURE
  'Crop farming': {
    required: [],
    conditional: []
  },
  'Livestock / poultry raising': {
    required: [],
    conditional: ['bai-registration']
  },
  'Aquaculture / fishpond': {
    required: [],
    conditional: ['bfar-registration', 'ecc']
  },
  'Plant nursery': {
    required: [],
    conditional: ['bpi-accreditation']
  },
  'Rice / corn milling': {
    required: [],
    conditional: ['nfa-license', 'nfa-registration']
  },
  'Agricultural services (spraying, harvesting)': {
    required: [],
    conditional: ['fpa-commercial-applicator-license', 'caap-rpas-operator-certificate']
  },
  // UTILITIES
  'Water supply': {
    required: [],
    conditional: ['nwrb-water-permit', 'nwrb-cpc', 'ecc']
  },
  'Electric power distribution': {
    required: ['erc-cpcn'],
    conditional: ['congressional-franchise']
  },
  'Telecommunications provider': {
    required: ['ntc-cpcn'],
    conditional: ['congressional-franchise']
  },
  'Waste collection & disposal': {
    required: [],
    conditional: ['doh-operating-permit']
  },
  'Sewerage services': {
    required: [],
    conditional: ['llda-discharge-permit', 'denr-wastewater-discharge-permit']
  },
  // TRANSPORTATION
  'Trucking / hauling': {
    required: [],
    conditional: ['ltfrb-cpc', 'lto-vehicle-registration']
  },
  'Passenger transport (jeepney, bus, UV express)': {
    required: ['ltfrb-cpc'],
    conditional: ['lto-vehicle-registration']
  },
  'Delivery / courier service': {
    required: [],
    conditional: ['dict-pemedes-authority']
  },
  'Freight forwarding': {
    required: ['dti-freight-forwarding-accreditation'],
    conditional: []
  },
  'Warehouse / storage': {
    required: [],
    conditional: ['ecc']
  },
  'Parking lot operation': {
    required: [],
    conditional: []
  },
  // TOURISM
  'Travel agency': {
    required: [],
    conditional: ['dot-accreditation']
  },
  'Tour operator': {
    required: [],
    conditional: ['dot-accreditation']
  },
  'School bus service': {
    required: ['ltfrb-cpc', 'school-accreditation'],
    conditional: ['lto-vehicle-registration']
  },
  // SERVICES
  'Salon / barbershop': {
    required: [],
    conditional: []
  },
  'Laundry services': {
    required: [],
    conditional: ['denr-cnc']
  },
  'Repair shop (electronics, appliances)': {
    required: [],
    conditional: ['dti-accreditation']
  },
  'Tutorial / review center': {
    required: [],
    conditional: ['deped-permit']
  },
  'School / educational institution': {
    required: ['deped-permit'],
    conditional: ['deped-recognition']
  },
  'University / college': {
    required: ['ched-recognition-permit'],
    conditional: ['deped-permit']
  },
  'IT / BPO services': {
    required: [],
    conditional: ['peza-registration', 'boi-registration', 'npc-registration']
  },
  'Legal services': {
    required: [],
    conditional: ['prc-license']
  },
  'Accounting / bookkeeping': {
    required: [],
    conditional: ['prc-license']
  },
  'Medical / dental clinic': {
    required: [],
    conditional: ['doh-lto', 'philhealth-accreditation', 'denr-cnc']
  },
  'Hospital': {
    required: ['doh-lto', 'philhealth-accreditation'],
    conditional: ['doh-permit-to-construct', 'ecc']
  },
  'Veterinary clinic': {
    required: ['bai-registration'],
    conditional: ['pdea-s2-license', 'animal-welfare-seminar-certificate']
  },
  'Security agency': {
    required: ['pnp-sosia-license'],
    conditional: []
  },
  'Manpower / recruitment agency': {
    required: [],
    conditional: ['dole-registration-do174', 'dmw-license']
  },
  'Advertising services': {
    required: [],
    conditional: []
  },
  'Internet cafe': {
    required: [],
    conditional: []
  },
  // FINANCIAL
  'Bank': {
    required: ['bsp-certificate-authority'],
    conditional: []
  },
  'Lending / financing company': {
    required: ['sec-ca-lending'],
    conditional: ['amlc-registration']
  },
  'Pawnshop': {
    required: ['bsp-pawnshop-authority'],
    conditional: []
  },
  'Money changer / remittance': {
    required: [],
    conditional: []
  },
  'Insurance agency': {
    required: [],
    conditional: []
  },
  'Cooperative (credit)': {
    required: [],
    conditional: []
  },
  'Microfinance institution': {
    required: [],
    conditional: []
  },
}

// Essential commodity mappings - LOBs that deal with essential/prime commodities qualify for 50% tax rate
const LOB_ESSENTIAL_COMMODITY_MAPPINGS = {
  'Sari-sari store': true,
  'Grocery vendor': true,
  'Rice retailer': true,
  'Fish vendor': true,
  'Fruits & vegetables vendor': true,
  'Meat & poultry vendor': true,
  'Agricultural supplies': true,
  'Hardware & construction supplies': true,
}

// Document mappings by specific LOB name
// Documents are physical permits/certificates issued post-approval
// Only BPLO/BizClear-produced documents: Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
const LOB_DOCUMENT_MAPPINGS = {
  // RETAIL
  'Sari-sari store': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Convenience store': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
  'General merchandise': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Hardware & construction supplies': ['Fire Safety Inspection Certificate'],
  'Pharmacy / drugstore': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
  'Clothing & apparel': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Electronics & gadgets': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Auto parts & accessories': ['Fire Safety Inspection Certificate'],
  'Fuel / gasoline station': ['Fire Safety Inspection Certificate', 'Zoning Clearance'],
  'Agricultural supplies': ['Sanitary Permit'],
  'Meat & poultry vendor': ['Sanitary Permit'],
  'Fish vendor': ['Sanitary Permit'],
  'Fruits & vegetables vendor': ['Sanitary Permit'],
  'Rice retailer': ['Sanitary Permit'],
  'Grocery vendor': ['Sanitary Permit'],

  // WHOLESALE
  'Agricultural raw materials': [],
  'Food & beverages (wholesale)': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Household goods (wholesale)': [],
  'Industrial machinery & equipment': ['Fire Safety Inspection Certificate'],
  'Construction materials (wholesale)': ['Fire Safety Inspection Certificate'],
  'Chemicals & fertilizers': ['Fire Safety Inspection Certificate'],

  // FOOD SERVICE
  'Restaurant / eatery': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
  'Catering services': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Food cart / food stall': ['Sanitary Permit'],
  'Bakery / pastry shop': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Coffee shop / milk tea': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
  'Bar / nightclub': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
  'Canteen / commissary': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],

  // MANUFACTURING
  'Food processing': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Garments & textiles': ['Fire Safety Inspection Certificate'],
  'Furniture & woodworks': ['Fire Safety Inspection Certificate'],
  'Metal fabrication': ['Fire Safety Inspection Certificate'],
  'Plastics & rubber products': ['Fire Safety Inspection Certificate'],
  'Printing & publishing': ['Fire Safety Inspection Certificate'],
  'Chemical products': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Electronics assembly': ['Fire Safety Inspection Certificate'],
  'Fireworks / pyrotechnics': ['Fire Safety Inspection Certificate'],

  // SERVICES
  'Salon / barbershop': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Laundry services': ['Fire Safety Inspection Certificate'],
  'Repair shop (electronics, appliances)': ['Fire Safety Inspection Certificate'],
  'Tutorial / review center': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'School / educational institution': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
  'University / college': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
  'IT / BPO services': ['Fire Safety Inspection Certificate'],
  'Legal services': [],
  'Accounting / bookkeeping': [],
  'Medical / dental clinic': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Hospital': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Veterinary clinic': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Security agency': ['Fire Safety Inspection Certificate'],
  'Manpower / recruitment agency': ['Fire Safety Inspection Certificate'],
  'Advertising services': [],
  'Internet cafe': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],

  // FINANCIAL
  'Bank': ['Fire Safety Inspection Certificate'],
  'Lending / financing company': ['Fire Safety Inspection Certificate'],
  'Pawnshop': ['Fire Safety Inspection Certificate'],
  'Money changer / remittance': ['Fire Safety Inspection Certificate'],
  'Insurance agency': ['Fire Safety Inspection Certificate'],
  'Cooperative (credit)': [],
  'Microfinance institution': ['Fire Safety Inspection Certificate'],
  'Holding company': [],
  'Fund management': ['Fire Safety Inspection Certificate'],

  // REAL ESTATE
  'Real estate brokerage': [],
  'Property leasing / rental': [],
  'Subdivision developer': ['Fire Safety Inspection Certificate'],

  // ACCOMMODATION
  'Hotel / resort': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Boarding house / dormitory': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],
  'Apartment / condominium rental': ['Fire Safety Inspection Certificate', 'Sanitary Permit'],

  // TRANSPORTATION
  'Trucking / hauling': ['Fire Safety Inspection Certificate'],
  'Passenger transport (jeepney, bus, UV express)': ['Fire Safety Inspection Certificate'],
  'Delivery / courier service': ['Fire Safety Inspection Certificate'],
  'Freight forwarding': ['Fire Safety Inspection Certificate'],
  'Warehouse / storage': ['Fire Safety Inspection Certificate'],
  'Parking lot operation': ['Fire Safety Inspection Certificate'],
  'Travel agency': [],
  'Tour operator': [],

  // AGRICULTURE
  'Crop farming': [],
  'Livestock / poultry raising': ['Sanitary Permit'],
  'Aquaculture / fishpond': [],
  'Plant nursery': [],
  'Rice / corn milling': ['Fire Safety Inspection Certificate'],
  'Agricultural services (spraying, harvesting)': [],

  // CONSTRUCTION
  'General contractor': ['Fire Safety Inspection Certificate'],
  'Specialty trade contractor': ['Fire Safety Inspection Certificate'],
  'Electrical installation': ['Fire Safety Inspection Certificate'],
  'Plumbing & HVAC': ['Fire Safety Inspection Certificate'],
  'Painting & finishing': ['Fire Safety Inspection Certificate'],
  'Demolition services': ['Fire Safety Inspection Certificate'],

  // MINING
  'Mining operations': ['Fire Safety Inspection Certificate'],

  // UTILITIES
  'Water supply': ['Fire Safety Inspection Certificate'],
  'Electric power distribution': ['Fire Safety Inspection Certificate'],
  'Telecommunications provider': ['Fire Safety Inspection Certificate'],

  // EDUCATION
  'School / educational institution': ['Fire Safety Inspection Certificate', 'Sanitary Permit', 'Zoning Clearance'],
};

// Notes mappings by specific LOB name
// Notes provide helpful administrative context for each LOB type
const LOB_NOTES_MAPPINGS = {
  // RETAIL
  'Sari-sari store': 'Small neighborhood retail. Typically home-based with minimal capital. Check for actual inventory vs declared capital.',
  'Convenience store': '24/7 operations. Verify business permit signage and fire safety compliance. May require CCTV for security.',
  'General merchandise': 'Medium to large retail. Verify storage capacity matches declared inventory. Check for proper shelving and display.',
  'Hardware & construction supplies': 'Specialized retail. Verify proper storage of hazardous materials. Check for MSDS documentation.',
  'Pharmacy / drugstore': 'Highly regulated. Verify FDA LTO, pharmacist license, and drug storage conditions. Schedule quarterly inspections.',
  'Clothing & apparel': 'Fashion retail. Verify fitting room facilities and proper display racks. Check for seasonal inventory variations.',
  'Electronics & gadgets': 'Technology retail. Verify warranty documentation and after-sales service capability. Check for proper display security.',
  'Auto parts & accessories': 'Automotive retail. Verify proper storage of flammable materials. Check for catalog availability and parts sourcing.',
  'Fuel / gasoline station': 'Highly regulated. Verify DENR permit, fire safety certification, and underground tank compliance. Monthly safety inspections required.',
  'Agricultural supplies': 'Retail of farming inputs. Verify proper storage of chemicals/fertilizers. Check for expired inventory.',
  'Meat & poultry vendor': 'Market stall. Verify health permit and cold chain compliance. Check for proper meat handling and storage.',
  'Fish vendor': 'Market stall. Verify health permit and ice supply. Check for proper fish handling and display.',
  'Fruits & vegetables vendor': 'Market stall. Verify health permit. Check for proper produce handling and display.',
  'Rice retailer': 'Staple food retail. Verify NFA registration if applicable. Check for proper storage and pest control.',
  'Grocery vendor': 'Market stall. Verify health permit. Check for proper food handling and storage.',
  'Dry goods vendor': 'Market stall. Verify proper storage conditions. Check for inventory organization.',

  // WHOLESALE
  'Agricultural raw materials': 'Bulk distribution. Verify cold storage facilities if perishable. Check for proper handling of bulk materials.',
  'Food & beverages (wholesale)': 'Bulk food distribution. Verify FDA registration and proper storage. Check for expiration date tracking.',
  'Household goods (wholesale)': 'Bulk distribution. Verify warehouse capacity and proper shelving. Check for inventory management system.',
  'Industrial machinery & equipment': 'Heavy equipment. Verify proper handling equipment and storage. Check for maintenance documentation.',
  'Construction materials (wholesale)': 'Bulk building materials. Verify storage capacity and proper handling. Check for inventory tracking.',
  'Chemicals & fertilizers': 'Hazardous materials. Verify MSDS documentation and proper storage. Check for spill containment measures.',

  // FOOD SERVICE
  'Restaurant / eatery': 'Full-service dining. Verify kitchen facilities, seating capacity, and health permit. Check for grease trap installation.',
  'Catering services': 'Food preparation for events. Verify mobile kitchen permits and food transport equipment. Check for event booking records.',
  'Food cart / food stall': 'Mobile/small-scale. Verify health permit and food handling certification. Check for proper sanitation facilities.',
  'Bakery / pastry shop': 'Food production. Verify health permit and baking equipment. Check for proper storage of ingredients and finished goods.',
  'Coffee shop / milk tea': 'Beverage-focused. Verify health permit and equipment certification. Check for seating capacity if applicable.',
  'Bar / nightclub': 'Alcohol-serving. Verify liquor license, entertainment permit, and security personnel. Check for CCTV installation.',
  'Canteen / commissary': 'Institutional food service. Verify health permit and capacity for client institution. Check for meal planning records.',

  // MANUFACTURING
  'Food processing': 'Food manufacturing. Verify FDA LTO and strict hygiene standards. Check for HACCP certification and quality control.',
  'Garments & textiles': 'Textile manufacturing. Verify equipment certification and worker safety. Check for export documentation if applicable.',
  'Furniture & woodworks': 'Wood processing. Verify environmental permits for wood sourcing. Check for dust control and fire safety.',
  'Metal fabrication': 'Metalworking. Verify environmental compliance and worker safety. Check for proper ventilation and waste disposal.',
  'Plastics & rubber products': 'Chemical manufacturing. Verify environmental compliance and proper ventilation. Check for waste treatment facilities.',
  'Printing & publishing': 'Media production. Verify business permit for published materials. Check for copyright compliance.',
  'Chemical products': 'Chemical manufacturing. Verify strict environmental and safety regulations. Check for hazardous material handling.',
  'Electronics assembly': 'Technology manufacturing. Verify ESD protection and quality control. Check for export zone benefits if applicable.',
  'Fireworks / pyrotechnics': 'Highly regulated. Verify special permits and safety measures. Check for storage distance from residential areas.',

  // SERVICES
  'Salon / barbershop': 'Personal care. Verify health permit and practitioner licenses. Check for proper sanitation and equipment sterilization.',
  'Laundry services': 'Textile care. Verify water usage compliance and environmental permits. Check for proper chemical storage.',
  'Repair shop (electronics, appliances)': 'Technical repair. Verify proper tools and hazardous waste handling. Check for spare parts inventory.',
  'Tutorial / review center': 'Educational support. Verify permits from education authorities. Check for curriculum and instructor credentials.',
  'School / educational institution': 'Formal education. Verify comprehensive permits from DepEd/CHED. Check for facility safety and fire compliance.',
  'University / college': 'Higher education. Verify CHED recognition and comprehensive compliance. Check for program accreditation.',
  'IT / BPO services': 'Technology services. Verify business permit and data security measures. Check for economic zone incentives if applicable.',
  'Legal services': 'Professional services. Verify PRC license and bar accreditation. Check for office documentation and client records.',
  'Accounting / bookkeeping': 'Financial services. Verify PRC license and tax compliance knowledge. Check for client confidentiality measures.',
  'Medical / dental clinic': 'Healthcare services. Verify DOH licensing and professional credentials. Check for medical equipment certification.',
  'Hospital': 'Comprehensive healthcare. Verify extensive DOH and PhilHealth accreditation. Check for emergency facilities and staffing.',
  'Veterinary clinic': 'Animal healthcare. Verify PAI registration and specialized facilities. Check for proper animal handling and storage.',
  'Security agency': 'Private security. Verify PNP-SOSIA licensing and guard training. Check for firearm permits if applicable.',
  'Manpower / recruitment agency': 'Employment services. Verify DOLE and DMW registration. Check for placement records and client contracts.',
  'Advertising services': 'Marketing and promotional. Verify business permit and client contracts. Check for creative portfolio.',
  'Internet cafe': 'Technology rental. Verify business permit and equipment inventory. Check for internet bandwidth and licensing.',

  // FINANCIAL
  'Bank': 'Full banking. Verify BSP supervision and comprehensive compliance. Check for deposit insurance and audit reports.',
  'Lending / financing company': 'Financial lending. Verify SEC registration and AMLC compliance. Check for interest rate disclosures.',
  'Pawnshop': 'Collateral-based lending. Verify BSP authority and jewelry appraisal licenses. Check for secure storage facilities.',
  'Money changer / remittance': 'Currency exchange/transfer. Verify BSP registration. Check for transaction monitoring and reporting.',
  'Insurance agency': 'Insurance distribution. Verify IC licensing. Check for product authorization and client records.',
  'Cooperative (credit)': 'Member-owned financial. Verify CDA registration. Check for member equity and dividend records.',
  'Microfinance institution': 'Small-scale lending. Verify registration and target market compliance. Check for interest rate caps.',
  'Holding company': 'Investment management. Verify SEC registration. Check for portfolio holdings and financial statements.',
  'Fund management': 'Investment fund management. Verify SEC registration. Check for fund performance and compliance reports.',

  // REAL ESTATE
  'Real estate brokerage': 'Property mediation. Verify PRC license and DHSUD registration. Check for commission structures and client contracts.',
  'Property leasing / rental': 'Property rental. Verify business permit and lease agreements. Check for property maintenance records.',
  'Subdivision developer': 'Large-scale housing. Verify DHSUD license to sell and comprehensive permits. Check for development progress and sales.',

  // ACCOMMODATION
  'Hotel / resort': 'Hospitality establishment. Verify DOT accreditation and comprehensive safety permits. Check for room inventory and amenities.',
  'Boarding house / dormitory': 'Transit accommodation. Verify basic safety and sanitation permits. Check for occupancy limits and facilities.',
  'Apartment / condominium rental': 'Long-term residential rental. Verify business permit and lease agreements. Check for property maintenance.',

  // TRANSPORTATION
  'Trucking / hauling': 'Goods transport. Verify LTFRB CPC and LTO vehicle registration. Check for driver licenses and cargo insurance.',
  'Passenger transport (jeepney, bus, UV express)': 'Public transport. Verify LTFRB CPC and LTO registration. Check for route franchise and vehicle inspection.',
  'Delivery / courier service': 'Package delivery. Verify business permit and vehicle registration. Check for service coverage and tracking.',
  'Freight forwarding': 'Cargo logistics. Verify DTI accreditation. Check for customs broker partnerships and warehouse access.',
  'Warehouse / storage': 'Storage facilities. Verify proper storage conditions and security. Check for cold storage if applicable.',
  'Parking lot operation': 'Vehicle parking. Verify business permit and land use clearance. Check for security measures and capacity.',
  'Travel agency': 'Travel booking. Verify DOT accreditation. Check for airline partnerships and client booking records.',
  'Tour operator': 'Tour organization. Verify DOT accreditation. Check for tour packages and insurance coverage.',

  // AGRICULTURE
  'Crop farming': 'Agricultural production. Verify land use permits and irrigation access. Check for crop variety and yield records.',
  'Livestock / poultry raising': 'Animal farming. Verify BAi registration and environmental compliance. Check for animal health records and waste management.',
  'Aquaculture / fishpond': 'Fish farming. Verify BFAR registration and water resource permits. Check for water quality and feeding practices.',
  'Plant nursery': 'Plant cultivation. Verify BPI accreditation for certain species. Check for plant health certification and sourcing.',
  'Rice / corn milling': 'Grain processing. Verify NFA registration and food safety compliance. Check for equipment certification and output capacity.',
  'Agricultural services (spraying, harvesting)': 'Farm support services. Verify FPA licenses for chemical application. Check for equipment certification and safety measures.',

  // CONSTRUCTION
  'General contractor': 'Overall construction management. Verify PCAB license. Check for project portfolio and safety record.',
  'Specialty trade contractor': 'Specialized construction. Verify PCAB license and trade certification. Check for equipment and workforce.',
  'Electrical installation': 'Electrical work. Verify PCAB license and PRC electrical license. Check for compliance with electrical code.',
  'Plumbing & HVAC': 'Mechanical systems. Verify PCAB license and PRC plumbing license. Check for compliance with mechanical code.',
  'Painting & finishing': 'Cosmetic construction. Verify business permit. Check for safety equipment and proper ventilation.',
  'Demolition services': 'Structure removal. Verify demolition permits and PCAB license. Check for safety measures and waste disposal.',

  // MINING
  'Sand & gravel quarrying': 'Small-scale mining. Verify MGB permits and environmental compliance. Check for rehabilitation plan.',
  'Stone quarrying': 'Rock extraction. Verify MGB permits and environmental compliance. Check for blasting permits and safety measures.',
  'Non-metallic mineral mining': 'Mineral extraction. Verify MGB permits and environmental compliance. Check for processing facilities.',

  // UTILITIES
  'Water distribution': 'Water supply. Verify NWRB permits and environmental compliance. Check for water quality testing and infrastructure.',
  'Electric power distribution': 'Power distribution. Verify ERC CPCN and congressional franchise. Check for grid reliability and maintenance.',
  'Waste collection & disposal': 'Solid waste management. Verify DOH permits and environmental compliance. Check for landfill access and recycling.',
  'Sewerage services': 'Wastewater treatment. Verify LLADA permits and environmental compliance. Check for treatment capacity and discharge quality.',
}

// Helper function to map variable customIds to IDs
async function mapVariableCustomIdsToIds(customIds) {
  if (!customIds || customIds.length === 0) return []

  const variables = await Variable.find({ customId: { $in: customIds }, isActive: true })
  const customIdToIdMap = variables.reduce((acc, variable) => {
    acc[variable.customId] = variable._id
    return acc
  }, {})

  return customIds.map(customId => customIdToIdMap[customId]).filter(id => id)
}

// Helper function to map license names to IDs
async function mapLicenseNamesToIds(licenseNames) {
  if (!licenseNames || licenseNames.length === 0) return []

  // For now, return the license names as-is since we don't have a License model
  // This will need to be updated when the License model is implemented
  return licenseNames
}

// Helper function to map document names to IDs
async function mapDocumentNamesToIds(documentNames) {
  if (!documentNames || documentNames.length === 0) return []

  // Fetch all active documents and match manually (due to encryption)
  const documents = await ClaimableDocument.find({ isActive: true })
  const nameToIdMap = documents.reduce((acc, doc) => {
    acc[doc.name] = doc._id
    return acc
  }, {})

  const mappedIds = documentNames.map(name => nameToIdMap[name]).filter(id => id)
  return mappedIds
}

// Helper function to map post requirement codes to ObjectIds
async function mapPostRequirementCodesToIds(postRequirementCodes) {
  if (!postRequirementCodes || postRequirementCodes.length === 0) return []

  // Fetch all active post requirements and match by code
  const postRequirements = await PostRequirement.find({ isActive: true })
  const codeToIdMap = postRequirements.reduce((acc, pr) => {
    acc[pr.code] = pr._id
    return acc
  }, {})

  const mappedIds = postRequirementCodes.map(code => codeToIdMap[code]).filter(id => id)
  return mappedIds
}

// Helper function to map post requirement IDs to names
async function mapPostRequirementIdsToNames(postRequirementIds) {
  if (!postRequirementIds || postRequirementIds.length === 0) return []

  const { getPostRequirements } = require('./seedPostRequirements')
  const allPostRequirements = getPostRequirements()
  const idToNameMap = allPostRequirements.reduce((acc, pr) => {
    acc[pr._id] = pr.name
    return acc
  }, {})

  return postRequirementIds.map(id => idToNameMap[id]).filter(name => name)
}

async function seed() {
  console.log('Starting LOB seed...')
  
  // Read LOB data from frontend constants (we'll need to inline this since backend can't import frontend)
  const LINE_OF_BUSINESS = [
    {
      taxCode: 'RET',
      lineOfBusiness: 'retail',
      detailedLines: [
        { name: 'Sari-sari store', description: 'Small neighborhood store selling daily essentials' },
        { name: 'Convenience store', description: '24/7 store selling ready-to-eat food, drinks, and basic supplies' },
        { name: 'General merchandise', description: 'Store selling various household items and goods' },
        { name: 'Hardware & construction supplies', description: 'Store selling tools, building materials, and home improvement supplies' },
        { name: 'Pharmacy / drugstore', description: 'Store selling medicines, health products, and medical supplies' },
        { name: 'Clothing & apparel', description: 'Store selling clothes, shoes, and fashion accessories' },
        { name: 'Electronics & gadgets', description: 'Store selling electronic devices, phones, and tech accessories' },
        { name: 'Auto parts & accessories', description: 'Store selling vehicle parts, tools, and automotive supplies' },
        { name: 'Fuel / gasoline station', description: 'Station selling fuel, oil, and vehicle services' },
        { name: 'Agricultural supplies', description: 'Store selling seeds, fertilizers, and farming equipment' },
        { name: 'Meat & poultry vendor', description: 'Market stall selling fresh meat and poultry products' },
        { name: 'Fish vendor', description: 'Market stall selling fresh fish and seafood' },
        { name: 'Fruits & vegetables vendor', description: 'Market stall selling fresh produce' },
        { name: 'Rice retailer', description: 'Market stall selling rice and cereals' },
        { name: 'Grocery vendor', description: 'Market stall selling grocery items' },
        { name: 'Dry goods vendor', description: 'Market stall selling dry goods and household items' },
      ],
    },
    {
      taxCode: 'WHL',
      lineOfBusiness: 'wholesale',
      detailedLines: [
        { name: 'Agricultural raw materials', description: 'Bulk selling of crops, grains, and farm produce' },
        { name: 'Food & beverages (wholesale)', description: 'Bulk distribution of food and drink products to retailers' },
        { name: 'Household goods (wholesale)', description: 'Bulk selling of home items and daily necessities' },
        { name: 'Industrial machinery & equipment', description: 'Bulk selling of factory and industrial equipment' },
        { name: 'Construction materials (wholesale)', description: 'Bulk distribution of building supplies and materials' },
        { name: 'Chemicals & fertilizers', description: 'Bulk selling of industrial chemicals and farming inputs' },
      ],
    },
    {
      taxCode: 'FDS',
      lineOfBusiness: 'food_service',
      detailedLines: [
        { name: 'Restaurant / eatery', description: 'Establishment serving prepared meals and drinks on-site' },
        { name: 'Catering services', description: 'Food preparation and service for events and gatherings' },
        { name: 'Food cart / food stall', description: 'Mobile or small stall selling street food and snacks' },
        { name: 'Bakery / pastry shop', description: 'Shop selling bread, pastries, cakes, and baked goods' },
        { name: 'Coffee shop / milk tea', description: 'Cafe serving coffee, tea, and light refreshments' },
        { name: 'Bar / nightclub', description: 'Establishment serving alcoholic drinks and entertainment' },
        { name: 'Canteen / commissary', description: 'Food service for schools, offices, or institutions' },
      ],
    },
    {
      taxCode: 'ACM',
      lineOfBusiness: 'accommodation',
      detailedLines: [
        { name: 'Hotel / resort', description: 'Establishment providing lodging and accommodation services' },
        { name: 'Boarding house / dormitory', description: 'Providing temporary lodging and accommodation' },
        { name: 'Apartment / condominium rental', description: 'Renting out apartment units and condominiums' },
      ],
    },
    {
      taxCode: 'MFG',
      lineOfBusiness: 'manufacturing',
      detailedLines: [
        { name: 'Food processing', description: 'Processing raw ingredients into packaged food products' },
        { name: 'Garments & textiles', description: 'Producing clothing, fabrics, and textile products' },
        { name: 'Furniture & woodworks', description: 'Manufacturing furniture and wooden products' },
        { name: 'Metal fabrication', description: 'Creating metal products through cutting, welding, and assembly' },
        { name: 'Plastics & rubber products', description: 'Producing plastic items and rubber goods' },
        { name: 'Printing & publishing', description: 'Printing books, materials, and published content' },
        { name: 'Chemical products', description: 'Manufacturing industrial and consumer chemicals' },
        { name: 'Electronics assembly', description: 'Assembling electronic components and devices' },
        { name: 'Fireworks / pyrotechnics', description: 'Manufacturing fireworks and explosive devices' },
      ],
    },
    {
      taxCode: 'SVC',
      lineOfBusiness: 'services',
      detailedLines: [
        { name: 'Salon / barbershop', description: 'Hair cutting, styling, and beauty services' },
        { name: 'Laundry services', description: 'Washing, dry cleaning, and garment care services' },
        { name: 'Repair shop (electronics, appliances)', description: 'Repairing and maintaining electronic devices and appliances' },
        { name: 'Tutorial / review center', description: 'Educational support and tutoring services' },
        { name: 'School / educational institution', description: 'Primary, secondary, and tertiary educational institutions' },
        { name: 'University / college', description: 'Higher education institutions offering degree programs' },
        { name: 'IT / BPO services', description: 'Information technology and business process outsourcing' },
        { name: 'Legal services', description: 'Legal advice, documentation, and representation' },
        { name: 'Accounting / bookkeeping', description: 'Financial record-keeping and tax preparation services' },
        { name: 'Medical / dental clinic', description: 'Healthcare and dental treatment services' },
        { name: 'Hospital', description: 'Medical institution providing inpatient and outpatient healthcare services' },
        { name: 'Veterinary clinic', description: 'Animal health care and veterinary services' },
        { name: 'Security agency', description: 'Providing security personnel and protection services' },
        { name: 'Manpower / recruitment agency', description: 'Staffing and employment placement services' },
        { name: 'Advertising services', description: 'Marketing, branding, and promotional services' },
        { name: 'Internet cafe', description: 'Internet access and computer rental services' },
      ],
    },
    {
      taxCode: 'FIN',
      lineOfBusiness: 'financial',
      detailedLines: [
        { name: 'Bank', description: 'Commercial bank, thrift bank, rural bank, or universal bank accepting deposits and extending credit' },
        { name: 'Lending / financing company', description: 'Providing loans and financial assistance to individuals and businesses' },
        { name: 'Pawnshop', description: 'Lending money in exchange for collateral items' },
        { name: 'Money changer / remittance', description: 'Currency exchange and money transfer services' },
        { name: 'Insurance agency', description: 'Selling insurance policies and risk protection products' },
        { name: 'Cooperative (credit)', description: 'Member-owned financial cooperative providing loans and savings' },
        { name: 'Microfinance institution', description: 'Providing small loans and financial services to low-income individuals' },
        { name: 'Holding company', description: 'Investment holding company managing portfolio of investments' },
        { name: 'Fund management', description: 'Investment fund management and trust services' },
      ],
    },
    {
      taxCode: 'RES',
      lineOfBusiness: 'real_estate',
      detailedLines: [
        { name: 'Real estate brokerage', description: 'Buying, selling, and mediating property transactions' },
        { name: 'Property leasing / rental', description: 'Renting out properties to tenants' },
        { name: 'Subdivision developer', description: 'Developing residential subdivisions and housing projects' },
      ],
    },
    {
      taxCode: 'TRN',
      lineOfBusiness: 'transportation',
      detailedLines: [
        { name: 'Trucking / hauling', description: 'Transporting goods using trucks and heavy vehicles' },
        { name: 'Passenger transport (jeepney, bus, UV express)', description: 'Public transportation services for passengers' },
        { name: 'Delivery / courier service', description: 'Package delivery and courier services' },
        { name: 'Freight forwarding', description: 'Coordinating and managing cargo shipments' },
        { name: 'Warehouse / storage', description: 'Providing storage facilities for goods and inventory' },
        { name: 'Parking lot operation', description: 'Operating parking facilities for vehicles' },
        { name: 'Travel agency', description: 'Booking flights, hotels, and travel arrangements for clients' },
        { name: 'Tour operator', description: 'Organizing and conducting tour packages and itineraries' },
      ],
    },
    {
      taxCode: 'AGR',
      lineOfBusiness: 'agriculture',
      detailedLines: [
        { name: 'Crop farming', description: 'Growing and harvesting crops and agricultural produce' },
        { name: 'Livestock / poultry raising', description: 'Raising animals for meat, eggs, and dairy production' },
        { name: 'Aquaculture / fishpond', description: 'Breeding and harvesting fish and aquatic organisms' },
        { name: 'Plant nursery', description: 'Growing and selling plants, seedlings, and flowers' },
        { name: 'Rice / corn milling', description: 'Processing rice and corn into consumable products' },
        { name: 'Agricultural services (spraying, harvesting)', description: 'Providing farming services like crop spraying and harvesting' },
      ],
    },
    {
      taxCode: 'CON',
      lineOfBusiness: 'construction',
      detailedLines: [
        { name: 'General contractor', description: 'Overall management and execution of construction projects' },
        { name: 'Specialty trade contractor', description: 'Specialized construction work like electrical, plumbing, or HVAC' },
        { name: 'Electrical installation', description: 'Installing electrical systems and wiring in buildings' },
        { name: 'Plumbing & HVAC', description: 'Installing water systems, pipes, and air conditioning' },
        { name: 'Painting & finishing', description: 'Applying paint and finishing touches to structures' },
        { name: 'Demolition services', description: 'Tearing down and removing structures and buildings' },
      ],
    },
    {
      taxCode: 'MIN',
      lineOfBusiness: 'mining',
      detailedLines: [
        { name: 'Sand & gravel quarrying', description: 'Extracting sand and gravel for construction use' },
        { name: 'Stone quarrying', description: 'Extracting stones and rocks for building materials' },
        { name: 'Non-metallic mineral mining', description: 'Mining non-metallic minerals and earth resources' },
      ],
    },
    {
      taxCode: 'UTL',
      lineOfBusiness: 'utilities',
      detailedLines: [
        { name: 'Water distribution', description: 'Providing water supply and distribution services' },
        { name: 'Electric power distribution', description: 'Distributing electricity to consumers and businesses' },
        { name: 'Waste collection & disposal', description: 'Collecting and disposing of solid waste and garbage' },
        { name: 'Sewerage services', description: 'Managing sewage and wastewater treatment systems' },
      ],
    },
  ]

  let createdCount = 0
  let updatedCount = 0
  let lineIndex = 1

  for (const category of LINE_OF_BUSINESS) {
    for (const detailedLine of category.detailedLines) {
      const lobName = detailedLine.name
      const lobDescription = detailedLine.description
      const uniqueCode = `${category.taxCode}-${String(lineIndex).padStart(3, '0')}`

      // Map variable customIds to IDs
      const variableCustomIds = LOB_VARIABLE_MAPPINGS[lobName] || []
      const variables = await mapVariableCustomIdsToIds(variableCustomIds)

      // Map license names to IDs (deprecated - now using postRequirements instead)
      const requiredLicenses = []
      const optionalLicenses = []

      // Map document names to IDs
      const documentNames = LOB_DOCUMENT_MAPPINGS[lobName] || []
      const documents = await mapDocumentNamesToIds(documentNames)

      // Map post requirement codes to ObjectIds (new structure with required and conditional)
      const postRequirementMapping = LOB_POST_REQUIREMENT_MAPPINGS[lobName] || { required: [], conditional: [] }
      const postRequirements = {
        required: await mapPostRequirementCodesToIds(postRequirementMapping.required),
        conditional: await mapPostRequirementCodesToIds(postRequirementMapping.conditional),
      }

      // Map essential commodity flag
      const essentialCommodity = LOB_ESSENTIAL_COMMODITY_MAPPINGS[lobName] || false

      // Map notes
      const notes = LOB_NOTES_MAPPINGS[lobName] || ''

      // Check if LOB exists by code (unique, not encrypted)
      const existingLob = await Lob.findOne({ code: uniqueCode })

      if (existingLob) {
        // Update all fields except code (code is unique and immutable)
        const updateData = {
          description: lobDescription,
          notes,
          lineOfBusiness: category.lineOfBusiness,
          variables,
          documents,
          postRequirements,
          essentialCommodity,
          status: 'active',
        }
        
        // Debug logging for first few LOBs
        if (updatedCount < 5) {
          console.log(`Updating ${lobName} (${uniqueCode}):`)
          console.log(`  documents: ${documents.length} IDs`)
        }
        
        await Lob.updateOne(
          { _id: existingLob._id },
          { $set: updateData }
        )
        updatedCount++
      } else {
        // Create new LOB
        await Lob.create({
          code: uniqueCode,
          name: lobName,
          description: lobDescription,
          notes,
          category: category.taxCode,
          lineOfBusiness: category.lineOfBusiness,
          variables,
          documents,
          postRequirements,
          essentialCommodity,
          status: 'active',
        })
        createdCount++
      }

      lineIndex++
    }
  }

  console.log(`LOB seed completed: ${createdCount} created, ${updatedCount} updated`)
  return { created: createdCount, updated: updatedCount }
}

async function seedIfEmpty() {
  const count = await Lob.countDocuments()
  if (count === 0) {
    console.log('No LOBs found, running seed...')
    const result = await seed()
    return { seeded: true, count: result.created, updated: result.updated }
  } else {
    console.log(`LOBs already exist (${count} records), running update to sync variables...`)
    const result = await seed()
    return { seeded: false, updated: result.updated, existing: count }
  }
}

module.exports = { seed, seedIfEmpty, LOB_POST_REQUIREMENT_MAPPINGS }
