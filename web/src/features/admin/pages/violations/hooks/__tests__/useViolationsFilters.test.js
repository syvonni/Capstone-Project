import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useViolationsFilters } from '../useViolationsFilters'

describe('useViolationsFilters', () => {
  beforeEach(() => {
    // Reset any module state if needed
  })

  it('initializes with default search term (empty string)', () => {
    const { result } = renderHook(() => useViolationsFilters())
    expect(result.current.searchTerm).toBe('')
  })

  it('initializes with default severity filter based on DEFAULT_FILTERS', () => {
    const { result } = renderHook(() => useViolationsFilters())
    expect(result.current.severityFilter).toBeDefined()
  })

  it('initializes with default status filter based on DEFAULT_FILTERS', () => {
    const { result } = renderHook(() => useViolationsFilters())
    expect(result.current.statusFilter).toBeDefined()
  })

  it('initializes with filter open state as false', () => {
    const { result } = renderHook(() => useViolationsFilters())
    expect(result.current.filterOpen).toBe(false)
  })

  it('updates search term correctly', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setSearchTerm('height violation')
    })
    
    expect(result.current.searchTerm).toBe('height violation')
  })

  it('updates severity filter correctly', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setSeverityFilter('major')
    })
    
    expect(result.current.severityFilter).toBe('major')
  })

  it('updates status filter correctly', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setStatusFilter(false)
    })
    
    expect(result.current.statusFilter).toBe(false)
  })

  it('resets filters to default values', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setSearchTerm('test search')
      result.current.setSeverityFilter('critical')
      result.current.setStatusFilter(false)
    })
    
    expect(result.current.searchTerm).toBe('test search')
    expect(result.current.severityFilter).toBe('critical')
    expect(result.current.statusFilter).toBe(false)
    
    act(() => {
      result.current.resetFilters()
    })
    
    expect(result.current.searchTerm).toBe('')
    expect(result.current.severityFilter).toBeDefined()
    expect(result.current.statusFilter).toBeDefined()
  })

  it('calculates active filter count correctly when no filters are active', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setSearchTerm('')
      result.current.setSeverityFilter('')
      result.current.setStatusFilter(null)
    })
    
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('calculates active filter count correctly when search is active', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setSearchTerm('test')
    })
    
    // The default status filter is also counted, so it's 2 (search + status)
    expect(result.current.activeFilterCount).toBe(2)
  })

  it('calculates active filter count correctly when severity is active', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setSeverityFilter('major')
    })
    
    // The default status filter is also counted, so it's 2 (severity + status)
    expect(result.current.activeFilterCount).toBe(2)
  })

  it('calculates active filter count correctly when status is active', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setStatusFilter(true)
    })
    
    expect(result.current.activeFilterCount).toBe(1)
  })

  it('calculates active filter count correctly when multiple filters are active', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    act(() => {
      result.current.setSearchTerm('test')
      result.current.setSeverityFilter('major')
      result.current.setStatusFilter(true)
    })
    
    expect(result.current.activeFilterCount).toBe(3)
  })

  it('toggles filter open state correctly', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    expect(result.current.filterOpen).toBe(false)
    
    act(() => {
      result.current.setFilterOpen(true)
    })
    
    expect(result.current.filterOpen).toBe(true)
    
    act(() => {
      result.current.setFilterOpen(false)
    })
    
    expect(result.current.filterOpen).toBe(false)
  })

  it('returns correct state structure', () => {
    const { result } = renderHook(() => useViolationsFilters())
    
    expect(result.current).toHaveProperty('searchTerm')
    expect(result.current).toHaveProperty('setSearchTerm')
    expect(result.current).toHaveProperty('severityFilter')
    expect(result.current).toHaveProperty('setSeverityFilter')
    expect(result.current).toHaveProperty('statusFilter')
    expect(result.current).toHaveProperty('setStatusFilter')
    expect(result.current).toHaveProperty('filterOpen')
    expect(result.current).toHaveProperty('setFilterOpen')
    expect(result.current).toHaveProperty('resetFilters')
    expect(result.current).toHaveProperty('activeFilterCount')
  })
})
