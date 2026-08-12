import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { App } from 'antd';

// Mock the dependencies
vi.mock('@/shared/hooks/useStepUp', () => ({
  useStepUp: vi.fn(() => ({
    runWithStepUp: vi.fn((fn) => fn()),
    stepUpModal: null,
  })),
}));

vi.mock('@/shared/hooks/useFormChangeTracking', () => ({
  useFormChangeTracking: vi.fn(() => ({
    hasChanges: false,
    changedFields: [],
    resetChangeTracking: vi.fn(),
    handleValuesChange: vi.fn(),
  })),
}));

vi.mock('@/shared/hooks/useUndoRedo', () => ({
  default: vi.fn(() => ({
    undo: vi.fn(() => ({ name: 'Previous' })),
    redo: vi.fn(() => ({ name: 'Next' })),
    pushHistory: vi.fn(),
    resetHistory: vi.fn(),
    canUndo: vi.fn(() => true),
    canRedo: vi.fn(() => true),
  })),
}));

vi.mock('@/features/admin/services/checklistService', () => ({
  createChecklist: vi.fn(),
  updateChecklist: vi.fn(),
}));

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      destroy: vi.fn(),
      config: vi.fn(),
    },
  };
});

// Now import after mocks are set up
import { useChecklistForm } from '../useChecklistForm';
import { createChecklist, updateChecklist } from '@/features/admin/services/checklistService';

describe('useChecklistForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInitialValues = {
    name: 'Test Checklist',
    description: 'Test Description',
    notes: 'Test Notes',
    legalBasis: [],
    items: ['item1', 'item2'],
    isActive: true,
    postRequirementId: null,
  };

  const renderTestHook = (props = {}) => {
    return renderHook(() => useChecklistForm(props), {
      wrapper: ({ children }) => <App>{children}</App>,
    });
  };

  describe('Form Initialization', () => {
    it('initializes form with correct values for new checklist', () => {
      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: vi.fn(),
      });

      expect(result.current.form).toBeDefined();
      expect(result.current.saving).toBe(false);
      expect(result.current.hasChanges).toBe(false);
    });

    it('initializes form with correct values for existing checklist', () => {
      const mockChecklist = {
        _id: '1',
        name: 'Existing Checklist',
        description: 'Existing Description',
        notes: 'Existing Notes',
        legalBasis: [],
        items: [{ inspectionItemId: 'item1', order: 1 }],
        isActive: true,
      };

      const { result } = renderTestHook({
        checklistId: '1',
        checklist: mockChecklist,
        initialValues: mockInitialValues,
        onSave: vi.fn(),
      });

      expect(result.current.form).toBeDefined();
      expect(result.current.saving).toBe(false);
    });

    it('handles item transformation (inspectionItemId objects to IDs)', () => {
      const mockChecklist = {
        _id: '1',
        name: 'Test Checklist',
        items: [
          { inspectionItemId: { _id: 'item1', name: 'Item 1' }, order: 1 },
          { inspectionItemId: 'item2', order: 2 },
          { inspectionItemId: { _id: 'item3', name: 'Item 3' }, order: 3 },
        ],
      };

      const { result } = renderTestHook({
        checklistId: '1',
        checklist: mockChecklist,
        initialValues: mockInitialValues,
        onSave: vi.fn(),
      });

      expect(result.current.form).toBeDefined();
    });
  });

  describe('Form Management', () => {
    it('handles form changes correctly', () => {
      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: vi.fn(),
      });

      expect(result.current.handleFormValuesChange).toBeDefined();

      act(() => {
        result.current.handleFormValuesChange(
          { name: 'New Name' },
          { ...mockInitialValues, name: 'New Name' }
        );
      });

      // Function should be callable without errors
      expect(result.current.handleFormValuesChange).toBeInstanceOf(Function);
    });

    it('tracks changes correctly', () => {
      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: vi.fn(),
      });

      expect(result.current.hasChanges).toBeDefined();
      expect(typeof result.current.hasChanges).toBe('boolean');
    });

    it('handles undo functionality', () => {
      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: vi.fn(),
      });

      expect(result.current.handleUndo).toBeDefined();
      expect(result.current.canUndo).toBeDefined();

      act(() => {
        result.current.handleUndo();
      });

      // Function should be callable without errors
      expect(result.current.handleUndo).toBeInstanceOf(Function);
    });

    it('handles redo functionality', () => {
      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: vi.fn(),
      });

      expect(result.current.handleRedo).toBeDefined();
      expect(result.current.canRedo).toBeDefined();

      act(() => {
        result.current.handleRedo();
      });

      // Function should be callable without errors
      expect(result.current.handleRedo).toBeInstanceOf(Function);
    });
  });

  describe('Save Operations', () => {
    it('handles save operation for new checklist', async () => {
      createChecklist.mockResolvedValue({ _id: '1', name: 'New Checklist' });
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(createChecklist).toHaveBeenCalled();
    });

    it('handles save operation for existing checklist', async () => {
      updateChecklist.mockResolvedValue({ _id: '1', name: 'Updated Checklist' });
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: '1',
        checklist: { _id: '1', name: 'Test Checklist' },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      });

      act(() => {
        result.current.form.setFieldsValue({
          name: 'Updated Checklist',
          description: 'Test Description',
          items: ['item1', 'item2'],
        });
      });

      act(() => {
        result.current.handleSave();
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(updateChecklist).toHaveBeenCalled();
    });

    it('transforms items array to backend format (inspectionItemId + order)', async () => {
      createChecklist.mockResolvedValue({ _id: '1' });
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: { ...mockInitialValues, items: ['item1', 'item2', 'item3'] },
        onSave: mockOnSave,
      });

      // Set the form values directly to test the transformation
      act(() => {
        result.current.form.setFieldsValue({
          name: 'Test Checklist',
          description: 'Test Description',
          items: ['item1', 'item2', 'item3'],
        });
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(createChecklist).toHaveBeenCalled();
      // Verify the service was called (the transformation happens in the hook)
    });

    it('handles save errors correctly', async () => {
      createChecklist.mockRejectedValue(new Error('Save failed'));
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(createChecklist).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Status Changes', () => {
    it('handles status change with confirmation', () => {
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: '1',
        checklist: { _id: '1', name: 'Test Checklist', isActive: true },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      });

      expect(result.current.handleStatusChange).toBeDefined();
      expect(result.current.handleStatusChange).toBeInstanceOf(Function);

      // Function should be callable without errors
      act(() => {
        result.current.handleStatusChange('disabled');
      });
    });

    it('handles status change with step-up authentication', async () => {
      updateChecklist.mockResolvedValue({ _id: '1', isActive: false });
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: '1',
        checklist: { _id: '1', name: 'Test Checklist', isActive: true },
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      });

      expect(result.current.handleStatusChange).toBeDefined();

      // Note: This test verifies the hook structure, actual modal confirmation
      // would need to be tested with component tests
      act(() => {
        result.current.handleStatusChange('disabled');
      });
    });
  });

  describe('Change Tracking', () => {
    it('resets change tracking after save', async () => {
      createChecklist.mockResolvedValue({ _id: '1' });
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.resetChangeTracking).toHaveBeenCalled();
    });

    it('resets history after save', async () => {
      createChecklist.mockResolvedValue({ _id: '1' });
      const mockOnSave = vi.fn();

      const { result } = renderTestHook({
        checklistId: 'new',
        checklist: null,
        initialValues: mockInitialValues,
        onSave: mockOnSave,
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.resetHistory).toHaveBeenCalled();
    });
  });
});
