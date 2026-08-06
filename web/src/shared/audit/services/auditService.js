/**
 * Generic Audit Service
 * 
 * PURPOSE: This service provides generic functions for fetching audit logs across all entity types.
 * It eliminates the need to duplicate audit API calls in multiple feature-specific service files.
 * It standardizes response format handling and provides a consistent interface for audit operations.
 * 
 * USAGE EXAMPLE (for using in other features):
 * 
 * // Instead of:
 * import { getVariableAudit } from '@/features/admin/services/variableService'
 * const audit = await getVariableAudit(variableId)
 * 
 * // Use:
 * import { getEntityAudit } from '@/shared/services/auditService'
 * const audit = await getEntityAudit('variable', variableId)
 * 
 * MIGRATION PATH:
 * 1. Import getEntityAudit from this service
 * 2. Replace feature-specific audit calls with getEntityAudit
 * 3. Update response format handling if needed (pagination object structure)
 * 4. Remove feature-specific audit functions from service files
 * 
 * RESPONSE FORMAT:
 * All functions return standardized format:
 * {
 *   logs: [...],
 *   pagination: { page, limit, total, totalPages }
 * }
 */

import { get } from '@/lib/http';

/**
 * Endpoint mapping for entity types
 * Maps entity type to API endpoint path
 * 
 * HOW TO ADD A NEW ENTITY:
 * 1. Add entry to endpointMap with entity type (singular) as key
 * 2. Value should be the API endpoint path
 * 3. Singular endpoint: /api/audit/{entity}/{id}
 * 4. Global endpoint: /api/audit/{entities}
 */
const endpointMap = {
  // Admin entities
  'variable': '/api/audit/variable',
  'fee': '/api/audit/fee',
  'conditional-fee': '/api/audit/conditional-fee',
  'variable-fee-rule': '/api/audit/variable-fee-rule',
  'penalty-rule': '/api/audit/penalty-rule',
  'tax-bracket': '/api/audit/tax-bracket',
  'lob': '/api/audit/lob',
  'requirement': '/api/audit/requirement',
  'requirement-group': '/api/audit/requirement-group',
  'post-requirement': '/api/audit/post-requirement',
  'violation': '/api/audit/violation',
  'permit-form': '/api/audit/permit-form',
  'inspection-item': '/api/audit/inspection-item',
  'checklist': '/api/audit/checklist',
  
  // Officer/staff entities
  'application': '/api/audit/application',
  'help-request': '/api/audit/help-request',
  'business-owner': '/api/audit/business-owner',
  'permit': '/api/audit/permit',
  'cms': '/api/audit/cms',
};

/**
 * Global endpoint mapping for entity types
 * Maps entity type to global API endpoint path (all entities of a type)
 */
const globalEndpointMap = {
  'variables': '/api/audit/variables',
  'fees': '/api/audit/fees',
  'conditional-fees': '/api/audit/conditional-fees',
  'variable-fee-rules': '/api/audit/variable-fee-rules',
  'penalty-rules': '/api/audit/penalty-rules',
  'tax-brackets': '/api/audit/tax-brackets',
  'lobs': '/api/audit/lobs',
  'requirements': '/api/audit/requirements',
  'requirement-groups': '/api/audit/requirement-groups',
  'post-requirements': '/api/audit/post-requirements',
  'violations': '/api/audit/violations',
  'permit-forms': '/api/audit/permit-forms',
  'inspection-items': '/api/audit/inspection-items',
  'checklists': '/api/audit/checklists',
  'applications': '/api/audit/applications',
  'help-requests': '/api/audit/help-requests',
  'business-owners': '/api/audit/business-owners',
  'permits': '/api/audit/permits',
  'cms': '/api/audit/cms',
};

/**
 * Fetches audit logs for a specific entity
 * 
 * USAGE:
 * getEntityAudit('variable', '123')
 * // Returns: { logs: [...], pagination: { page: 1, limit: 20, total: 100, totalPages: 5 } }
 * 
 * getEntityAudit('variable', '123', { page: 2, limit: 50 })
 * // Returns: { logs: [...], pagination: { page: 2, limit: 50, total: 100, totalPages: 2 } }
 * 
 * @param {string} entityType - The entity type (singular, e.g., 'variable', 'fee')
 * @param {string} entityId - The ID of the entity
 * @param {object} params - Query parameters (page, limit, etc.)
 * @returns {Promise<object>} - Audit logs with pagination
 */
export async function getEntityAudit(entityType, entityId, params = {}) {
  const endpoint = endpointMap[entityType];
  if (!endpoint) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  
  // Build query string from params
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });
  
  const queryString = queryParams.toString();
  const url = `${endpoint}/${entityId}${queryString ? `?${queryString}` : ''}`;
  
  const res = await get(url);
  
  // Standardize response format
  // Handle both old format { logs, total, page, limit, totalPages }
  // and new format { logs, pagination: { page, limit, total, totalPages } }
  return {
    logs: res?.logs || [],
    pagination: res?.pagination || {
      page: res?.page || 1,
      limit: res?.limit || 20,
      total: res?.total || 0,
      totalPages: res?.totalPages || 0,
    },
  };
}

/**
 * Fetches all audit logs for an entity type (global view)
 * 
 * USAGE:
 * getGlobalEntityAudit('variables')
 * // Returns: { logs: [...], pagination: { page: 1, limit: 20, total: 100, totalPages: 5 } }
 * 
 * getGlobalEntityAudit('variables', { page: 2, eventType: 'variable_created', search: 'test' })
 * // Returns: { logs: [...], pagination: { page: 2, limit: 20, total: 50, totalPages: 3 } }
 * 
 * @param {string} entityType - The entity type (plural, e.g., 'variables', 'fees')
 * @param {object} params - Query parameters (page, limit, eventType, startDate, endDate, search)
 * @returns {Promise<object>} - Audit logs with pagination
 */
export async function getGlobalEntityAudit(entityType, params = {}) {
  const endpoint = globalEndpointMap[entityType];
  if (!endpoint) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  
  // Build query string from params
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });
  
  const queryString = queryParams.toString();
  const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  const res = await get(url);
  
  // Standardize response format
  return {
    logs: res?.logs || [],
    pagination: res?.pagination || {
      page: res?.page || 1,
      limit: res?.limit || 20,
      total: res?.total || 0,
      totalPages: res?.totalPages || 0,
    },
  };
}

/**
 * Validates if an entity type is supported
 * 
 * USAGE:
 * isEntityTypeSupported('variable') // true
 * isEntityTypeSupported('unknown') // false
 * 
 * @param {string} entityType - The entity type to validate
 * @returns {boolean} - True if entity type is supported
 */
export function isEntityTypeSupported(entityType) {
  return endpointMap[entityType] !== undefined;
}

/**
 * Gets all supported entity types
 * 
 * USAGE:
 * getSupportedEntityTypes() // ['variable', 'fee', 'application', ...]
 * 
 * @returns {string[]} - Array of supported entity types
 */
export function getSupportedEntityTypes() {
  return Object.keys(endpointMap);
}
