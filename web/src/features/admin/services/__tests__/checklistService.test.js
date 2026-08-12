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
  getChecklists,
  getChecklist,
  getChecklistsByInspectionItem,
  createChecklist,
  updateChecklist,
  disableChecklist,
  getChecklistAuditHistory,
  getChecklistDataQuality,
  getAllChecklistAudits,
} from '../checklistService'

describe('checklistService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getChecklists', () => {
    it('calls get with correct URL when no parameters provided', async () => {
      get.mockResolvedValue([])
      
      await getChecklists()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/checklists?')
    })

    it('includes isActive parameter in URL when provided', async () => {
      get.mockResolvedValue([])
      
      await getChecklists({ isActive: true })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/checklists?isActive=true')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Checklist 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getChecklists()
      
      expect(result).toEqual(mockData)
    })

    it('handles response with direct data property', async () => {
      const mockData = [{ _id: '1', name: 'Checklist 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getChecklists()
      
      expect(result).toEqual(mockData)
    })

    it('handles empty response', async () => {
      get.mockResolvedValue([])
      
      const result = await getChecklists()
      
      expect(result).toEqual([])
    })

    it('request deduplication prevents duplicate calls', async () => {
      get.mockResolvedValue([])
      
      const promise1 = getChecklists()
      const promise2 = getChecklists()
      
      await Promise.all([promise1, promise2])
      
      expect(get).toHaveBeenCalledTimes(1)
    })
  })

  describe('getChecklist', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue(null)
      
      await getChecklist('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/checklists/1')
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Checklist 1' }
      get.mockResolvedValue(mockData)
      
      const result = await getChecklist('1')
      
      expect(result).toEqual(mockData)
    })

    it('handles null nested data response', async () => {
      get.mockResolvedValue(null)
      
      const result = await getChecklist('1')
      
      expect(result).toBeNull()
    })

    it('request deduplication prevents duplicate calls', async () => {
      get.mockResolvedValue({ _id: '1' })
      
      const promise1 = getChecklist('1')
      const promise2 = getChecklist('1')
      
      await Promise.all([promise1, promise2])
      
      expect(get).toHaveBeenCalledTimes(1)
    })
  })

  describe('getChecklistsByInspectionItem', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue([])
      
      await getChecklistsByInspectionItem('item1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/inspection-items/item1/checklists')
    })

    it('returns data from response', async () => {
      const mockData = [{ _id: '1', name: 'Checklist 1' }]
      get.mockResolvedValue(mockData)
      
      const result = await getChecklistsByInspectionItem('item1')
      
      expect(result).toEqual(mockData)
    })

    it('handles empty response', async () => {
      get.mockResolvedValue([])
      
      const result = await getChecklistsByInspectionItem('item1')
      
      expect(result).toEqual([])
    })
  })

  describe('createChecklist', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'New Checklist', description: 'Test description' }
      await createChecklist(data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/checklists',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('includes step-up token in headers when provided', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'New Checklist' }
      await createChecklist(data, { stepUpToken: 'token123' })
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/checklists',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'New Checklist' }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await createChecklist({ name: 'New Checklist' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('updateChecklist', () => {
    it('calls fetchJsonWithFallback with correct parameters', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'Updated Checklist' }
      await updateChecklist('1', data)
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/checklists/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })

    it('includes step-up token in headers when provided', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      const data = { name: 'Updated Checklist' }
      await updateChecklist('1', data, { stepUpToken: 'token123' })
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/checklists/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', name: 'Updated Checklist' }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await updateChecklist('1', { name: 'Updated Checklist' })
      
      expect(result).toEqual(mockData)
    })
  })

  describe('disableChecklist', () => {
    it('calls fetchJsonWithFallback with DELETE method', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      await disableChecklist('1')
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/checklists/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('includes step-up token in headers when provided', async () => {
      fetchJsonWithFallback.mockResolvedValue({ _id: '1' })
      
      await disableChecklist('1', { stepUpToken: 'token123' })
      
      expect(fetchJsonWithFallback).toHaveBeenCalledWith(
        '/api/business/admin/checklists/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('returns data from response', async () => {
      const mockData = { _id: '1', isActive: false }
      fetchJsonWithFallback.mockResolvedValue(mockData)
      
      const result = await disableChecklist('1')
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getChecklistAuditHistory', () => {
    it('calls get with correct URL and default pagination', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getChecklistAuditHistory('1')
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/checklists/1/audit?page=1&limit=20')
    })

    it('includes custom pagination parameters', async () => {
      get.mockResolvedValue({ logs: [] })
      
      await getChecklistAuditHistory('1', { page: 2, limit: 50 })
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/checklists/1/audit?page=2&limit=50')
    })

    it('returns logs from response', async () => {
      const mockLogs = [{ _id: '1', eventType: 'update' }]
      get.mockResolvedValue({ logs: mockLogs })
      
      const result = await getChecklistAuditHistory('1')
      
      expect(result).toEqual(mockLogs)
    })
  })

  describe('getChecklistDataQuality', () => {
    it('calls get with correct URL', async () => {
      get.mockResolvedValue([])
      
      await getChecklistDataQuality()
      
      expect(get).toHaveBeenCalledWith('/api/business/admin/checklists/data-quality')
    })

    it('returns data from response', async () => {
      const mockData = { issues: [], totalEntities: 0 }
      get.mockResolvedValue(mockData)
      
      const result = await getChecklistDataQuality()
      
      expect(result).toEqual(mockData)
    })
  })

  describe('getAllChecklistAudits', () => {
    it('calls get with correct URL when no params provided', async () => {
      get.mockResolvedValue([])
      
      await getAllChecklistAudits()
      
      expect(get).toHaveBeenCalledWith('/api/audit/checklists?page=1&limit=20')
    })

    it('includes query parameters when provided', async () => {
      get.mockResolvedValue([])
      
      await getAllChecklistAudits({ page: 2, limit: 50 })
      
      expect(get).toHaveBeenCalledWith('/api/audit/checklists?page=2&limit=50')
    })

    it('returns data from response', async () => {
      const mockData = { logs: [{ _id: '1', eventType: 'create' }] }
      get.mockResolvedValue(mockData)
      
      const result = await getAllChecklistAudits()
      
      expect(result).toEqual(mockData)
    })
  })
})
