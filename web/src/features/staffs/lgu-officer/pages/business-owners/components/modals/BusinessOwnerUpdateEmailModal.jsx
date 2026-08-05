import { Typography, Form, Input, Button, Drawer, Modal, Grid } from 'antd'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function BusinessOwnerUpdateEmailModal({ open, onClose, _businessOwner, form, onSubmit }) {
  const screens = useBreakpoint()
  const isMobile = !screens.lg

  const formContent = (
    <>
      <Text style={{ display: 'block', marginBottom: 24 }}>
        Update the business owner&apos;s email address. Verification emails will be sent to both the current and new email addresses.
      </Text>
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item name="currentEmail" label="Current Email">
          <Input disabled />
        </Form.Item>
        <Form.Item
          name="newEmail"
          label="New Email"
          rules={[
            { required: true, message: 'Please enter new email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="Enter new email address" />
        </Form.Item>
        <Form.Item
          name="confirmEmail"
          label="Confirm New Email"
          dependencies={['newEmail']}
          rules={[
            { required: true, message: 'Please confirm new email' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newEmail') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('Emails do not match'))
              },
            }),
          ]}
        >
          <Input placeholder="Confirm new email address" />
        </Form.Item>
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button type="primary" htmlType="submit">Send Verification</Button>
          </div>
        )}
      </Form>
    </>
  )

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title="Update Email Address"
        placement="bottom"
        height="100%"
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        destroyOnHidden
      >
        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
          {formContent}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <Button type="primary" onClick={() => form.submit()}>Send Verification</Button>
        </div>
      </Drawer>
    )
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Update Email Address"
      footer={null}
      width={500}
      destroyOnHidden
    >
      <div style={{ padding: 16 }}>
        {formContent}
      </div>
    </Modal>
  )
}
