import { useState } from 'react';
import { Row, Col, theme } from 'antd';
import { Form } from 'antd';
import OnboardingStepContent from '@/shared/components/OnboardingStepContent';

export default {
  title: 'Business Owner/BusinessOwnerOnboarding',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

/**
 * Shell that renders OnboardingStepContent with controlled props,
 * bypassing all the useEffect hooks that auto-skip steps.
 * Uses a simple layout wrapper instead of BusinessOwnerLayout to avoid Storybook dependency issues.
 */
function OnboardingShell({
  initialStep = 0,
  mustChange = true,
  mustMfa = true,
  passwordExpired = false,
  mfaEnabled = false,
  checkingMfa = false,
  submitting = false,
  mode = 'onboarding',
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const mockCurrentUser = { firstName: 'Maria' };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: token.colorBgLayout,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '40px 24px',
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
              variant="staff"
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              mustChange={mustChange}
              mustMfa={mustMfa}
              form={form}
              handleCredentialsFinish={async (values) => {
                console.log('handleCredentialsFinish', values);
                if (mustMfa) setCurrentStep(2);
                else setCurrentStep(3);
              }}
              submitting={submitting}
              checkingMfa={checkingMfa}
              mfaEnabled={mfaEnabled}
              onComplete={() => console.log('onComplete')}
              passwordExpired={passwordExpired}
              onBack={() => setCurrentStep(Math.max(0, currentStep - 1))}
              currentUser={mockCurrentUser}
              mode={mode}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}

export const PasswordExpiredWelcome = {
  render: () => <OnboardingShell initialStep={0} mode="password-expired" />,
  parameters: {
    storyDescription: 'Password expired mode: Welcome page explaining 90-day policy',
  },
};

export const PasswordExpired = {
  render: () => <OnboardingShell initialStep={1} passwordExpired mode="password-expired" />,
  parameters: {
    storyDescription: 'Password expired mode: Password change form',
  },
};

export const PasswordExpiredComplete = {
  render: () => <OnboardingShell initialStep={2} mode="password-expired" />,
  parameters: {
    storyDescription: 'Password expired mode: Complete step after password change',
  },
};

export const PasswordExpiredFlow = {
  render: () => <OnboardingShell initialStep={0} mode="password-expired" />,
  parameters: {
    storyDescription: 'Password expired flow: Welcome → Password → Complete',
  },
};

export const MfaSetupStep = {
  render: () => <OnboardingShell initialStep={0} mode="mfa-only" />,
  parameters: {
    storyDescription: 'MFA Setup - Business owner scans QR code and enters verification code',
  },
};

export const MfaChecking = {
  render: () => <OnboardingShell initialStep={0} mode="mfa-only" checkingMfa />,
  parameters: {
    storyDescription: 'Checking MFA status loading spinner',
  },
};

export const MfaAlreadyEnabled = {
  render: () => <OnboardingShell initialStep={0} mode="mfa-only" mfaEnabled />,
  parameters: {
    storyDescription: 'MFA already enabled - shows "Continue" button',
  },
};

export const MfaComplete = {
  render: () => <OnboardingShell initialStep={1} mode="mfa-only" />,
  parameters: {
    storyDescription: 'Complete - Business owner sees success message after MFA setup',
  },
};

export const MfaFlow = {
  render: () => <OnboardingShell initialStep={0} mode="mfa-only" />,
  parameters: {
    storyDescription: 'Interactive: MFA-only onboarding flow for business owners',
  },
};
