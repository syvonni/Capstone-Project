import { describe, it, expect } from 'vitest'
import { filterItemsBySearch, filterItemsByStatus } from '../inspections.utils'

describe('inspections.utils', () => {
  describe('filterItemsBySearch', () => {
    const mockItems = [
      { name: 'Fire Extinguisher Inspection', description: 'Check for fire extinguisher' },
      { name: 'Emergency Exit Inspection', description: 'Check emergency exits' },
      { name: 'Electrical Wiring Inspection', description: 'Check electrical compliance' },
    ]

    it('returns all items when search term is empty', () => {
      const result = filterItemsBySearch(mockItems, '')
      expect(result).toEqual(mockItems)
    })

    it('returns all items when search term is null', () => {
      const result = filterItemsBySearch(mockItems, null)
      expect(result).toEqual(mockItems)
    })

    it('returns all items when search term is undefined', () => {
      const result = filterItemsBySearch(mockItems, undefined)
      expect(result).toEqual(mockItems)
    })



    it('filters by name (case-insensitive)', () => {
      const result = filterItemsBySearch(mockItems, 'fire')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Fire Extinguisher Inspection')
    })

    it('filters by name (case-insensitive, uppercase)', () => {
      const result = filterItemsBySearch(mockItems, 'FIRE')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Fire Extinguisher Inspection')
    })

    it('filters by description (case-insensitive)', () => {
      const result = filterItemsBySearch(mockItems, 'electrical')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Electrical Wiring Inspection')
    })

    it('returns empty array when no matches', () => {
      const result = filterItemsBySearch(mockItems, 'nonexistent')
      expect(result).toEqual([])
    })



    it('handles items with missing name', () => {
      const itemsWithMissing = [
        { description: 'Check for fire extinguisher' },
        { name: 'Emergency Exit Inspection', description: 'Check emergency exits' },
      ]
      const result = filterItemsBySearch(itemsWithMissing, 'fire')
      expect(result).toHaveLength(1)
      expect(result[0].description).toBe('Check for fire extinguisher')
    })

    it('handles items with missing description', () => {
      const itemsWithMissing = [
        { name: 'Fire Extinguisher Inspection' },
        { name: 'Emergency Exit Inspection', description: 'Check emergency exits' },
      ]
      const result = filterItemsBySearch(itemsWithMissing, 'fire')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Fire Extinguisher Inspection')
    })
  })

  describe('filterItemsByStatus', () => {
    const mockItems = [
      { name: 'Fire Extinguisher Inspection', isActive: true },
      { name: 'Emergency Exit Inspection', isActive: true },
      { name: 'Electrical Wiring Inspection', isActive: false },
    ]

    it('returns all items when status filter is null', () => {
      const result = filterItemsByStatus(mockItems, null)
      expect(result).toEqual(mockItems)
    })

    it('returns all items when status filter is undefined', () => {
      const result = filterItemsByStatus(mockItems, undefined)
      expect(result).toEqual(mockItems)
    })



    it('filters active inspection items correctly', () => {
      const result = filterItemsByStatus(mockItems, true)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.isActive === true)).toBe(true)
    })

    it('filters inactive inspection items correctly', () => {
      const result = filterItemsByStatus(mockItems, false)
      expect(result).toHaveLength(1)
      expect(result[0].isActive).toBe(false)
    })



    it('handles items with missing isActive', () => {
      const itemsWithMissing = [
        { name: 'Fire Extinguisher Inspection', isActive: true },
        { name: 'Emergency Exit Inspection' },
      ]
      const result = filterItemsByStatus(itemsWithMissing, true)
      expect(result).toHaveLength(1)
      expect(result[0].isActive).toBe(true)
    })
  })
})
