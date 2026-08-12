import { Form } from 'antd';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySignupCode } from '@/features/authentication/services';
import { useNotifier, useAuthNotification } from '@/shared/notifications.js';

// Generic signup verification hook. Accepts `email` and verifies the code.
// On success, calls `onSubmit` with the created user (and provider if present).
export function useSignUpVerificationForm({ onSubmit, email } = {}) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);
  const verifyingRef = useRef(false);
  const verifiedSuccessRef = useRef(false);
  const redirectTimeoutRef = useRef(null);
  const { success, error } = useNotifier();
  const { notificationError } = useAuthNotification();

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

  const handleFinish = async (values) => {
    if (verifyingRef.current) return;

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
    verifyingRef.current = true;
    try {
      setSubmitting(true);
      const created = await verifySignupCode(payload);
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      verifiedSuccessRef.current = true;
      success('Code verified');
      form.resetFields();
      if (typeof onSubmit === 'function') onSubmit(created);
    } catch (err) {
      console.error('Signup verification error:', err);
      if (err.details) console.error('Validation details:', err.details);

      if (verifiedSuccessRef.current) return;

      // Safely extract and convert error message to string
      let errorMessage = '';
      try {
        errorMessage = String(err?.message || '');
      } catch {
        errorMessage = '';
      }

      const lower = errorMessage.toLowerCase();

      if (lower && lower.includes('email already exists')) {
        error('Email is already verified. Redirecting to login...');
        redirectTimeoutRef.current = setTimeout(() => navigate('/login'), 2000);
        return;
      }

      if (lower && (lower.includes('invalid code') || lower.includes('invalid request'))) {
        // Use backend error message if available and valid, otherwise use fallback
        const backendMsg =
          errorMessage &&
          !errorMessage.includes('Request failed') &&
          !errorMessage.includes('[object Object]') &&
          !errorMessage.includes('includes is not a function')
            ? errorMessage
            : 'Incorrect code. Please check and try again.';

        notificationError('Incorrect OTP Code', backendMsg);
        form.setFields([{ name: 'verificationCode', errors: [backendMsg] }]);
      } else if (lower && lower.includes('expired')) {
        const expiredMsg = 'The OTP code has expired. Please request a new code.';
        notificationError('OTP Code Expired', expiredMsg);
        form.setFields([{ name: 'verificationCode', errors: [expiredMsg] }]);
      } else if (lower && lower.includes('no signup request')) {
        const notFoundMsg =
          'No active signup request found. Please start the signup process again.';
        notificationError('Verification Request Not Found', notFoundMsg);
        form.setFields([{ name: 'verificationCode', errors: [notFoundMsg] }]);
      } else if (
        lower &&
        (lower.includes('rate limited') || lower.includes('too many') || lower.includes('wait'))
      ) {
        // Parse retry time if available
        const match = lower.match(/(?:in|wait)\s+(\d+)\s*s/i);
        if (match && match[1]) {
          error(`Too many attempts. Please request a new code to try again.`);
        } else {
          error('Too many attempts. Please request a new code.');
        }
      } else {
        error(err, 'Failed to verify code');
      }
    } finally {
      verifyingRef.current = false;
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
