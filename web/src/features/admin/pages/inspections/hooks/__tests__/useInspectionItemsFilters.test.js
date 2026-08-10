import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInspectionItemsFilters } from '../useInspectionItemsFilters'

describe('useInspectionItemsFilters', () => {
  it('initializes with default search term (empty string)', () => {
    const { result } = renderHook(() => useInspectionItemsFilters())
    expect(result.current.searchTerm).toBe('')
  })

  it('initializes with default status filter (null)', () => {
    const { result } = renderHook(() => useInspectionItemsFilters())
    expect(result.current.statusFilter).toBe(null)
  })

  it('updates search term correctly', () => {
    const { result } = renderHook(() => useInspectionItemsFilters())
    act(() => {
      result.current.setSearchTerm('fire')
    })
    expect(result.current.searchTerm).toBe('fire')
  })

  it('updates status filter correctly', () => {
    const { result } = renderHook(() => useInspectionItemsFilters())
    act(() => {
      result.current.setStatusFilter(true)
    })
    expect(result.current.statusFilter).toBe(true)
  })

  it('updates status filter to false', () => {
    const { result } = renderHook(() => useInspectionItemsFilters())
    act(() => {
      result.current.setStatusFilter(false)
    })
    expect(result.current.statusFilter).toBe(false)
  })

  it('resets filters to default values', () => {
    const { result } = renderHook(() => useInspectionItemsFilters())
    act(() => {
      result.current.setSearchTerm('fire')
      result.current.setStatusFilter(true)
    })
    expect(result.current.searchTerm).toBe('fire')
    expect(result.current.statusFilter).toBe(true)

    act(() => {
      result.current.setSearchTerm('')
      result.current.setStatusFilter(null)
    })
    expect(result.current.searchTerm).toBe('')
    expect(result.current.statusFilter).toBe(null)
  })

  it('returns correct state structure', () => {
    const { result } = renderHook(() => useInspectionItemsFilters())
    expect(result.current).toHaveProperty('searchTerm')
    expect(result.current).toHaveProperty('setSearchTerm')
    expect(result.current).toHaveProperty('statusFilter')
    expect(result.current).toHaveProperty('setStatusFilter')
    expect(typeof result.current.setSearchTerm).toBe('function')
    expect(typeof result.current.setStatusFilter).toBe('function')
  })
})
