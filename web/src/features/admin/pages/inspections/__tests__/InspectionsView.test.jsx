import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import InspectionsView from '../views/InspectionsView'

// Mock the hooks
vi.mock('../hooks/useInspections', () => ({
  useInspections: vi.fn(() => ({
    selectedItemId: null,
    setSelectedItemId: vi.fn(),
    items: [],
    selectedItem: null,
    refresh: vi.fn(),
  })),
}))

vi.mock('../hooks/useInspectionsFilters', () => ({
  useInspectionsFilters: vi.fn(() => ({
    searchTerm: '',
    setSearchTerm: vi.fn(),
    statusFilter: null,
    setStatusFilter: vi.fn(),
  })),
}))

// Mock the components
vi.mock('../components/InspectionItemDetailPanel', () => ({
  default: () => <div>Inspection Item Detail Panel</div>,
}))

vi.mock('../components/ChecklistDetailPanel', () => ({
  default: () => <div>Checklist Detail Panel</div>,
}))

vi.mock('../components/InspectionItemCard', () => ({
  default: () => <div>Inspection Item Card</div>,
}))

vi.mock('../components/ChecklistCard', () => ({
  default: () => <div>Checklist Card</div>,
}))

vi.mock('../components/modals/AddInspectionItemModal', () => ({
  default: () => <div>Add Inspection Item Modal</div>,
}))

vi.mock('../components/modals/AddChecklistModal', () => ({
  default: () => <div>Add Checklist Modal</div>,
}))

vi.mock('../components/InspectionItemsStatsPanel', () => ({
  default: () => <div>Inspection Items Stats Panel</div>,
}))

vi.mock('../components/ChecklistsStatsPanel', () => ({
  default: () => <div>Checklists Stats Panel</div>,
}))

vi.mock('@/shared/components/ListPanel', () => ({
  default: () => <div>List Panel</div>,
}))

vi.mock('@/shared/components/ResponsiveSplitLayout', () => ({
  default: ({ listContent, detailContent }) => (
    <div>
      <div data-testid="list-content">{listContent}</div>
      <div data-testid="detail-content">{detailContent}</div>
    </div>
  ),
}))

describe('InspectionsView Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<InspectionsView />)
      expect(container).toBeInTheDocument()
    })

    it('renders list panel', () => {
      renderWithProviders(<InspectionsView />)
      expect(screen.getByText('List Panel')).toBeInTheDocument()
    })

    it('renders responsive split layout', () => {
      renderWithProviders(<InspectionsView />)
      expect(screen.getByTestId('list-content')).toBeInTheDocument()
      expect(screen.getByTestId('detail-content')).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('integrates with ListPanel component', () => {
      renderWithProviders(<InspectionsView />)
      expect(screen.getByText('List Panel')).toBeInTheDocument()
    })

    it('integrates with ResponsiveSplitLayout component', () => {
      renderWithProviders(<InspectionsView />)
      expect(screen.getByTestId('list-content')).toBeInTheDocument()
    })
  })
})
