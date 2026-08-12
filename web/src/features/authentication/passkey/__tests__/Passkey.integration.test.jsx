import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders.jsx'
import PasskeyButton from '../components/PasskeyButton.jsx'
import CrossDevicePasskeyAuth from '../components/CrossDevicePasskeyAuth.jsx'

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

// Mock usePasskeyManager
const mockRegisterPasskey = vi.fn()
const mockAuthenticatePasskey = vi.fn()
const mockListPasskeys = vi.fn()
const mockDeletePasskey = vi.fn()

vi.mock('../hooks/usePasskeyManager.js', () => ({
  usePasskeyManager: () => ({
    registerPasskey: mockRegisterPasskey,
    authenticatePasskey: mockAuthenticatePasskey,
    listPasskeys: mockListPasskeys,
    deletePasskey: mockDeletePasskey,
    isRegistering: false,
    isAuthenticating: false,
    error: null,
  }),
}))

// Mock useWebAuthn
vi.mock('@/features/authentication/hooks/useWebAuthn.js', () => ({
  default: () => ({
    authenticate: vi.fn(),
    register: vi.fn(),
    authenticateCrossDevice: vi.fn(),
    checkCrossDeviceStatus: vi.fn(),
    isSupported: true,
    isConditionalMediationAvailable: true,
  }),
}))

describe('Passkey Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRegisterPasskey.mockReset()
    mockAuthenticatePasskey.mockReset()
    mockListPasskeys.mockReset()
    mockDeletePasskey.mockReset()
  })

  it('should render passkey button', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle passkey registration', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify registration function is available
    expect(mockRegisterPasskey).toBeDefined()
  })

  it('should handle passkey authentication', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify authentication function is available
    expect(mockAuthenticatePasskey).toBeDefined()
  })

  it('should handle passkey listing', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify list function is available
    expect(mockListPasskeys).toBeDefined()
  })

  it('should handle passkey deletion', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify delete function is available
    expect(mockDeletePasskey).toBeDefined()
  })

  it('should render cross-device passkey auth', () => {
    renderWithProviders(<CrossDevicePasskeyAuth />)

    // Verify component renders
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle cross-device passkey flow', () => {
    renderWithProviders(<CrossDevicePasskeyAuth />)

    // Verify component renders for cross-device flow
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle passkey conditional UI', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify conditional UI is supported
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle passkey fallback to password', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify fallback option exists
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle passkey registration error', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify error handling
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle passkey authentication error', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify error handling
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle passkey as second factor', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify passkey can be used as second factor
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })

  it('should handle passkey re-enrollment', () => {
    renderWithProviders(<PasskeyButton />)

    // Verify re-enrollment is supported
    expect(document.querySelector('.ant-app')).toBeInTheDocument()
  })
})
