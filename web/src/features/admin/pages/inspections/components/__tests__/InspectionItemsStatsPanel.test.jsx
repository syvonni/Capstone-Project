import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import InspectionItemsStatsPanel from '../InspectionItemsStatsPanel'

// Mock the services
vi.mock('@/features/admin/services/inspectionItemService', () => ({
  getInspectionItems: vi.fn(() => Promise.resolve([
    { _id: '1', name: 'Fire Safety', isActive: true, createdAt: new Date() },
    { _id: '2', name: 'Health Inspection', isActive: false, createdAt: new Date() },
  ])),
  getAllInspectionItemAudits: vi.fn(() => Promise.resolve({
    logs: [
      {
        _id: '1',
        eventType: 'inspection_item_created',
        metadata: { name: 'Fire Safety', userName: 'admin' },
        createdAt: new Date(),
      },
    ],
  })),
}))

vi.mock('@/shared/monitoring/hooks/useDataQuality', () => ({
  useDataQuality: vi.fn(() => ({
    issues: [],
    loading: false,
    error: null,
  })),
}))

vi.mock('@/shared/monitoring/hooks/usePerformance', () => ({
  usePerformance: vi.fn(() => ({
    metrics: null,
    loading: false,
    error: null,
  })),
}))

vi.mock('@/shared/monitoring/components/PerformanceStatsPanel', () => ({
  default: () => <div>Performance Stats Panel</div>,
}))

vi.mock('@/shared/audit/components/AuditHistoryModal', () => ({
  default: () => <div>Audit History Modal</div>,
}))

vi.mock('@/shared/audit/components/AuditEventDetails', () => ({
  default: () => <div>Audit Event Details</div>,
}))

describe('InspectionItemsStatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<InspectionItemsStatsPanel />)
      expect(container).toBeInTheDocument()
    })
  })
})
