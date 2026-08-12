import { Form } from 'antd';
import { Input, Button, Typography, Flex, Grid } from 'antd';
import { useChangeEmailForm } from '../hooks/useChangeEmailForm.js';
import { emailRules } from '@/features/authentication/utils/validations';
import { useState } from 'react';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ChangeEmailForm({
  currentEmail,
  resetToken,
  onSubmit,
  onBack,
  maxWidth = 300,
} = {}) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { form, handleFinish, isSubmitting } = useChangeEmailForm({
    email: currentEmail,
    resetToken,
    onSubmit,
  });
  const showBack = typeof onBack === 'function';
  const [emailValue, setEmailValue] = useState('');

  return (
    <div style={{ maxWidth, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={isMobile ? 4 : 3} style={{ marginBottom: isMobile ? 12 : 16 }}>
          Enter New Email Address
        </Title>
        <Text type="secondary">
          Please enter the new email address you would like to associate with your account.
        </Text>
      </div>
      <Form
        validateTrigger="onBlur"
        name="changeEmail"
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ newEmail: '' }}
        requiredMark={false}
      >
        <Form.Item
          name="newEmail"
          rules={[
            ...emailRules,
            () => ({
              validator(_, value) {
                if (!value || value !== currentEmail) return Promise.resolve();
                return Promise.reject(new Error('New email must be different from current email'));
              },
            }),
          ]}
          style={{ marginBottom: 32 }}
        >
          <Input placeholder="New Email Address" onChange={(e) => setEmailValue(e.target.value)} />
        </Form.Item>

        <Flex vertical gap="middle">
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={isSubmitting || !emailValue}
            block
          >
            Update Email
          </Button>

          {showBack && (
            <Button type="text" onClick={onBack} block style={{ padding: 0 }}>
              Back
            </Button>
          )}
        </Flex>
      </Form>
    </div>
  );
}
