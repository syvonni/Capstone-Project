import { Form } from 'antd';
import { useState } from 'react';
import {
  changePassword,
  changePasswordStart,
  changePasswordVerify,
  loginPost,
} from '@/features/authentication/services';
import { useAuthNotification, useNotifier } from '@/shared/notifications.js';
import { getCurrentUser, setCurrentUser } from '@/features/authentication/lib/authEvents.js';
import { useAuthSession } from '@/features/authentication/hooks/useAuthSession.js';

export function useChangePasswordForm({
  onSubmit,
  email,
  resetToken,
  isLoggedInFlow = false,
} = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('password'); // 'password' or 'verify'
  const [otpSent, setOtpSent] = useState(false);
  const { success, error } = useNotifier();
  const { notificationSuccess } = useAuthNotification();
  const { login } = useAuthSession();

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);

      // If this is a password reset flow (has valid resetToken and email, NOT logged in flow), use the old flow
      // For logged-in users, always use OTP flow (new endpoints use JWT auth)
      const isResetFlow =
        resetToken &&
        typeof resetToken === 'string' &&
        resetToken.trim().length > 0 &&
        email &&
        !isLoggedInFlow;

      if (isResetFlow) {
        const payload = { email, resetToken, password: values.password };
        await changePassword(payload);
        form.resetFields();
        // Auto-login with new password so user doesn't have to sign in again
        try {
          const user = await loginPost({ email, password: values.password });
          if (user?.token) {
            login(user, { remember: true });
            notificationSuccess('Password updated', 'You are now logged in.');
          } else {
            notificationSuccess('Password changed', 'Your password has been updated successfully.');
          }
        } catch (loginErr) {
          console.warn('Post-reset auto-login failed, user can log in manually:', loginErr);
          notificationSuccess('Password changed', 'Please log in with your new password.');
        }
        if (typeof onSubmit === 'function') onSubmit();
        return;
      }

      // For authenticated users (logged in), always use OTP flow
      if (step === 'password') {
        // Step 1: Send OTP to email
        if (!values.password || !values.confirmPassword) {
          error('Please enter and confirm your new password');
          return;
        }
        if (values.password !== values.confirmPassword) {
          form.setFields([{ name: 'confirmPassword', errors: ['Passwords do not match'] }]);
          return;
        }

        await changePasswordStart({ newPassword: values.password });
        setOtpSent(true);
        setStep('verify');
        success('Verification code sent to your email');
        form.setFieldsValue({ verificationCode: '' });
      } else if (step === 'verify') {
        // Step 2: Verify OTP and change password
        if (!values.verificationCode) {
          error('Please enter the verification code');
          return;
        }

        const user = await changePasswordVerify({ code: values.verificationCode });
        notificationSuccess('Password changed', 'Your password has been updated successfully.');
        form.resetFields();
        setStep('password');
        setOtpSent(false);

        // Update the user session with the new token from the response
        // This ensures the user stays logged in after password change
        if (user && user.token) {
          const current = getCurrentUser();
          const remember = !!localStorage.getItem('auth__currentUser');

          // Update user with new token and user data
          const updatedUser = { ...current, ...user };
          setCurrentUser(updatedUser);

          // Update storage with new token
          try {
            const LOCAL_KEY = 'auth__currentUser';
            const SESSION_KEY = 'auth__sessionUser';
            const expiresAt = user.expiresAt
              ? new Date(user.expiresAt).getTime()
              : Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000);

            if (remember) {
              localStorage.setItem(LOCAL_KEY, JSON.stringify({ user: updatedUser, expiresAt }));
              sessionStorage.removeItem(SESSION_KEY);
            } else {
              sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: updatedUser, expiresAt }));
              localStorage.removeItem(LOCAL_KEY);
            }
          } catch {
            /* ignore storage errors */
          }
        } else {
          // If no token returned, user needs to log in again
          notificationSuccess('Password changed', 'Please log in again with your new password.');
          setTimeout(() => {
            setCurrentUser(null);
            try {
              localStorage.removeItem('auth__currentUser');
              sessionStorage.removeItem('auth__sessionUser');
            } catch {
              /* ignore */
            }
            window.location.href = '/login?reason=password_changed';
          }, 1500);
        }

        if (typeof onSubmit === 'function') onSubmit(user);
      }
    } catch (err) {
      console.error('Change password error:', err);
      const lower = String(err?.message || '').toLowerCase();
      if (lower.includes('invalid code') || lower.includes('expired')) {
        if (step === 'verify') {
          form.setFields([
            { name: 'verificationCode', errors: [err.message || 'Invalid or expired code'] },
          ]);
        }
      } else {
        error(err, 'Failed to change password');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const password = form.getFieldValue('password');
      if (!password) {
        error('Please enter your new password first');
        return;
      }
      await changePasswordStart({ newPassword: password });
      success('Verification code resent to your email');
    } catch (err) {
      error(err, 'Failed to resend code');
    }
  };

  return { form, handleFinish, isSubmitting, step, otpSent, handleResendCode };
}
