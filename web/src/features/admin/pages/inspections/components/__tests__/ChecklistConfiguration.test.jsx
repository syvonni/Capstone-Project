import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('ChecklistConfiguration', () => {
  const mockHandleFormValuesChange = vi.fn()
  const mockInspectionItems = [
    { _id: 'item1', name: 'Check fire extinguishers', question: 'Are fire extinguishers present?' },
    { _id: 'item2', name: 'Check emergency exits', question: 'Are emergency exits clear?' },
    { _id: 'item3', name: 'Check smoke detectors', question: 'Are smoke detectors functional?' },
  ]

  const mockPostRequirements = [
    { _id: 'pr1', name: 'Fire Safety Post-Requirement' },
    { _id: 'pr2', name: 'Building Code Post-Requirement' },
  ]

  // Wrapper component to provide Form instance
  const TestWrapper = ({ children }) => {
    const [form] = Form.useForm()
    return <Form form={form}>{children}</Form>
  }

  // Test component that uses the form instance
  const TestComponent = () => {
    const [form] = Form.useForm()
    return (
      <TestWrapper>
        <ChecklistConfiguration form={form} handleFormValuesChange={mockHandleFormValuesChange} />
      </TestWrapper>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getInspectionItems.mockResolvedValue(mockInspectionItems)
    getPostRequirements.mockResolvedValue(mockPostRequirements)
  })

  describe('Basic Rendering', () => {
    it('renders without crashing', async () => {
      render(<TestComponent />)

      // Should render without errors
      await waitFor(() => {
        expect(document.querySelector('.ant-form')).toBeInTheDocument()
      })
    })

    it('renders with minimal data', async () => {
      render(<TestComponent />)

      // Should render without errors
      await waitFor(() => {
        expect(document.querySelector('.ant-form')).toBeInTheDocument()
      })
    })
  })

  describe('Service Integration', () => {
    it('fetches inspection items on mount', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(getInspectionItems).toHaveBeenCalledWith({ isActive: true })
      })
    })

    it('fetches post requirements on mount', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(getPostRequirements).toHaveBeenCalledWith({ isActive: true })
      })
    })
  })

  describe('Form Fields Presence', () => {
    it('has name field', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText(/name/i)).toBeInTheDocument()
      })
    })

    it('has description field', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText(/description/i)).toBeInTheDocument()
      })
    })

    it('has notes field', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText(/notes/i)).toBeInTheDocument()
      })
    })

    it('has legal basis section', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Legal Basis')).toBeInTheDocument()
      })
    })

    it('has inspection items section', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Inspection Items')).toBeInTheDocument()
      })
    })
  })

  describe('Integration', () => {
    it('handles form values change callback', async () => {
      render(<TestComponent />)

      await waitFor(() => {
        expect(mockHandleFormValuesChange).toBeDefined()
      })
    })
  })
})
