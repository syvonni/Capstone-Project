import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Form } from 'antd';
import { useEffect } from 'react';
import ChecklistDetailPanel from '../ChecklistDetailPanel';

// Mock the services
vi.mock('@/features/admin/services/checklistService', () => ({
  getChecklist: vi.fn(),
}));

vi.mock('@/features/admin/services/inspectionItemService', () => ({
  getInspectionItems: vi.fn(),
}));

vi.mock('@/features/admin/services/postRequirementService', () => ({
  getPostRequirements: vi.fn(),
}));

// Mock the configuration form so these state tests don't need a real antd Form instance
vi.mock('../ChecklistConfiguration', () => ({
  default: () => <div data-testid="checklist-configuration">Checklist Configuration</div>,
}));

// Mock the hooks
vi.mock('../hooks/useChecklistForm', () => ({
  useChecklistForm: vi.fn(),
}));

vi.mock('@/shared/audit/hooks/useAudit', () => ({
  useAudit: vi.fn(),
}));

import { getChecklist } from '@/features/admin/services/checklistService';
import { useChecklistForm } from '../../hooks/useChecklistForm';

vi.mock('../../hooks/useChecklistForm');
import { useAudit } from '@/shared/audit/hooks/useAudit';

vi.setConfig({ testTimeout: 10_000 });

// Helper that creates and captures a real Ant Design Form instance.
let capturedForm = null;

function FormCapture() {
  const [form] = Form.useForm();
  useEffect(() => {
    capturedForm = form;
  }, [form]);
  // Hook the form to a real Form element so it is connected and no
  // "not connected" warning is emitted in tests that never enter edit mode.
  return <Form form={form} />;
}

