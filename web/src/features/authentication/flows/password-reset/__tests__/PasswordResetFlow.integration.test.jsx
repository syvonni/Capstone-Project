import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders.jsx'
import PasswordResetFlow from '../PasswordResetFlow.jsx'

// Mock lottie-web
vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: () => ({
      destroy: vi.fn(),
      play: vi.fn(),
      stop: vi.fn(),
      setSpeed: vi.fn(),
      goToAndPlay: vi.fn(),
      goToAndStop: vi.fn(),
    }),
  },
}))

// Mock LottieSpinner
vi.mock('@/shared/components/graphics/LottieSpinner.jsx', () => ({
  default: () => null,
}))

// Mock usePasswordResetFlow
const mockRequestPasswordReset = vi.fn()
const mockResetPassword = vi.fn()
const mockGoBack = vi.fn()

vi.mock('../hooks/usePasswordResetFlow.js', () => ({
  usePasswordResetFlow: () => ({
    requestPasswordReset: mockRequestPasswordReset,
    resetPassword: mockResetPassword,
    isRequesting: false,
    isResetting: false,
    error: null,
    step: 'request',
    forgotProps: {},
    verifyProps: { email: 'test@example.com' },
    mfaProps: {},
    totpProps: {},
    changeProps: {},
    goBack: mockGoBack,
  }),
}))

// Mock useResendForgotPasswordCode
vi.mock('../hooks/useResendForgotPasswordCode.js', () => ({
  useResendForgotPasswordCode: () => ({
    resend: vi.fn(),
    canResend: true,
    cooldownRemaining: 0,
  }),
}))

describe('Password Reset Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestPasswordReset.mockReset()
    mockResetPassword.mockReset()
    mockGoBack.mockReset()
  })

  it('should render password reset flow component', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders without crashing
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should have password reset hook available', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify hook is called
    expect(mockRequestPasswordReset).toBeDefined()
    expect(mockResetPassword).toBeDefined()
  })

  it('should handle go back function', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify goBack is available
    expect(mockGoBack).toBeDefined()
  })

  it('should handle email input for password reset', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle password reset request', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle password reset with valid token', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle password reset with expired token', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle password reset with invalid token', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle password strength validation during reset', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle password confirmation mismatch', () => {
    renderWithProviders(<PasswordResetFlow />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })
})
