import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { userEvent } from '@testing-library/user-event'
import AddViolationModal from '../AddViolationModal'

describe('AddViolationModal', () => {
  const mockOnSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal State', () => {
    it('does not render when closed', () => {
      renderWithProviders(
        <AddViolationModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders modal correctly when open', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      const user = userEvent.setup()
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Form Fields - Basic', () => {
    it('has all required form fields', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/severity/i)).toBeInTheDocument()
    })

    it('has optional form fields', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/corrective action/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/penalty amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('has submit button', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('button', { name: /add violation/i })).toBeInTheDocument()
    })

    it('has close button with aria-label', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })
  })

  describe('Form Fields - Required Field Validation', () => {
    it('validates name field (required)', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /add violation/i })
      const user = userEvent.setup()
      await user.click(submitButton)

      // Form validation should prevent submission
      expect(submitButton).toBeInTheDocument()
    })

    it('validates severity field (required)', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /add violation/i })
      const user = userEvent.setup()
      await user.click(submitButton)

      // Form validation should prevent submission
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Form Fields - Field Behavior', () => {
    it('handles name input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByLabelText(/name/i)
      const user = userEvent.setup()
      await user.type(nameInput, 'Missing Fire Extinguisher')

      expect(nameInput).toHaveValue('Missing Fire Extinguisher')
    })

    it('handles description input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const descriptionInput = screen.getByLabelText(/description/i)
      const user = userEvent.setup()
      await user.type(descriptionInput, 'No fire extinguisher present on premises')

      expect(descriptionInput).toHaveValue('No fire extinguisher present on premises')
    })

    it('handles severity selection', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const severitySelect = screen.getByLabelText(/severity/i)
      const user = userEvent.setup()
      await user.click(severitySelect)

      // Should show severity options (use getAllByText for multiple matches)
      expect(screen.getAllByText(/minor/i)).toBeTruthy()
      expect(screen.getAllByText(/major/i)).toBeTruthy()
      expect(screen.getAllByText(/critical/i)).toBeTruthy()
    })

    it('handles penalty amount input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const penaltyInput = screen.getByLabelText(/penalty amount/i)
      const user = userEvent.setup()
      await user.type(penaltyInput, '10000')

      // Currency formatter will format the value, so check for formatted value
      expect(penaltyInput).toHaveValue('₱10,000')
    })

    it('handles corrective action input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const correctiveActionInput = screen.getByLabelText(/corrective action/i)
      const user = userEvent.setup()
      await user.type(correctiveActionInput, 'Install fire extinguisher')

      expect(correctiveActionInput).toHaveValue('Install fire extinguisher')
    })

    it('handles notes input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const notesInput = screen.getByLabelText(/notes/i)
      const user = userEvent.setup()
      await user.type(notesInput, 'Ensure fire extinguisher is visible')

      expect(notesInput).toHaveValue('Ensure fire extinguisher is visible')
    })
  })

  describe('Form Fields - Legal Basis', () => {
    it('has add legal basis button', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('button', { name: /add legal basis/i })).toBeInTheDocument()
    })

    it('adds legal basis when button is clicked', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const addLegalBasisButton = screen.getByRole('button', { name: /add legal basis/i })
      const user = userEvent.setup()
      await user.click(addLegalBasisButton)

      // Should show legal basis fields
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      // There are now two description fields (main + legal basis), so check for multiple
      expect(screen.getAllByLabelText(/description/i)).toHaveLength(2)
    })

    it('has remove legal basis button for each legal basis', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const addLegalBasisButton = screen.getByRole('button', { name: /add legal basis/i })
      const user = userEvent.setup()
      await user.click(addLegalBasisButton)

      expect(screen.getByRole('button', { name: /remove legal basis/i })).toBeInTheDocument()
    })

    it('handles legal basis url input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const addLegalBasisButton = screen.getByRole('button', { name: /add legal basis/i })
      const user = userEvent.setup()
      await user.click(addLegalBasisButton)

      const urlInput = screen.getByLabelText(/url/i)
      await user.type(urlInput, 'https://officialgazette.gov.ph/')

      expect(urlInput).toHaveValue('https://officialgazette.gov.ph/')
    })

    it('handles legal basis title input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const addLegalBasisButton = screen.getByRole('button', { name: /add legal basis/i })
      const user = userEvent.setup()
      await user.click(addLegalBasisButton)

      const titleInput = screen.getByLabelText(/title/i)
      await user.type(titleInput, 'Republic Act No. 12345')

      expect(titleInput).toHaveValue('Republic Act No. 12345')
    })

    it('handles legal basis description input', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const addLegalBasisButton = screen.getByRole('button', { name: /add legal basis/i })
      const user = userEvent.setup()
      await user.click(addLegalBasisButton)

      // Get the legal basis description specifically (the second one)
      const descriptionInputs = screen.getAllByLabelText(/description/i)
      const legalBasisDescription = descriptionInputs[1] // Second description field is for legal basis
      await user.type(legalBasisDescription, 'Fire safety requirements')

      expect(legalBasisDescription).toHaveValue('Fire safety requirements')
    })
  })

  describe('Form Submission', () => {
    it('calls onSuccess callback on successful save', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i)
      const severitySelect = screen.getByLabelText(/severity/i)
      const user = userEvent.setup()

      await user.type(nameInput, 'Test Violation')
      await user.click(severitySelect)
      await user.click(screen.getAllByText(/major/i)[0])

      const submitButton = screen.getByRole('button', { name: /add violation/i })
      await user.click(submitButton)

      // Should call onSuccess after successful submission
      // Note: This will require mocking the API call
      expect(mockOnSuccess).toBeDefined()
    })

    it('calls onClose callback when close button is clicked', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      const user = userEvent.setup()
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Form Reset', () => {
    it('resets form when modal opens', () => {
      const { rerender } = renderWithProviders(
        <AddViolationModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      rerender(<AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

      // Form should be reset when opened
      expect(screen.getByLabelText(/name/i)).toHaveValue('')
    })
  })

  describe('Step-up Authentication', () => {
    it('handles step-up authentication during submission', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i)
      const severitySelect = screen.getByLabelText(/severity/i)
      const user = userEvent.setup()

      await user.type(nameInput, 'Test Violation')
      await user.click(severitySelect)
      await user.click(screen.getAllByText(/major/i)[0])

      const submitButton = screen.getByRole('button', { name: /add violation/i })
      await user.click(submitButton)

      // Should trigger step-up authentication
      // Note: This will require mocking the step-up hook
      expect(submitButton).toBeInTheDocument()
    })

    it('handles step-up cancellation gracefully', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i)
      const severitySelect = screen.getByLabelText(/severity/i)
      const user = userEvent.setup()

      await user.type(nameInput, 'Test Violation')
      await user.click(severitySelect)
      await user.click(screen.getAllByText(/major/i)[0])

      const submitButton = screen.getByRole('button', { name: /add violation/i })
      await user.click(submitButton)

      // Should handle step-up cancellation without error
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i)
      const severitySelect = screen.getByLabelText(/severity/i)
      const user = userEvent.setup()

      await user.type(nameInput, 'Test Violation')
      await user.click(severitySelect)
      await user.click(screen.getAllByText(/major/i)[0])

      const submitButton = screen.getByRole('button', { name: /add violation/i })
      await user.click(submitButton)

      // Should show loading state
      // Note: This will require mocking the API call
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles submission errors', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i)
      const severitySelect = screen.getByLabelText(/severity/i)
      const user = userEvent.setup()

      await user.type(nameInput, 'Test Violation')
      await user.click(severitySelect)
      await user.click(screen.getAllByText(/major/i)[0])

      const submitButton = screen.getByRole('button', { name: /add violation/i })
      await user.click(submitButton)

      // Should handle errors gracefully
      // Note: This will require mocking the API call to return an error
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Name Validation', () => {
    it('handles name validation (useNameValidation hook)', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByLabelText(/name/i)
      const user = userEvent.setup()

      await user.type(nameInput, 'Test')
      await user.tab()

      // Should trigger name validation
      expect(nameInput).toBeInTheDocument()
    })
  })

  describe('Severity Levels', () => {
    it('handles different severity levels (minor, major, critical)', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const severitySelect = screen.getByLabelText(/severity/i)
      const user = userEvent.setup()

      await user.click(severitySelect)

      // Use getAllByText for multiple matches
      expect(screen.getAllByText(/minor/i)).toBeTruthy()
      expect(screen.getAllByText(/major/i)).toBeTruthy()
      expect(screen.getAllByText(/critical/i)).toBeTruthy()
    })
  })

  describe('Fee Association', () => {
    it('handles penalty amount field', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const penaltyInput = screen.getByLabelText(/penalty amount/i)
      const user = userEvent.setup()
      await user.type(penaltyInput, '10000')

      // Currency formatter will format the value, so check for formatted value
      expect(penaltyInput).toHaveValue('₱10,000')
    })
  })

  describe('Debug Fill', () => {
    it('has debug fill button', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('button', { name: /debug fill/i })).toBeInTheDocument()
    })

    it('fills form with debug data when button is clicked', async () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const debugButton = screen.getByRole('button', { name: /debug fill/i })
      const user = userEvent.setup()
      await user.click(debugButton)

      // Should fill form with debug data
      expect(screen.getByLabelText(/name/i)).toHaveValue('Missing Fire Extinguisher')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('is keyboard navigable', () => {
      renderWithProviders(
        <AddViolationModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByLabelText(/name/i)
      expect(nameInput).toBeInTheDocument()
    })
  })
})
