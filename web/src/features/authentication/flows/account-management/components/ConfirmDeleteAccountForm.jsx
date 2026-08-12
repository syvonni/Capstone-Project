import { Form } from 'antd';
import { Button, Flex, Typography, List } from 'antd';
import { theme } from 'antd';
import { useConfirmDeleteAccountForm } from '../hooks/useConfirmDeleteAccountForm.js';

const { Title, Text, Paragraph } = Typography;

export default function ConfirmDeleteAccountForm({ email, deleteToken, onSubmit } = {}) {
  const { form, handleFinish, isSubmitting } = useConfirmDeleteAccountForm({
    email,
    deleteToken,
    onSubmit,
  });
  const { token } = theme.useToken();

  return (
    <div style={{ maxWidth: 300, width: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={4} style={{ margin: '0 0 8px' }}>
          Confirm Account Deletion
        </Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Your account will be scheduled for deletion. You have 30 days to cancel this request.
        </Paragraph>
      </div>
      <div
        style={{
          padding: 20,
          backgroundColor: token.colorFillAlter,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: 32,
        }}
      >
        <Flex align="center" gap="small" style={{ marginBottom: 12 }}>
          <Text strong style={{ color: token.colorText }}>
            Before you continue
          </Text>
        </Flex>
        <List
          split={false}
          dataSource={[
            'Your account and access will be removed',
            'Some records may be retained for audit and legal compliance',
            'You can cancel within 30 days',
          ]}
          renderItem={(item) => (
            <List.Item style={{ padding: '4px 0' }}>
              <Text type="secondary">– {item}</Text>
            </List.Item>
          )}
        />
      </div>
      <Form
        validateTrigger="onBlur"
        name="confirmDeleteAccount"
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
      >
        <Form.Item style={{ marginBottom: 32 }}>
          <Button
            type="primary"
            danger
            htmlType="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            block
          >
            Schedule deletion
          </Button>
        </Form.Item>
        <div style={{ textAlign: 'center' }}>
          <Button type="text" onClick={() => window.history.back()} style={{ padding: 0 }}>
            Cancel
          </Button>
        </div>
      </Form>
    </div>
  );
}
