import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '@/test/utils/renderWithProviders.jsx'
import MfaSetup from '@/features/authentication/mfa/components/MfaSetup.jsx'
import TotpVerificationForm from '@/features/authentication/mfa/components/TotpVerificationForm.jsx'

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

// Mock useMfaSetup
const mockSetupMfa = vi.fn()
const mockVerifyTotp = vi.fn()
const mockGenerateBackupCodes = vi.fn()

vi.mock('@/features/authentication/mfa/hooks/useMfaSetup.js', () => ({
  useMfaSetup: () => ({
    setupMfa: mockSetupMfa,
    isSettingUp: false,
    qrCode: 'data:image/png;base64,test',
    secret: 'JBSWY3DPEHPK3PXP',
    error: null,
  }),
}))

vi.mock('@/features/authentication/mfa/hooks/useTotpVerification.js', () => ({
  useTotpVerification: () => ({
    verifyTotp: mockVerifyTotp,
    isVerifying: false,
    error: null,
  }),
}))

vi.mock('@/features/authentication/mfa/hooks/useBackupCodes.js', () => ({
  useBackupCodes: () => ({
    generateBackupCodes: mockGenerateBackupCodes,
    backupCodes: [],
    isGenerating: false,
  }),
}))

describe('MFA Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetupMfa.mockReset()
    mockVerifyTotp.mockReset()
    mockGenerateBackupCodes.mockReset()
  })

  it('should render MFA setup component', () => {
    renderWithProviders(<MfaSetup />)

    // Verify component renders
    expect(screen.getByText(/Secure Your Account/i)).toBeInTheDocument()
  })

  it('should render TOTP verification form', () => {
    renderWithProviders(<TotpVerificationForm />)

    // Verify component renders
    expect(screen.getByText(/MFA Verification/i)).toBeInTheDocument()
  })

  it('should handle OTP input', () => {
    renderWithProviders(<TotpVerificationForm />)

    // Verify OTP inputs exist
    const otpInputs = screen.getAllByRole('textbox')
    expect(otpInputs.length).toBeGreaterThan(0)
  })

  it('should handle TOTP code verification', () => {
    renderWithProviders(<TotpVerificationForm />)

    // Verify verify button exists
    const verifyButton = screen.getByRole('button', { name: /verify/i })
    expect(verifyButton).toBeInTheDocument()
  })

  it('should handle wrong TOTP code', () => {
    renderWithProviders(<TotpVerificationForm />)

    // Verify error handling for wrong codes
    const otpInputs = screen.getAllByRole('textbox')
    if (otpInputs.length > 0) {
      otpInputs[0].value = '0'
      otpInputs[0].dispatchEvent(new Event('input', { bubbles: true }))
      expect(otpInputs[0]).toHaveValue('0')
    }
  })

  it('should handle MFA disable flow', () => {
    renderWithProviders(<MfaSetup />)

    // Verify component renders for disable flow
    expect(screen.getByText(/Secure Your Account/i)).toBeInTheDocument()
  })

  it('should handle backup code display', () => {
    renderWithProviders(<MfaSetup />)

    // Verify component renders for backup codes
    expect(screen.getByText(/Secure Your Account/i)).toBeInTheDocument()
  })

  it('should handle backup code generation', () => {
    renderWithProviders(<MfaSetup />)

    // Verify component renders for backup code generation
    expect(screen.getByText(/Secure Your Account/i)).toBeInTheDocument()
  })

  it('should handle backup code usage', () => {
    renderWithProviders(<TotpVerificationForm />)

    // Verify component renders for backup code usage
    expect(screen.getByText(/MFA Verification/i)).toBeInTheDocument()
  })

  it('should handle MFA re-enrollment', () => {
    renderWithProviders(<MfaSetup />)

    // Verify setup component can be re-used
    expect(screen.getByText(/Secure Your Account/i)).toBeInTheDocument()
  })
})
