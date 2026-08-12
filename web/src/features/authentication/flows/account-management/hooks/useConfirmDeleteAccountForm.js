import { Form } from 'antd';
import { useState } from 'react';
import { useAuthSession } from '@/features/authentication';
import { useAuthNotification, useNotifier } from '@/shared/notifications.js';
import { confirmAccountDeletion } from '@/features/authentication/services/authService';

export function useConfirmDeleteAccountForm({ onSubmit, email, deleteToken } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const { logout } = useAuthSession();
  const { notificationSuccess } = useAuthNotification();
  const { error } = useNotifier();

  const handleFinish = async (values) => {
    const payload = {
      email,
      deleteToken,
      legalAcknowledgment: values?.legalAcknowledgment || false,
    };
    try {
      setSubmitting(true);
      const data = await confirmAccountDeletion(payload);
      const date = data?.user?.deletionScheduledFor
        ? new Date(data.user.deletionScheduledFor)
        : null;
      const dateStr = date ? date.toLocaleString() : 'in 30 days';
      notificationSuccess(
        'Account deletion scheduled',
        `Your account will be deleted on ${dateStr}.`
      );
      form.resetFields();
      try {
        logout();
      } catch (err) {
        void err;
      }
      if (typeof onSubmit === 'function') onSubmit(data);
      // Note: The mobile flow might just redirect to scheduled page, but here we log out or show state.
      // The DeleteAccountFlow handles the state change if we don't logout, but typically security requirement might imply logout.
      // However, mobile app implies you can "Undo" which means you might still be logged in or can log in back to Undo.
      // The code above calls logout(). If the user logs back in, they see the banner.
    } catch (err) {
      console.error('Confirm delete account error:', err);
      error(err, 'Failed to schedule account deletion');
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
