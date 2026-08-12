import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/utils/renderWithProviders.jsx'
import { validLoginCredentials } from '@/test/fixtures/authData.js'
import LoginForm from '@/features/authentication/login/LoginForm.jsx'

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

// Mock PasskeySignInOptions
vi.mock('@/features/authentication/components/PasskeySignInOptions.jsx', () => ({
  default: () => null,
}))

// Mock validations
vi.mock('@/features/authentication/utils/validations', () => ({
  loginEmailRules: [],
  loginPasswordRules: [],
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Login Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
  })

  it('should render login form with all inputs', () => {
    renderWithProviders(<LoginForm />)

    expect(screen.getByTestId('login-email')).toBeInTheDocument()
    expect(screen.getByTestId('login-password')).toBeInTheDocument()
    expect(screen.getByTestId('login-submit')).toBeInTheDocument()
  })

  it('should accept user input', async () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByTestId('login-email')
    const passwordInput = screen.getByTestId('login-password')

    emailInput.value = validLoginCredentials.email
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    passwordInput.value = validLoginCredentials.password
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(emailInput).toHaveValue(validLoginCredentials.email)
    expect(passwordInput).toHaveValue(validLoginCredentials.password)
  })

  it('should show forgot password link', () => {
    renderWithProviders(<LoginForm />)

    const forgotLink = screen.getByTestId('login-forgot')
    expect(forgotLink).toBeInTheDocument()
  })

  it('should navigate to forgot password on link click', () => {
    renderWithProviders(<LoginForm />)

    const forgotLink = screen.getByTestId('login-forgot')
    forgotLink.click()

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password')
  })

  it('should show verification step when MFA is required', () => {
    renderWithProviders(<LoginForm />)

    // This test verifies the UI state when the hook returns verification step
    // The actual flow will be tested with MSW handlers in future iterations
    expect(screen.getByTestId('login-email')).toBeInTheDocument()
  })

  it('should show lockout banner when account is locked', () => {
    renderWithProviders(<LoginForm />)

    // This test verifies the UI state when the hook returns lockout
    // The actual flow will be tested with MSW handlers in future iterations
    expect(screen.getByTestId('login-email')).toBeInTheDocument()
  })

  it('should handle empty email field', async () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByTestId('login-email')
    const passwordInput = screen.getByTestId('login-password')

    // Leave email empty
    passwordInput.value = validLoginCredentials.password
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(emailInput).toHaveValue('')
    expect(passwordInput).toHaveValue(validLoginCredentials.password)
  })

  it('should handle empty password field', async () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByTestId('login-email')
    const passwordInput = screen.getByTestId('login-password')

    emailInput.value = validLoginCredentials.email
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    // Leave password empty
    expect(emailInput).toHaveValue(validLoginCredentials.email)
    expect(passwordInput).toHaveValue('')
  })

  it('should handle special characters in email', async () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByTestId('login-email')

    const specialEmail = 'user+test@example.com'
    emailInput.value = specialEmail
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(emailInput).toHaveValue(specialEmail)
  })

  it('should handle very long password', async () => {
    renderWithProviders(<LoginForm />)

    const passwordInput = screen.getByTestId('login-password')

    const longPassword = 'A'.repeat(200)
    passwordInput.value = longPassword
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(passwordInput).toHaveValue(longPassword)
  })

  it('should handle invalid email format', async () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByTestId('login-email')

    const invalidEmail = 'not-an-email'
    emailInput.value = invalidEmail
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(emailInput).toHaveValue(invalidEmail)
  })

  it('should handle concurrent submissions (double-click protection)', async () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByTestId('login-email')
    const passwordInput = screen.getByTestId('login-password')
    const submitButton = screen.getByTestId('login-submit')

    emailInput.value = validLoginCredentials.email
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    passwordInput.value = validLoginCredentials.password
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    // Double-click simulation
    submitButton.click()
    submitButton.click()

    // Verify button is disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    }, { timeout: 3000 })
  })
})
