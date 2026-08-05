import { vi } from 'vitest';

// Mock React hooks for testing
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useState: vi.fn((initial) => [initial, vi.fn()]),
    useEffect: vi.fn(),
    useMemo: vi.fn((fn) => fn()),
    useCallback: vi.fn((fn) => fn),
    useRef: vi.fn(() => ({ current: null }))
  };
});

// Mock useBusiness hook
vi.mock('@/hooks/useBusiness', () => ({
  useBusiness: vi.fn(() => ({
    business: {
      id: 'test-business-123',
      businessName: 'Test Business',
      applicationStatus: 'approved',
      permitNumber: 'PERMIT-001'
    },
    businesses: [],
    loading: false,
    error: null
  }))
}));

// Mock all services
vi.mock('../../services/riskProfileService', () => ({
  getRiskProfile: vi.fn(),
  getRiskFactors: vi.fn(),
  getRiskImpactAnalysis: vi.fn(),
  getRiskReductionRecommendations: vi.fn()
}));

vi.mock('../../services/businessConflictService', () => ({
  getBusinessConflicts: vi.fn(),
  resolveConflict: vi.fn()
}));

vi.mock('../../services/permitService', () => ({
  getPermitCategories: vi.fn(),
  submitPermitApplication: vi.fn(),
  getPermitApplications: vi.fn()
}));

vi.mock('../../services/notificationService', () => ({
  getNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  deleteNotification: vi.fn()
}));

vi.mock('../../services/paymentService', () => ({
  getPaymentMethods: vi.fn(),
  getPaymentHistory: vi.fn(),
  getPaymentAnalytics: vi.fn()
}));

vi.mock('../../services/offlineService', () => ({
  getMobileDashboardData: vi.fn(),
  syncOfflineData: vi.fn()
}));
