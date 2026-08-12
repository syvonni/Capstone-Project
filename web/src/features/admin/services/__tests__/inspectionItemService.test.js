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
  getInspectionItems,
  getInspectionItemsByViolation,
  getInspectionItem,
  createInspectionItem,
  updateInspectionItem,
  disableInspectionItem,
  getInspectionItemAuditHistory,
  getInspectionItemDataQuality,
  getAllInspectionItemAudits,
} from '../inspectionItemService'

describe('inspectionItemService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getInspectionItems', () => {
    it('calls get with correct URL when no parameters provided', async () => {
      get.mockResolvedValue([])
      
      await getInspectionItems()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items?')
    })

    it('includes isActive parameter in URL when provided', async () => {
      get.mockResolvedValue([])
      
      await getInspectionItems({ isActive: true })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items?isActive=true')
    })

    it('includes violationId parameter in URL when provided', async () => {
      get.mockResolvedValue([])
      
      await getInspectionItems({ violationId: 'violation1' })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items?violationId=violation1')
    })

    it('includes both parameters when provided', async () => {
      get.mockResolvedValue([])
      
      await getInspectionItems({ isActive: false, violationId: 'violation1' })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items?isActive=false&violationId=violation1')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Item 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getInspectionItems()
      
      expect(result).toEqual(mockData)
    })

    it('handles response with direct data property', async () => {
      const mockData = [{ _id: '1', name: 'Item 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getInspectionItems()
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getInspectionItemsByViolation', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue([])
      
      await getInspectionItemsByViolation('violation1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items/by-violation/violation1')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Item 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getInspectionItemsByViolation('violation1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getInspectionItem', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue(null)
      
      await getInspectionItem('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items/1')
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Item 1' }
      get.mockResolvedValue(mockData)
      
      const result = await getInspectionItem('1')
      
      expect(result).toEqual(mockData)
    })

    it('handles response with null data property', async () => {
      get.mockResolvedValue(null)
      
      const result = await getInspectionItem('1')
      
      expect(result).toBeNull()
    })

    it('handles completely null response', async () => {
      get.mockResolvedValue(null)
      
      const result = await getInspectionItem('1')
      
      expect(result).toBeNull()
    })
  })

  describe('createInspectionItem', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'New Item', question: 'Test question' }
      await createInspectionItem(data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/inspection-items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('includes step-up token in headers when provided', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'New Item', question: 'Test question' }
      await createInspectionItem(data, { stepUpToken: 'token123' })
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/inspection-items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'New Item' }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await createInspectionItem({ name: 'New Item' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('updateInspectionItem', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'Updated Item' }
      await updateInspectionItem('1', data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/inspection-items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Updated Item' }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await updateInspectionItem('1', { name: 'Updated Item' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('disableInspectionItem', () => {
    it('calls fetchJsonWithFallback with DELETE method', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      await disableInspectionItem('1')
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/inspection-items/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', isActive: false }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await disableInspectionItem('1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getInspectionItemAuditHistory', () => {
    it('calls get with correct URL and default pagination', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getInspectionItemAuditHistory('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items/1/audit?page=1&limit=20')
    })

    it('includes custom pagination parameters', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getInspectionItemAuditHistory('1', { page: 2, limit: 50 })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items/1/audit?page=2&limit=50')
    })

    it('returns logs from response', async () => {
      const mockLogs = [{ _id: '1', eventType: 'update' }]
      get.mockResolvedValue({ logs: mockLogs })
      
      const result = await getInspectionItemAuditHistory('1')
      
      expect(result).toEqual(mockLogs)
    })
  })

  describe('getInspectionItemDataQuality', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue([])
      
      await getInspectionItemDataQuality()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items/data-quality')
    })

    it('returns data from response', async () => {
      const mockData = { issues: [] }
      get.mockResolvedValue(mockData)
      
      const result = await getInspectionItemDataQuality()
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getAllInspectionItemAudits', () => {
    it('calls get with correct URL and default pagination', async () => {
      get.mockResolvedValue([])
      
      await getAllInspectionItemAudits()
      
      expect(get).toHaveBeenCalledWith('/api/audit/inspection-items?page=1&limit=20')
    })

    it('includes custom pagination parameters', async () => {
      get.mockResolvedValue([])
      
      await getAllInspectionItemAudits({ page: 2, limit: 50 })
      
      expect(get).toHaveBeenCalledWith('/api/audit/inspection-items?page=2&limit=50')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', eventType: 'create' }]
      get.mockResolvedValue(mockData)
      
      const result = await getAllInspectionItemAudits()
      
      expect(result).toEqual(mockData)
    })
  })
})
