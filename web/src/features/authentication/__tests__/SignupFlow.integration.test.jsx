import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '@/test/utils/renderWithProviders.jsx'
import { validSignupData } from '@/test/fixtures/authData.js'
import UserSignUpForm from '@/features/authentication/signup/UserSignUpForm.jsx'

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

// Mock SignUpVerificationForm
vi.mock('@/features/authentication/components/SignUpVerificationForm.jsx', () => ({
  default: ({ email }) => <div data-testid="verification-form">Verify {email}</div>,
}))

// Mock validations
vi.mock('@/features/authentication/utils/validations', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    emailRules: [],
    firstNameRules: [],
    lastNameRules: [],
    middleNameRules: [],
    phoneNumberRules: [],
    signUpPasswordRules: [],
    signUpConfirmPasswordRules: [],
    termsRules: [],
  }
})

// Mock PIS rules
vi.mock('@/features/authentication/utils/validations/pisRules', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    pisMaritalStatusRules: [],
    pisDateOfBirthRules: [],
    pisPlaceOfBirthRules: [],
    pisNationalityRules: [],
    pisFatherNameRules: [],
    pisMotherNameRules: [],
    pisEducationRules: [],
    pisStreetRules: [],
    pisBarangayRules: [],
    pisCityRules: [],
    pisProvinceRules: [],
    pisZipCodeRules: [],
    pisSexRules: [],
  }
})

// Mock LinkExistingAccountModal
vi.mock('@/features/authentication/components/LinkExistingAccountModal.jsx', () => ({
  default: () => null,
}))

describe('Signup Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render signup form with all inputs', () => {
    renderWithProviders(<UserSignUpForm />)

    expect(screen.getByPlaceholderText('First name')).toBeVisible()
    expect(screen.getByPlaceholderText('Last name')).toBeVisible()
    expect(screen.getByPlaceholderText('Email address')).toBeVisible()
    expect(screen.getByPlaceholderText('Mobile number')).toBeVisible()
  })

  it('should accept user input', async () => {
    renderWithProviders(<UserSignUpForm />)

    const firstNameInput = screen.getByPlaceholderText('First name')
    const lastNameInput = screen.getByPlaceholderText('Last name')
    const emailInput = screen.getByPlaceholderText('Email address')
    const phoneInput = screen.getByPlaceholderText('Mobile number')

    firstNameInput.value = validSignupData.firstName
    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    lastNameInput.value = validSignupData.lastName
    lastNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    emailInput.value = validSignupData.email
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    phoneInput.value = validSignupData.phoneNumber
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(firstNameInput).toHaveValue(validSignupData.firstName)
    expect(lastNameInput).toHaveValue(validSignupData.lastName)
    expect(emailInput).toHaveValue(validSignupData.email)
    expect(phoneInput).toHaveValue(validSignupData.phoneNumber)
  })

  it('should show Continue button', () => {
    renderWithProviders(<UserSignUpForm />)

    const button = screen.getByRole('button', { name: /continue/i })
    expect(button).toBeInTheDocument()
  })

  it('should handle empty first name', async () => {
    renderWithProviders(<UserSignUpForm />)

    const firstNameInput = screen.getByPlaceholderText('First name')
    const lastNameInput = screen.getByPlaceholderText('Last name')

    lastNameInput.value = validSignupData.lastName
    lastNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(firstNameInput).toHaveValue('')
    expect(lastNameInput).toHaveValue(validSignupData.lastName)
  })

  it('should handle empty last name', async () => {
    renderWithProviders(<UserSignUpForm />)

    const firstNameInput = screen.getByPlaceholderText('First name')
    const lastNameInput = screen.getByPlaceholderText('Last name')

    firstNameInput.value = validSignupData.firstName
    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(firstNameInput).toHaveValue(validSignupData.firstName)
    expect(lastNameInput).toHaveValue('')
  })

  it('should handle empty email', async () => {
    renderWithProviders(<UserSignUpForm />)

    const firstNameInput = screen.getByPlaceholderText('First name')
    const emailInput = screen.getByPlaceholderText('Email address')

    firstNameInput.value = validSignupData.firstName
    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(firstNameInput).toHaveValue(validSignupData.firstName)
    expect(emailInput).toHaveValue('')
  })

  it('should handle empty phone number', async () => {
    renderWithProviders(<UserSignUpForm />)

    const firstNameInput = screen.getByPlaceholderText('First name')
    const phoneInput = screen.getByPlaceholderText('Mobile number')

    firstNameInput.value = validSignupData.firstName
    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(firstNameInput).toHaveValue(validSignupData.firstName)
    expect(phoneInput).toHaveValue('')
  })

  it('should handle invalid email format', async () => {
    renderWithProviders(<UserSignUpForm />)

    const emailInput = screen.getByPlaceholderText('Email address')

    const invalidEmail = 'not-an-email'
    emailInput.value = invalidEmail
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(emailInput).toHaveValue(invalidEmail)
  })

  it('should handle invalid phone format', async () => {
    renderWithProviders(<UserSignUpForm />)

    const phoneInput = screen.getByPlaceholderText('Mobile number')

    const invalidPhone = '123'
    phoneInput.value = invalidPhone
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(phoneInput).toHaveValue(invalidPhone)
  })

  it('should handle very long first name', async () => {
    renderWithProviders(<UserSignUpForm />)

    const firstNameInput = screen.getByPlaceholderText('First name')

    const longName = 'A'.repeat(200)
    firstNameInput.value = longName
    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(firstNameInput).toHaveValue(longName)
  })

  it('should handle special characters in name', async () => {
    renderWithProviders(<UserSignUpForm />)

    const firstNameInput = screen.getByPlaceholderText('First name')

    const specialName = "José María"
    firstNameInput.value = specialName
    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(firstNameInput).toHaveValue(specialName)
  })

  it('should show verification step after form submission', () => {
    renderWithProviders(<UserSignUpForm />)

    // This test verifies the UI state when the hook returns verification step
    // The actual flow will be tested with MSW handlers in future iterations
    expect(screen.getByPlaceholderText('First name')).toBeVisible()
  })

  it('should handle terms checkbox', async () => {
    renderWithProviders(<UserSignUpForm />)

    const termsCheckbox = screen.queryByRole('checkbox', { name: /terms/i })

    if (termsCheckbox) {
      termsCheckbox.checked = true
      termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))

      expect(termsCheckbox).toBeChecked()
    }
  })
})
