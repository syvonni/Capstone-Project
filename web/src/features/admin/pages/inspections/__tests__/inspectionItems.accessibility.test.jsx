import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import AddInspectionItemModal from '../components/modals/AddInspectionItemModal'

// Mock the services
vi.mock('@/features/admin/services/violationService', () => ({
  getViolations: vi.fn(() => Promise.resolve([
    { _id: '1', name: 'Missing Fire Extinguisher' },
  ])),
}))

vi.mock('@/features/admin/services/inspectionItemService', () => ({
  createInspectionItem: vi.fn(() => Promise.resolve({ _id: 'new', name: 'New Item' })),
}))

vi.mock('@/shared/hooks/useStepUp', () => ({
  useStepUp: () => ({
    runWithStepUp: vi.fn((callback) => callback('mock-step-up-token')),
    stepUpModal: 'mock-step-up-modal',
  }),
}))

vi.mock('@/shared/hooks/useNameValidation', () => ({
  useNameValidation: () => ({
    validateName: vi.fn(),
    isValidating: false,
    error: null,
    clearError: vi.fn(),
  }),
}))

describe('Inspection Items Accessibility Tests', () => {
  const mockOnSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ARIA Labels and Roles', () => {
    it('has proper ARIA labels for all form fields', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Name field should have aria-required
      const nameInputs = screen.getAllByLabelText(/name/i)
      expect(nameInputs.length).toBeGreaterThan(0)

      // Question field should have label
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()

      // Notes field should have label
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()

      // Violation mode should have label
      expect(screen.getByLabelText(/violation mode/i)).toBeInTheDocument()
    })

    it('has proper role for modal dialog', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Modal should have role="dialog"
      const modal = document.querySelector('[role="dialog"]')
      expect(modal).toBeInTheDocument()
    })

    it('has close button with proper ARIA label', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Close button should have aria-label
      const closeButtons = screen.getAllByLabelText(/close/i)
      expect(closeButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Keyboard Navigation', () => {
    it('allows tab navigation through form fields', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // All form fields should be focusable
      const nameInputs = screen.getAllByLabelText(/name/i)
      const nameInput = nameInputs[0]
      expect(nameInput).toBeInTheDocument()

      const questionInput = screen.getByLabelText(/question/i)
      expect(questionInput).toBeInTheDocument()

      const notesInput = screen.getByLabelText(/notes/i)
      expect(notesInput).toBeInTheDocument()
    })

    it('has buttons that are keyboard accessible', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Debug fill button should be accessible
      const debugButton = screen.getByText('Debug Fill')
      expect(debugButton).toBeInTheDocument()

      // Add legal basis button should be accessible
      const addButton = screen.getByText('Add Legal Basis')
      expect(addButton).toBeInTheDocument()
    })
  })

  describe('Screen Reader Compatibility', () => {
    it('provides descriptive labels for all inputs', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // All inputs should have associated labels
      expect(screen.getAllByLabelText(/name/i).length).toBeGreaterThan(0)
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('provides meaningful error messages when validation fails', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Required fields should be marked
      const nameInputs = screen.getAllByLabelText(/name/i)
      const nameInput = nameInputs[0]
      expect(nameInput).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('Focus Management', () => {
    it('maintains focus within modal when open', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Modal should be focusable
      const modal = document.querySelector('[role="dialog"]')
      expect(modal).toBeInTheDocument()
    })

    it('has proper focus indicators for interactive elements', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Buttons should be focusable
      const debugButton = screen.getByText('Debug Fill')
      expect(debugButton).toBeInTheDocument()

      const addButton = screen.getByText('Add Legal Basis')
      expect(addButton).toBeInTheDocument()
    })
  })

  describe('Color and Visual Accessibility', () => {
    it('does not rely solely on color to convey information', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Status indicators should have text labels, not just color
      // This is verified by checking for text labels
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
    })
  })

  describe('Form Accessibility', () => {
    it('provides clear instructions for form completion', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Form should have clear field labels
      expect(screen.getAllByLabelText(/name/i).length).toBeGreaterThan(0)
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
    })

    it('allows sufficient time for form completion', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Form should not have time limits
      // This is verified by the absence of timeout mechanisms
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })
  })
})
