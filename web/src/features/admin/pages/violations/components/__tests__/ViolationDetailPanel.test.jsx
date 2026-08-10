import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ViolationDetailPanel from '../ViolationDetailPanel'
import { getInspectionItemsByViolation } from '@/features/admin/services/inspectionItemService'

// Mock the dependencies
vi.mock('@/shared/components/DetailHeader', () => ({
  default: ({ title }) => (
    <div data-testid="detail-header">
      <div data-testid="header-title">{title}</div>
    </div>
  ),
}))

vi.mock('@/shared/audit/components/AuditHistoryModal', () => ({
  default: () => <div data-testid="audit-history-modal">Audit History Modal</div>,
}))

vi.mock('@/shared/audit/components/AuditEventDetails', () => ({
  default: () => <div data-testid="audit-event-details">Audit Event Details</div>,
}))

vi.mock('./ViolationOverview', () => ({
  default: () => <div data-testid="violation-overview">Violation Overview</div>,
}))

vi.mock('./ViolationConfiguration', () => ({
  default: () => <div data-testid="violation-configuration">Violation Configuration</div>,
}))

vi.mock('../hooks/useViolationForm', () => ({
  useViolationForm: vi.fn(() => ({
    form: {
      setFieldsValue: vi.fn(),
      getFieldsValue: vi.fn(() => ({})),
    },
    saving: false,
    hasChanges: false,
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    handleUndo: vi.fn(),
    handleRedo: vi.fn(),
    handleFormValuesChange: vi.fn(),
    handleStatusChange: vi.fn(),
    handleSave: vi.fn(),
    resetChangeTracking: vi.fn(),
    stepUpModal: null,
  })),
}))

vi.mock('@/shared/audit/hooks/useAudit', () => ({
  useAudit: vi.fn(() => ({
    auditLogs: [],
    auditLoading: false,
    refresh: vi.fn(),
  })),
}))

vi.mock('@/shared/config/auditEventTypes', () => ({
  AUDIT_EVENT_INFO: [
    { event: 'violation_created', label: 'Violation Created' },
    { event: 'violation_updated', label: 'Violation Updated' },
  ],
}))

vi.mock('@/features/admin/services/inspectionItemService', () => ({
  getInspectionItemsByViolation: vi.fn(),
}))

describe('ViolationDetailPanel', () => {
  const mockViolation = {
    _id: '1',
    name: 'Building Height Violation',
    description: 'Building exceeds maximum allowed height',
    severity: 'major',
    isActive: true,
  }

  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders violation details correctly', () => {
    getInspectionItemsByViolation.mockResolvedValue([])

    render(<ViolationDetailPanel violationId="1" violation={mockViolation} onSave={mockOnSave} />)

    expect(screen.getByTestId('detail-header')).toBeInTheDocument()
    expect(screen.getByText('Building Height Violation')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    getInspectionItemsByViolation.mockResolvedValue([])

    const { container } = render(
      <ViolationDetailPanel violationId="1" violation={mockViolation} onSave={mockOnSave} />
    )
    expect(container).toBeInTheDocument()
  })
})
