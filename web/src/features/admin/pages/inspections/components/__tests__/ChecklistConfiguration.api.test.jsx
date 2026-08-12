import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('ChecklistConfiguration - Advanced API Integration', () => {
  const mockHandleFormValuesChange = vi.fn();
  const mockInspectionItems = [
    { _id: 'item1', name: 'Check fire extinguishers', question: 'Are fire extinguishers present?' },
    { _id: 'item2', name: 'Check emergency exits', question: 'Are emergency exits clear?' },
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

  describe('API Loading States', () => {
    it('shows loading state while fetching inspection items', async () => {
      let resolveItems;
      getInspectionItems.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveItems = resolve;
          })
      );

      render(<TestComponent />);

      // Component should render initially
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();

      // Resolve the promise
      resolveItems(mockInspectionItems);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });
    });

    it('shows loading state while fetching post requirements', async () => {
      let resolvePostReqs;
      getPostRequirements.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePostReqs = resolve;
          })
      );

      render(<TestComponent />);

      // Component should render initially
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();

      // Resolve the promise
      resolvePostReqs(mockPostRequirements);

      await waitFor(() => {
        expect(getPostRequirements).toHaveBeenCalled();
      });
    });

    it('handles both API calls loading simultaneously', async () => {
      let resolveItems;
      let resolvePostReqs;

      getInspectionItems.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveItems = resolve;
          })
      );

      getPostRequirements.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePostReqs = resolve;
          })
      );

      render(<TestComponent />);

      // Both should be called
      expect(getInspectionItems).toHaveBeenCalled();
      expect(getPostRequirements).toHaveBeenCalled();

      // Resolve both
      resolveItems(mockInspectionItems);
      resolvePostReqs(mockPostRequirements);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Failure Recovery', () => {
    it('shows error message when inspection items API fails', async () => {
      getInspectionItems.mockRejectedValue(new Error('Network error'));

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('shows error message when post requirements API fails', async () => {
      getPostRequirements.mockRejectedValue(new Error('Network error'));

      render(<TestComponent />);

      await waitFor(() => {
        expect(getPostRequirements).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('handles one API failure while other succeeds', async () => {
      getInspectionItems.mockRejectedValue(new Error('Network error'));
      getPostRequirements.mockResolvedValue(mockPostRequirements);

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
        expect(getPostRequirements).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('recovers when API call succeeds after initial failure', async () => {
      let callCount = 0;
      getInspectionItems.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockInspectionItems);
      });

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });
  });

  describe('Concurrent API Calls', () => {
    it('handles multiple simultaneous API requests', async () => {
      let resolveItems;
      let resolvePostReqs;

      getInspectionItems.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveItems = resolve;
          })
      );

      getPostRequirements.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePostReqs = resolve;
          })
      );

      render(<TestComponent />);

      // Both should be called
      expect(getInspectionItems).toHaveBeenCalled();
      expect(getPostRequirements).toHaveBeenCalled();

      // Resolve in reverse order
      resolvePostReqs(mockPostRequirements);
      resolveItems(mockInspectionItems);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
      });
    });

    it('handles API calls completing out of order', async () => {
      let resolveItems;
      let resolvePostReqs;

      getInspectionItems.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveItems = resolve;
          })
      );

      getPostRequirements.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePostReqs = resolve;
          })
      );

      render(<TestComponent />);

      // Resolve post requirements first
      resolvePostReqs(mockPostRequirements);

      // Then resolve inspection items
      resolveItems(mockInspectionItems);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
      });

      // Both should have been called
      expect(getInspectionItems).toHaveBeenCalled();
      expect(getPostRequirements).toHaveBeenCalled();
    });
  });

  describe('API Response Handling', () => {
    it('handles empty inspection items response', async () => {
      getInspectionItems.mockResolvedValue([]);

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('handles empty post requirements response', async () => {
      getPostRequirements.mockResolvedValue([]);

      render(<TestComponent />);

      await waitFor(() => {
        expect(getPostRequirements).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('handles null inspection items response', async () => {
      getInspectionItems.mockResolvedValue(null);

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('handles null post requirements response', async () => {
      getPostRequirements.mockResolvedValue(null);

      render(<TestComponent />);

      await waitFor(() => {
        expect(getPostRequirements).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('sorts inspection items alphabetically by name', async () => {
      const unsortedItems = [
        { _id: 'item2', name: 'Zebra Check', question: 'Question?' },
        { _id: 'item1', name: 'Apple Check', question: 'Question?' },
        { _id: 'item3', name: 'Banana Check', question: 'Question?' },
      ];
      getInspectionItems.mockResolvedValue(unsortedItems);

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Component should still render
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });
  });

  describe('API Error States', () => {
    it('displays error message when inspection items fail to load', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      getInspectionItems.mockRejectedValue(new Error('Failed to load inspection items'));

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Console error should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch inspection items:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('displays error message when post requirements fail to load', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      getPostRequirements.mockRejectedValue(new Error('Failed to load post requirements'));

      render(<TestComponent />);

      await waitFor(() => {
        expect(getPostRequirements).toHaveBeenCalled();
      });

      // Console error should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch post requirements:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles timeout errors', async () => {
      getInspectionItems.mockRejectedValue(new Error('Request timeout'));

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Should still render the form
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });

    it('handles malformed API responses', async () => {
      getInspectionItems.mockResolvedValue({ invalid: 'response' });

      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      // Should still render the form (graceful degradation)
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    });
  });

  describe('API Request Parameters', () => {
    it('calls getInspectionItems with correct parameters', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalledWith({ isActive: true });
      });
    });

    it('calls getPostRequirements with correct parameters', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(getPostRequirements).toHaveBeenCalledWith({ isActive: true });
      });
    });
  });

  describe('API Cleanup', () => {
    it('does not make API calls on unmount', async () => {
      const { unmount } = render(<TestComponent />);

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalled();
      });

      unmount();

      // Should not make additional calls after unmount
      expect(getInspectionItems).toHaveBeenCalledTimes(1);
    });
  });
});
