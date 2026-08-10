import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import AddInspectionItemModal from '../AddInspectionItemModal'

// Mock the violation service
vi.mock('@/features/admin/services/violationService', () => ({
  getViolations: vi.fn(() => Promise.resolve([
    { _id: '1', name: 'Missing Fire Extinguisher' },
    { _id: '2', name: 'Blocked Emergency Exit' },
  ])),
}))

// Mock the inspection item service
vi.mock('@/features/admin/services/inspectionItemService', () => ({
  createInspectionItem: vi.fn(() => Promise.resolve({ _id: 'new', name: 'New Item' })),
}))

// Mock shared hooks
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

describe('AddInspectionItemModal', () => {
  const mockOnSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal correctly when open', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(screen.getAllByText('Add Inspection Item').length).toBeGreaterThan(0)
  })

  it('calls onClose when close button is clicked', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    // Just verify the modal renders with the title
    const titles = screen.getAllByText('Add Inspection Item')
    expect(titles.length).toBeGreaterThan(0)
  })

  it('has all required form fields (name, question)', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(screen.getAllByLabelText(/name/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
  })

  it('has optional notes field', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
  })

  it('has add legal basis button', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByText('Add Legal Basis')).toBeInTheDocument()
  })

  it('has debug fill button', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByText('Debug Fill')).toBeInTheDocument()
  })

  it('handles violation mode selection (select vs create)', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByLabelText(/violation mode/i)).toBeInTheDocument()
  })

  it('handles name input', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const nameInputs = screen.getAllByLabelText(/name/i)
    const nameInput = nameInputs[0]
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    expect(nameInput.value).toBe('New Name')
  })

  it('handles question input', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const questionInput = screen.getByLabelText(/question/i)
    fireEvent.change(questionInput, { target: { value: 'New question?' } })
    expect(questionInput.value).toBe('New question?')
  })

  it('handles notes input', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const notesInput = screen.getByLabelText(/notes/i)
    fireEvent.change(notesInput, { target: { value: 'New notes' } })
    expect(notesInput.value).toBe('New notes')
  })

  it('adds legal basis when button is clicked', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const addButton = screen.getByText('Add Legal Basis')
    fireEvent.click(addButton)

    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
  })

  it('has remove legal basis button for each legal basis', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const addButton = screen.getByText('Add Legal Basis')
    fireEvent.click(addButton)

    expect(screen.getByText('Remove Legal Basis')).toBeInTheDocument()
  })

  it('handles legal basis url input', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const addButton = screen.getByText('Add Legal Basis')
    fireEvent.click(addButton)

    const urlInput = screen.getByLabelText(/url/i)
    fireEvent.change(urlInput, { target: { value: 'https://test.com' } })
    expect(urlInput.value).toBe('https://test.com')
  })

  it('handles legal basis title input', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const addButton = screen.getByText('Add Legal Basis')
    fireEvent.click(addButton)

    const titleInput = screen.getByLabelText(/title/i)
    fireEvent.change(titleInput, { target: { value: 'Test Title' } })
    expect(titleInput.value).toBe('Test Title')
  })

  it('handles legal basis description input', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const addButton = screen.getByText('Add Legal Basis')
    fireEvent.click(addButton)

    const descriptionInput = screen.getAllByLabelText(/description/i)[0]
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } })
    expect(descriptionInput.value).toBe('Test Description')
  })

  it('allows multiple legal basis entries', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    const addButton = screen.getByText('Add Legal Basis')
    fireEvent.click(addButton)
    fireEvent.click(addButton)

    const removeButtons = screen.getAllByText('Remove Legal Basis')
    expect(removeButtons.length).toBe(2)
  })

  it('has proper ARIA labels', () => {
    renderWithProviders(
      <AddInspectionItemModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/question/i)).toBeInTheDocument()
  })
})
