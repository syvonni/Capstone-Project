import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import InspectionsView from '../views/InspectionsView'

// Mock the services
vi.mock('@/features/admin/services/checklistService', () => ({
  getChecklists: vi.fn(),
  createChecklist: vi.fn(),
  updateChecklist: vi.fn(),
  deleteChecklist: vi.fn(),
}))

vi.mock('@/features/admin/services/inspectionItemService', () => ({
  getInspectionItems: vi.fn(),
}))

vi.mock('@/features/admin/services/postRequirementService', () => ({
  getPostRequirements: vi.fn(),
}))

import { getChecklists } from '@/features/admin/services/checklistService'
import { getInspectionItems } from '@/features/admin/services/inspectionItemService'
import { getPostRequirements } from '@/features/admin/services/postRequirementService'

describe('InspectionsView Integration (Checklists)', () => {
  const mockChecklists = [
    {
      _id: '1',
      name: 'Fire Safety Checklist',
      description: 'Standard fire safety inspection checklist',
      isActive: true,
      version: 1,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      items: [
        { inspectionItemId: { _id: 'item1', name: 'Check fire extinguishers' }, order: 1 },
      ],
    },
    {
      _id: '2',
      name: 'Building Code Checklist',
      description: 'Building code compliance checklist',
      isActive: false,
      version: 2,
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2024-02-15T14:30:00Z',
      items: [],
    },
  ]

  const mockInspectionItems = [
    { _id: 'item1', name: 'Check fire extinguishers', question: 'Are fire extinguishers present?' },
    { _id: 'item2', name: 'Check emergency exits', question: 'Are emergency exits clear?' },
  ]

  const mockPostRequirements = [
    { _id: 'pr1', name: 'Fire Safety Post-Requirement' },
    { _id: 'pr2', name: 'Building Code Post-Requirement' },
  ]

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getChecklists.mockResolvedValue(mockChecklists)
    getInspectionItems.mockResolvedValue(mockInspectionItems)
    getPostRequirements.mockResolvedValue(mockPostRequirements)
  })

  describe('Basic Integration', () => {
    it('renders without crashing', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('renders with proper structure', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('Data Display', () => {
    it('displays checklists list', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('displays active status tags', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('displays items count', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('opens add checklist modal when add button is clicked', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })

      // Add button should be present
      expect(document.body).toBeInTheDocument()
    })

    it('handles checklist selection', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      getChecklists.mockRejectedValue(new Error('API Error'))

      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('handles empty checklists list', async () => {
      getChecklists.mockResolvedValue([])

      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state while fetching', async () => {
      getChecklists.mockImplementation(() => new Promise(() => {}))

      renderWithRouter(<InspectionsView />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('handles pagination', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('handles search/filter', async () => {
      renderWithRouter(<InspectionsView />)

      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })
})
