import { Form } from 'antd';
import { Input, Button, Typography, Grid, theme } from 'antd';
import { useForgotPasswordForm } from '@/features/authentication/hooks';
import { forgotPasswordEmailRules } from '@/features/authentication/utils/validations';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import TurnstileWidget from '@/features/authentication/components/TurnstileWidget.jsx';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

export default function ForgotPasswordForm({ onSubmit } = {}) {
  const { form, handleFinish, isSubmitting } = useForgotPasswordForm({ onSubmit });
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { token } = useToken();
  const isMobile = !screens.md;
  const turnstileRef = React.useRef(null);
  const turnstileSiteKey =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_TURNSTILE_SITE_KEY) ||
    '';
  const [emailValue, setEmailValue] = useState('');

  return (
    <div style={{ maxWidth: 300, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: isMobile ? 24 : 32 }}>
        <Title level={isMobile ? 4 : 3} style={{ marginBottom: isMobile ? 12 : 16 }}>
          Forgot Password?
        </Title>
        <Text type="secondary">
          Enter your email address and we&apos;ll send you a code to reset your password.
        </Text>
      </div>
      <Form
        validateTrigger="onBlur"
        name="forgotPassword"
        form={form}
        size="default"
        layout="vertical"
        onFinish={async (values) => {
          const captchaToken = turnstileRef.current?.getToken?.() || '';
          const payload = { email: values.email, captchaToken };
          try {
            await handleFinish(payload);
          } finally {
            turnstileRef.current?.reset?.();
          }
        }}
        requiredMark={false}
      >
        <Form.Item name="email" label="Email Address" rules={forgotPasswordEmailRules}>
          <Input placeholder="name@example.com" onChange={(e) => setEmailValue(e.target.value)} />
        </Form.Item>

        {turnstileSiteKey ? (
          <Form.Item style={{ marginBottom: 16 }}>
            <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} token={token} />
          </Form.Item>
        ) : null}

        <Form.Item style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={isSubmitting || !emailValue}
            block
          >
            Continue
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button type="text" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </div>
      </Form>
    </div>
  );
}
