import { useState } from 'react';
import { Row, Col, theme } from 'antd';
import { Form } from 'antd';
import OnboardingStepContent from '@/shared/components/OnboardingStepContent';

export default {
  title: 'Staff/StaffOnboarding',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

/**
 * Shell that renders OnboardingStepContent with controlled props,
 * bypassing all the useEffect hooks that auto-skip steps.
 * Uses a simple layout wrapper instead of StaffLayout to avoid Storybook dependency issues.
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

export const WelcomeStep = {
  render: () => <OnboardingShell initialStep={0} />,
  parameters: {
    storyDescription:
      'Step 0: Welcome screen - Staff user sees welcome message and "Get Started" button',
  },
};

export const PasswordStep = {
  render: () => <OnboardingShell initialStep={1} />,
  parameters: {
    storyDescription:
      'Step 1: Set new password - Staff user enters new password with strength indicator',
  },
};

export const PasswordExpired = {
  render: () => <OnboardingShell initialStep={1} passwordExpired mode="password-expired" />,
  parameters: {
    storyDescription: 'Step 1: Password expired warning with change form',
  },
};

export const PasswordExpiredWelcome = {
  render: () => <OnboardingShell initialStep={0} mode="password-expired" />,
  parameters: {
    storyDescription: 'Password expired mode: Welcome page explaining 90-day policy',
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

export const PasswordSubmitting = {
  render: () => <OnboardingShell initialStep={1} submitting />,
  parameters: {
    storyDescription: 'Step 1: Password form in submitting/loading state',
  },
};

export const MfaSetupStep = {
  render: () => <OnboardingShell initialStep={2} />,
  parameters: {
    storyDescription: 'Step 2: MFA Setup - Staff user scans QR code and enters verification code',
  },
};

export const MfaChecking = {
  render: () => <OnboardingShell initialStep={2} checkingMfa />,
  parameters: {
    storyDescription: 'Step 2: Checking MFA status loading spinner',
  },
};

export const MfaAlreadyEnabled = {
  render: () => <OnboardingShell initialStep={2} mfaEnabled />,
  parameters: {
    storyDescription: 'Step 2: MFA already enabled - shows "Continue" button',
  },
};

export const CompleteStep = {
  render: () => <OnboardingShell initialStep={3} />,
  parameters: {
    storyDescription:
      'Step 3: Complete - Staff user sees success message and button to go to staff dashboard',
  },
};

export const FullFlow = {
  render: () => <OnboardingShell initialStep={0} />,
  parameters: {
    storyDescription:
      'Interactive: Click through the complete staff onboarding flow from Welcome → Password → MFA → Complete',
  },
};
