import { Form } from 'antd';
import { useState } from 'react';
import { deleteAccountVerifyCode } from '@/features/authentication/services';
import { useNotifier, useAuthNotification } from '@/shared/notifications.js';

export function useVerifyDeleteAccountCode({ onSubmit, email } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { success, error } = useNotifier();
  const { notificationError } = useAuthNotification();

  const handleFinish = async (values) => {
    const payload = { email, code: values.verificationCode };
    try {
      setSubmitting(true);
      const data = await deleteAccountVerifyCode(payload);
      success('Code verified');
      form.resetFields();
      if (typeof onSubmit === 'function') onSubmit({ email, deleteToken: data?.deleteToken });
    } catch (err) {
      console.error('Verify delete code error:', err);
      const msg = err?.message || '';
      const status = err?.status;
      const lower = String(msg).toLowerCase();

      if (status === 401 || lower.includes('invalid code')) {
        const invalidMsg =
          msg || 'The OTP code you entered is incorrect. Please check and try again.';
        notificationError('Incorrect OTP Code', invalidMsg);
        form.setFields([{ name: 'verificationCode', errors: [invalidMsg] }]);
        return;
      }
      if (status === 410 || lower.includes('expired')) {
        const expiredMsg = msg || 'The OTP code has expired. Please request a new code.';
        notificationError('OTP Code Expired', expiredMsg);
        form.setFields([{ name: 'verificationCode', errors: [expiredMsg] }]);
        return;
      }
      if (status === 404 || lower.includes('no delete request')) {
        const notFoundMsg = msg || 'No active delete request found. Please request a new code.';
        notificationError('Verification Request Not Found', notFoundMsg);
        form.setFields([{ name: 'verificationCode', errors: [notFoundMsg] }]);
        return;
      }
      error(err, 'Failed to verify delete code');
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
