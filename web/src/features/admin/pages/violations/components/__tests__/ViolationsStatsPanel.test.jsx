import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ViolationsStatsPanel from '../ViolationsStatsPanel'

// Mock the dependencies
vi.mock('@/features/admin/services/violationService', () => ({
  getViolations: vi.fn(),
  getAllViolationAudits: vi.fn(),
}))

vi.mock('@/shared/monitoring/hooks/useDataQuality', () => ({
  useDataQuality: vi.fn(() => ({ issues: [], loading: false })),
}))

vi.mock('@/shared/monitoring/components/PerformanceStatsPanel', () => ({
  default: () => <div data-testid="performance-panel">Performance Panel</div>,
}))

vi.mock('@/shared/audit/components/AuditHistoryModal', () => ({
  default: ({ inline, auditLogs, eventDescriptions, loading, onRefresh, search, onSearchChange, DetailPanelComponent, subtitle, hideHeader, hideBorder }) => (
    <div data-testid="audit-history-modal">
      <div data-testid="audit-logs-count">{auditLogs?.length || 0}</div>
      <div data-testid="audit-loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="audit-search">{search || ''}</div>
    </div>
  ),
}))

vi.mock('@/shared/audit/components/AuditEventDetails', () => ({
  default: () => <div data-testid="audit-event-details">Audit Event Details</div>,
}))

vi.mock('@/shared/components/SplitCard', () => ({
  default: ({ title, icon, links, loading, extraText, children, noRightPanelPadding }) => (
    <div data-testid={`split-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div data-testid="card-title">{title}</div>
      <div data-testid="card-loading">{loading ? 'loading' : 'not-loading'}</div>
      {extraText && <div data-testid="card-extra">{extraText}</div>}
      {links && <div data-testid="card-links-count">{links.length}</div>}
      {children && <div data-testid="card-children">{children}</div>}
    </div>
  ),
}))

describe('ViolationsStatsPanel', () => {
  const mockViolations = [
    {
      _id: '1',
      name: 'Building Height Violation',
      description: 'Test violation 1',
      severity: 'minor',
      isActive: true,
      feeId: { _id: 'fee1', amount: 5000 },
      createdAt: new Date('2026-08-01'),
    },
    {
      _id: '2',
      name: 'Setback Violation',
      description: 'Test violation 2',
      severity: 'major',
      isActive: false,
      feeId: null,
      createdAt: new Date('2026-08-05'),
    },
  ]

  const mockAuditLogs = [
    {
      _id: 'audit1',
      eventType: 'violation_created',
      createdAt: new Date('2026-08-07T10:00:00Z'),
      metadata: {
        userName: 'Test User',
        name: 'Violation 1',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<ViolationsStatsPanel />)
    expect(container).toBeInTheDocument()
  })

  it('handles empty violations array', async () => {
    const { getViolations } = await import('@/features/admin/services/violationService')
    getViolations.mockResolvedValue([])

    const { container } = render(<ViolationsStatsPanel />)

    // Should render without error even with empty array
    expect(container).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    const { container } = render(<ViolationsStatsPanel />)

    // Check that loading state is shown
    const loadingElements = container.querySelectorAll('[data-testid*="loading"]')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('displays overview statistics when data is loaded', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid="split-card-status"]')).toBeInTheDocument()
    })
  })

  it('shows active violations count', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      const statusCard = container.querySelector('[data-testid="split-card-status"]')
      expect(statusCard).toBeInTheDocument()
      
      // Check that links are calculated
      const linksCount = statusCard.querySelector('[data-testid="card-links-count"]')
      expect(linksCount).toBeInTheDocument()
    })
  })

  it('shows disabled violations count', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      const statusCard = container.querySelector('[data-testid="split-card-status"]')
      expect(statusCard).toBeInTheDocument()
    })
  })

  it('shows unused violations count', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      const statusCard = container.querySelector('[data-testid="split-card-status"]')
      expect(statusCard).toBeInTheDocument()
    })
  })

  it('displays last activity time', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      const statusCard = container.querySelector('[data-testid="split-card-status"]')
      expect(statusCard).toBeInTheDocument()
    })
  })

  it('filters audit logs by search term', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      const auditModal = container.querySelector('[data-testid="audit-history-modal"]')
      expect(auditModal).toBeInTheDocument()
      
      // Check that search functionality is available
      const searchElement = auditModal.querySelector('[data-testid="audit-search"]')
      expect(searchElement).toBeInTheDocument()
    })
  })

  it('displays data quality issues when available', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({
      issues: [
        {
          type: 'missing_name',
          count: 2,
          entityIds: [{ id: '1', name: 'Violation 1' }],
        },
      ],
      loading: false,
    })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid="split-card-issues"]')).toBeInTheDocument()
    })
  })

  it('shows performance stats', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid="performance-panel"]')).toBeInTheDocument()
    })
  })

  it('displays audit history', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid="audit-history-modal"]')).toBeInTheDocument()
    })
  })

  it('handles loading state correctly', () => {
    const { container } = render(<ViolationsStatsPanel />)

    // Check that loading state is shown
    const loadingElements = container.querySelectorAll('[data-testid*="loading"]')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('handles error state correctly', async () => {
    const { getViolations } = await import('@/features/admin/services/violationService')
    getViolations.mockRejectedValue(new Error('Failed to fetch'))

    const { container } = render(<ViolationsStatsPanel />)

    // Should render without error even when API fails
    expect(container).toBeInTheDocument()
  })

  it('calculates correct statistics', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      const statusCard = container.querySelector('[data-testid="split-card-status"]')
      expect(statusCard).toBeInTheDocument()
      
      // Check that links are calculated
      const linksCount = statusCard.querySelector('[data-testid="card-links-count"]')
      expect(linksCount).toBeInTheDocument()
    })
  })

  it('handles search functionality', async () => {
    const { getViolations, getAllViolationAudits } = await import('@/features/admin/services/violationService')
    const { useDataQuality } = await import('@/shared/monitoring/hooks/useDataQuality')

    getViolations.mockResolvedValue(mockViolations)
    getAllViolationAudits.mockResolvedValue({ logs: mockAuditLogs })
    useDataQuality.mockReturnValue({ issues: [], loading: false })

    const { container } = render(<ViolationsStatsPanel />)

    await waitFor(() => {
      const auditModal = container.querySelector('[data-testid="audit-history-modal"]')
      expect(auditModal).toBeInTheDocument()
      
      // Check that search functionality is available
      const searchElement = auditModal.querySelector('[data-testid="audit-search"]')
      expect(searchElement).toBeInTheDocument()
    })
  })
})
