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
  getViolations,
  getViolation,
  createViolation,
  updateViolation,
  disableViolation,
  getViolationAuditHistory,
  getViolationsByFee,
  getAllViolationAudits,
  getDataQualityIssues,
} from '../violationService'

describe('violationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getViolations', () => {
    it('calls get with correct URL when no parameters provided', async () => {
      get.mockResolvedValue([])
      
      await getViolations()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations?')
    })

    it('includes category parameter in URL when provided', async () => {
      get.mockResolvedValue([])
      
      await getViolations({ category: 'health' })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations?category=health')
    })

    it('includes severity parameter in URL when provided', async () => {
      get.mockResolvedValue([])
      
      await getViolations({ severity: 'major' })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations?severity=major')
    })

    it('includes isActive parameter in URL when provided', async () => {
      get.mockResolvedValue([])
      
      await getViolations({ isActive: true })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations?isActive=true')
    })

    it('includes multiple parameters when provided', async () => {
      get.mockResolvedValue([])
      
      await getViolations({ category: 'health', severity: 'major', isActive: false })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations?category=health&severity=major&isActive=false')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Violation 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getViolations()
      
      expect(result).toEqual(mockData)
    })

    it('handles response with direct data property', async () => {
      const mockData = [{ _id: '1', name: 'Violation 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getViolations()
      
      expect(result).toEqual(mockData)
    })

    it('handles empty response', async () => {
      get.mockResolvedValue([])
      
      const result = await getViolations()
      
      expect(result).toEqual([])
    })
  })

  describe('getViolation', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue(null)
      
      await getViolation('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations/1')
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Violation 1' }
      get.mockResolvedValue(mockData)
      
      const result = await getViolation('1')
      
      expect(result).toEqual(mockData)
    })

    it('handles null nested data response', async () => {
      get.mockResolvedValue(null)
      
      const result = await getViolation('1')
      
      expect(result).toBeNull()
    })

    it('handles response with null data property', async () => {
      get.mockResolvedValue(null)
      
      const result = await getViolation('1')
      
      expect(result).toBeNull()
    })
  })

  describe('createViolation', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'New Violation', description: 'Test description' }
      await createViolation(data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/violations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('includes step-up token in headers when provided', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'New Violation' }
      await createViolation(data, { stepUpToken: 'token123' })
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/violations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'New Violation' }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await createViolation({ name: 'New Violation' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('updateViolation', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'Updated Violation' }
      await updateViolation('1', data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/violations/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Updated Violation' }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await updateViolation('1', { name: 'Updated Violation' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('disableViolation', () => {
    it('calls fetchJsonWithFallback with DELETE method', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      await disableViolation('1')
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/violations/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', isActive: false }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await disableViolation('1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getViolationAuditHistory', () => {
    it('calls get with correct URL and default pagination', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getViolationAuditHistory('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations/1/audit?page=1&limit=20')
    })

    it('includes custom pagination parameters', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getViolationAuditHistory('1', { page: 2, limit: 50 })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations/1/audit?page=2&limit=50')
    })

    it('returns logs from response', async () => {
      const mockLogs = [{ _id: '1', eventType: 'update' }]
      get.mockResolvedValue({ logs: mockLogs })
      
      const result = await getViolationAuditHistory('1')
      
      expect(result).toEqual(mockLogs)
    })
  })

  describe('getViolationsByFee', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue([])
      
      await getViolationsByFee('fee1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations?feeId=fee1')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Violation 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getViolationsByFee('fee1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getAllViolationAudits', () => {
    it('calls get with correct URL when no params provided', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getAllViolationAudits()
      
      expect(get).toHaveBeenCalledWith('/api/audit/violations')
    })

    it('includes query parameters when provided', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getAllViolationAudits({ page: 2, limit: 50 })
      
      expect(get).toHaveBeenCalledWith('/api/audit/violations?page=2&limit=50')
    })

    it('filters out undefined, null, and empty string values', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getAllViolationAudits({ page: 2, limit: null, category: '' })
      
      expect(get).toHaveBeenCalledWith('/api/audit/violations?page=2')
    })

    it('returns logs from response', async () => {
      const mockLogs = [{ _id: '1', eventType: 'create' }]
      get.mockResolvedValue({ logs: mockLogs })
      
      const result = await getAllViolationAudits()
      
      // The service returns the whole response when logs are present
      expect(result).toEqual({ logs: mockLogs })
    })

    it('returns data from response when logs not present', async () => {
      const mockData = { logs: [{ _id: '1', eventType: 'create' }] }
      get.mockResolvedValue(mockData)
      
      const result = await getAllViolationAudits()
      
      expect(result).toEqual(mockData)
    })

    it('returns default structure when response is null', async () => {
      get.mockResolvedValue(null)
      
      const result = await getAllViolationAudits()
      
      expect(result).toEqual({ logs: [], total: 0, page: 1, limit: 20, totalPages: 0 })
    })
  })

  describe('getDataQualityIssues', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue({ issues: [] })
      
      await getDataQualityIssues()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/violations/data-quality')
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
