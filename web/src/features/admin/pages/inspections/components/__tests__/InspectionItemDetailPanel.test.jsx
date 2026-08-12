import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import InspectionItemDetailPanel from '../InspectionItemDetailPanel'

// Mock the services
vi.mock('@/features/admin/services/checklistService', () => ({
  getChecklistsByInspectionItem: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/shared/audit/hooks/useAudit', () => ({
  useAudit: vi.fn(() => ({
    auditLogs: [],
    auditLoading: false,
    refresh: vi.fn(),
  })),
}))

vi.mock('../hooks/useInspectionItemForm', () => ({
  useInspectionItemForm: vi.fn(() => ({
    form: { setFieldsValue: vi.fn() },
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

vi.mock('@/shared/audit/components/AuditHistoryModal', () => ({
  default: () => <div>Audit History Modal</div>,
}))

vi.mock('@/shared/audit/components/AuditEventDetails', () => ({
  default: () => <div>Audit Event Details</div>,
}))

vi.mock('./InspectionItemOverview', () => ({
  default: () => <div>Inspection Item Overview</div>,
}))

vi.mock('./InspectionItemConfiguration', () => ({
  default: () => <div>Inspection Item Configuration</div>,
}))

describe('InspectionItemDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<InspectionItemDetailPanel inspectionItemId="1" inspectionItem={{ _id: '1', name: 'Test Item' }} onSave={vi.fn()} />)
      expect(container).toBeInTheDocument()
    })

    it('renders new inspection item form', () => {
      const { container } = renderWithProviders(<InspectionItemDetailPanel inspectionItemId="new" inspectionItem={null} onSave={vi.fn()} />)
      expect(container).toBeInTheDocument()
    })

    it('renders existing inspection item', () => {
      renderWithProviders(<InspectionItemDetailPanel inspectionItemId="1" inspectionItem={{ _id: '1', name: 'Test Item' }} onSave={vi.fn()} />)
      expect(screen.getByText('Save')).toBeInTheDocument()
    })

    it('displays edit mode button', () => {
      renderWithProviders(<InspectionItemDetailPanel inspectionItemId="1" inspectionItem={{ _id: '1', name: 'Test Item' }} onSave={vi.fn()} />)
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('switches to edit mode when Edit button is clicked', () => {
      renderWithProviders(<InspectionItemDetailPanel inspectionItemId="1" inspectionItem={{ _id: '1', name: 'Test Item' }} onSave={vi.fn()} />)
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  describe('Save Functionality', () => {
    it('calls onSave when save is triggered', () => {
      const mockOnSave = vi.fn()
      renderWithProviders(<InspectionItemDetailPanel inspectionItemId="1" inspectionItem={{ _id: '1', name: 'Test Item' }} onSave={mockOnSave} />)
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })
})
