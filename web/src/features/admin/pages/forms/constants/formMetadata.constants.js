import {
  UNIFIED_BUSINESS_PERMIT_SECTIONS,
  COOPERATIVE_PERMIT_SECTIONS,
  ASSOCIATION_FOUNDATION_PERMIT_SECTIONS,
  CHAINSAW_PERMIT_SECTIONS,
  FIRECRACKERS_STALLHOLDERS_PERMIT_SECTIONS,
  BAZAAR_FESTIVAL_VENDORS_PERMIT_SECTIONS,
  PEDDLERS_PERMIT_SECTIONS,
  PROMOTIONS_EXHIBITORS_PERMIT_SECTIONS,
  CEMETERY_STALLHOLDERS_PERMIT_SECTIONS,
  FISH_TRAP_FISH_PEN_PERMIT_SECTIONS,
  FISH_POND_PERMIT_SECTIONS,
} from './formDefinitions.constants'

// Standardized form metadata - single source of truth
export const FORM_METADATA = {
  'unified-business-permit': {
    id: 'unified-business-permit',
    name: 'Unified Business Permit Form',
    description: 'For businesses with ongoing operations that are valid for one calendar year and require annual renewal. This permit is for establishments that operate year-round such as retail stores, restaurants, service providers, and other permanent businesses.',
    sections: UNIFIED_BUSINESS_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1', 'uf-2', 'uf-4'],
    notes: '',
    isActive: true,
  },
  'cooperative-permit': {
    id: 'cooperative-permit',
    name: 'Cooperative Permit',
    description: 'For cooperatives (registered with CDA) applying for business permit renewal or new registration. Covers agricultural, consumer, marketing, service, and multi-purpose cooperatives operating within the city.',
    sections: COOPERATIVE_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'association-foundation-permit': {
    id: 'association-foundation-permit',
    name: 'Association/Foundation Permit',
    description: 'For non-profit associations and foundations (registered with SEC or DOLE) applying for business permit. Covers civic organizations, foundations, trade associations, labor unions, and other non-profit entities operating within the city.',
    sections: ASSOCIATION_FOUNDATION_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'chainsaw-permit': {
    id: 'chainsaw-permit',
    name: 'Chainsaw Permit',
    description: 'For chainsaw operators and owners applying for permit to use chainsaws for logging, land clearing, or tree cutting activities. Required for all chainsaw operations within city jurisdiction per DENR regulations.',
    sections: CHAINSAW_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'firecrackers-stallholders-permit': {
    id: 'firecrackers-stallholders-permit',
    name: 'Firecrackers Stallholders Permit',
    description: 'For individuals or businesses applying to sell firecrackers and pyrotechnic products during the designated holiday period (typically December to January). Required for all temporary firecrackers retail stalls in authorized selling zones.',
    sections: FIRECRACKERS_STALLHOLDERS_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'bazaar-festival-vendors-permit': {
    id: 'bazaar-festival-vendors-permit',
    name: 'Bazaar/Festival Vendors Permit',
    description: 'For vendors applying to operate temporary selling stalls during city-sponsored bazaars, festivals, trade fairs, or special events. Covers food stalls, merchandise booths, and temporary retail spaces in designated event areas.',
    sections: BAZAAR_FESTIVAL_VENDORS_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'peddlers-permit': {
    id: 'peddlers-permit',
    name: 'Peddlers Permit',
    description: 'For mobile vendors (itinerant sellers) applying to sell goods while moving from place to place within the city. Covers street vendors, hawkers, and ambulant sellers of food, merchandise, or other products.',
    sections: PEDDLERS_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'promotions-exhibitors-permit': {
    id: 'promotions-exhibitors-permit',
    name: 'Promotions/Exhibitors Permit',
    description: 'For businesses or organizations applying to conduct promotional activities, product launches, sales promotions, or exhibitions in public or private spaces. Covers roadshows, mall activations, product demonstrations, and temporary promotional displays.',
    sections: PROMOTIONS_EXHIBITORS_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'cemetery-stallholders-permit': {
    id: 'cemetery-stallholders-permit',
    name: 'Cemetery Stallholders Permit',
    description: 'For vendors applying to operate temporary selling stalls within public or private cemeteries during All Saints Day (November 1) and All Souls Day (November 2) observance period. Covers flower, candle, food, and merchandise stalls in designated cemetery areas.',
    sections: CEMETERY_STALLHOLDERS_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'fish-trap-fish-pen-permit': {
    id: 'fish-trap-fish-pen-permit',
    name: 'Fish Trap/Fish Pen Permit',
    description: 'For fishery operators seeking to establish fish traps or fish pens in designated water areas. This permit regulates aquaculture activities to ensure sustainable fishing practices and environmental protection.',
    sections: FISH_TRAP_FISH_PEN_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
  'fish-pond-permit': {
    id: 'fish-pond-permit',
    name: 'Fish Pond Permit',
    description: 'For fishery operators seeking to establish or operate fish ponds for aquaculture purposes. This permit regulates fish pond operations to ensure sustainable aquaculture practices and environmental compliance.',
    sections: FISH_POND_PERMIT_SECTIONS,
    lastUpdated: 'January 15, 2025',
    version: '1',
    createdAt: '2024-01-15',
    fees: ['uf-1'],
    notes: '',
    isActive: true,
  },
}

// Helper to get form metadata by ID
export function getFormMetadata(formId) {
  return FORM_METADATA[formId] || null
}

// Helper to get all temporary permits
export function getTemporaryPermits() {
  return Object.values(FORM_METADATA).filter(form => form.id !== 'unified-business-permit')
}

// Helper to get unified business permit
export function getUnifiedBusinessPermit() {
  return FORM_METADATA['unified-business-permit']
}
