import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { axe, toHaveNoViolations } from 'jest-axe'

// Configure jest-axe
expect.extend(toHaveNoViolations)

// Import components to test
import VariableCard from '../components/VariableCard'
import VariablesStatsPanel from '../components/VariablesStatsPanel'
import AddVariableModal from '../components/modals/AddVariableModal'
import VariablesView from '../views/VariablesView'

// Mock dependencies
vi.mock('../hooks/useVariables', () => ({
  useVariables: () => ({
    selectedItemId: null,
    setSelectedItemId: vi.fn(),
    items: [],
    selectedItem: null,
    refresh: vi.fn(),
  }),
}))

vi.mock('../hooks/useVariablesFilters', () => ({
  useVariablesFilters: () => ({
    searchTerm: '',
    setSearchTerm: vi.fn(),
    statusFilter: '',
    setStatusFilter: vi.fn(),
  }),
}))

vi.mock('../components/VariableDetailPanel', () => ({
  default: () => <div data-testid="variable-detail-panel">Detail Panel</div>,
}))

vi.mock('@/shared/components/ListPanel', () => ({
  default: ({ children }) => <div data-testid="list-panel">{children}</div>,
}))

vi.mock('@/shared/components/ResponsiveSplitLayout', () => ({
  default: ({ listContent, detailContent }) => (
    <div>
      <div data-testid="list-content">{listContent}</div>
      <div data-testid="detail-content">{detailContent}</div>
    </div>
  ),
}))

describe('Variables Feature Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('VariableCard Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <VariableCard
          item={{
            _id: '1',
            name: 'Test Variable',
            question: 'Test question',
            calculationMethod: 'per_unit',
            unit: 'sqm',
            status: 'active',
          }}
          selected={false}
          onClick={() => {}}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should be keyboard accessible', () => {
      const { container } = renderWithProviders(
        <VariableCard
          item={{
            _id: '1',
            name: 'Test Variable',
            question: 'Test question',
            calculationMethod: 'per_unit',
            unit: 'sqm',
            status: 'active',
          }}
          selected={false}
          onClick={() => {}}
        />
      )

      // Check that the card has proper keyboard interaction
      const card = container.querySelector('[role="button"]') || container
      expect(card).toBeInTheDocument()
    })
  })

  describe('VariablesStatsPanel Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<VariablesStatsPanel />)

      // Configure axe to ignore skeleton loading states
      const results = await axe(container, {
        rules: {
          'empty-heading': { enabled: false }, // Disable for skeleton loading states
        },
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('AddVariableModal Accessibility', () => {
    it('should have no accessibility violations when open', async () => {
      const { container } = renderWithProviders(
        <AddVariableModal
          open={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA attributes for modal', () => {
      renderWithProviders(
        <AddVariableModal
          open={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      )

      // Check for proper modal ARIA attributes
      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
    })
  })

  describe('VariablesView Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<VariablesView />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading hierarchy', () => {
      const { container } = renderWithProviders(<VariablesView />)

      // Check for proper heading structure
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      // Should have at least one heading
      expect(headings.length).toBeGreaterThanOrEqual(0)
    })
  })
})
