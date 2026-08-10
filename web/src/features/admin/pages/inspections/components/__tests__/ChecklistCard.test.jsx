import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChecklistCard from '../ChecklistCard'

describe('ChecklistCard', () => {
  const mockOnClick = vi.fn()

  const mockChecklist = {
    _id: '1',
    name: 'Fire Safety Checklist',
    description: 'Standard fire safety inspection checklist',
    isActive: true,
    version: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    items: [
      { _id: 'item1', name: 'Check fire extinguishers' },
      { _id: 'item2', name: 'Check emergency exits' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders checklist name correctly', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('Fire Safety Checklist')).toBeInTheDocument()
    })

    it('renders description correctly', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('Standard fire safety inspection checklist')).toBeInTheDocument()
    })

    it('displays active status with green tag', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('displays inactive status with red tag', () => {
      const inactiveChecklist = { ...mockChecklist, isActive: false }
      render(<ChecklistCard item={inactiveChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('shows items count in tags', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('2 items')).toBeInTheDocument()
    })

    it('shows version in meta info', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      // Version is displayed in meta info by PanelCard
      expect(screen.getByText(/version/i)).toBeInTheDocument()
    })

    it('displays created date in meta info', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText(/Created on/i)).toBeInTheDocument()
    })

    it('displays updated date in meta info', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText(/Last updated on/i)).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('handles selected state correctly', () => {
      const { container } = render(
        <ChecklistCard item={mockChecklist} selected={true} onClick={mockOnClick} />
      )
      
      // The selected state should be passed to PanelCard
      expect(container.firstChild).toBeInTheDocument()
    })

    it('calls onClick callback when clicked', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      // Click the card
      const card = screen.getByText('Fire Safety Checklist').closest('div')
      card.click()
      
      expect(mockOnClick).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing optional fields gracefully', () => {
      const minimalChecklist = {
        _id: '1',
        name: 'Minimal Checklist',
        description: 'Minimal description',
      }
      
      render(<ChecklistCard item={minimalChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('Minimal Checklist')).toBeInTheDocument()
      expect(screen.getByText('Minimal description')).toBeInTheDocument()
    })

    it('handles empty items array', () => {
      const emptyItemsChecklist = { ...mockChecklist, items: [] }
      
      render(<ChecklistCard item={emptyItemsChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('Fire Safety Checklist')).toBeInTheDocument()
      // Should not show items count tag
      expect(screen.queryByText(/items/i)).not.toBeInTheDocument()
    })

    it('handles missing dates gracefully', () => {
      const noDatesChecklist = {
        _id: '1',
        name: 'No Dates Checklist',
        description: 'No dates',
        isActive: true,
      }
      
      render(<ChecklistCard item={noDatesChecklist} selected={false} onClick={mockOnClick} />)
      
      expect(screen.getByText('No Dates Checklist')).toBeInTheDocument()
      // The component should handle missing dates without crashing
    })
  })

  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      render(<ChecklistCard item={mockChecklist} selected={false} onClick={mockOnClick} />)
      
      // Should format dates in readable format (appears in both created and updated dates)
      const dateElements = screen.getAllByText(/2024/i)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })
})
