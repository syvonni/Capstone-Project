/**
 * Test-specific utilities for inspection items feature testing
 */

import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { vi } from 'vitest'

/**
 * Mock the inspection items service
 */
export function mockInspectionItemService() {
  vi.mock('@/features/admin/services/inspectionItemService', () => ({
    getInspectionItems: vi.fn(),
    getInspectionItem: vi.fn(),
    createInspectionItem: vi.fn(),
    updateInspectionItem: vi.fn(),
    disableInspectionItem: vi.fn(),
    getAllInspectionItemAudits: vi.fn(),
  }))
}

/**
 * Mock the checklist service
 */
export function mockChecklistService() {
  vi.mock('@/features/admin/services/checklistService', () => ({
    getChecklistsByInspectionItem: vi.fn(),
  }))
}

/**
 * Mock the violations service (needed for inspection items)
 */
export function mockViolationService() {
  vi.mock('@/features/admin/services/violationService', () => ({
    getViolations: vi.fn(),
  }))
}

/**
 * Mock shared monitoring hooks
 */
export function mockMonitoringHooks() {
  vi.mock('@/shared/monitoring/hooks/useDataQuality', () => ({
    useDataQuality: vi.fn(() => ({ issues: [], loading: false })),
  }))

  vi.mock('@/shared/monitoring/hooks/usePerformance', () => ({
    usePerformance: vi.fn(() => ({ data: {}, loading: false })),
  }))
}

/**
 * Mock shared components
 */
export function mockSharedComponents() {
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

  vi.mock('@/shared/components/PanelCard', () => ({
    default: ({ title, tags, metaInfo, selected, onClick, children }) => (
      <div
        data-testid={`panel-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={onClick}
        data-selected={selected}
      >
        <div data-testid="card-title">{title}</div>
        {tags && <div data-testid="card-tags-count">{tags.length}</div>}
        {metaInfo && <div data-testid="card-meta-count">{metaInfo.length}</div>}
        {children && <div data-testid="card-children">{children}</div>}
      </div>
    ),
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

  vi.mock('@/shared/components/InfoGrid', () => ({
    default: ({ items, loading, noPadding }) => (
      <div data-testid="info-grid">
        <div data-testid="info-grid-loading">{loading ? 'loading' : 'not-loading'}</div>
        <div data-testid="info-grid-items-count">{items?.length || 0}</div>
      </div>
    ),
  }))

  vi.mock('@/shared/components/DetailHeader', () => ({
    default: ({ title, primaryButton, showUndoRedo, onUndo, onRedo, canUndo, canRedo, iconButtons, actionButtons, instructionSlotId, selectFields }) => (
      <div data-testid="detail-header">
        <div data-testid="header-title">{title}</div>
        <div data-testid="header-primary-button">{primaryButton?.text || ''}</div>
        <div data-testid="header-show-undo-redo">{showUndoRedo ? 'true' : 'false'}</div>
        <div data-testid="header-can-undo">{canUndo ? 'true' : 'false'}</div>
        <div data-testid="header-can-redo">{canRedo ? 'true' : 'false'}</div>
        {iconButtons && <div data-testid="header-icon-buttons-count">{iconButtons.length}</div>}
        {actionButtons && <div data-testid="header-action-buttons-count">{actionButtons.length}</div>}
        {selectFields && <div data-testid="header-select-fields-count">{selectFields.length}</div>}
      </div>
    ),
  }))
}

/**
 * Setup all mocks for inspection items testing
 */
export function setupInspectionItemsMocks() {
  mockInspectionItemService()
  mockChecklistService()
  mockViolationService()
  mockMonitoringHooks()
  mockSharedComponents()
}

/**
 * Render a component with all necessary mocks
 */
export function renderWithInspectionItemsMocks(ui, options = {}) {
  setupInspectionItemsMocks()
  return renderWithProviders(ui, options)
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
