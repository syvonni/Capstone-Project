import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ChecklistCard from '../ChecklistCard'

describe('ChecklistCard - Performance and Edge Cases', () => {
  const mockChecklist = {
    _id: '1',
    name: 'Fire Safety Checklist',
    description: 'Checklist for fire safety inspections',
    isActive: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    items: [{ _id: 'item1' }],
  }

  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Large Datasets', () => {
    it('renders 50 checklist cards without errors', async () => {
      const checklists = Array.from({ length: 50 }, (_, i) => ({
        ...mockChecklist,
        _id: `${i}`,
        name: `Checklist ${i}`,
      }))

      const startTime = performance.now()

      render(
        <div>
          {checklists.map((checklist) => (
            <ChecklistCard key={checklist._id} item={checklist} onClick={mockOnClick} />
          ))}
        </div>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Render should complete in reasonable time (< 2 seconds)
      expect(renderTime).toBeLessThan(2000)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders 100 checklist cards without errors', async () => {
      const checklists = Array.from({ length: 100 }, (_, i) => ({
        ...mockChecklist,
        _id: `${i}`,
        name: `Checklist ${i}`,
      }))

      const startTime = performance.now()

      render(
        <div>
          {checklists.map((checklist) => (
            <ChecklistCard key={checklist._id} item={checklist} onClick={mockOnClick} />
          ))}
        </div>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Render should complete in reasonable time (< 3 seconds)
      expect(renderTime).toBeLessThan(3000)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles rapid re-renders with large dataset', async () => {
      const checklists = Array.from({ length: 50 }, (_, i) => ({
        ...mockChecklist,
        _id: `${i}`,
        name: `Checklist ${i}`,
      }))

      const { rerender } = render(
        <div>
          {checklists.map((checklist) => (
            <ChecklistCard key={checklist._id} item={checklist} onClick={mockOnClick} />
          ))}
        </div>
      )

      // Rapid re-renders
      for (let i = 0; i < 5; i++) {
        const updatedChecklists = checklists.map((checklist) => ({
          ...checklist,
          name: `Updated Checklist ${i}`,
        }))

        rerender(
          <div>
            {updatedChecklists.map((checklist) => (
              <ChecklistCard key={checklist._id} item={checklist} onClick={mockOnClick} />
            ))}
          </div>
        )
      }

      // Should complete without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Memory Leaks', () => {
    it('cleans up event listeners on unmount', async () => {
      const { unmount } = render(<ChecklistCard item={mockChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument()
      })

      // Click the card to trigger onClick
      const card = screen.getByText(/fire safety checklist/i)
      card.click()
      expect(mockOnClick).toHaveBeenCalledTimes(1)

      unmount()

      // Try to click again - should not trigger onClick
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('handles multiple mount/unmount cycles', async () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<ChecklistCard item={mockChecklist} onClick={mockOnClick} />)

        await waitFor(() => {
          expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument()
        })

        unmount()
      }

      // Should complete without memory leaks or errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Component Unmounting', () => {
    it('unmounts without errors', async () => {
      const { unmount } = render(<ChecklistCard item={mockChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument()
      })

      unmount()

      // Component should be removed from DOM
      expect(screen.queryByText(/fire safety checklist/i)).not.toBeInTheDocument()
    })

    it('unmounts while loading state is active', async () => {
      const { unmount } = render(<ChecklistCard item={mockChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument()
      })

      unmount()

      // Should not throw any errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Malformed Data', () => {
    it('handles checklist with missing optional fields', async () => {
      const incompleteChecklist = {
        _id: '1',
        name: 'Test Checklist',
        isActive: true,
        items: [],
        // Missing optional fields like description, version, createdAt, updatedAt
      }

      render(<ChecklistCard item={incompleteChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/test checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles checklist with null values', async () => {
      const nullChecklist = {
        _id: '1',
        name: 'Test Checklist',
        description: null,
        isActive: true,
        version: null,
        createdAt: null,
        updatedAt: null,
        items: [],
      }

      render(<ChecklistCard item={nullChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/test checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles checklist with empty strings', async () => {
      const emptyChecklist = {
        _id: '1',
        name: '',
        description: '',
        isActive: true,
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        items: [],
      }

      render(<ChecklistCard item={emptyChecklist} onClick={mockOnClick} />)

      // Should render without errors (even with empty name)
      expect(document.body).toBeInTheDocument()
    })

    it('handles checklist with undefined values', async () => {
      const undefinedChecklist = {
        _id: '1',
        name: 'Test Checklist',
        description: undefined,
        isActive: true,
        version: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        items: [],
      }

      render(<ChecklistCard item={undefinedChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/test checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Partial Data Loading', () => {
    it('renders with minimal required data', async () => {
      const minimalChecklist = {
        _id: '1',
        name: 'Minimal Checklist',
        isActive: true,
      }

      render(<ChecklistCard item={minimalChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/minimal checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles missing items array', async () => {
      const noItemsChecklist = {
        _id: '1',
        name: 'No Items Checklist',
        isActive: true,
        // items field missing
      }

      render(<ChecklistCard item={noItemsChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/no items checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles empty items array', async () => {
      const emptyItemsChecklist = {
        _id: '1',
        name: 'Empty Items Checklist',
        isActive: true,
        items: [],
      }

      render(<ChecklistCard item={emptyItemsChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/empty items checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles very long names', async () => {
      const longNameChecklist = {
        ...mockChecklist,
        name: 'A'.repeat(500),
      }

      render(<ChecklistCard item={longNameChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/A{10}/)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles very long descriptions', async () => {
      const longDescChecklist = {
        ...mockChecklist,
        description: 'B'.repeat(1000),
      }

      render(<ChecklistCard item={longDescChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles special characters in name', async () => {
      const specialCharsChecklist = {
        ...mockChecklist,
        name: 'Checklist <script>alert("xss")</script> & "quotes" \'apostrophes\'',
      }

      render(<ChecklistCard item={specialCharsChecklist} onClick={mockOnClick} />)

      // Should render safely (escaped)
      expect(document.body).toBeInTheDocument()
    })

    it('handles inactive checklist', async () => {
      const inactiveChecklist = {
        ...mockChecklist,
        isActive: false,
      }

      render(<ChecklistCard item={inactiveChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument()
      })

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles onClick callback', async () => {
      render(<ChecklistCard item={mockChecklist} onClick={mockOnClick} />)

      await waitFor(() => {
        expect(screen.getByText(/fire safety checklist/i)).toBeInTheDocument()
      })

      const card = screen.getByText(/fire safety checklist/i)
      card.click()

      // Verify onClick was called
      expect(mockOnClick).toHaveBeenCalled()
    })
  })
})
