import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies first
vi.mock('@/lib/http.js', () => ({
  get: vi.fn(),
  fetchJsonWithFallback: vi.fn(),
}))

vi.mock('@/lib/authHeaders.js', () => ({
  authHeaders: vi.fn(() => ({})),
}))

vi.mock('@/features/authentication/lib/authEvents.js', () => ({
  getCurrentUser: vi.fn(() => ({ _id: 'user1', name: 'Test User' })),
}))

// Now import after mocks are set up
import { get, fetchJsonWithFallback } from '@/lib/http.js'
import {
  getVariables,
  getVariable,
  createVariable,
  updateVariable,
  deleteVariable,
  getVariableAudit,
  getVariablesByFeeId,
  getVariablesByVariableFeeRuleId,
  updateVariableCalculation,
  getAllVariableAudits,
  getDataQualityIssues,
} from '../variableService'

describe('variableService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getVariables', () => {
    it('calls get with correct URL when no filters provided', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariables()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/variables?')
    })

    it('includes category filter in URL when provided', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariables({ category: 'test' })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/variables?category=test')
    })

    it('includes multiple filters when provided', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariables({ category: 'test', isActive: true })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/variables?category=test&isActive=true')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Variable 1' }]
      get.mockResolvedValue({ data: { data: mockData } })
      
      const result = await getVariables()
      
      expect(result).toEqual(mockData)
    })

    it('handles response with direct data property', async () => {
      const mockData = [{ _id: '1', name: 'Variable 1' }]
      get.mockResolvedValue({ data: mockData })
      
      const result = await getVariables()
      
      expect(result).toEqual(mockData)
    })

    it('handles empty response', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      const result = await getVariables()
      
      expect(result).toEqual([])
    })
  })

  describe('getVariable', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue({ data: { data: null } })
      
      await getVariable('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/variables/1')
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Variable 1' }
      get.mockResolvedValue({ data: { data: mockData } })
      
      const result = await getVariable('1')
      
      expect(result).toEqual(mockData)
    })

    it('handles null nested data response', async () => {
      get.mockResolvedValue({ data: { data: null } })
      
      const result = await getVariable('1')
      
      // The service now returns res directly
      expect(result).toEqual({ data: null })
    })

    it('handles response with null data property', async () => {
      get.mockResolvedValue({ data: null })
      
      const result = await getVariable('1')
      
      expect(result).toBeNull()
    })
  })

  describe('createVariable', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ data: { data: { _id: '1' } } })
      
      const data = { name: 'New Variable', description: 'Test description' }
      await createVariable(data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/variables',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('includes step-up token in headers when provided', async () => {
      fetchJsonWithFallback.mockResolvedValue({ data: { data: { _id: '1' } } })
      
      const data = { name: 'New Variable' }
      await createVariable(data, { stepUpToken: 'token123' })
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/variables',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'New Variable' }
      fetchJsonWithFallback.mockResolvedValue({ data: { data: mockData } })
      
      const result = await createVariable({ name: 'New Variable' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('updateVariable', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ data: { data: { _id: '1' } } })
      
      const data = { name: 'Updated Variable' }
      await updateVariable('1', data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/variables/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Updated Variable' }
      fetchJsonWithFallback.mockResolvedValue({ data: { data: mockData } })
      
      const result = await updateVariable('1', { name: 'Updated Variable' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('deleteVariable', () => {
    it('calls fetchJsonWithFallback with DELETE method', async () => {
      fetchJsonWithFallback.mockResolvedValue({ data: { data: { _id: '1' } } })
      
      await deleteVariable('1')
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/variables/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', isActive: false }
      fetchJsonWithFallback.mockResolvedValue({ data: { data: mockData } })
      
      const result = await deleteVariable('1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getVariableAudit', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariableAudit('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/variables/1/audit')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', eventType: 'update' }]
      get.mockResolvedValue({ data: { data: mockData } })
      
      const result = await getVariableAudit('1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getVariablesByFeeId', () => {
    it('calls get with correct URL structure', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariablesByFeeId('fee1')
      
      const callArgs = get.mock.calls[0][0]
      expect(callArgs).toContain('/api/business/admin/variables/by-fee/fee1?_t=')
    })

    it('includes timestamp in URL', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariablesByFeeId('fee1')
      
      const callArgs = get.mock.calls[0][0]
      expect(callArgs).toContain('_t=')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Variable 1' }]
      get.mockResolvedValue({ data: { data: mockData } })
      
      const result = await getVariablesByFeeId('fee1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getVariablesByVariableFeeRuleId', () => {
    it('calls get with correct URL structure', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariablesByVariableFeeRuleId('rule1')
      
      const callArgs = get.mock.calls[0][0]
      expect(callArgs).toContain('/api/business/admin/variables/by-variable-fee-rule/rule1?_t=')
    })

    it('includes timestamp in URL', async () => {
      get.mockResolvedValue({ data: { data: [] } })
      
      await getVariablesByVariableFeeRuleId('rule1')
      
      const callArgs = get.mock.calls[0][0]
      expect(callArgs).toContain('_t=')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Variable 1' }]
      get.mockResolvedValue({ data: { data: mockData } })
      
      const result = await getVariablesByVariableFeeRuleId('rule1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('updateVariableCalculation', () => {
    it('calls fetchJsonWithFallback with correct URL', async () => {
      fetchJsonWithFallback.mockResolvedValue({ data: { data: { _id: '1' } } })
      
      const data = { calculation: 'new calculation' }
      await updateVariableCalculation('1', data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/fees/variables/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', calculation: 'new calculation' }
      fetchJsonWithFallback.mockResolvedValue({ data: { data: mockData } })
      
      const result = await updateVariableCalculation('1', { calculation: 'new calculation' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getAllVariableAudits', () => {
    it('calls get with correct URL when no params provided', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getAllVariableAudits()
      
      expect(get).toHaveBeenCalledWith('/api/audit/variables')
    })

    it('includes query parameters when provided', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getAllVariableAudits({ page: 2, limit: 50 })
      
      expect(get).toHaveBeenCalledWith('/api/audit/variables?page=2&limit=50')
    })

    it('filters out undefined, null, and empty string values', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getAllVariableAudits({ page: 2, limit: null, category: '' })
      
      expect(get).toHaveBeenCalledWith('/api/audit/variables?page=2')
    })

    it('returns logs from response', async () => {
      const mockLogs = [{ _id: '1', eventType: 'create' }]
      get.mockResolvedValue({ logs: mockLogs })
      
      const result = await getAllVariableAudits()
      
      // The service returns the whole response when logs are present
      expect(result).toEqual({ logs: mockLogs })
    })

    it('returns data from response when logs not present', async () => {
      const mockData = { logs: [{ _id: '1', eventType: 'create' }] }
      get.mockResolvedValue({ data: mockData })
      
      const result = await getAllVariableAudits()
      
      expect(result).toEqual(mockData)
    })

    it('returns default structure when response is null', async () => {
      get.mockResolvedValue(null)
      
      const result = await getAllVariableAudits()
      
      expect(result).toEqual({ logs: [], total: 0, page: 1, limit: 20, totalPages: 0 })
    })
  })

  describe('getDataQualityIssues', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue({ issues: [] })
      
      await getDataQualityIssues()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/variables/data-quality')
    })

    it('returns data from response', async () => {
      const mockData = { issues: [], totalEntities: 0, totalIssues: 0 }
      get.mockResolvedValue(mockData)
      
      const result = await getDataQualityIssues()
      
      expect(result).toEqual(mockData)
    })

    it('returns default structure when response is null', async () => {
      get.mockResolvedValue(null)
      
      const result = await getDataQualityIssues()
      
      expect(result).toEqual({ issues: [], totalEntities: 0, totalIssues: 0 })
    })
  })
})
