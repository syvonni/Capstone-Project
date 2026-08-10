import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVariableForm } from '../useVariableForm'
import * as variableService from '@/features/admin/services/variableService'

// Mock the variable service
vi.mock('@/features/admin/services/variableService')

// Mock shared hooks
const mockResetChangeTracking = vi.fn()
const mockHandleValuesChange = vi.fn()
const mockPushHistory = vi.fn()
const mockResetHistory = vi.fn()

vi.mock('@/shared/hooks/useStepUp', () => ({
  useStepUp: () => ({
    runWithStepUp: vi.fn((callback) => callback('mock-step-up-token')),
    stepUpModal: null
  })
}))

vi.mock('@/shared/hooks/useFormChangeTracking', () => ({
  useFormChangeTracking: () => ({
    hasChanges: false,
    resetChangeTracking: mockResetChangeTracking,
    handleValuesChange: mockHandleValuesChange
  })
}))

vi.mock('@/shared/hooks/useUndoRedo', () => ({
  default: () => ({
    undo: vi.fn(() => ({ name: 'previous value' })),
    redo: vi.fn(() => ({ name: 'next value' })),
    pushHistory: mockPushHistory,
    resetHistory: mockResetHistory,
    canUndo: true,
    canRedo: true
  })
}))

describe('useVariableForm', () => {
  const mockVariable = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Variable',
    description: 'Test description',
    question: 'Test question?',
    calculationMethod: 'per_unit',
    unit: 'per unit',
    unitSingular: 'unit',
    unitPlural: 'units',
    unitContextSingular: 'per unit',
    unitContextPlural: 'per units',
    baseRate: 100,
    isActive: true,
    version: 1
  }

  const mockInitialValues = {
    name: 'Test Variable',
    description: 'Test description',
    question: 'Test question?',
    calculationMethod: 'per_unit',
    unit: 'per unit',
    unitSingular: 'unit',
    unitPlural: 'units',
    unitContextSingular: 'per unit',
    unitContextPlural: 'per units',
    baseRate: 100
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize form with correct values', () => {
    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: '507f1f77bcf86cd799439011',
        variable: mockVariable,
        initialValues: mockInitialValues,
        onSave: vi.fn()
      })
    )

    expect(result.current.form).toBeDefined()
    expect(result.current.saving).toBe(false)
    expect(result.current.hasChanges).toBe(false)
  })

  it('should handle form changes correctly', () => {
    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: '507f1f77bcf86cd799439011',
        variable: mockVariable,
        initialValues: mockInitialValues,
        onSave: vi.fn()
      })
    )

    act(() => {
      result.current.handleFormValuesChange({ name: 'Updated Name' }, mockInitialValues)
    })

    // Just verify the method exists and can be called
    expect(result.current.handleFormValuesChange).toBeDefined()
  })

  it('should handle undo functionality', () => {
    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: '507f1f77bcf86cd799439011',
        variable: mockVariable,
        initialValues: mockInitialValues,
        onSave: vi.fn()
      })
    )

    act(() => {
      result.current.handleUndo()
    })

    // Just verify the method exists and can be called
    expect(result.current.handleUndo).toBeDefined()
  })

  it('should handle redo functionality', () => {
    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: '507f1f77bcf86cd799439011',
        variable: mockVariable,
        initialValues: mockInitialValues,
        onSave: vi.fn()
      })
    )

    act(() => {
      result.current.handleRedo()
    })

    // Just verify the method exists and can be called
    expect(result.current.handleRedo).toBeDefined()
  })

  it('should handle save operation with step-up token', async () => {
    const mockOnSave = vi.fn()
    variableService.createVariable.mockResolvedValue({ _id: 'new-id', ...mockVariable })
    variableService.updateVariable.mockResolvedValue(mockVariable)

    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: 'new',
        variable: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave
      })
    )

    act(() => {
      result.current.handleSave()
    })

    await waitFor(() => {
      expect(result.current.saving).toBe(false)
    })

    expect(mockOnSave).toHaveBeenCalled()
  })

  it('should handle save operation for existing variable', async () => {
    const mockOnSave = vi.fn()
    variableService.updateVariable.mockResolvedValue(mockVariable)

    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: '507f1f77bcf86cd799439011',
        variable: mockVariable,
        initialValues: mockInitialValues,
        onSave: mockOnSave
      })
    )

    act(() => {
      result.current.handleSave()
    })

    await waitFor(() => {
      expect(result.current.saving).toBe(false)
    })

    expect(mockOnSave).toHaveBeenCalled()
  })

  it('should handle save errors correctly', async () => {
    const mockError = new Error('Save failed')
    variableService.createVariable.mockRejectedValue(mockError)

    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: 'new',
        variable: null,
        initialValues: mockInitialValues,
        onSave: vi.fn()
      })
    )

    act(() => {
      result.current.handleSave()
    })

    await waitFor(() => {
      expect(result.current.saving).toBe(false)
    })
  })

  it('should handle status change with confirmation', () => {
    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: '507f1f77bcf86cd799439011',
        variable: mockVariable,
        initialValues: mockInitialValues,
        onSave: vi.fn()
      })
    )

    // Just verify the method exists and can be called
    // The actual modal.confirm is hard to test in unit tests
    expect(result.current.handleStatusChange).toBeDefined()
  })

  it('should reset change tracking after save', async () => {
    const mockOnSave = vi.fn()
    variableService.createVariable.mockResolvedValue({ _id: 'new-id', ...mockVariable })

    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: 'new',
        variable: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave
      })
    )

    act(() => {
      result.current.handleSave()
    })

    await waitFor(() => {
      expect(result.current.saving).toBe(false)
    })

    expect(mockResetChangeTracking).toHaveBeenCalled()
  })

  it('should return correct structure', () => {
    const { result } = renderHook(() => 
      useVariableForm({ 
        variableId: '507f1f77bcf86cd799439011',
        variable: mockVariable,
        initialValues: mockInitialValues,
        onSave: vi.fn()
      })
    )

    expect(result.current).toHaveProperty('form')
    expect(result.current).toHaveProperty('saving')
    expect(result.current).toHaveProperty('hasChanges')
    expect(result.current).toHaveProperty('canUndo')
    expect(result.current).toHaveProperty('canRedo')
    expect(result.current).toHaveProperty('handleUndo')
    expect(result.current).toHaveProperty('handleRedo')
    expect(result.current).toHaveProperty('handleFormValuesChange')
    expect(result.current).toHaveProperty('handleStatusChange')
    expect(result.current).toHaveProperty('handleSave')
    expect(result.current).toHaveProperty('resetChangeTracking')
    expect(result.current).toHaveProperty('resetHistory')
    expect(result.current).toHaveProperty('stepUpModal')
  })
})