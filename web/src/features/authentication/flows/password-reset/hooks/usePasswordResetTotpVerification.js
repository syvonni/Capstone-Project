import { Form } from 'antd';
import { useState } from 'react';
import { verifyForgotPasswordMfa } from '@/features/authentication/services/authService';
import { useNotifier, useAuthNotification } from '@/shared/notifications.js';

export function usePasswordResetTotpVerification({ onSubmit, email } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { success, error } = useNotifier();
  const { notificationError } = useAuthNotification();

  const handleFinish = async (values) => {
    const payload = { email, code: values.verificationCode };
    try {
      setSubmitting(true);
      // Verify TOTP using the forgot-password MFA endpoint (for non-logged-in users)
      await verifyForgotPasswordMfa(payload);
      success('Identity verified with authenticator app');
      form.resetFields();
      if (typeof onSubmit === 'function')
        onSubmit({
          email,
          resetToken: 'TOTP_VERIFIED', // Special token to indicate TOTP was verified
          allowedToReset: true,
        });
    } catch (err) {
      console.error('Password reset TOTP verification error:', err);
      const lower = String(err?.message || '').toLowerCase();
      const errCode = String(err?.code || '').toLowerCase();

      // Check if account deletion is scheduled - user should use email OTP instead
      if (
        lower.includes('scheduled deletion') ||
        lower.includes('use email otp') ||
        errCode === 'use_email_otp_for_scheduled_deletion'
      ) {
        error(
          'Account deletion is scheduled. Please use the email verification code sent to your email instead of TOTP. Check your inbox for the verification code.',
          'Use Email OTP Instead'
        );
        form.setFields([
          {
            name: 'verificationCode',
            errors: ['Account deletion scheduled - please use email OTP code instead'],
          },
        ]);
      } else if (lower.includes('invalid')) {
        const invalidMsg = 'The authenticator code is incorrect. Please try again.';
        notificationError('Incorrect Code', invalidMsg);
        form.setFields([{ name: 'verificationCode', errors: [invalidMsg] }]);
      } else if (lower.includes('expired')) {
        const expiredMsg = 'The authenticator code has expired. Please generate a new code.';
        notificationError('Code Expired', expiredMsg);
        form.setFields([{ name: 'verificationCode', errors: [expiredMsg] }]);
      } else {
        error(err, 'Failed to verify code');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}

export default usePasswordResetTotpVerification;
