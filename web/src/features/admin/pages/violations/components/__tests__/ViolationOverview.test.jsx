import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ViolationOverview from '../ViolationOverview'
import { getInspectionItemsByViolation } from '@/features/admin/services/inspectionItemService'

// Mock the dependencies
vi.mock('@/shared/components/InfoGrid', () => ({
  default: ({ loading }) => (
    <div data-testid="info-grid">
      <div data-testid="info-grid-loading">{loading ? 'loading' : 'not-loading'}</div>
    </div>
  ),
}))

vi.mock('../constants/violations.constants', () => ({
  SEVERITY_LEVELS: [
    { value: 'minor', label: 'Minor', color: 'green' },
    { value: 'major', label: 'Major', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' },
  ],
}))

vi.mock('@/features/admin/services/inspectionItemService', () => ({
  getInspectionItemsByViolation: vi.fn(),
}))

describe('ViolationOverview', () => {
  const mockViolation = {
    _id: '1',
    name: 'Building Height Violation',
    description: 'Building exceeds maximum allowed height',
    severity: 'major',
    isActive: true,
  }

  const mockToken = { colorError: 'red' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders overview correctly', () => {
    getInspectionItemsByViolation.mockResolvedValue([])

    render(<ViolationOverview violation={mockViolation} _initialValues={{}} _token={mockToken} />)

    expect(screen.getByTestId('info-grid')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    getInspectionItemsByViolation.mockResolvedValue([])

    const { container } = render(
      <ViolationOverview violation={mockViolation} _initialValues={{}} _token={mockToken} />
    )
    expect(container).toBeInTheDocument()
  })
})
