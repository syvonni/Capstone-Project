import { get, fetchJsonWithFallback } from '@/lib/http.js'
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

// Fee API
export const getFees = async (params = {}) => {
  const { category, isActive } = params
  const queryParams = new URLSearchParams()
  if (category) queryParams.append('category', category)
  if (isActive !== undefined) queryParams.append('isActive', isActive)

  const res = await get(`/api/business/admin/fees?${queryParams.toString()}`)
  return res || []
}

export const getFee = async (id) => {
  const res = await get(`/api/business/admin/fees/${id}`)
  return res
}

export const getFeesByCategory = async (category, params = {}) => {
  const { isActive } = params
  const queryParams = new URLSearchParams()
  if (isActive !== undefined) queryParams.append('isActive', isActive)

  const res = await get(`/api/business/admin/fees/by-category/${category}?${queryParams.toString()}`)
  return res || []
}

export const getFeesByPermitForm = async (permitFormId) => {
  const res = await get(`/api/business/admin/fees/by-permit-form/${permitFormId}`)
  return res
}

export const createFee = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/fees', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const updateFee = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/fees/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const disableFee = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/fees/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res
}

// Penalty Rule API
export const getPenaltyRules = async (params = {}) => {
  const { category, isActive, includeDrafts } = params
  const queryParams = new URLSearchParams()
  if (category) queryParams.append('category', category)
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  if (includeDrafts) queryParams.append('includeDrafts', 'true')

  const res = await get(`/api/business/admin/penalty-rules?${queryParams.toString()}`)
  return res || []
}

export const getPenaltyRule = async (id) => {
  const res = await get(`/api/business/admin/penalty-rules/${id}`)
  return res
}

export const createPenaltyRule = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/penalty-rules', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const updatePenaltyRule = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/penalty-rules/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const disablePenaltyRule = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/penalty-rules/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res
}

// Audit History API
export const getFeeAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/fees/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}

export const getPenaltyRuleAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/penalty-rules/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}

// Variable Fee Rule API
export const getVariableFeeRules = async (params = {}) => {
  const { isActive, category } = params
  const queryParams = new URLSearchParams()
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  if (category) queryParams.append('category', category)

  const res = await get(`/api/business/admin/variable-fee-rules?${queryParams.toString()}`)
  return res || []
}

export const getVariableFeeRule = async (id) => {
  const res = await get(`/api/business/admin/variable-fee-rules/${id}`)
  return res
}

export const createVariableFeeRule = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/variable-fee-rules', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const updateVariableFeeRule = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/variable-fee-rules/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const disableVariableFeeRule = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/variable-fee-rules/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res
}

export const getVariableFeeRuleAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/variable-fee-rules/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}

export const getVariableFeeRuleLobs = async (id) => {
  const res = await get(`/api/business/admin/variable-fee-rules/${id}/lobs`)
  return res || []
}

// Tax Bracket API
export const getTaxBrackets = async (params = {}) => {
  const { taxBasis, isActive, lobId } = params
  const queryParams = new URLSearchParams()
  if (taxBasis) queryParams.append('taxBasis', taxBasis)
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  if (lobId) queryParams.append('lobId', lobId)

  const res = await get(`/api/business/admin/tax-brackets?${queryParams.toString()}`)
  return res || []
}

export const getTaxBracket = async (id) => {
  const res = await get(`/api/business/admin/tax-brackets/${id}`)
  return res
}

export const createTaxBracket = async (data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback('/api/business/admin/tax-brackets', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const updateTaxBracket = async (id, data, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    'Content-Type': 'application/json',
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/tax-brackets/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return res
}

export const deleteTaxBracket = async (id, options = {}) => {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', {
    ...(options.stepUpToken && { stepUpToken: options.stepUpToken }),
  })
  const res = await fetchJsonWithFallback(`/api/business/admin/tax-brackets/${id}`, {
    method: 'DELETE',
    headers,
  })
  return res
}

export const getTaxBracketAuditHistory = async (id, params = {}) => {
  const { page = 1, limit = 20 } = params
  const res = await get(`/api/business/admin/tax-brackets/${id}/audit?page=${page}&limit=${limit}`)
  return res?.logs || []
}
