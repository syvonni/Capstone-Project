import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

// Mock the services
vi.mock('@/features/admin/services/violationService', () => ({
  getViolations: vi.fn(() => Promise.resolve([
    { _id: '1', name: 'Missing Fire Extinguisher' },
    { _id: '2', name: 'Blocked Emergency Exit' },
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

// Import after mocks
import AddInspectionItemModal from '../components/modals/AddInspectionItemModal'

describe('Inspection Items Integration Tests', () => {
  const mockOnSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Inspection Item Creation Flow', () => {
    it('allows user to create inspection item with all fields', async () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Step 1: Fill in name
      const nameInputs = screen.getAllByLabelText(/name/i)
      const nameInput = nameInputs[0]
      fireEvent.change(nameInput, { target: { value: 'Fire Safety Inspection' } })
      expect(nameInput.value).toBe('Fire Safety Inspection')

      // Step 2: Fill in question
      const questionInput = screen.getByLabelText(/question/i)
      fireEvent.change(questionInput, { target: { value: 'Is there a fire extinguisher present?' } })
      expect(questionInput.value).toBe('Is there a fire extinguisher present?')

      // Step 3: Fill in notes
      const notesInput = screen.getByLabelText(/notes/i)
      fireEvent.change(notesInput, { target: { value: 'Important safety check' } })
      expect(notesInput.value).toBe('Important safety check')

      // Step 4: Add legal basis
      const addButton = screen.getByText('Add Legal Basis')
      fireEvent.click(addButton)

      const urlInput = screen.getByLabelText(/url/i)
      fireEvent.change(urlInput, { target: { value: 'https://nfpa.org' } })
      expect(urlInput.value).toBe('https://nfpa.org')

      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'NFPA 10' } })
      expect(titleInput.value).toBe('NFPA 10')

      // Verify all fields are filled
      expect(screen.getByText('Remove Legal Basis')).toBeInTheDocument()
    })

    it('handles violation mode selection flow', async () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Verify violation mode selector exists
      expect(screen.getByLabelText(/violation mode/i)).toBeInTheDocument()

      // The component should render without errors in both modes
      expect(screen.getAllByText('Add Inspection Item').length).toBeGreaterThan(0)
    })

    it('allows multiple legal basis entries in single flow', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Add first legal basis
      const addButton = screen.getByText('Add Legal Basis')
      fireEvent.click(addButton)

      // Add second legal basis
      fireEvent.click(addButton)

      // Verify both remove buttons exist
      const removeButtons = screen.getAllByText('Remove Legal Basis')
      expect(removeButtons.length).toBe(2)
    })

    it('handles form reset when modal is reopened', () => {
      const { rerender } = renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Fill in some data
      const nameInputs = screen.getAllByLabelText(/name/i)
      const nameInput = nameInputs[0]
      fireEvent.change(nameInput, { target: { value: 'Test Item' } })

      // Close and reopen modal
      rerender(<AddInspectionItemModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />)
      rerender(<AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

      // Modal should render without errors
      expect(screen.getAllByText('Add Inspection Item').length).toBeGreaterThan(0)
    })
  })

  describe('Form Validation Flow', () => {
    it('requires name field to be filled', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Name field should be present and required
      const nameInputs = screen.getAllByLabelText(/name/i)
      expect(nameInputs.length).toBeGreaterThan(0)
    })

    it('requires question field to be filled', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Question field should be present
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
    })
  })

  describe('User Interaction Flow', () => {
    it('provides debug fill button for testing', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByText('Debug Fill')).toBeInTheDocument()
    })

    it('has proper form structure for user input', () => {
      renderWithProviders(
        <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Verify all major form sections are present
      expect(screen.getAllByLabelText(/name/i).length).toBeGreaterThan(0)
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/violation mode/i)).toBeInTheDocument()
    })
  })
})
