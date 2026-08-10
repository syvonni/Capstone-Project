import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVariablesFilters } from '../useVariablesFilters'

describe('useVariablesFilters', () => {
  beforeEach(() => {
    // Reset any state before each test
  })

  it('should initialize with default search term (empty string)', () => {
    const { result } = renderHook(() => useVariablesFilters())
    expect(result.current.searchTerm).toBe('')
  })

  it('should initialize with default status filter based on DEFAULT_FILTERS', () => {
    const { result } = renderHook(() => useVariablesFilters())
    // DEFAULT_FILTERS.isActive is true by default, so status should be 'active'
    expect(result.current.statusFilter).toBe('active')
  })

  it('should update search term correctly', () => {
    const { result } = renderHook(() => useVariablesFilters())
    
    act(() => {
      result.current.setSearchTerm('building')
    })
    
    expect(result.current.searchTerm).toBe('building')
  })

  it('should update status filter correctly', () => {
    const { result } = renderHook(() => useVariablesFilters())
    
    act(() => {
      result.current.setStatusFilter('disabled')
    })
    
    expect(result.current.statusFilter).toBe('disabled')
  })

  it('should update status filter to empty string', () => {
    const { result } = renderHook(() => useVariablesFilters())
    
    act(() => {
      result.current.setStatusFilter('')
    })
    
    expect(result.current.statusFilter).toBe('')
  })

  it('should return correct state structure', () => {
    const { result } = renderHook(() => useVariablesFilters())
    
    expect(result.current).toHaveProperty('searchTerm')
    expect(result.current).toHaveProperty('setSearchTerm')
    expect(result.current).toHaveProperty('statusFilter')
    expect(result.current).toHaveProperty('setStatusFilter')
    expect(typeof result.current.setSearchTerm).toBe('function')
    expect(typeof result.current.setStatusFilter).toBe('function')
  })

  it('should handle multiple state updates', () => {
    const { result } = renderHook(() => useVariablesFilters())
    
    act(() => {
      result.current.setSearchTerm('test')
      result.current.setStatusFilter('disabled')
    })
    
    expect(result.current.searchTerm).toBe('test')
    expect(result.current.statusFilter).toBe('disabled')
    
    act(() => {
      result.current.setSearchTerm('building')
      result.current.setStatusFilter('active')
    })
    
    expect(result.current.searchTerm).toBe('building')
    expect(result.current.statusFilter).toBe('active')
  })
})