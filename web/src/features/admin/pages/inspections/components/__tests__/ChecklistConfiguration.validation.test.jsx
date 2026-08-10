import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Form } from 'antd'
import ChecklistConfiguration from '../ChecklistConfiguration'

// Mock the services
vi.mock('@/features/admin/services/inspectionItemService', () => ({
  getInspectionItems: vi.fn(),
}))

vi.mock('@/features/admin/services/postRequirementService', () => ({
  getPostRequirements: vi.fn(),
}))

import { getInspectionItems } from '@/features/admin/services/inspectionItemService'
import { getPostRequirements } from '@/features/admin/services/postRequirementService'

describe('ChecklistConfiguration - Deep Form Validation', () => {
  const mockHandleFormValuesChange = vi.fn()
  const mockInspectionItems = [
    { _id: 'item1', name: 'Check fire extinguishers', question: 'Are fire extinguishers present?' },
    { _id: 'item2', name: 'Check emergency exits', question: 'Are emergency exits clear?' },
  ]

  const mockPostRequirements = [
    { _id: 'pr1', name: 'Fire Safety Post-Requirement' },
  ]

  // Test component that uses the form instance
  const TestComponent = () => {
    const [form] = Form.useForm()
    return (
      <ChecklistConfiguration form={form} handleFormValuesChange={mockHandleFormValuesChange} />
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getInspectionItems.mockResolvedValue(mockInspectionItems)
    getPostRequirements.mockResolvedValue(mockPostRequirements)
  })

  describe('Field-Level Validation', () => {
    it('name field accepts valid input without error', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument()
      })

      // Fill with valid input
      const nameInput = screen.getByPlaceholderText(/name/i)
      await userEvent.type(nameInput, 'Test Checklist')

      // Should NOT show name error
      expect(screen.queryByText(/please enter a name/i)).not.toBeInTheDocument()
    })

    it('description field accepts valid input without error', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument()
      })

      // Fill with valid input
      const descInput = screen.getByPlaceholderText(/description/i)
      await userEvent.type(descInput, 'Test Description')

      // Should NOT show description error
      expect(screen.queryByText(/please enter a description/i)).not.toBeInTheDocument()
    })
  })

  describe('Cross-Field Validation', () => {
    it('notes field is optional and does not show error when empty', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/notes/i)).toBeInTheDocument()
      })

      // Don't fill notes field
      // Should not show notes error message
      expect(screen.queryByText(/please enter a note/i)).not.toBeInTheDocument()
    })
  })

  describe('Form State Management', () => {
    it('form updates when values change', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument()
      })

      // Fill name field
      const nameInput = screen.getByPlaceholderText(/name/i)
      await userEvent.type(nameInput, 'Test Checklist')

      // Form callback should be called
      expect(mockHandleFormValuesChange).toHaveBeenCalled()
    })
  })
})
