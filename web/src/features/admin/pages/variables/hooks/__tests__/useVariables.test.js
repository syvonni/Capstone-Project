import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useVariables, useVariable } from '../useVariables'
import * as variableService from '@/features/admin/services/variableService'

// Mock the variable service
vi.mock('@/features/admin/services/variableService')

describe('useVariables', () => {
  const mockVariables = [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'Building Height Fee',
      description: 'Fee based on building height',
      isActive: true,
      version: 1,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Business Tax',
      description: 'Annual business tax',
      isActive: true,
      version: 2,
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-20T10:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useVariables hook', () => {
    it('should fetch variables on mount', async () => {
      variableService.getVariables.mockResolvedValue(mockVariables)

      const { result } = renderHook(() => useVariables())

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(variableService.getVariables).toHaveBeenCalledWith({})
      expect(result.current.items).toEqual(mockVariables)
    })

    it('should handle loading state correctly', async () => {
      variableService.getVariables.mockResolvedValue(mockVariables)

      const { result } = renderHook(() => useVariables())

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should handle error state correctly', async () => {
      const mockError = new Error('Failed to fetch variables')
      variableService.getVariables.mockRejectedValue(mockError)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.error.message).toBe('Failed to fetch variables')
    })

    it('should sort variables by name alphabetically', async () => {
      const unsortedVariables = [
        { _id: '2', name: 'Zebra Fee' },
        { _id: '1', name: 'Apple Fee' },
        { _id: '3', name: 'Middle Fee' }
      ]
      variableService.getVariables.mockResolvedValue(unsortedVariables)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.items[0].name).toBe('Apple Fee')
      expect(result.current.items[1].name).toBe('Middle Fee')
      expect(result.current.items[2].name).toBe('Zebra Fee')
    })

    it('should return selected item correctly', async () => {
      variableService.getVariables.mockResolvedValue(mockVariables)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Select first item using act
      act(() => {
        result.current.setSelectedItemId('507f1f77bcf86cd799439011')
      })

      expect(result.current.selectedItem).toEqual(mockVariables[0])
    })

    it('should handle item selection', async () => {
      variableService.getVariables.mockResolvedValue(mockVariables)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.onSelectItem(mockVariables[0])
      })

      expect(result.current.selectedItemId).toBe('507f1f77bcf86cd799439011')
    })

    it('should handle refresh functionality', async () => {
      variableService.getVariables.mockResolvedValue(mockVariables)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      variableService.getVariables.mockResolvedValue([...mockVariables, { _id: '3', name: 'New Variable' }])

      await act(async () => {
        await result.current.refresh()
      })

      expect(variableService.getVariables).toHaveBeenCalledTimes(2)
    })

    it('should handle create operation', async () => {
      const newVariable = { _id: '3', name: 'New Variable' }
      variableService.getVariables.mockResolvedValue(mockVariables)
      variableService.createVariable.mockResolvedValue(newVariable)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({ name: 'New Variable' })
      })

      expect(variableService.createVariable).toHaveBeenCalledWith({ name: 'New Variable' })
    })

    it('should handle update operation', async () => {
      const updatedVariable = { _id: '507f1f77bcf86cd799439011', name: 'Updated Name' }
      variableService.getVariables.mockResolvedValue(mockVariables)
      variableService.updateVariable.mockResolvedValue(updatedVariable)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.update('507f1f77bcf86cd799439011', { name: 'Updated Name' })
      })

      expect(variableService.updateVariable).toHaveBeenCalledWith('507f1f77bcf86cd799439011', { name: 'Updated Name' })
    })

    it('should handle delete operation', async () => {
      variableService.getVariables.mockResolvedValue(mockVariables)
      variableService.deleteVariable.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.remove('507f1f77bcf86cd799439011')
      })

      expect(variableService.deleteVariable).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
    })

    it('should handle create error', async () => {
      const mockError = new Error('Create failed')
      variableService.getVariables.mockResolvedValue(mockVariables)
      variableService.createVariable.mockRejectedValue(mockError)

      const { result } = renderHook(() => useVariables())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        try {
          await result.current.create({ name: 'New Variable' })
        } catch {
          // Expected error
        }
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useVariable hook', () => {
    it('should fetch single variable by ID', async () => {
      const mockVariable = mockVariables[0]
      variableService.getVariable.mockResolvedValue(mockVariable)

      const { result } = renderHook(() => useVariable('507f1f77bcf86cd799439011'))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(variableService.getVariable).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(result.current.data).toEqual(mockVariable)
    })

    it('should handle loading state correctly', async () => {
      const mockVariable = mockVariables[0]
      variableService.getVariable.mockResolvedValue(mockVariable)

      const { result } = renderHook(() => useVariable('507f1f77bcf86cd799439011'))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should handle error state correctly', async () => {
      const mockError = new Error('Variable not found')
      variableService.getVariable.mockRejectedValue(mockError)

      const { result } = renderHook(() => useVariable('507f1f77bcf86cd799439011'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.error.message).toBe('Variable not found')
    })

    it('should handle null/undefined ID gracefully', async () => {
      const { result } = renderHook(() => useVariable(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(variableService.getVariable).not.toHaveBeenCalled()
      expect(result.current.data).toBeNull()
    })

    it('should refetch when ID changes', async () => {
      const mockVariable1 = mockVariables[0]
      const mockVariable2 = mockVariables[1]
      variableService.getVariable.mockResolvedValue(mockVariable1)

      const { result, rerender } = renderHook(({ id }) => useVariable(id), {
        initialProps: { id: '507f1f77bcf86cd799439011' }
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(variableService.getVariable).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(result.current.data).toEqual(mockVariable1)

      variableService.getVariable.mockResolvedValue(mockVariable2)
      rerender({ id: '507f1f77bcf86cd799439012' })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(variableService.getVariable).toHaveBeenCalledWith('507f1f77bcf86cd799439012')
      expect(result.current.data).toEqual(mockVariable2)
    })
  })
})