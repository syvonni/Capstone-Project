import { Form } from 'antd';
import { useState } from 'react';
import { changeEmailStart } from '@/features/authentication/services';
import { useNotifier } from '@/shared/notifications.js';

export function useChangeEmailForm({ onSubmit, email } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { success, error } = useNotifier();

  const handleFinish = async (values) => {
    const payload = {
      newEmail: values.newEmail,
      currentEmail: String(email || '')
        .trim()
        .toLowerCase(),
    };
    try {
      setSubmitting(true);
      await changeEmailStart(payload);
      success('Verification code sent to the new email');
      form.resetFields();
      if (typeof onSubmit === 'function') onSubmit({ newEmail: values.newEmail });
    } catch (err) {
      console.error('Change email error:', err);
      error(err, 'Failed to initiate change email');
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
