import { useState } from 'react';
import { Form } from 'antd';
import { Input, Button, Typography, Alert } from 'antd';
import { requestRecovery } from '../services/recoveryService.js';
import { useNotifier } from '@/shared/notifications.js';
import { useAuthSession } from '@/features/authentication';

const { Title, Text } = Typography;

export default function RecoveryRequestForm({ onSubmitted } = {}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useNotifier();
  const { currentUser } = useAuthSession();

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);
      await requestRecovery({ reason: values.reason });
      success('Recovery request submitted. An admin will review it shortly.');
      form.resetFields();
      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error('Recovery request error', err);
      const msg = err?.body?.message || 'Failed to submit recovery request';
      error(err, msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Request Password Recovery
        </Title>
        <Text type="secondary">
          Your request will be reviewed by an admin. We record your IP and device for security.
        </Text>
      </div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Your current account"
        description={currentUser?.email || 'Signed-in staff account'}
      />
      <Form
        validateTrigger="onBlur"
        layout="vertical"
        form={form}
        onFinish={handleFinish}
        requiredMark={false}
      >
        <Form.Item
          name="reason"
          label="Reason (optional)"
          rules={[{ max: 500, message: 'Keep under 500 characters' }]}
        >
          <Input.TextArea placeholder="Briefly explain why you need recovery" rows={4} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Submit Recovery Request
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
