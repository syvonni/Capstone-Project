import { useState } from 'react';
import { Form } from 'antd';
import { Input, Button, Typography, Alert } from 'antd';
import { loginWithTemporaryCredentials } from '../services/recoveryService.js';
import { useNotifier } from '@/shared/notifications.js';
import { useAuthSession } from '@/features/authentication';

const { Title, Text } = Typography;

export default function TemporaryCredentialsLogin({ onSuccess } = {}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useNotifier();
  const { setSession } = useAuthSession();

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);
      const res = await loginWithTemporaryCredentials(values);
      if (res?.user?.token) {
        setSession(res.user, res.user.token);
      }
      success(res?.message || 'Temporary login successful');
      if (onSuccess) onSuccess(res);
    } catch (err) {
      console.error('Temp login failed', err);
      error(err, err?.body?.message || 'Invalid temporary credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Login with Temporary Credentials
        </Title>
        <Text type="secondary">Use the username and temporary password issued by your admin.</Text>
      </div>
      <Alert
        showIcon
        type="warning"
        message="One-time use"
        description="Temporary credentials expire quickly and will force a password change and MFA setup."
        style={{ marginBottom: 16 }}
      />
      <Form
        validateTrigger="onBlur"
        layout="vertical"
        form={form}
        onFinish={handleFinish}
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label="Temporary Username"
          rules={[{ required: true, message: 'Enter your temporary username' }]}
        >
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Temporary Password"
          rules={[{ required: true, message: 'Enter your temporary password' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Login and Continue
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
