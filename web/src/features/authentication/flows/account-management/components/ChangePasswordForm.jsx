import { Form } from 'antd';
import { Input, Button, Typography, Space, Alert, Grid } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import {
  changeConfirmPasswordRules as confirmPasswordRules,
  changePasswordRules as passwordRules,
} from '@/features/authentication/utils/validations';
import { useChangePasswordForm } from '../hooks/useChangePasswordForm.js';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PasswordStrengthIndicator from '@/features/authentication/components/PasswordStrengthIndicator.jsx';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ChangePasswordForm({
  email,
  resetToken,
  onSubmit,
  isLoggedInFlow = false,
  onBack,
} = {}) {
  const { form, handleFinish, isSubmitting, step, otpSent, handleResendCode } =
    useChangePasswordForm({ email, resetToken, onSubmit, isLoggedInFlow });
  const navigate = useNavigate();
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showBack = typeof onBack === 'function';

  const isResetFlow = !!resetToken && !isLoggedInFlow;
  const isOtpFlow = !isResetFlow && (isLoggedInFlow || !resetToken);

  const handlePasswordChange = (e) => {
    const value = e?.target?.value || '';
    setPasswordValue(value);
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e?.target?.value || '';
    setConfirmPasswordValue(value);
  };

  const handleOtpChange = (e) => {
    const value = e?.target?.value || '';
    setOtpValue(value);
  };

  const isButtonDisabled = () => {
    if (isSubmitting) return true;
    if (isOtpFlow && step === 'verify' && otpSent) {
      return otpValue.length !== 6;
    }
    if (isResetFlow) {
      return !passwordValue || !confirmPasswordValue;
    }
    if (step === 'password') {
      return !passwordValue || !confirmPasswordValue;
    }
    return false;
  };

  return (
    <div style={{ maxWidth: 300, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={isMobile ? 4 : 3} style={{ marginBottom: isMobile ? 12 : 16 }}>
          {isLoggedInFlow ? 'Set New Password' : isResetFlow ? 'Reset Password' : 'Change Password'}
        </Title>
        <Text type="secondary">
          {isLoggedInFlow
            ? 'Create a strong password for your account.'
            : isResetFlow
              ? 'Please enter a new password for your account.'
              : 'Update your password to keep your account secure.'}
        </Text>
      </div>
      {isOtpFlow && otpSent && (
        <Alert
          message="Verification Code Sent"
          description={
            <Space direction="vertical" size={4}>
              <Text>A verification code has been sent to your email address.</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Please check your inbox and enter the code below to complete the password change.
              </Text>
            </Space>
          }
          type="info"
          icon={<MailOutlined />}
          style={{ marginBottom: 24 }}
          action={
            <Button type="link" size="small" onClick={handleResendCode}>
              Resend
            </Button>
          }
        />
      )}
      <Form
        validateTrigger="onBlur"
        name="changePassword"
        form={form}
        size="default"
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
      >
        {/* Step 1: Password fields (shown when step is 'password' or in reset flow) */}
        {(step === 'password' || isResetFlow) && (
          <>
            <Form.Item name="password" label="New Password" rules={passwordRules}>
              <Input.Password
                placeholder="Enter new password"
                onChange={handlePasswordChange}
                disabled={isOtpFlow && otpSent}
              />
            </Form.Item>
            <PasswordStrengthIndicator value={passwordValue} />
            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['password']}
              hasFeedback
              rules={confirmPasswordRules}
            >
              <Input.Password
                placeholder="Confirm new password"
                onChange={handleConfirmPasswordChange}
                disabled={isOtpFlow && otpSent}
              />
            </Form.Item>
          </>
        )}

        {/* Step 2: OTP verification (shown when step is 'verify' and OTP was sent) */}
        {isOtpFlow && step === 'verify' && otpSent && (
          <Form.Item
            name="verificationCode"
            label="Verification Code"
            rules={[
              { required: true, message: 'Please enter the verification code' },
              { pattern: /^[0-9]{6}$/, message: 'Please enter a valid 6-digit code' },
            ]}
          >
            <Input placeholder="Enter 6-digit code" maxLength={6} onChange={handleOtpChange} />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 32 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={isButtonDisabled()}
            block
          >
            {isResetFlow
              ? 'Reset Password'
              : step === 'verify'
                ? 'Verify & Update Password'
                : 'Send Verification Code'}
          </Button>
        </Form.Item>

        {(isResetFlow || showBack) && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button
              type="text"
              onClick={isResetFlow ? () => navigate('/login') : onBack}
              style={{ padding: 0 }}
            >
              {isResetFlow ? 'Back to Login' : 'Back'}
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
}
