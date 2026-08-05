/**
 * Unit presets for variables and fees
 * Common units used in LGU business permits
 */

export const UNIT_PRESETS = [
  // Area units
  { value: 'sqm', label: 'sqm (square meter)' },
  { value: 'per sqm', label: 'per sqm' },
  { value: 'per sqm of sign', label: 'per sqm of sign' },
  { value: 'per sqm of land area', label: 'per sqm of land area' },
  { value: 'per sqm of GFA', label: 'per sqm of GFA (Gross Floor Area)' },
  { value: 'per sqm per month', label: 'per sqm per month' },
  
  // Length units
  { value: 'meter', label: 'meter' },
  { value: 'per meter', label: 'per meter' },
  { value: 'linear meter', label: 'linear meter' },
  { value: 'per 50 linear meters', label: 'per 50 linear meters' },
  
  // Count/quantity units
  { value: 'unit', label: 'unit' },
  { value: 'per unit', label: 'per unit' },
  { value: 'room', label: 'room' },
  { value: 'rooms', label: 'rooms' },
  { value: 'stall', label: 'stall' },
  { value: 'stalls', label: 'stalls' },
  { value: 'lot', label: 'lot' },
  { value: 'lots', label: 'lots' },
  { value: 'item', label: 'item' },
  { value: 'items', label: 'items' },
  
  // Time units
  { value: 'per month', label: 'per month' },
  { value: 'per year', label: 'per year' },
  { value: 'per day', label: 'per day' },
  
  // Volume units
  { value: 'cubic meter', label: 'cubic meter' },
  { value: 'per cubic meter', label: 'per cubic meter' },
  
  // Weight units
  { value: 'kilogram', label: 'kilogram' },
  { value: 'per kilogram', label: 'per kilogram' },
]

export const UNIT_SINGULAR_PRESETS = [
  { value: 'sqm', label: 'sqm' },
  { value: 'meter', label: 'meter' },
  { value: 'unit', label: 'unit' },
  { value: 'room', label: 'room' },
  { value: 'stall', label: 'stall' },
  { value: 'lot', label: 'lot' },
  { value: 'item', label: 'item' },
  { value: 'cubic meter', label: 'cubic meter' },
  { value: 'kilogram', label: 'kilogram' },
]

export const UNIT_PLURAL_PRESETS = [
  { value: 'sqm', label: 'sqm' },
  { value: 'meters', label: 'meters' },
  { value: 'units', label: 'units' },
  { value: 'rooms', label: 'rooms' },
  { value: 'stalls', label: 'stalls' },
  { value: 'lots', label: 'lots' },
  { value: 'items', label: 'items' },
  { value: 'cubic meters', label: 'cubic meters' },
  { value: 'kilograms', label: 'kilograms' },
]

export const UNIT_CONTEXT_SINGULAR_PRESETS = [
  { value: 'room unit', label: 'room unit' },
  { value: 'sqm of parking space', label: 'sqm of parking space' },
  { value: 'sqm of floor area', label: 'sqm of floor area' },
  { value: 'sqm of land area', label: 'sqm of land area' },
  { value: 'linear meter of fence', label: 'linear meter of fence' },
]

export const UNIT_CONTEXT_PLURAL_PRESETS = [
  { value: 'room units', label: 'room units' },
  { value: 'sqm of parking space', label: 'sqm of parking space' },
  { value: 'sqm of floor area', label: 'sqm of floor area' },
  { value: 'sqm of land area', label: 'sqm of land area' },
  { value: 'linear meters of fence', label: 'linear meters of fence' },
]
