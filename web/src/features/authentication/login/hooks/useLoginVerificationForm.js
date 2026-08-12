import { Form } from 'antd';
import { useState } from 'react';
import { verifyLoginCode } from '@/features/authentication/services';
import { useNotifier, useAuthNotification } from '@/shared/notifications.js';

export function useLoginVerificationForm({ onSubmit, email } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { success } = useNotifier();
  const { notificationError } = useAuthNotification();

  const handleFinish = async (values) => {
    // Wait a tick to ensure form state is updated (especially after paste)
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Get value from form state as the source of truth
    let codeRaw = form.getFieldValue('verificationCode') || values.verificationCode;

    // Handle edge case where OTP might be an array, number, null, undefined, or string
    if (codeRaw === null || codeRaw === undefined || codeRaw === '') {
      return; // Let the form's required validation handle empty codes
    }

    if (Array.isArray(codeRaw)) {
      codeRaw = codeRaw.join('');
    }

    // Convert to string and extract only numeric characters, removing any whitespace or special chars
    let code = String(codeRaw || '').replace(/[^0-9]/g, '');

    // Skip validation if code is empty (required validation will handle it)
    if (!code || code.length === 0) {
      return; // Let the form's required validation handle empty codes
    }

    // Only validate that code contains numbers - let the API handle length and correctness validation
    if (!/^[0-9]+$/.test(code)) {
      notificationError(
        'Invalid Verification Code',
        'Please enter a valid numeric code. Only numbers are allowed.'
      );
      return;
    }

    // Don't validate length here - let the API handle it and return proper error messages
    // This ensures "incorrect code" errors come from the API, not client-side validation

    const payload = { email, code };
    try {
      setSubmitting(true);
      const user = await verifyLoginCode(payload);
      success('Code verified');
      form.resetFields();
      if (typeof onSubmit === 'function') onSubmit(user);
    } catch (err) {
      console.error('Login verification error:', err);

      // Extract error message from various error formats - safely convert to string
      let errorMessage = '';
      try {
        if (err?.message) {
          errorMessage = String(err.message);
        } else if (typeof err === 'string') {
          errorMessage = err;
        } else if (err?.error?.message) {
          errorMessage = String(err.error.message);
        } else if (err?.response?.data?.error?.message) {
          errorMessage = String(err.response.data.error.message);
        }
      } catch {
        // If error extraction fails, use default message
        errorMessage = '';
      }

      // Safely convert to lowercase string for comparison
      const lower = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';

      // Handle specific OTP-related errors with user-friendly messages
      if (
        lower &&
        (lower.includes('invalid code') || lower.includes('incorrect') || lower.includes('401'))
      ) {
        // Use backend error message if available and valid, otherwise use fallback
        const backendMsg =
          typeof errorMessage === 'string' &&
          errorMessage &&
          !errorMessage.includes('Request failed') &&
          !errorMessage.includes('[object Object]') &&
          !errorMessage.includes('includes is not a function')
            ? errorMessage
            : 'Incorrect code. Please check and try again.';

        notificationError('Incorrect OTP Code', backendMsg);
      } else if (lower && (lower.includes('expired') || lower.includes('410'))) {
        const expiredMsg = 'The OTP code has expired. Please request a new code.';
        notificationError('OTP Code Expired', expiredMsg);
      } else if (
        lower &&
        (lower.includes('no login verification request') ||
          lower.includes('not found') ||
          lower.includes('404'))
      ) {
        const notFoundMsg =
          'No active login verification request found. Please start the login process again.';
        notificationError('Verification Request Not Found', notFoundMsg);
      } else {
        // For other errors, show user-friendly message
        const friendlyMsg =
          typeof errorMessage === 'string' &&
          errorMessage &&
          !errorMessage.includes('Request failed') &&
          !errorMessage.includes('[object Object]') &&
          !errorMessage.includes('includes is not a function')
            ? errorMessage
            : 'Incorrect code. Please try again.';
        notificationError('Verification Failed', friendlyMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
