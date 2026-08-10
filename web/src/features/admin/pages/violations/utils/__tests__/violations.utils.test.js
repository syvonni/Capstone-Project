import { describe, it, expect } from 'vitest'
import {
  filterItemsBySearch,
  filterItemsBySeverity,
  filterItemsByStatus,
  getSeverityLabel,
  getSeverityColor,
} from '../violations.utils'

describe('violations.utils', () => {
  const mockViolations = [
    {
      _id: '1',
      name: 'Building Height Violation',
      description: 'Building exceeds maximum allowed height',
      severity: 'major',
      isActive: true,
    },
    {
      _id: '2',
      name: 'Setback Violation',
      description: 'Building does not meet setback requirements',
      severity: 'minor',
      isActive: true,
    },
    {
      _id: '3',
      name: 'Fire Safety Violation',
      description: 'Missing fire safety equipment',
      severity: 'critical',
      isActive: false,
    },
  ]

  describe('filterItemsBySearch', () => {
    it('returns all items when search term is empty', () => {
      const result = filterItemsBySearch(mockViolations, '')
      expect(result).toHaveLength(3)
    })

    it('returns all items when search term is null', () => {
      const result = filterItemsBySearch(mockViolations, null)
      expect(result).toHaveLength(3)
    })

    it('returns all items when search term is whitespace only', () => {
      const result = filterItemsBySearch(mockViolations, '   ')
      expect(result).toHaveLength(3)
    })

    it('filters by name (case-insensitive)', () => {
      const result = filterItemsBySearch(mockViolations, 'height')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Building Height Violation')
    })

    it('filters by name (case-insensitive, uppercase)', () => {
      const result = filterItemsBySearch(mockViolations, 'HEIGHT')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Building Height Violation')
    })

    it('filters by description (case-insensitive)', () => {
      const result = filterItemsBySearch(mockViolations, 'setback')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Setback Violation')
    })

    it('filters by description (case-insensitive, uppercase)', () => {
      const result = filterItemsBySearch(mockViolations, 'SETBACK')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Setback Violation')
    })

    it('returns empty array when no matches', () => {
      const result = filterItemsBySearch(mockViolations, 'nonexistent')
      expect(result).toHaveLength(0)
    })

    it('handles null items gracefully', () => {
      const result = filterItemsBySearch(null, 'height')
      expect(result).toHaveLength(0)
    })

    it('handles undefined items gracefully', () => {
      const result = filterItemsBySearch(undefined, 'height')
      expect(result).toHaveLength(0)
    })

    it('handles items with missing name/description', () => {
      const itemsWithMissing = [
        { _id: '1', name: 'Test Violation', severity: 'minor', isActive: true },
        { _id: '2', description: 'Test description', severity: 'minor', isActive: true },
        { _id: '3', severity: 'minor', isActive: true },
      ]
      const result = filterItemsBySearch(itemsWithMissing, 'test')
      expect(result).toHaveLength(2)
    })
  })

  describe('filterItemsBySeverity', () => {
    it('returns all items when severity filter is empty', () => {
      const result = filterItemsBySeverity(mockViolations, '')
      expect(result).toHaveLength(3)
    })

    it('returns all items when severity filter is null', () => {
      const result = filterItemsBySeverity(mockViolations, null)
      expect(result).toHaveLength(3)
    })

    it('filters by minor severity correctly', () => {
      const result = filterItemsBySeverity(mockViolations, 'minor')
      expect(result).toHaveLength(1)
      expect(result[0].severity).toBe('minor')
    })

    it('filters by major severity correctly', () => {
      const result = filterItemsBySeverity(mockViolations, 'major')
      expect(result).toHaveLength(1)
      expect(result[0].severity).toBe('major')
    })

    it('filters by critical severity correctly', () => {
      const result = filterItemsBySeverity(mockViolations, 'critical')
      expect(result).toHaveLength(1)
      expect(result[0].severity).toBe('critical')
    })

    it('returns empty array when no matches', () => {
      const result = filterItemsBySeverity(mockViolations, 'nonexistent')
      expect(result).toHaveLength(0)
    })

    it('handles null items gracefully', () => {
      const result = filterItemsBySeverity(null, 'minor')
      expect(result).toHaveLength(0)
    })

    it('handles undefined items gracefully', () => {
      const result = filterItemsBySeverity(undefined, 'minor')
      expect(result).toHaveLength(0)
    })

    it('handles items with missing severity', () => {
      const itemsWithMissing = [
        { _id: '1', name: 'Test Violation', severity: 'minor', isActive: true },
        { _id: '2', name: 'Test Violation 2', isActive: true },
      ]
      const result = filterItemsBySeverity(itemsWithMissing, 'minor')
      expect(result).toHaveLength(1)
    })
  })

  describe('filterItemsByStatus', () => {
    it('returns all items when status filter is null', () => {
      const result = filterItemsByStatus(mockViolations, null)
      expect(result).toHaveLength(3)
    })

    it('filters active violations correctly', () => {
      const result = filterItemsByStatus(mockViolations, true)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.isActive === true)).toBe(true)
    })

    it('filters disabled violations correctly', () => {
      const result = filterItemsByStatus(mockViolations, false)
      expect(result).toHaveLength(1)
      expect(result.every(item => item.isActive === false)).toBe(true)
    })

    it('handles null items gracefully', () => {
      const result = filterItemsByStatus(null, true)
      expect(result).toHaveLength(0)
    })

    it('handles undefined items gracefully', () => {
      const result = filterItemsByStatus(undefined, true)
      expect(result).toHaveLength(0)
    })

    it('handles items with missing isActive', () => {
      const itemsWithMissing = [
        { _id: '1', name: 'Test Violation', severity: 'minor', isActive: true },
        { _id: '2', name: 'Test Violation 2', severity: 'minor' },
      ]
      const result = filterItemsByStatus(itemsWithMissing, true)
      expect(result).toHaveLength(1)
    })
  })

  describe('getSeverityLabel', () => {
    it('returns correct label for minor severity', () => {
      const result = getSeverityLabel('minor')
      expect(result).toBe('Minor')
    })

    it('returns correct label for major severity', () => {
      const result = getSeverityLabel('major')
      expect(result).toBe('Major')
    })

    it('returns correct label for critical severity', () => {
      const result = getSeverityLabel('critical')
      expect(result).toBe('Critical')
    })

    it('returns original value for unknown severity', () => {
      const result = getSeverityLabel('unknown')
      expect(result).toBe('unknown')
    })

    it('returns original value for null severity', () => {
      const result = getSeverityLabel(null)
      expect(result).toBe(null)
    })

    it('returns original value for undefined severity', () => {
      const result = getSeverityLabel(undefined)
      expect(result).toBe(undefined)
    })
  })

  describe('getSeverityColor', () => {
    it('returns correct color for minor severity', () => {
      const result = getSeverityColor('minor')
      expect(result).toBe('green')
    })

    it('returns correct color for major severity', () => {
      const result = getSeverityColor('major')
      expect(result).toBe('orange')
    })

    it('returns correct color for critical severity', () => {
      const result = getSeverityColor('critical')
      expect(result).toBe('red')
    })

    it('returns default color for unknown severity', () => {
      const result = getSeverityColor('unknown')
      expect(result).toBe('default')
    })

    it('returns default color for null severity', () => {
      const result = getSeverityColor(null)
      expect(result).toBe('default')
    })

    it('returns default color for undefined severity', () => {
      const result = getSeverityColor(undefined)
      expect(result).toBe('default')
    })
  })
})
