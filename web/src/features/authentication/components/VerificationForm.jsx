import { Form } from 'antd';
import { Input, Button, Typography, Flex, Grid } from 'antd';
import {
  useVerificationForm,
  usePasswordResetTotpVerification,
  useMfaVerificationForm,
  useLoginVerificationForm,
  useSignUpVerificationForm,
  useVerifyChangeEmailForm,
  useVerifyDeleteAccountCode,
  useEmailChangeTotpVerification,
  usePasswordChangeTotpVerification,
  useDeleteAccountTotpVerification,
  useResendLoginCode,
  useResendSignupCode,
  useResendEmailChangeCode,
  useResendDeleteAccountCode,
} from '@/features/authentication/hooks';
import useOtpCountdown from '@/features/authentication/hooks/useOtpCountdown.js';
import { useState, useCallback } from 'react';
import { useNotifier } from '@/shared/notifications.js';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function VerificationForm({
  email,
  onSubmit,
  title,
  description,
  onResend,
  isResending,
  isCooling,
  remaining,
  onBack,
  verificationType = 'email', // 'email' | 'totp' | 'mfa' | 'login' | 'signup' | 'email-change' | 'password-change' | 'delete-account' | 'delete-totp'
  warning,
  maxWidth = 300,
  otpExpiresAt,
  devCode,
  dangerButton = false,
  currentEmail,
  onSessionExpired,
} = {}) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showResend =
    typeof onResend === 'function' &&
    (verificationType === 'email' ||
      verificationType === 'login' ||
      verificationType === 'signup' ||
      verificationType === 'email-change' ||
      verificationType === 'delete-account');
  const showCountdown = showResend && otpExpiresAt; // Only show countdown when resend is available
  const [devCodeDisplay, setDevCodeDisplay] = useState(devCode);

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else {
      window.history.back();
    }
  };

  // Call all hooks unconditionally to satisfy React Hooks rules
  const emailHook = useVerificationForm({ email, onSubmit });
  const totpHook = usePasswordResetTotpVerification({ email, onSubmit });
  const [mfaForm] = Form.useForm();
  const mfaHook = useMfaVerificationForm({ email, onSubmit, form: mfaForm });
  const loginHook = useLoginVerificationForm({ email, onSubmit });
  const signupHook = useSignUpVerificationForm({ email, onSubmit });
  const emailChangeHook = useVerifyChangeEmailForm({ email, currentEmail, onSubmit });
  const deleteHook = useVerifyDeleteAccountCode({ email, onSubmit });
  const emailChangeTotpHook = useEmailChangeTotpVerification({ email, onSubmit });
  const passwordChangeTotpHook = usePasswordChangeTotpVerification({ email, onSubmit });
  const deleteTotpHook = useDeleteAccountTotpVerification({ email, onSubmit });

  const loginResendHook = useResendLoginCode({ email, cooldownSec: 60, onSessionExpired });
  const signupResendHook = useResendSignupCode({
    email,
    cooldownSec: 60,
    onSent: ({ devCode: newDevCode }) => {
      emailHook.form.resetFields(['verificationCode']);
      if (newDevCode !== undefined && newDevCode !== null) setDevCodeDisplay(String(newDevCode));
    },
  });
  const emailChangeResendHook = useResendEmailChangeCode({ email, cooldownSec: 60 });
  const deleteAccountResendHook = useResendDeleteAccountCode({ email, cooldownSec: 60 });

  const { remaining: otpRemaining, isExpired } = useOtpCountdown(otpExpiresAt);
  const { success } = useNotifier();

  // Select the appropriate hook based on verification type
  let form, handleFinish, isSubmitting;
  if (verificationType === 'email') {
    form = emailHook.form;
    handleFinish = emailHook.handleFinish;
    isSubmitting = emailHook.isSubmitting;
  } else if (verificationType === 'totp') {
    form = totpHook.form;
    handleFinish = totpHook.handleFinish;
    isSubmitting = totpHook.isSubmitting;
  } else if (verificationType === 'mfa') {
    form = mfaForm;
    handleFinish = mfaHook.handleFinish;
    isSubmitting = mfaHook.isSubmitting;
  } else if (verificationType === 'login') {
    form = loginHook.form;
    handleFinish = loginHook.handleFinish;
    isSubmitting = loginHook.isSubmitting;
  } else if (verificationType === 'signup') {
    form = signupHook.form;
    handleFinish = signupHook.handleFinish;
    isSubmitting = signupHook.isSubmitting;
  } else if (verificationType === 'email-change') {
    form = emailChangeHook.form;
    handleFinish = emailChangeHook.handleFinish;
    isSubmitting = emailChangeHook.isSubmitting;
  } else if (verificationType === 'delete-account') {
    form = deleteHook.form;
    handleFinish = deleteHook.handleFinish;
    isSubmitting = deleteHook.isSubmitting;
  } else if (verificationType === 'email-change-totp') {
    form = emailChangeTotpHook.form;
    handleFinish = emailChangeTotpHook.handleFinish;
    isSubmitting = emailChangeTotpHook.isSubmitting;
  } else if (verificationType === 'password-change-totp') {
    form = passwordChangeTotpHook.form;
    handleFinish = passwordChangeTotpHook.handleFinish;
    isSubmitting = passwordChangeTotpHook.isSubmitting;
  } else if (verificationType === 'delete-totp') {
    form = deleteTotpHook.form;
    handleFinish = deleteTotpHook.handleFinish;
    isSubmitting = deleteTotpHook.isSubmitting;
  }

  // Select appropriate resend hook
  let resendHook;
  if (verificationType === 'login') {
    resendHook = loginResendHook;
  } else if (verificationType === 'signup') {
    resendHook = signupResendHook;
  } else if (verificationType === 'email-change') {
    resendHook = emailChangeResendHook;
  } else if (verificationType === 'delete-account') {
    resendHook = deleteAccountResendHook;
  }

  const fieldName = 'verificationCode';
  const buttonText =
    verificationType === 'email'
      ? 'Verify'
      : verificationType === 'signup'
        ? 'Verify Email'
        : 'Verify and Continue';

  const handlePrefillCode = useCallback(() => {
    if (!devCodeDisplay) return;
    form.setFieldsValue({ verificationCode: String(devCodeDisplay) });
    success('Dev code prefilled');
  }, [devCodeDisplay, form, success]);

  return (
    <div style={{ maxWidth, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={isMobile ? 4 : 3} style={{ marginBottom: isMobile ? 12 : 16 }}>
          {title || 'Verify Code'}
        </Title>
        {warning && (
          <Text type="warning" style={{ display: 'block', marginBottom: 12 }}>
            {warning}
          </Text>
        )}
        <Text type="secondary">
          {description || (
            <>
              Enter the 6-digit code sent to <Text strong>{email}</Text>
            </>
          )}
        </Text>
      </div>
      <Form
        validateTrigger="onBlur"
        name="verification"
        form={form}
        size="default"
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
      >
        <div style={{ textAlign: 'center' }}>
          <Form.Item
            name={fieldName}
            rules={[
              { required: true, message: 'Please enter the verification code' },
              { pattern: /^[0-9]{6}$/, message: 'Code must be exactly 6 digits' },
            ]}
            style={{ marginBottom: 32 }}
            getValueFromEvent={(val) => {
              if (typeof val === 'string') return val.replace(/\D/g, '').slice(0, 6);
              if (Array.isArray(val)) return val.join('').replace(/\D/g, '').slice(0, 6);
              return '';
            }}
          >
            <Input.OTP
              size="default"
              length={6}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              inputType="numeric"
              mask={false}
              onKeyDown={(e) => {
                const allowedKeys = [
                  'Backspace',
                  'Delete',
                  'Tab',
                  'Escape',
                  'Enter',
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                ];
                if (allowedKeys.includes(e.key)) return;
                if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))
                  return;
                if (!/^[0-9]$/.test(e.key)) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          </Form.Item>
        </div>

        <Flex vertical gap="middle">
          <Button
            type={dangerButton ? 'primary' : 'primary'}
            danger={dangerButton}
            htmlType="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            block
          >
            {buttonText}
          </Button>

          {showResend && (
            <Flex justify="center" align="center" style={{ marginTop: 8 }}>
              {showCountdown && (
                <Text type={isExpired ? 'danger' : 'secondary'} style={{ fontSize: 13 }}>
                  {otpRemaining != null
                    ? isExpired
                      ? 'Code expired'
                      : `Code expires in: ${Math.floor(otpRemaining / 60)}:${String(otpRemaining % 60).padStart(2, '0')}`
                    : ''}
                </Text>
              )}
              <Button
                type="link"
                onClick={resendHook?.handleResend || onResend}
                loading={resendHook?.isSending || isResending}
                disabled={
                  resendHook?.isCooling || isCooling || resendHook?.isSending || isResending
                }
                style={{
                  padding: 0,
                  height: 'auto',
                  fontSize: 13,
                  marginLeft: showCountdown ? 16 : 0,
                }}
              >
                {resendHook?.isCooling || isCooling
                  ? `Resend available in ${resendHook?.remaining || remaining}s`
                  : 'Resend Code'}
              </Button>
            </Flex>
          )}

          {devCodeDisplay && import.meta.env.DEV && (
            <Button type="dashed" onClick={handlePrefillCode} block>
              Prefill Code (Dev: {devCodeDisplay})
            </Button>
          )}
        </Flex>
      </Form>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button type="text" onClick={handleBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
