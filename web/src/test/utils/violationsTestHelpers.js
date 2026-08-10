/**
 * Test-specific utilities for violations feature testing
 */

import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { vi } from 'vitest'

/**
 * Mock the violations service
 */
export function mockViolationService() {
  vi.mock('@/features/admin/services/violationService', () => ({
    getViolations: vi.fn(),
    getViolation: vi.fn(),
    createViolation: vi.fn(),
    updateViolation: vi.fn(),
    disableViolation: vi.fn(),
    getAllViolationAudits: vi.fn(),
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
}

/**
 * Setup all mocks for violations testing
 */
export function setupViolationsMocks() {
  mockViolationService()
  mockMonitoringHooks()
  mockSharedComponents()
}

/**
 * Render a component with all necessary mocks
 */
export function renderWithViolationsMocks(ui, options = {}) {
  setupViolationsMocks()
  return renderWithProviders(ui, options)
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