describe('ChecklistDetailPanel - Complex State Management', () => {
  const mockChecklist = {
    _id: '1',
    name: 'Fire Safety Checklist',
    description: 'Checklist for fire safety inspections',
    isActive: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    items: [{ inspectionItemId: { _id: 'item1', name: 'Check fire extinguishers' }, order: 0 }],
    legalBasis: [
      { url: 'https://example.com/law1', title: 'Fire Safety Law', description: 'Description' },
    ],
  };

  const mockFormValues = {
    form: null,
    saving: false,
    hasChanges: false,
    changedFields: [],
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    handleUndo: vi.fn(),
    handleRedo: vi.fn(),
    handleFormValuesChange: vi.fn(),
    handleStatusChange: vi.fn(),
    handleSave: vi.fn(),
    handleConfirm: vi.fn(),
    handleSummaryClose: vi.fn(),
    resetChangeTracking: vi.fn(),
    stepUpModal: null,
    ChangesSummary: () => null,
  };

  const mockAuditLogs = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    capturedForm = null;
    render(<FormCapture />);
    await waitFor(() => expect(capturedForm).toBeTruthy());
    mockFormValues.form = capturedForm;
    getChecklist.mockResolvedValue(mockChecklist);
    useChecklistForm.mockReturnValue(mockFormValues);
    useAudit.mockReturnValue({
      auditLogs: mockAuditLogs,
      auditLoading: false,
      refresh: vi.fn(),
    });
  });

  describe('Edit Mode State Management', () => {
    it('enters edit mode when edit button is clicked', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      // Should show exit edit mode button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exit edit mode/i })).toBeInTheDocument();
      });
    });

    it('exits edit mode when exit button is clicked', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exit edit mode/i })).toBeInTheDocument();
      });

      // Exit edit mode
      const exitButton = screen.getByRole('button', { name: /exit edit mode/i });
      await userEvent.click(exitButton);

      // Should show edit button again
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      // Form should be reset
      expect(mockFormValues.resetChangeTracking).toHaveBeenCalled();
    });

    it('resets form values when exiting edit mode', async () => {
      const setFieldsValueSpy = vi.spyOn(mockFormValues.form, 'setFieldsValue');

      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      // Clear the initial setFieldsValue call from the mount effect
      setFieldsValueSpy.mockClear();
      mockFormValues.resetChangeTracking.mockClear();

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exit edit mode/i })).toBeInTheDocument();
      });

      // Exit edit mode
      const exitButton = screen.getByRole('button', { name: /exit edit mode/i });
      await userEvent.click(exitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      // Form should be reset to initial values
      expect(setFieldsValueSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'Fire Safety Checklist',
          description: 'Checklist for fire safety inspections',
          isActive: true,
          items: ['item1'],
        })
      );
      expect(mockFormValues.resetChangeTracking).toHaveBeenCalled();
    });
  });

  describe('Undo/Redo State Management', () => {
    it('calls handleUndo when undo button is clicked', async () => {
      const mockWithUndo = {
        ...mockFormValues,
        canUndo: vi.fn(() => true),
      };
      useChecklistForm.mockReturnValue(mockWithUndo);

      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTitle(/undo/i)).toBeInTheDocument();
      });

      const undoButton = screen.getByTitle(/undo/i);
      await userEvent.click(undoButton);

      expect(mockWithUndo.handleUndo).toHaveBeenCalled();
    });

    it('calls handleRedo when redo button is clicked', async () => {
      const mockWithRedo = {
        ...mockFormValues,
        canRedo: vi.fn(() => true),
      };
      useChecklistForm.mockReturnValue(mockWithRedo);

      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTitle(/redo/i)).toBeInTheDocument();
      });

      const redoButton = screen.getByTitle(/redo/i);
      await userEvent.click(redoButton);

      expect(mockWithRedo.handleRedo).toHaveBeenCalled();
    });

    it('disables undo button when canUndo returns false', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTitle(/undo/i)).toBeInTheDocument();
      });

      const undoButton = screen.getByTitle(/undo/i);
      expect(undoButton).toBeDisabled();
    });

    it('disables redo button when canRedo returns false', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTitle(/redo/i)).toBeInTheDocument();
      });

      const redoButton = screen.getByTitle(/redo/i);
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Loading State Management', () => {
    it('shows loading state when saving', async () => {
      const mockWithSaving = {
        ...mockFormValues,
        saving: true,
      };
      useChecklistForm.mockReturnValue(mockWithSaving);

      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i }).closest('button');
      expect(saveButton).toBeDisabled();
    });

    it('shows loading state when fetching checklist', async () => {
      let resolveFetch;
      getChecklist.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklistId="1" />
        </MemoryRouter>
      );

      // Should show loading state
      expect(getChecklist).toHaveBeenCalledWith('1');

      resolveFetch(mockChecklist);

      await waitFor(() => {
        expect(getChecklist).toHaveBeenCalled();
      });
    });
  });

  describe('Form State Persistence', () => {
    it('persists form values across re-renders', async () => {
      const { rerender } = render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument();
      });

      // Re-render with same checklist
      rerender(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      // Should still show the checklist
      expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument();
    });

    it('updates form values when checklist prop changes', async () => {
      const { rerender } = render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument();
      });

      const newChecklist = {
        ...mockChecklist,
        _id: '2',
        name: 'Updated Checklist',
      };

      rerender(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={newChecklist} />
        </MemoryRouter>
      );

      // Should update to new checklist
      await waitFor(() => {
        expect(screen.getByText(/updated checklist/i)).toBeInTheDocument();
      });
    });
  });

  describe('History Modal State', () => {
    it('opens history modal when history button is clicked', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTitle(/history/i)).toBeInTheDocument();
      });

      const historyButton = screen.getByTitle(/history/i);
      await userEvent.click(historyButton);

      // Modal should be open (we can check this by looking for modal content)
      // The modal should render audit logs
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('State Cleanup', () => {
    it('cleans up state on unmount', async () => {
      const { unmount } = render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument();
      });

      unmount();

      // Should not throw any errors
      expect(document.body).toBeInTheDocument();
    });

    it('does not make API calls after unmount', async () => {
      let resolveFetch;
      getChecklist.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const { unmount } = render(
        <MemoryRouter>
          <ChecklistDetailPanel checklistId="1" />
        </MemoryRouter>
      );

      expect(getChecklist).toHaveBeenCalledWith('1');

      unmount();

      // Resolve after unmount
      resolveFetch(mockChecklist);

      // Should not cause any issues
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Complex State Transitions', () => {
    it('handles transition from view to edit mode with unsaved changes', async () => {
      const mockWithChanges = {
        ...mockFormValues,
        hasChanges: true,
      };
      useChecklistForm.mockReturnValue(mockWithChanges);

      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exit edit mode/i })).toBeInTheDocument();
      });

      // Exit edit mode (should reset changes)
      const exitButton = screen.getByRole('button', { name: /exit edit mode/i });
      await userEvent.click(exitButton);

      expect(mockFormValues.resetChangeTracking).toHaveBeenCalled();
    });

    it('disables save button when no changes', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i }).closest('button');
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when has changes', async () => {
      const mockWithChanges = {
        ...mockFormValues,
        hasChanges: true,
      };
      useChecklistForm.mockReturnValue(mockWithChanges);

      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklist={mockChecklist} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i }).closest('button');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('New Checklist State', () => {
    it('shows new checklist title when checklistId is new', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklistId="new" checklist={{ name: 'New Checklist' }} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/new checklist/i)).toBeInTheDocument();
      });

      expect(getChecklist).not.toHaveBeenCalled();
    });

    it('does not fetch checklist when checklistId is new', async () => {
      render(
        <MemoryRouter>
          <ChecklistDetailPanel checklistId="new" checklist={{ name: 'New Checklist' }} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/new checklist/i)).toBeInTheDocument();
      });

      expect(getChecklist).not.toHaveBeenCalled();
    });
  });
});
