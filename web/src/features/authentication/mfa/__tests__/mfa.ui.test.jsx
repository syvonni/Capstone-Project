import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders.jsx'

// Mock hooks and services used by MFA components
vi.mock('@/shared/theme/ThemeProvider.jsx', () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  THEMES: {},
  useAppTheme: () => 'default',
}))

vi.mock('@/features/authentication/hooks', () => ({
  useAuthSession: () => ({ currentUser: { email: 'jane@example.com', role: 'user' }, login: () => {}, logout: () => {} }),
  useLoginVerificationForm: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false, prefillDevCode: () => {} }),
  useTotpVerificationForm: () => ({ code: '', setCode: () => {}, codeError: '', handleVerify: () => {}, isSubmitting: false }),
  useResendLoginCode: () => ({ isSending: false, handleResend: () => {}, isCooling: false, remaining: 0 }),
  useMfaSetup: () => ({ loading: false, qrDataUrl: null, uri: null, secret: null, code: '', setCode: () => {}, enabled: false, handleSetup: () => {}, handleVerify: () => {}, handleDisable: () => {}, markMfaComplete: () => {}, showSecret: false, toggleShowSecret: () => {}, confirmedSaved: false, setConfirmedSaved: () => {}, handleCopy: () => {} }),
  useConfirmLogoutModal: () => ({ open: false, show: () => {}, hide: () => {}, confirming: false, handleConfirm: () => {} }),
  useLoggedInMfaManager: vi.fn(() => ({
    currentUser: { email: 'jane@example.com', role: 'user' },
    role: { slug: 'user' },
    status: 'disabled',
    loading: false,
    isLoading: false,
    enabled: false,
    statusFetchFailed: false,
    disablePending: false,
    scheduledFor: null,
    countdown: '',
    confirmModalVisible: false,
    setConfirmModalVisible: () => {},
    confirmCode: '',
    setConfirmCode: () => {},
    undoModalVisible: false,
    setUndoModalVisible: () => {},
    undoCode: '',
    setUndoCode: () => {},
    qrDataUrl: null,
    uri: null,
    secret: 'S3CR3T',
    code: '',
    setCode: () => {},
    handleSetup: () => {},
    handleVerify: () => {},
    handleDisable: () => {},
    handleEnable: () => {},
    handleOpenSetup: () => {},
    confirmDisable: () => {},
    confirmDisableWithoutVerify: () => {},
    confirmUndo: () => {},
  })),
  useVerificationForm: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false, prefillDevCode: () => {} }),
  usePasswordResetTotpVerification: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  useMfaVerificationForm: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  useSignUpVerificationForm: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  useVerifyChangeEmailForm: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  useVerifyDeleteAccountCode: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  useEmailChangeTotpVerification: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  usePasswordChangeTotpVerification: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  useDeleteAccountTotpVerification: () => ({ form: undefined, handleFinish: () => {}, isSubmitting: false }),
  useResendSignupCode: () => ({ isSending: false, handleResend: () => {}, isCooling: false, remaining: 0 }),
  useResendEmailChangeCode: () => ({ isSending: false, handleResend: () => {}, isCooling: false, remaining: 0 }),
  useResendDeleteAccountCode: () => ({ isSending: false, handleResend: () => {}, isCooling: false, remaining: 0 }),
  useOtpCountdown: () => ({ remaining: null, isExpired: false }),
}))

vi.mock('@/features/authentication/passkey/hooks/usePasskeyManager', () => ({
  usePasskeyManager: () => ({ handleRegister: () => Promise.resolve(false), registering: false }),
}))

vi.mock('@/features/authentication/services/mfaService', () => ({
  mfaSetup: async () => ({ secret: 'S3CR3T', otpauthUri: 'otpauth://totp/App:email?secret=S3CR3T' }),
  mfaStatus: async () => ({ enabled: false }),
  mfaVerify: async () => ({ enabled: true }),
  mfaDisable: async () => ({ disabled: true }),
}))

