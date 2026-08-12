import { useState, useEffect } from 'react';
import { Form } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '@/features/authentication';
import {
  firstLoginChangeCredentials,
  getProfile,
} from '@/features/authentication/services/authService.js';
import { useNotifier } from '@/shared/notifications';

/**
 * Same credential flow as admin onboarding: password only, default username from email.
 * @param {{ onCredentialsSuccess?: () => void }} [opts] - Called after credentials are updated (advance to MFA or complete).
 */
export function useStaffOnboarding(opts = {}) {
  const { onCredentialsSuccess } = opts;
  const navigate = useNavigate();
  const { currentUser, role, login } = useAuthSession();
  const { success, error } = useNotifier();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const roleKey = String(role?.slug || role || '').toLowerCase();
  const isStaffRole = ['lgu_officer', 'inspector', 'staff'].includes(roleKey);
  const mustChange = !!currentUser?.mustChangeCredentials;
  const mustMfa = !!currentUser?.mustSetupMfa;
  const homePath = '/staff';

  useEffect(() => {
    if (!currentUser?.token) return;
    if (!isStaffRole) {
      navigate('/owner', { replace: true });
      return;
    }
  }, [currentUser, isStaffRole, navigate]);

  const handleCredentialsFinish = async (values) => {
    try {
      setSubmitting(true);
      const derivedUsername =
        currentUser?.username ||
        (currentUser?.email ? currentUser.email.split('@')[0] : '') ||
        'staff';
      const newUsername = derivedUsername.length >= 3 ? derivedUsername : 'staff';
      const res = await firstLoginChangeCredentials({
        newPassword: values.password,
        newUsername,
      });
      // Use the user returned by the API so we don't depend on a second getProfile() call (avoids 401/network and ensures UI advances)
      const fresh = res?.user ? { ...res.user } : await getProfile();
      const raw = localStorage.getItem('auth__currentUser');
      const remember = !!raw;
      const merged = { ...currentUser, ...fresh, token: currentUser?.token };
      login(merged, { remember });
      form.resetFields();
      success('Password changed successfully');
      onCredentialsSuccess?.();
    } catch (e) {
      console.error('First login change credentials error:', e);
      error(e?.message || 'Failed to update credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    submitting,
    mustChange,
    mustMfa,
    currentUser,
    homePath,
    handleCredentialsFinish,
    navigate,
  };
}
