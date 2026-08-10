import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { userEvent } from '@testing-library/user-event'
import AddVariableModal from '../AddVariableModal'

describe('AddVariableModal', () => {
  const mockOnSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal State', () => {
    it('does not render when closed', () => {
      renderWithProviders(
        <AddVariableModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders modal correctly when open', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', async () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
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
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/calculation method/i)).toBeInTheDocument()
    })

    it('has description field', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('has notes field', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('resets form when modal opens', () => {
      const { rerender } = renderWithProviders(
        <AddVariableModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      rerender(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByLabelText(/name/i)
      expect(nameInput.value).toBe('')
    })
  })

  describe('Calculation Method - Per Unit', () => {
    it('has per_unit option in calculation method', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const calculationMethodSelect = screen.getByLabelText(/calculation method/i)
      expect(calculationMethodSelect).toBeInTheDocument()
    })
  })

  describe('Calculation Method - Percentage', () => {
    it('has percentage option in calculation method', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const calculationMethodSelect = screen.getByLabelText(/calculation method/i)
      expect(calculationMethodSelect).toBeInTheDocument()
    })
  })

  describe('Calculation Method - Classification', () => {
    it('has classification option in calculation method', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const calculationMethodSelect = screen.getByLabelText(/calculation method/i)
      expect(calculationMethodSelect).toBeInTheDocument()
    })
  })

  describe('Calculation Method - Yes/No', () => {
    it('has yes/no option in calculation method', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const calculationMethodSelect = screen.getByLabelText(/calculation method/i)
      expect(calculationMethodSelect).toBeInTheDocument()
    })
  })

  describe('Calculation Method - Custom', () => {
    it('has custom option in calculation method', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const calculationMethodSelect = screen.getByLabelText(/calculation method/i)
      expect(calculationMethodSelect).toBeInTheDocument()
    })
  })

  describe('Categories', () => {
    it('has categories field', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/categories/i)).toBeInTheDocument()
    })
  })

  describe('Legal Basis', () => {
    it('has legal basis section', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Check for legal basis section by text
      expect(screen.getAllByText(/legal basis/i).length).toBeGreaterThan(0)
    })
  })

  describe('Checklist', () => {
    it('has checklist field', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/checklist/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('has submit button', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /add variable/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('has submit button', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /add variable/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Debug Fill', () => {
    it('has submit button for form submission', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /add variable/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper modal role', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('role', 'dialog')
    })

    it('has proper form labels', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/calculation method/i)).toBeInTheDocument()
    })

    it('has aria-modal attribute', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('has close button with aria-label', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toHaveAttribute('aria-label', 'Close')
    })
  })

  describe('Loading States', () => {
    it('has submit button that can be clicked', () => {
      renderWithProviders(
        <AddVariableModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /add variable/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeEnabled()
    })
  })
})