import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute.jsx'
import { renderWithProviders, screen } from '@/test/utils/renderWithProviders.jsx'

// Mock ThemeProvider to avoid localStorage usage in tests (ThemeProvider calls localStorage.getItem on init)
vi.mock('@/shared/theme/ThemeProvider.jsx', () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  THEMES: {},
  useAppTheme: () => 'default',
}))

// Mock auth hooks and helpers from the authentication barrel
const mockUseAuthSession = vi.fn()
const mockUseMaintenanceStatus = vi.fn()
const mockGetIsLoggingOut = vi.fn(() => false)
const mockGetLogoutNotification = vi.fn(() => null)

vi.mock('@/features/authentication', async () => {
  const actual = await vi.importActual('@/features/authentication')
  return {
    ...actual,
    useAuthSession: (...args) => mockUseAuthSession(...args),
    useMaintenanceStatus: (...args) => mockUseMaintenanceStatus(...args),
  }
})

vi.mock('@/features/authentication/lib/authEvents.js', async () => {
  const actual = await vi.importActual('@/features/authentication/lib/authEvents.js')
  return {
    ...actual,
    getIsLoggingOut: () => mockGetIsLoggingOut(),
    getLogoutNotification: () => mockGetLogoutNotification(),
  }
})

const LocationEcho = () => {
  const location = useLocation()
  return (
    <div data-testid="location">
      {location.pathname}::{location.state?.notification?.message || ''}
    </div>
  )
}

const Secure = () => <div>secure content</div>

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseMaintenanceStatus.mockReturnValue({ loading: false, active: false })
    mockGetIsLoggingOut.mockReturnValue(false)
    mockGetLogoutNotification.mockReturnValue(null)
  })

  it('renders children when authenticated and allowed', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: { token: 'token', role: 'user' },
      role: { slug: 'user' },
      isLoading: false,
    })

    renderWithProviders(
      <Routes>
        <Route path="/" element={<ProtectedRoute><Secure /></ProtectedRoute>} />
      </Routes>
    )

    expect(screen.getByText('secure content')).toBeInTheDocument()
  })

  it('accepts business owner role aliases', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: { token: 'token', role: 'owner' },
      role: { slug: 'owner' },
      isLoading: false,
    })

    renderWithProviders(
      <Routes>
        <Route path="/owner" element={<ProtectedRoute allowedRoles={['business_owner']}><Secure /></ProtectedRoute>} />
      </Routes>,
      { initialEntries: ['/owner'] }
    )

    expect(screen.getByText('secure content')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login with warning for sensitive routes', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: null,
      role: null,
      isLoading: false,
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute><Secure /></ProtectedRoute>}
        />
        <Route path="/login" element={<LocationEcho />} />
      </Routes>,
      { initialEntries: ['/admin/dashboard'] }
    )

    expect(screen.getByTestId('location').textContent).toContain('/login::Restricted Access')
  })

  it('redirects while logging out without showing a restricted-access warning', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: null,
      role: null,
      isLoading: false,
    })
    mockGetIsLoggingOut.mockReturnValue(true)

    renderWithProviders(
      <Routes>
        <Route
          path="/owner"
          element={<ProtectedRoute><Secure /></ProtectedRoute>}
        />
        <Route path="/login" element={<LocationEcho />} />
      </Routes>,
      { initialEntries: ['/owner'] }
    )

    expect(screen.getByTestId('location').textContent).toBe('/login::')
  })

  it('redirects with a queued logout notification without showing a restricted-access warning', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: null,
      role: null,
      isLoading: false,
    })
    mockGetLogoutNotification.mockReturnValue({
      type: 'success',
      message: 'Logged out',
      description: 'You have been signed out successfully.',
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/owner"
          element={<ProtectedRoute><Secure /></ProtectedRoute>}
        />
        <Route path="/login" element={<LocationEcho />} />
      </Routes>,
      { initialEntries: ['/owner'] }
    )

    expect(screen.getByTestId('location').textContent).toBe('/login::')
  })

  it('redirects non-admin users to maintenance page when maintenance mode is active', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: { token: 'token', role: 'user' },
      role: { slug: 'user' },
      isLoading: false,
    })
    mockUseMaintenanceStatus.mockReturnValue({ loading: false, active: true })

    renderWithProviders(
      <Routes>
        <Route
          path="/owner"
          element={<ProtectedRoute><Secure /></ProtectedRoute>}
        />
        <Route path="/maintenance" element={<LocationEcho />} />
      </Routes>,
      { initialEntries: ['/owner'] }
    )

    expect(screen.getByTestId('location').textContent).toContain('/maintenance::')
  })

  it('allows admin users during maintenance mode', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: { token: 'token', role: 'admin' },
      role: { slug: 'admin' },
      isLoading: false,
    })
    mockUseMaintenanceStatus.mockReturnValue({ loading: false, active: true })

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute><Secure /></ProtectedRoute>}
        />
      </Routes>,
      { initialEntries: ['/admin/dashboard'] }
    )

    expect(screen.getByText('secure content')).toBeInTheDocument()
  })

  it('shows loading state while checking authentication', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: null,
      role: null,
      isLoading: true,
    })

    renderWithProviders(
      <Routes>
        <Route path="/" element={<ProtectedRoute><Secure /></ProtectedRoute>} />
      </Routes>
    )

    // Should not render content while loading
    expect(screen.queryByText('secure content')).not.toBeInTheDocument()
  })

  it('handles multiple allowed roles', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: { token: 'token', role: 'staff' },
      role: { slug: 'staff' },
      isLoading: false,
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/staff"
          element={<ProtectedRoute allowedRoles={['admin', 'staff', 'lgu_officer']}><Secure /></ProtectedRoute>}
        />
      </Routes>,
      { initialEntries: ['/staff'] }
    )

    expect(screen.getByText('secure content')).toBeInTheDocument()
  })

  it('blocks users with disallowed roles', () => {
    mockUseAuthSession.mockReturnValue({
      currentUser: { token: 'token', role: 'user' },
      role: { slug: 'user' },
      isLoading: false,
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/admin"
          element={<ProtectedRoute allowedRoles={['admin']}><Secure /></ProtectedRoute>}
        />
        <Route path="*" element={<LocationEcho />} />
      </Routes>,
      { initialEntries: ['/admin'] }
    )

    expect(screen.queryByText('secure content')).not.toBeInTheDocument()
    expect(screen.getByTestId('location').textContent).toContain('Restricted Access')
  })
})
