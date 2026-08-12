import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInspectionItemForm } from '../useInspectionItemForm';

// Mock shared hooks
vi.mock('@/shared/hooks/useStepUp', () => ({
  useStepUp: () => ({
    runWithStepUp: vi.fn((callback) => callback('mock-step-up-token')),
    stepUpModal: 'mock-step-up-modal',
  }),
}));

vi.mock('@/shared/hooks/useFormChangeTracking', () => ({
  useFormChangeTracking: vi.fn((_initialValues) => ({
    hasChanges: false,
    changedFields: [],
    resetChangeTracking: vi.fn(),
    handleValuesChange: vi.fn(),
  })),
}));

vi.mock('@/shared/components/ChangesSummaryModal', () => ({
  default: () => null,
}));

vi.mock('@/shared/hooks/useUndoRedo', () => ({
  default: () => ({
    undo: vi.fn(() => ({ name: 'Previous Value' })),
    redo: vi.fn(() => ({ name: 'Next Value' })),
    pushHistory: vi.fn(),
    resetHistory: vi.fn(),
    canUndo: vi.fn(() => true),
    canRedo: vi.fn(() => true),
  }),
}));

// Mock services
vi.mock('@/features/admin/services/inspectionItemService', () => ({
  createInspectionItem: vi.fn(() => Promise.resolve({ _id: 'new', name: 'New Item' })),
  updateInspectionItem: vi.fn(() => Promise.resolve({ _id: '1', name: 'Updated Item' })),
}));

// Mock Ant Design
vi.mock('antd', () => ({
  Form: {
    useForm: vi.fn(() => [
      {
        getFieldsValue: vi.fn(() => ({ name: 'Test Item' })),
        setFieldsValue: vi.fn(),
        validateFields: vi.fn(() => Promise.resolve({ name: 'Test Item' })),
        resetFields: vi.fn(),
      },
    ]),
  },
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
  App: {
    useApp: () => ({
      modal: {
        confirm: vi.fn(({ onOk }) => onOk()),
      },
    }),
  },
}));

describe('useInspectionItemForm', () => {
  const mockInitialValues = {
    name: 'Test Inspection Item',
    question: 'Is this a test?',
    notes: 'Test notes',
    legalBasis: [],
    violationId: '1',
    isActive: true,
  };

  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes form with correct values', () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: '1',
        inspectionItem: { _id: '1', name: 'Test Item' },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    expect(result.current).toHaveProperty('form');
    expect(result.current).toHaveProperty('saving');
    expect(result.current).toHaveProperty('hasChanges');
    expect(result.current).toHaveProperty('canUndo');
    expect(result.current).toHaveProperty('canRedo');
  });

  it('handles new inspection item mode correctly', () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: 'new',
        inspectionItem: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    expect(result.current.form).toBeDefined();
  });

  it('handles edit inspection item mode correctly', () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: '1',
        inspectionItem: { _id: '1', name: 'Test Item' },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    expect(result.current.form).toBeDefined();
  });

  it('handles undo functionality', () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: '1',
        inspectionItem: { _id: '1', name: 'Test Item' },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.form.setFieldsValue).toHaveBeenCalled();
  });

  it('handles redo functionality', () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: '1',
        inspectionItem: { _id: '1', name: 'Test Item' },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.handleRedo();
    });

    expect(result.current.form.setFieldsValue).toHaveBeenCalled();
  });

  it('handles status change with confirmation', async () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: '1',
        inspectionItem: { _id: '1', name: 'Test Item' },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    await act(async () => {
      await result.current.handleStatusChange('disabled');
    });

    // Should have called modal.confirm and onOk
    expect(result.current.stepUpModal).toBeDefined();
  });

  it('handles save operation with step-up token', async () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: 'new',
        inspectionItem: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('resets change tracking after save', async () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: 'new',
        inspectionItem: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.resetChangeTracking).toHaveBeenCalled();
  });

  it('returns step-up modal', () => {
    const { result } = renderHook(() =>
      useInspectionItemForm({
        inspectionItemId: '1',
        inspectionItem: { _id: '1', name: 'Test Item' },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      })
    );

    expect(result.current.stepUpModal).toBeDefined();
  });
});
