import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ChecklistOverview from '../ChecklistOverview'

describe('ChecklistOverview', () => {
  const mockChecklist = {
    _id: '1',
    name: 'Fire Safety Checklist',
    description: 'Standard fire safety inspection checklist',
    notes: 'Important notes for inspectors',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    legalBasis: [
      {
        url: 'https://nfpa.org/10',
        title: 'NFPA 10 - Portable Fire Extinguishers',
        description: 'Standard for portable fire extinguishers',
      },
    ],
    items: [
      {
        inspectionItemId: { _id: 'item1', name: 'Check fire extinguishers' },
        order: 1,
      },
      {
        inspectionItemId: { _id: 'item2', name: 'Check emergency exits' },
        order: 2,
      },
    ],
    postRequirementId: {
      _id: 'pr1',
      name: 'Fire Safety Post-Requirement',
      description: 'Required after fire inspection',
    },
    variableId: {
      _id: 'var1',
      name: 'Fire Safety Variable',
      description: 'Variable for fire safety calculations',
    },
    documentId: {
      _id: 'doc1',
      name: 'Fire Safety Document',
    },
  }

  const mockInitialValues = {
    name: 'Fire Safety Checklist',
    description: 'Standard fire safety inspection checklist',
    notes: 'Important notes for inspectors',
    legalBasis: [
      {
        url: 'https://nfpa.org/10',
        title: 'NFPA 10 - Portable Fire Extinguishers',
        description: 'Standard for portable fire extinguishers',
      },
    ],
    items: ['item1', 'item2'],
    isActive: true,
    postRequirementId: 'pr1',
  }

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderWithRouter(<ChecklistOverview checklist={mockChecklist} initialValues={mockInitialValues} />)
      
      // Component should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })

    it('renders with minimal data', () => {
      const minimalChecklist = {
        _id: '1',
        name: 'Minimal Checklist',
      }
      
      const minimalInitialValues = {
        name: 'Minimal Checklist',
        description: 'N/A',
        notes: 'N/A',
        legalBasis: [],
        items: [],
        isActive: true,
      }
      
      renderWithRouter(<ChecklistOverview checklist={minimalChecklist} initialValues={minimalInitialValues} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })

    it('handles loading state', () => {
      renderWithRouter(<ChecklistOverview checklist={mockChecklist} initialValues={mockInitialValues} loading={true} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })
  })

  describe('Data Handling', () => {
    it('handles checklist with legal basis', () => {
      renderWithRouter(<ChecklistOverview checklist={mockChecklist} initialValues={mockInitialValues} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })

    it('handles checklist with inspection items', () => {
      renderWithRouter(<ChecklistOverview checklist={mockChecklist} initialValues={mockInitialValues} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })

    it('handles checklist with associated entities', () => {
      renderWithRouter(<ChecklistOverview checklist={mockChecklist} initialValues={mockInitialValues} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })

    it('handles checklist without legal basis', () => {
      const noLegalBasisChecklist = { ...mockChecklist, legalBasis: [] }
      
      renderWithRouter(<ChecklistOverview checklist={noLegalBasisChecklist} initialValues={mockInitialValues} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })

    it('handles checklist without inspection items', () => {
      const noItemsChecklist = { ...mockChecklist, items: [] }
      
      renderWithRouter(<ChecklistOverview checklist={noItemsChecklist} initialValues={mockInitialValues} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })

    it('handles checklist without associated entities', () => {
      const minimalChecklist = {
        ...mockChecklist,
        postRequirementId: null,
        variableId: null,
        documentId: null,
      }
      
      renderWithRouter(<ChecklistOverview checklist={minimalChecklist} initialValues={mockInitialValues} />)
      
      // Should render without errors
      expect(document.querySelector('.ant-card')).toBeInTheDocument()
    })
  })
})
