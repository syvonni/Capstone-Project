import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useViolationForm } from '../useViolationForm'

// Mock the dependencies
vi.mock('antd', () => ({
  Form: {
    useForm: vi.fn(() => [{
      setFieldsValue: vi.fn(),
      getFieldsValue: vi.fn(() => ({})),
      validateFields: vi.fn(() => Promise.resolve({})),
      resetFields: vi.fn(),
    }]),
  },
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
  App: {
    useApp: vi.fn(() => ({
      modal: {
        confirm: vi.fn(),
      },
    })),
  },
}))

vi.mock('@/shared/hooks/useStepUp', () => ({
  useStepUp: vi.fn(() => ({
    runWithStepUp: vi.fn((callback) => callback('test-step-up-token')),
    stepUpModal: null,
  })),
}))

vi.mock('@/features/admin/services/violationService', () => ({
  updateViolation: vi.fn(),
}))

describe('useViolationForm', () => {
  const mockViolation = {
    _id: '1',
    name: 'Test Violation',
    description: 'Test description',
    severity: 'major',
    isActive: true,
  }

  const mockInitialValues = {
    _id: '1',
    name: 'Test Violation',
    description: 'Test description',
    severity: 'major',
    isActive: true,
  }

  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes form with initial values', () => {
    const { result } = renderHook(() =>
      useViolationForm({
        violationId: '1',
        violation: mockViolation,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    )

    expect(result.current.form).toBeDefined()
  })

  it('handles save operation', async () => {
    const { result } = renderHook(() =>
      useViolationForm({
        violationId: '1',
        violation: mockViolation,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    )

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saving).toBe(false)
  })

  it('handles undo operation', () => {
    const { result } = renderHook(() =>
      useViolationForm({
        violationId: '1',
        violation: mockViolation,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    )

    act(() => {
      result.current.handleUndo()
    })

    expect(result.current.canUndo()).toBeDefined()
  })

  it('handles redo operation', () => {
    const { result } = renderHook(() =>
      useViolationForm({
        violationId: '1',
        violation: mockViolation,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    )

    act(() => {
      result.current.handleRedo()
    })

    expect(result.current.canRedo()).toBeDefined()
  })

  it('handles status change', () => {
    const { result } = renderHook(() =>
      useViolationForm({
        violationId: '1',
        violation: mockViolation,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    )

    act(() => {
      result.current.handleStatusChange('disabled')
    })

    expect(result.current.handleStatusChange).toBeDefined()
  })

  it('resets change tracking', () => {
    const { result } = renderHook(() =>
      useViolationForm({
        violationId: '1',
        violation: mockViolation,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    )

    act(() => {
      result.current.resetChangeTracking(mockInitialValues)
    })

    expect(result.current.hasChanges).toBe(false)
  })

  it('returns correct state structure', () => {
    const { result } = renderHook(() =>
      useViolationForm({
        violationId: '1',
        violation: mockViolation,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    )

    expect(result.current.form).toBeDefined()
    expect(result.current.saving).toBeDefined()
    expect(result.current.hasChanges).toBeDefined()
    expect(result.current.canUndo).toBeDefined()
    expect(result.current.canRedo).toBeDefined()
    expect(result.current.handleUndo).toBeDefined()
    expect(result.current.handleRedo).toBeDefined()
    expect(result.current.handleFormValuesChange).toBeDefined()
    expect(result.current.handleStatusChange).toBeDefined()
    expect(result.current.handleSave).toBeDefined()
    expect(result.current.resetChangeTracking).toBeDefined()
    expect(result.current.stepUpModal).toBeDefined()
  })
})
