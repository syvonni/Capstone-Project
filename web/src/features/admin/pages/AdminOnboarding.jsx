import { useState, useEffect } from 'react';
import { Form } from 'antd';
import { Row, Col, theme } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SecurityScanOutlined } from '@ant-design/icons';
import { useAuthSession } from '@/features/authentication';
import { mfaStatus } from '@/features/authentication/services/mfaService';
import {
  firstLoginChangeCredentials,
  getProfile,
} from '@/features/authentication/services/authService';
import { useNotifier } from '@/shared/notifications';
import StaffLayout from '@/shared/components/StaffLayout';
import OnboardingStepContent from '@/shared/components/OnboardingStepContent';

export default function AdminOnboarding() {
  const { currentUser, login } = useAuthSession();
  const { success, error } = useNotifier();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const mustChange = !!currentUser?.mustChangeCredentials;
  const mustMfa = !!currentUser?.mustSetupMfa;
  const passwordExpired = !!currentUser?.passwordExpired;

  const [currentStep, setCurrentStep] = useState(0);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingOnboarding, setCompletingOnboarding] = useState(false);

  // Check MFA status on mount. MFA counts as enabled if TOTP, passkey, or fingerprint is set up.
  useEffect(() => {
    if (!currentUser?.email) return;
    let cancelled = false;
    setCheckingMfa(true);
    mfaStatus(currentUser.email)
      .then((status) => {
        if (cancelled) return;
        const enabled =
          !!status?.enabled || status?.method === 'passkey' || !!status?.fprintEnabled;
        setMfaEnabled(enabled);
      })
      .catch((err) => console.error('Failed to check MFA status:', err))
      .finally(() => {
        if (!cancelled) setCheckingMfa(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  // Single source of truth for step routing once MFA status is known
  useEffect(() => {
    if (checkingMfa) return;
    // Skip MFA step if already enabled
    if (currentStep === 2 && mfaEnabled) {
      setCurrentStep(3);
    }
  }, [currentStep, mfaEnabled, checkingMfa]);

  const handleCredentialsFinish = async (values) => {
    setSubmitting(true);
    try {
      await firstLoginChangeCredentials({
        newPassword: values.password,
        newUsername:
          currentUser?.username || (currentUser?.email ? currentUser.email.split('@')[0] : 'admin'),
      });
      const fresh = await getProfile();
      const raw = localStorage.getItem('auth__currentUser');
      const remember = !!raw;
      const merged = { ...currentUser, ...fresh, token: currentUser?.token };
      login(merged, { remember });
      success('Password changed successfully');
      if (mustMfa) setCurrentStep(2);
      else setCurrentStep(3);
    } catch (err) {
      console.error('Change credentials error:', err);
      error(err?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCompletingOnboarding(true);
    try {
      // Fetch fresh profile to ensure mustChangeCredentials and mustSetupMfa are cleared
      const fresh = await getProfile();
      const merged = { ...currentUser, ...fresh, token: currentUser?.token };
      const remember = !!localStorage.getItem('auth__currentUser');
      login(merged, { remember });
    } catch (e) {
      console.error('[AdminOnboarding] Failed to refresh profile before dashboard', e);
      // Fallback: navigate anyway to avoid being stuck
      setCompletingOnboarding(false);
      navigate('/admin/dashboard', { replace: true });
    }
  };

  // Navigate after auth context has updated with cleared flags
  useEffect(() => {
    if (
      completingOnboarding &&
      currentUser &&
      !currentUser.mustChangeCredentials &&
      !currentUser.mustSetupMfa
    ) {
      // Auth context has been updated with cleared flags, safe to navigate
      navigate('/admin/dashboard', { replace: true });
    }
  }, [completingOnboarding, currentUser, navigate]);

  return (
    <StaffLayout hideSidebar pageTitle="Onboarding" pageIcon={<SecurityScanOutlined />}>
      <div
        style={{
          paddingBottom: 128,
          background: token.colorBgContainer,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <Row justify="center" align="middle" style={{ flex: 1 }}>
          <Col xs={24} sm={24} md={20} lg={18} xl={16}>
            <OnboardingStepContent
              variant="admin"
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              mustChange={mustChange}
              mustMfa={mustMfa}
              currentUser={currentUser}
              form={form}
              handleCredentialsFinish={handleCredentialsFinish}
              submitting={submitting}
              checkingMfa={checkingMfa}
              mfaEnabled={mfaEnabled}
              onComplete={handleComplete}
              passwordExpired={passwordExpired}
              onBack={() => setCurrentStep(Math.max(0, currentStep - 1))}
              mode={passwordExpired ? 'password-expired' : 'onboarding'}
            />
          </Col>
        </Row>
      </div>
    </StaffLayout>
  );
}
