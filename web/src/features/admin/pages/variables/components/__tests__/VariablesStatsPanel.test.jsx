import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import VariablesStatsPanel from '../VariablesStatsPanel'

describe('VariablesStatsPanel', () => {
  const mockVariables = [
    { _id: '1', name: 'Active Variable 1', isActive: true },
    { _id: '2', name: 'Active Variable 2', isActive: true },
    { _id: '3', name: 'Disabled Variable', isActive: false }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = renderWithProviders(
      <VariablesStatsPanel variables={mockVariables} />
    )

    // The component should render without error
    expect(container).toBeInTheDocument()
  })

  it('handles empty variables array', () => {
    const { container } = renderWithProviders(
      <VariablesStatsPanel variables={[]} />
    )

    // Should render without error even with empty array
    expect(container).toBeInTheDocument()
  })
})