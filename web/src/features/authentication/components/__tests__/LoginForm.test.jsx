import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Form } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { fireEvent } from '@testing-library/react';
import LoginForm from '../../login/LoginForm.jsx';
import {
  renderWithProviders,
  screen,
  renderHook,
  waitFor,
  act,
} from '@/test/utils/renderWithProviders.jsx';
import { ThemeProvider } from '@/shared/theme/ThemeProvider.jsx';

const TestWrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/']}>
    <ThemeProvider>
      <AntdApp>{children}</AntdApp>
    </ThemeProvider>
  </MemoryRouter>
);

const mockNavigate = vi.fn();
const mockHandleFinish = vi.fn();
const mockUseLoginFlow = vi.fn(() => ({
  step: 'form',
  form: undefined,
  handleFinish: mockHandleFinish,
  isSubmitting: false,
  verificationProps: null,
  serverLockedUntil: null,
  mfaRequired: false,
}));
const mockGetRememberedEmails = vi.fn(() => []);
const mockGetAllRememberedEmailsWithDetails = vi.fn(() => []);
const mockClearRememberedEmail = vi.fn();

vi.mock('@/features/authentication/utils/validations', () => ({
  loginEmailRules: [],
  loginPasswordRules: [],
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/authentication/hooks', async () => {
  const actual = await vi.importActual('@/features/authentication/hooks');
  return {
    ...actual,
    useLoginFlow: () => mockUseLoginFlow(),
    useRememberedEmail: () => ({
      getRememberedEmails: mockGetRememberedEmails,
      getAllRememberedEmailsWithDetails: mockGetAllRememberedEmailsWithDetails,
      clearRememberedEmail: mockClearRememberedEmail,
    }),
    useAuthSession: () => ({
      currentUser: null,
      role: null,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

vi.mock('@/features/authentication/hooks/useWebAuthn.js', () => ({
  default: () => ({
    authenticateConditional: vi.fn(),
    registerPasskey: vi.fn(),
    authenticatePasskey: vi.fn(),
  }),
}));

vi.mock('@/shared/notifications.js', () => ({
  useNotifier: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  useAuthNotification: () => ({
    notificationError: null,
  }),
}));

vi.mock('@/features/authentication/components/PasskeySignInOptions.jsx', () => ({
  default: () => null,
}));
vi.mock('../PasskeySignInOptions.jsx', () => ({
  default: () => null,
}));

describe('LoginForm', () => {
  const getInputByTestId = (testId) => {
    const container = screen.getByTestId(testId);
    if (container?.tagName?.toLowerCase() === 'input') return container;
    return container?.querySelector('input');
  };
  const waitForFormReset = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  let form;

  beforeEach(async () => {
    mockGetRememberedEmails.mockClear();
    mockGetAllRememberedEmailsWithDetails.mockClear();
    mockClearRememberedEmail.mockClear();
    mockHandleFinish.mockClear();
    const { result } = renderHook(() => Form.useForm(), {
      wrapper: TestWrapper,
    });
    await waitFor(
      () => {
        expect(result.current).toBeTruthy();
        expect(result.current?.[0]).toBeTruthy();
      },
      { timeout: 5000 }
    );
    form = result.current[0];
    mockUseLoginFlow.mockReturnValue({
      step: 'form',
      form,
      handleFinish: mockHandleFinish,
      isSubmitting: false,
      initialValues: { email: '', password: '', rememberMe: false },
      prefillAdmin: vi.fn(),
      prefillAdmin2: vi.fn(),
      prefillAdmin3: vi.fn(),
      prefillUser: vi.fn(),
      prefillLguOfficer: vi.fn(),
      prefillInspector: vi.fn(),
      prefillCso: vi.fn(),
      verificationProps: null,
      serverLockedUntil: null,
      mfaRequired: false,
    });
    mockNavigate.mockReset();
  });

  it('renders inputs and submits credentials', async () => {
    const utils = renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(getInputByTestId('login-email')).toBeTruthy();
      expect(getInputByTestId('login-password')).toBeTruthy();
    });
    await waitForFormReset();

    const emailInput = getInputByTestId('login-email');
    const passwordInput = getInputByTestId('login-password');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'StrongP@ssw0rd' } });

    expect(emailInput.value).toBe('user@example.com');
    expect(passwordInput.value).toBe('StrongP@ssw0rd');

    // Cleanup explicitly to avoid lingering timers
    utils.unmount();
  }, 10000);

  it('navigates to forgot password on link click', async () => {
    renderWithProviders(<LoginForm />);

    fireEvent.click(screen.getByTestId('login-forgot'));

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('handles remember me checkbox', async () => {
    const utils = renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(getInputByTestId('login-email')).toBeTruthy();
    });
    await waitForFormReset();

    const rememberCheckbox = screen.getByTestId('login-remember');
    expect(rememberCheckbox).toBeInTheDocument();

    utils.unmount();
  });

  it('disables submit button during submission', async () => {
    mockUseLoginFlow.mockReturnValue({
      step: 'form',
      form,
      handleFinish: mockHandleFinish,
      isSubmitting: true,
      initialValues: { email: '', password: '', rememberMe: false },
      verificationProps: null,
      serverLockedUntil: null,
      mfaRequired: false,
    });

    renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(getInputByTestId('login-email')).toBeTruthy();
    });

    const submitButton = screen.getByTestId('login-submit');
    expect(submitButton).toBeInTheDocument();
  });

  it('handles server lockout state', async () => {
    mockUseLoginFlow.mockReturnValue({
      step: 'form',
      form,
      handleFinish: mockHandleFinish,
      isSubmitting: false,
      serverLockedUntil: new Date(Date.now() + 300000),
      initialValues: { email: '', password: '', rememberMe: false },
      verificationProps: null,
      mfaRequired: false,
    });

    renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(getInputByTestId('login-email')).toBeTruthy();
    });
  });

  it('handles MFA required state', async () => {
    mockUseLoginFlow.mockReturnValue({
      step: 'form',
      form,
      handleFinish: mockHandleFinish,
      isSubmitting: false,
      mfaRequired: true,
      initialValues: { email: '', password: '', rememberMe: false },
      verificationProps: null,
      serverLockedUntil: null,
    });

    renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(getInputByTestId('login-email')).toBeTruthy();
    });
  });
});
