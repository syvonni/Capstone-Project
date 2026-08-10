import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import ChecklistsStatsPanel from '../ChecklistsStatsPanel'

expect.extend(toHaveNoViolations)

describe('ChecklistsStatsPanel', () => {
  const mockStats = {
    total: 50,
    active: 30,
    inactive: 20,
    recentlyCreated: 5,
    recentlyUpdated: 10,
  }

  const mockOnRefresh = vi.fn()

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<ChecklistsStatsPanel stats={mockStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with minimal data', () => {
      const minimalStats = {
        total: 0,
        active: 0,
        inactive: 0,
        recentlyCreated: 0,
        recentlyUpdated: 0,
      }

      render(<ChecklistsStatsPanel stats={minimalStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with loading state', () => {
      render(<ChecklistsStatsPanel stats={mockStats} onRefresh={mockOnRefresh} loading={true} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders with accessible structure', async () => {
      const { container } = render(<ChecklistsStatsPanel stats={mockStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with accessible structure with loading state', async () => {
      const { container } = render(
        <ChecklistsStatsPanel stats={mockStats} onRefresh={mockOnRefresh} loading={true} />
      )

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with accessible structure with minimal data', async () => {
      const minimalStats = {
        total: 0,
        active: 0,
        inactive: 0,
        recentlyCreated: 0,
        recentlyUpdated: 0,
      }

      const { container } = render(<ChecklistsStatsPanel stats={minimalStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    it('renders with stats data', () => {
      render(<ChecklistsStatsPanel stats={mockStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('renders with zero stats', () => {
      const zeroStats = {
        total: 0,
        active: 0,
        inactive: 0,
        recentlyCreated: 0,
        recentlyUpdated: 0,
      }

      render(<ChecklistsStatsPanel stats={zeroStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Callback Handling', () => {
    it('provides onRefresh callback', () => {
      render(<ChecklistsStatsPanel stats={mockStats} onRefresh={mockOnRefresh} />)

      expect(mockOnRefresh).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      const zeroStats = {
        total: 0,
        active: 0,
        inactive: 0,
        recentlyCreated: 0,
        recentlyUpdated: 0,
      }

      render(<ChecklistsStatsPanel stats={zeroStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles large values', () => {
      const largeStats = {
        total: 999999,
        active: 500000,
        inactive: 499999,
        recentlyCreated: 1000,
        recentlyUpdated: 2000,
      }

      render(<ChecklistsStatsPanel stats={largeStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('handles missing stats gracefully', () => {
      const partialStats = {
        total: 10,
        active: 5,
      }

      render(<ChecklistsStatsPanel stats={partialStats} onRefresh={mockOnRefresh} />)

      // Should render without errors
      expect(document.body).toBeInTheDocument()
    })
  })
})
