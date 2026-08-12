import React from 'react';
import { Form } from 'antd';
import {
  Input,
  Button,
  Flex,
  Checkbox,
  Dropdown,
  Typography,
  Grid,
  Alert,
  Modal,
  theme,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { loginEmailRules, loginPasswordRules } from '@/features/authentication/utils/validations';
import { useLoginFlow } from './hooks/useLoginFlow.js';
import { useAuthSession, useResendLoginCode } from '@/features/authentication/hooks';
import useWebAuthn from '@/features/authentication/hooks/useWebAuthn.js';
import useOtpCountdown from '@/features/authentication/hooks/useOtpCountdown.js';
import VerificationForm from '@/features/authentication/components/VerificationForm.jsx';
import TotpVerificationForm from '@/features/authentication/mfa/components/TotpVerificationForm.jsx';
import PlatformPasskeyAuth from './components/PlatformPasskeyAuth.jsx';
import PasskeySignInOptions from './components/PasskeySignInOptions.jsx';
import TurnstileWidget from '@/features/authentication/components/TurnstileWidget.jsx';
import { useAutofillSync } from '../utils/login/useAutofillSync.js';
import { useConditionalPasskey } from '../utils/login/useConditionalPasskey.js';
import { useDevPrefill } from '../utils/login/useDevPrefill.js';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

export default function LoginForm({ onSubmit } = {}) {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = useToken();
  const passwordInputRef = React.useRef(null);
  const turnstileRef = React.useRef(null);
  const turnstileSiteKey =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_TURNSTILE_SITE_KEY) ||
    '';

  const {
    step,
    form,
    handleFinish,
    isSubmitting,
    prefillAdmin,
    prefillAdmin2,
    prefillAdmin3,
    prefillUser,
    prefillLguOfficer,
    prefillLguOfficer2,
    prefillInspector,
    prefillInvalid,
    verificationProps,
    serverLockedUntil,
    mfaRequired,
    initialValues,
  } = useLoginFlow({
    onSubmit,
    getCaptchaToken: turnstileSiteKey ? () => turnstileRef.current?.getToken?.() ?? '' : undefined,
  });

  const { login } = useAuthSession();
  const { authenticateConditional } = useWebAuthn();
  const resendHook = useResendLoginCode({
    email: verificationProps.email,
    cooldownSec: 60,
    onSessionExpired: verificationProps.onSessionExpired,
  });

  // State to manage readOnly hack for autofill prevention
  const [fieldsReadOnly, setFieldsReadOnly] = React.useState(true);
  // State to force form remounting (defeats browser bfcache/restoration)
  const [formKey, setFormKey] = React.useState(Date.now());
  // When user dismisses the lockout modal we hide it until next lockout
  const [lockoutAlertDismissed, setLockoutAlertDismissed] = React.useState(false);
  const lockoutCountdown = useOtpCountdown(serverLockedUntil);

  const watchedEmail = Form.useWatch('email', form) ?? '';
  const watchedPassword = Form.useWatch('password', form) ?? '';

  // Extracted hooks
  const { syncAutofillPassword } = useAutofillSync(form, passwordInputRef);
  const { handleEmailFocusForPasskey, getReadyForModalPasskey } = useConditionalPasskey({
    step,
    form,
    login,
    onSubmit,
    authenticateConditional,
  });
  useDevPrefill({
    prefillAdmin,
    prefillAdmin2,
    prefillAdmin3,
    prefillUser,
    prefillLguOfficer,
    prefillLguOfficer2,
    prefillInspector,
    prefillInvalid,
    setFieldsReadOnly,
  });

  // On initial load only set email/rememberMe (never password) so browser can autofill password.
  React.useEffect(() => {
    const onInitialMount = () => {
      setFieldsReadOnly(false);
      const preserveRememberMe = initialValues?.rememberMe === true;
      form.setFieldsValue({
        email: initialValues?.email || '',
        rememberMe: preserveRememberMe ? true : false,
      });
    };

    const clearFieldsForBfcache = () => {
      setFieldsReadOnly(false);
      form.resetFields();
      form.setFieldsValue({ email: '', password: '', rememberMe: false });
    };

    const timer = setTimeout(onInitialMount, 50);

    const handlePageShow = (event) => {
      if (event.persisted) {
        setFormKey(Date.now());
        setTimeout(clearFieldsForBfcache, 50);
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [form, initialValues]);

  // After email is set, check for autofilled password
  React.useEffect(() => {
    if (!watchedEmail?.trim() || (watchedPassword ?? '').length > 0) return;
    const t1 = setTimeout(syncAutofillPassword, 350);
    const t2 = setTimeout(syncAutofillPassword, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [form, watchedEmail, watchedPassword, syncAutofillPassword]);

  // Reset lockout modal dismissed when lockout clears so next lockout shows the alert again
  React.useEffect(() => {
    if (!serverLockedUntil) setLockoutAlertDismissed(false);
  }, [serverLockedUntil]);

  const lockoutMessage = serverLockedUntil
    ? lockoutCountdown.isExpired
      ? 'Account lock has expired — you may try again.'
      : `Account locked. Try again in ${Math.floor(lockoutCountdown.remaining / 60)}:${String(lockoutCountdown.remaining % 60).padStart(2, '0')}`
    : null;

  if (step === 'verify' || step === 'verify-totp') {
    if (step === 'verify') {
      return (
        <VerificationForm
          email={verificationProps.email}
          onSubmit={verificationProps.onSubmit}
          title={verificationProps.title}
          otpExpiresAt={verificationProps.otpExpiresAt}
          devCode={verificationProps.devCode}
          onSessionExpired={verificationProps.onSessionExpired}
          verificationType="login"
          onResend={resendHook.handleResend}
          isResending={resendHook.isSending}
          isCooling={resendHook.isCooling}
          remaining={resendHook.remaining}
        />
      );
    }
    return <TotpVerificationForm {...verificationProps} />;
  }

  if (step === 'verify-passkey') {
    return (
      <PlatformPasskeyAuth
        form={form}
        onAuthenticated={verificationProps.onSubmit}
        onCancel={verificationProps.onSessionExpired}
      />
    );
  }

  // Show lockout as a modal alert instead of inline banner
  const showLockoutAlert = !!serverLockedUntil && !lockoutAlertDismissed;
  const mfaBanner = mfaRequired ? (
    <Alert
      type="warning"
      showIcon
      message="Multi-factor authentication required"
      description={`${mfaRequired.message || 'Use a passkey or authenticator app to continue.'}${mfaRequired.allowedMethods ? ` (Allowed: ${mfaRequired.allowedMethods.join(', ')})` : ''}`}
      style={{ marginBottom: isMobile ? 18 : 24 }}
    />
  ) : null;

  return (
    <>
      <Modal
        title="Account locked"
        open={showLockoutAlert}
        onCancel={() => setLockoutAlertDismissed(true)}
        footer={[
          <Button key="close" type="primary" onClick={() => setLockoutAlertDismissed(true)}>
            Close
          </Button>,
        ]}
        closable
      >
        {lockoutMessage}
      </Modal>
      {mfaBanner}
      <div
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <Form
          validateTrigger="onBlur"
          key={formKey}
          name="login"
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await handleFinish(values);
            } finally {
              turnstileRef.current?.reset?.();
            }
          }}
          initialValues={initialValues || { email: '', password: '', rememberMe: false }}
          size="default"
          requiredMark="*"
          style={{ maxWidth: 300, width: '100%' }}
        >
          <Title level={isMobile ? 4 : 3} style={{ marginBottom: 48, textAlign: 'center' }}>
            Login To BizClear
          </Title>
          <Form.Item
            name="email"
            label={
              <span>
                Email<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            }
            rules={loginEmailRules}
            style={{ marginBottom: isMobile ? 20 : 24 }}
          >
            <Input
              placeholder="Enter your email"
              autoComplete="username webauthn"
              readOnly={fieldsReadOnly}
              onFocus={() => {
                setFieldsReadOnly(false);
                handleEmailFocusForPasskey();
              }}
              data-test="login-email"
              data-testid="login-email"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={
              <span>
                Password<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            }
            rules={loginPasswordRules}
            style={{ marginBottom: isMobile ? 20 : 24 }}
          >
            <Input.Password
              ref={passwordInputRef}
              placeholder="Enter your password"
              autoComplete="current-password"
              readOnly={fieldsReadOnly}
              onFocus={() => {
                setFieldsReadOnly(false);
                [100, 300, 600].forEach((ms) => setTimeout(syncAutofillPassword, ms));
              }}
              data-test="login-password"
              data-testid="login-password"
            />
          </Form.Item>

          <Flex
            justify="space-between"
            align="center"
            style={{ marginBottom: isMobile ? 20 : 24, flexWrap: 'wrap', gap: 8 }}
          >
            <Form.Item
              name="rememberMe"
              valuePropName="checked"
              noStyle
              style={{ marginBottom: 0 }}
            >
              <Checkbox
                style={{ fontSize: isMobile ? 14 : undefined }}
                data-test="login-remember"
                data-testid="login-remember"
              >
                Remember me
              </Checkbox>
            </Form.Item>
            <Button
              type="link"
              onClick={() => navigate('/forgot-password')}
              style={{ padding: 0, color: token.colorPrimary, fontSize: isMobile ? 14 : undefined }}
              className="auth-link-hover"
              data-test="login-forgot"
              data-testid="login-forgot"
            >
              Forgot password?
            </Button>
          </Flex>

          {turnstileSiteKey ? (
            <Form.Item style={{ marginBottom: isMobile ? 20 : 24 }}>
              <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} token={token} />
            </Form.Item>
          ) : null}

          <Form.Item style={{ marginBottom: isMobile ? 20 : 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              disabled={
                isSubmitting || (serverLockedUntil != null && serverLockedUntil > Date.now())
              }
              block
              size="default"
              data-test="login-submit"
              data-testid="login-submit"
            >
              Login
            </Button>
          </Form.Item>

          <Flex justify="center" style={{ marginBottom: isMobile ? 20 : 24 }}>
            <PasskeySignInOptions
              form={form}
              onAuthenticated={onSubmit}
              onBeforePasskeyAuth={getReadyForModalPasskey}
            />
          </Flex>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Don&apos;t have an account? </Text>
            <Button
              type="link"
              onClick={() => navigate('/sign-up')}
              style={{ padding: 0, fontWeight: 600, color: token.colorPrimary }}
              className="auth-link-hover"
            >
              Sign up
            </Button>
          </div>
          {/* Dev Prefill Controls - Labels show emails from root .env (DEV_EMAIL_*); hidden in production and demo-ui */}
          {import.meta.env.DEV === true &&
            import.meta.env.VITE_DEMO_UI !== 'true' &&
            (() => {
              const env = import.meta.env || {};
              const devPrefillItems = [
                {
                  key: 'admin',
                  label: env.VITE_DEV_EMAIL_ADMIN || 'admin@example.com',
                  role: 'Admin',
                },
                {
                  key: 'admin2',
                  label: env.VITE_DEV_EMAIL_ADMIN2 || 'admin2@example.com',
                  role: 'Admin 2',
                },
                {
                  key: 'admin3',
                  label: env.VITE_DEV_EMAIL_ADMIN3 || 'admin3@example.com',
                  role: 'Admin 3',
                },
                {
                  key: 'officer',
                  label: env.VITE_DEV_EMAIL_OFFICER || 'officer@example.com',
                  role: 'LGU Officer',
                },
                {
                  key: 'officer2',
                  label: env.VITE_DEV_EMAIL_OFFICER2 || 'officer2@example.com',
                  role: 'LGU Officer 2',
                },
                {
                  key: 'manager',
                  label: env.VITE_DEV_EMAIL_MANAGER || 'manager@example.com',
                  role: 'Manager',
                },
                {
                  key: 'inspector',
                  label: env.VITE_DEV_EMAIL_INSPECTOR || 'inspector@example.com',
                  role: 'Inspector',
                },
                { key: 'invalid', label: 'wrong@example.com', role: 'Invalid credentials' },
              ];
              return (
                <>
                  <div style={{ marginTop: 24, textAlign: 'center', opacity: 0.5 }}>
                    <Dropdown
                      menu={{
                        items: devPrefillItems.map(({ key, label, role }) => ({
                          key,
                          label: `${role}: ${label}`,
                        })),
                        onClick: ({ key }) => {
                          if (key === 'admin') prefillAdmin();
                          else if (key === 'admin2') prefillAdmin2();
                          else if (key === 'admin3') prefillAdmin3();
                          else if (key === 'officer') prefillLguOfficer();
                          else if (key === 'officer2') prefillLguOfficer2();
                          else if (key === 'inspector') prefillInspector();
                          else if (key === 'invalid') prefillInvalid();
                        },
                      }}
                    >
                      <Button type="text" size="small">
                        Dev Tools
                      </Button>
                    </Dropdown>
                  </div>
                </>
              );
            })()}
        </Form>
      </div>
    </>
  );
}