// Mock notification hook used by components
vi.mock('@/shared/notifications', () => ({
  useNotifier: () => ({ success: () => {}, info: () => {}, error: () => {}, warning: () => {} }),
  useAuthNotification: () => ({ notificationError: () => {}, notificationSuccess: () => {} }),
}))

// Mock QrDisplay to keep snapshots simple
vi.mock('@/features/authentication/mfa/components/QrDisplay.jsx', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'qr' }, 'QR')
}))

import MfaSetup from '@/features/authentication/mfa/components/MfaSetup.jsx'
import VerificationForm from '@/features/authentication/components/VerificationForm.jsx'
import TotpVerificationForm from '@/features/authentication/mfa/components/TotpVerificationForm.jsx'
import LoggedInMfaManager from '@/features/authentication/mfa/components/LoggedInMfaManager.jsx'
import { useLoggedInMfaManager } from '@/features/authentication/hooks'

describe('MFA UI snapshots', () => {
  beforeEach(() => {
    // jsdom doesn't implement matchMedia; Ant Design uses it for responsive observer
    if (typeof window.matchMedia !== 'function') {
      window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
  })

  it('renders MfaSetup initial view', () => {
    const { getByText } = renderWithProviders(<MfaSetup />)
    expect(getByText(/Secure Your Account/i)).toBeInTheDocument()
    expect(getByText(/Protect your account from unauthorized access/i)).toBeInTheDocument()
  })

  it('renders VerificationForm with resend button (login type)', () => {
    const { getByText, getByRole } = renderWithProviders(
      <VerificationForm 
        email="jane@example.com" 
        devCode="123456" 
        verificationType="login"
        onResend={() => {}}
      />
    )
    expect(getByText(/Verify Code/i)).toBeInTheDocument()
    expect(getByRole('button', { name: /Resend Code/i })).toBeInTheDocument()
  })

  it('renders TotpVerificationForm', () => {
    const { getByText, getAllByRole } = renderWithProviders(<TotpVerificationForm email="jane@example.com" />)
    expect(getByText(/MFA Verification/i)).toBeInTheDocument()
    // OTP inputs should exist (6 fields)
    expect(getAllByRole('textbox').length).toBeGreaterThanOrEqual(1)
  })

  it('renders LoggedInMfaManager for user', () => {
    const { getByText } = renderWithProviders(<LoggedInMfaManager />)
    expect(getByText(/Multi-Factor Authentication/i)).toBeInTheDocument()
    expect(getByText(/Setup MFA/i)).toBeInTheDocument()
  })

  it('renders LoggedInMfaManager for user with MFA enabled', () => {
    vi.mocked(useLoggedInMfaManager).mockReturnValue({
      currentUser: { email: 'jane@example.com', role: 'user' },
      role: { slug: 'user' },
      status: 'enabled',
      loading: false,
      isLoading: false,
      enabled: true,
      statusFetchFailed: false,
      disablePending: false,
      scheduledFor: null,
      countdown: '',
      confirmModalVisible: false,
      setConfirmModalVisible: () => {},
      confirmCode: '',
      setConfirmCode: () => {},
      undoModalVisible: false,
      setUndoModalVisible: () => {},
      undoCode: '',
      setUndoCode: () => {},
      qrDataUrl: null,
      uri: null,
      secret: 'S3CR3T',
      code: '',
      setCode: () => {},
      handleSetup: () => {},
      handleVerify: () => {},
      handleDisable: () => {},
      handleEnable: () => {},
      handleOpenSetup: () => {},
      confirmDisable: () => {},
      confirmDisableWithoutVerify: () => {},
      confirmUndo: () => {},
    })
    const { getByRole, getByText } = renderWithProviders(<LoggedInMfaManager />)
    expect(getByRole('heading', { name: /Multi-Factor Authentication/i })).toBeInTheDocument()
    expect(getByText(/Manage MFA/i)).toBeInTheDocument()
  })
})
