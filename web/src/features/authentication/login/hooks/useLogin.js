import { Form } from 'antd';
import { useState } from 'react';
import { loginStart, loginPost } from '@/features/authentication/services';
import { useNotifier, useAuthNotification } from '@/shared/notifications.js';

export function useLogin({ onBegin, onSubmit, onError, getCaptchaToken } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { success, error } = useNotifier();
  const { notificationError } = useAuthNotification();

  const handleFinish = async (values) => {
    const payload = { email: values.email, password: values.password };
    if (typeof getCaptchaToken === 'function') {
      const token = getCaptchaToken();
      if (token) payload.captchaToken = token;
    }
    try {
      setSubmitting(true);
      if (typeof onBegin === 'function') {
        const data = await loginStart(payload);
        // Keep fields for user convenience during two-step flow
        const beginResult = await onBegin({
          email: values.email,
          rememberMe: values.rememberMe === true,
          serverData: data,
        });
        // If the onBegin handler indicates we should proceed immediately (MFA disabled),
        // signal the caller to complete the server-side login rather than performing
        // it inside this hook. This centralizes the finalization and ensures the
        // caller (flow orchestrator) is the only place that marks the session
        // as authenticated.
        if (beginResult && beginResult.proceedWithLogin) {
          if (typeof onSubmit === 'function') {
            // Signal the caller to perform the final server login. Provide the
            // original payload so the caller can call `loginPost` and validate
            // the server response before persisting session state.
            try {
              await onSubmit(null, values, { serverLoginPayload: payload });
            } catch (innerErr) {
              console.error('Login completion (delegated) failed:', innerErr);
              throw innerErr;
            }
            return;
          }
        } else {
          // Only show the verification-sent message when the flow will proceed
          // to a verification step (i.e., MFA / email code is expected).
          const show = beginResult ? beginResult.showVerificationSent !== false : true;
          if (show && data && data.sent === true) success('Verification code sent to your email');
        }
      } else {
        const user = await loginPost(payload);
        const role = String(user?.role || '').toLowerCase();
        // Block admin accounts on the generic login page: show invalid credentials
        if (role === 'admin') {
          const professionalMessage =
            'The email address or password you entered is incorrect. Please check your credentials and try again.';
          notificationError('Login Failed', professionalMessage);
          // Clear any field errors
          form.setFields([
            { name: 'email', errors: [] },
            { name: 'password', errors: [] },
          ]);
          return;
        }
        // Login success shown on destination via navigate state (Option A); no duplicate toast here
        form.resetFields();
        if (typeof onSubmit === 'function') onSubmit(user, values);
      }
    } catch (err) {
      let handled = false;
      // Notify caller about structured server errors (e.g., locked accounts)
      try {
        if (typeof onError === 'function') {
          handled = onError(err) === true;
        }
      } catch {
        /* ignore onError failures */
      }
      if (handled) return;

      console.error('Login error:', err);
      const msg = String(err?.message || '').toLowerCase();
      const errorCode = err?.code || '';
      const statusCode = err?.status || 0;

      // Prefer field-level errors for invalid credentials with professional message
      // Check for invalid credentials by message content, error code, or 401 status
      const isInvalidCredentials =
        msg.includes('invalid email or password') ||
        msg.includes('invalid_credentials') ||
        msg.includes('the email address or password you entered is incorrect') ||
        errorCode === 'invalid_credentials' ||
        (statusCode === 401 && !errorCode); // Generic 401 likely means invalid credentials

      if (isInvalidCredentials) {
        // Use the error message if it's already professional, otherwise use default
        const professionalMessage = msg.includes(
          'the email address or password you entered is incorrect'
        )
          ? err.message
          : 'The email address or password you entered is incorrect. Please check your credentials and try again.';
        notificationError('Login Failed', professionalMessage);
        // Also clear any field errors to avoid duplication
        form.setFields([
          { name: 'email', errors: [] },
          { name: 'password', errors: [] },
        ]);
      } else {
        error(err, 'Failed to login');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
