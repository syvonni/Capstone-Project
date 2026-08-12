import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Form } from 'antd';
import ChecklistConfiguration from '../ChecklistConfiguration';

// Mock the services
vi.mock('@/features/admin/services/inspectionItemService', () => ({
  getInspectionItems: vi.fn(),
}));

vi.mock('@/features/admin/services/postRequirementService', () => ({
  getPostRequirements: vi.fn(),
}));

import { getInspectionItems } from '@/features/admin/services/inspectionItemService';
import { getPostRequirements } from '@/features/admin/services/postRequirementService';

describe('ChecklistConfiguration - Complex User Interactions', () => {
  const mockHandleFormValuesChange = vi.fn();
  const mockInspectionItems = [
    { _id: 'item1', name: 'Check fire extinguishers', question: 'Are fire extinguishers present?' },
    { _id: 'item2', name: 'Check emergency exits', question: 'Are emergency exits clear?' },
    { _id: 'item3', name: 'Check smoke detectors', question: 'Are smoke detectors functional?' },
  ];

  const mockPostRequirements = [
    { _id: 'pr1', name: 'Fire Safety Post-Requirement' },
    { _id: 'pr2', name: 'Building Code Post-Requirement' },
  ];

  // Test component that uses the form instance
  const TestComponent = () => {
    const [form] = Form.useForm();
    return (
      <ChecklistConfiguration form={form} handleFormValuesChange={mockHandleFormValuesChange} />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getInspectionItems.mockResolvedValue(mockInspectionItems);
    getPostRequirements.mockResolvedValue(mockPostRequirements);
  });

  describe('Button Click Interactions', () => {
    it('clicking add legal basis button adds new legal basis entry', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText(/add legal basis/i)).toBeInTheDocument();
      });

      // Initially no legal basis entries
      const initialLegalBasis = screen.queryAllByText(/remove legal basis/i);
      expect(initialLegalBasis.length).toBe(0);

      // Click add button
      const addButton = screen.getByText(/add legal basis/i);
      await userEvent.click(addButton);

      // Should now have one remove button
      await waitFor(() => {
        const removeButtons = screen.getAllByText(/remove legal basis/i);
        expect(removeButtons.length).toBe(1);
      });

      // Verify form was updated
      expect(mockHandleFormValuesChange).toHaveBeenCalled();
    });

    it('clicking remove legal basis button removes entry', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText(/add legal basis/i)).toBeInTheDocument();
      });

      // Add a legal basis first
      const addButton = screen.getByText(/add legal basis/i);
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getAllByText(/remove legal basis/i).length).toBe(1);
      });

      // Click remove button
      const removeButton = screen.getByText(/remove legal basis/i);
      await userEvent.click(removeButton);

      // Should have no remove buttons now
      await waitFor(() => {
        const removeButtons = screen.queryAllByText(/remove legal basis/i);
        expect(removeButtons.length).toBe(0);
      });

      // Verify form was updated
      expect(mockHandleFormValuesChange).toHaveBeenCalled();
    });
  });

  describe('Form Input Interactions', () => {
    it('typing in name field updates form value', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(/name/i);
      await userEvent.type(nameInput, 'Test Checklist');

      expect(nameInput.value).toBe('Test Checklist');

      // Verify form callback was called
      expect(mockHandleFormValuesChange).toHaveBeenCalled();
    });

    it('typing in description field updates form value', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
      });

      const descInput = screen.getByPlaceholderText(/description/i);
      await userEvent.type(descInput, 'Test Description');

      expect(descInput.value).toBe('Test Description');

      // Verify form callback was called
      expect(mockHandleFormValuesChange).toHaveBeenCalled();
    });
  });

  describe('Rapid User Actions', () => {
    it('handles rapid button clicks without errors', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText(/add legal basis/i)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/add legal basis/i);

      // Rapidly click add button 10 times
      for (let i = 0; i < 10; i++) {
        await userEvent.click(addButton);
      }

      // Should have 10 remove buttons now
      await waitFor(() => {
        const removeButtons = screen.getAllByText(/remove legal basis/i);
        expect(removeButtons.length).toBe(10);
      });

      // Should not crash
      expect(document.body).toBeInTheDocument();
    });

    it('handles rapid form input changes without errors', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(/name/i);

      // Rapidly type and clear
      for (let i = 0; i < 5; i++) {
        await userEvent.type(nameInput, 'Test');
        await userEvent.clear(nameInput);
      }

      // Should not crash
      expect(document.body).toBeInTheDocument();
    });
  });
});
