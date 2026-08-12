import { Form } from 'antd';
import { useState } from 'react';
import { sendForgotPassword } from '@/features/authentication/services';
import { useNotifier } from '@/shared/notifications.js';

export function useForgotPasswordForm({ onSubmit } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { error } = useNotifier();

  const handleFinish = async (values) => {
    const payload = { email: values.email, captchaToken: values.captchaToken };
    try {
      setSubmitting(true);
      const result = await sendForgotPassword(payload);
      form.resetFields();
      if (typeof onSubmit === 'function')
        onSubmit({
          email: payload.email,
          requiresMfa: result.requiresMfa || false,
          warning: result.warning,
        });
    } catch (err) {
      console.error('Forgot password error:', err);
      const message = err?.message || 'Failed to send reset code';
      error(err, message);
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
