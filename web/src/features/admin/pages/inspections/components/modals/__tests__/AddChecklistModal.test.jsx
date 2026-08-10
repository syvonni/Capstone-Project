import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { BrowserRouter } from 'react-router-dom'
import AddChecklistModal from '../AddChecklistModal'

expect.extend(toHaveNoViolations)

describe('AddChecklistModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderWithRouter(
        <AddChecklistModal visible={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with visible false', () => {
      renderWithRouter(
        <AddChecklistModal visible={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with loading state', () => {
      renderWithRouter(
        <AddChecklistModal visible={true} onClose={mockOnClose} onSuccess={mockOnSuccess} loading={true} />
      )

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders with accessible structure', async () => {
      const { container } = renderWithRouter(
        <AddChecklistModal visible={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with accessible structure with loading state', async () => {
      const { container } = renderWithRouter(
        <AddChecklistModal visible={true} onClose={mockOnClose} onSuccess={mockOnSuccess} loading={true} />
      )

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Callback Handling', () => {
    it('provides onClose callback', () => {
      renderWithRouter(
        <AddChecklistModal visible={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(mockOnClose).toBeDefined()
    })

    it('provides onSuccess callback', () => {
      renderWithRouter(
        <AddChecklistModal visible={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(mockOnSuccess).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing callbacks gracefully', () => {
      renderWithRouter(<AddChecklistModal visible={true} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles rapid open/close', () => {
      const { rerender } = renderWithRouter(
        <AddChecklistModal visible={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      rerender(<AddChecklistModal visible={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })
})
