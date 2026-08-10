import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import PostRequirementsStatsPanel from '../PostRequirementsStatsPanel'

// Mock the services
vi.mock('@/features/admin/services/postRequirementService', () => ({
  getPostRequirements: vi.fn(() => Promise.resolve([])),
  getAllPostRequirementAudits: vi.fn(() => Promise.resolve({ logs: [] })),
}))

// Mock the hooks
vi.mock('@/shared/monitoring/hooks/useDataQuality', () => ({
  useDataQuality: vi.fn(() => ({ issues: [], loading: false })),
}))

vi.mock('@/shared/monitoring/hooks/usePerformance', () => ({
  usePerformance: vi.fn(() => ({ metrics: null, loading: false })),
}))

describe('PostRequirementsStatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = renderWithProviders(
      <PostRequirementsStatsPanel />
    )

    // The component should render without error
    expect(container).toBeInTheDocument()
  })

  it('displays overview statistics', () => {
    renderWithProviders(
      <PostRequirementsStatsPanel />
    )

    // Should display overview section
    expect(screen.getByText(/Status/i)).toBeInTheDocument()
  })

  it('displays data quality section', () => {
    renderWithProviders(
      <PostRequirementsStatsPanel />
    )

    // Should display data quality section
    expect(screen.getByText(/Issues/i)).toBeInTheDocument()
  })

  it('displays performance metrics section', () => {
    renderWithProviders(
      <PostRequirementsStatsPanel />
    )

    // Should display performance metrics section
    expect(screen.getByText(/Performance/i)).toBeInTheDocument()
  })

  it('displays global history section', () => {
    renderWithProviders(
      <PostRequirementsStatsPanel />
    )

    // Should display global history section
    expect(screen.getByText(/History/i)).toBeInTheDocument()
  })
})
