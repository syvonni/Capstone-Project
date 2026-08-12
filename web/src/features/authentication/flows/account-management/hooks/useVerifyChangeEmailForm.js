import { Form } from 'antd';
import { useState, useCallback } from 'react';
import { changeEmailVerify, getProfile } from '@/features/authentication/services';
import { useAuthNotification, useNotifier } from '@/shared/notifications.js';
import { useAuthSession } from '@/features/authentication/hooks';

export function useVerifyChangeEmailForm({ onSubmit, email, currentEmail } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { notificationSuccess } = useAuthNotification();
  const { error } = useNotifier();
  const { login, currentUser } = useAuthSession();

  const handleFinish = useCallback(
    async (values) => {
      const payload = { currentEmail, email, code: values.verificationCode };
      try {
        setSubmitting(true);
        await changeEmailVerify(payload);
        // Fetch updated profile and update session
        const updated = await getProfile();

        // Preserve existing token if not returned by profile
        if (currentUser?.token && updated && !updated.token) {
          updated.token = currentUser.token;
        }

        try {
          const localRaw = localStorage.getItem('auth__currentUser');
          const remember = !!localRaw;
          login(updated, { remember });
        } catch {
          login(updated, { remember: false });
        }
        notificationSuccess('Email changed', 'Your email has been updated and verified.');
        form.resetFields();
        if (typeof onSubmit === 'function') onSubmit({ email: updated?.email });
      } catch (err) {
        console.error('Verify new email error:', err);
        error(err, 'Failed to verify new email');
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSubmit, notificationSuccess, error, login, currentUser, currentEmail, email]
  );

  return { form, handleFinish, isSubmitting };
}
