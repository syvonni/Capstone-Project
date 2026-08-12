import OnboardingStepContent from './OnboardingStepContent.jsx';
import { Form } from 'antd';

export default {
  title: 'Shared/OnboardingStepContent',
  component: OnboardingStepContent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

const mockHandleFinish = async (values) => {
  console.log('Form submitted:', values);
};

export const AdminWelcome = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={0}
      setCurrentStep={() => {}}
      mustChange={true}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={false}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
AdminWelcome.parameters = {
  storyDescription: 'Admin variant - Step 0: Welcome screen',
};

export const StaffWelcome = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="staff"
      currentStep={0}
      setCurrentStep={() => {}}
      mustChange={true}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={false}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
StaffWelcome.parameters = {
  storyDescription: 'Staff variant - Step 0: Welcome screen',
};

export const PasswordChange = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={1}
      setCurrentStep={() => {}}
      mustChange={true}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={false}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
PasswordChange.parameters = {
  storyDescription: 'Step 1: Set new password form with strength indicator',
};

export const PasswordExpired = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={1}
      setCurrentStep={() => {}}
      mustChange={true}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={false}
      onComplete={() => {}}
      passwordExpired={true}
    />
  );
};
PasswordExpired.parameters = {
  storyDescription: 'Step 1: Password expired warning with change form',
};

export const MfaChecking = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={2}
      setCurrentStep={() => {}}
      mustChange={false}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={true}
      mfaEnabled={false}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
MfaChecking.parameters = {
  storyDescription: 'Step 2: Checking MFA status loading state',
};

export const MfaAlreadyEnabled = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={2}
      setCurrentStep={() => {}}
      mustChange={false}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={true}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
MfaAlreadyEnabled.parameters = {
  storyDescription: 'Step 2: MFA already enabled - show continue button',
};

export const MfaSetup = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={2}
      setCurrentStep={() => {}}
      mustChange={false}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={false}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
MfaSetup.parameters = {
  storyDescription: 'Step 2: MFA setup with QR code and verification',
};

export const AdminComplete = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={3}
      setCurrentStep={() => {}}
      mustChange={false}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={true}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
AdminComplete.parameters = {
  storyDescription: 'Step 3: Admin complete - go to admin dashboard',
};

export const StaffComplete = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="staff"
      currentStep={3}
      setCurrentStep={() => {}}
      mustChange={false}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={false}
      checkingMfa={false}
      mfaEnabled={true}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
StaffComplete.parameters = {
  storyDescription: 'Step 3: Staff complete - go to staff dashboard',
};

export const SubmittingPassword = () => {
  const [form] = Form.useForm();
  return (
    <OnboardingStepContent
      variant="admin"
      currentStep={1}
      setCurrentStep={() => {}}
      mustChange={true}
      form={form}
      handleCredentialsFinish={mockHandleFinish}
      submitting={true}
      checkingMfa={false}
      mfaEnabled={false}
      onComplete={() => {}}
      passwordExpired={false}
    />
  );
};
SubmittingPassword.parameters = {
  storyDescription: 'Step 1: Password form submitting state',
};
