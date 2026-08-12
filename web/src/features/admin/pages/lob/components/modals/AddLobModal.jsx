import { useState, useEffect } from 'react';
import { Form, Input, Button, App, Typography, theme, Select, InputNumber } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ResponsiveModal from '@/shared/components/ResponsiveModal';
import { useStepUp } from '@/shared/hooks/useStepUp';
import { createLob } from '@/features/admin/services/lobService';
import { INDUSTRY_CATEGORIES } from '@/shared/constants/industryCategories';
import { useNameValidation } from '@/shared/hooks/useNameValidation';

const { Text } = Typography;
const { useToken } = theme;

const { TextArea } = Input;

const CATEGORY_OPTIONS = INDUSTRY_CATEGORIES.map((category) => ({
  value: category.taxCode,
  label: category.name,
}));

export default function AddLobModal({ open, onClose, onSuccess }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { runWithStepUp, stepUpModal } = useStepUp();
  const { token } = useToken();
  const { validateName, isValidating, error: nameError, clearError } = useNameValidation('LOB');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      clearError();
    }
  }, [open, form, clearError]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Manual validation for required fields
      if (!values.code || values.code.trim() === '') {
        message.error('Code is required');
        return;
      }

      if (!values.name || values.name.trim() === '') {
        message.error('Name is required');
        return;
      }

      if (!values.category) {
        message.error('Category is required');
        return;
      }

      if (!values.lineOfBusiness || values.lineOfBusiness.trim() === '') {
        message.error('Line of Business is required');
        return;
      }

      if (!values.description || values.description.trim() === '') {
        message.error('Description is required');
        return;
      }

      setLoading(true);

      await runWithStepUp(async (stepUpToken) => {
        await createLob(values, { stepUpToken });
      });

      message.success('LOB created successfully');
      form.resetFields();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create LOB:', error);
        message.error(error.message || 'Failed to create LOB');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDebugFill = () => {
    const timestamp = Date.now().toString().slice(-4);
    form.setFieldsValue({
      code: `TEST-${timestamp}`,
      name: 'Test LOB',
      category: 'RETAIL',
      lineOfBusiness: 'Retail Trade',
      description: 'Test LOB for debugging purposes',
      notes: 'Test LOB for debugging',
      capitalTaxBrackets: [
        {
          name: 'Small Business',
          minValue: 0,
          maxValue: 100000,
          fixedAmount: 500,
          excessRate: 0,
        },
        {
          name: 'Medium Business',
          minValue: 100001,
          maxValue: 500000,
          fixedAmount: 1000,
          excessRate: 0.02,
        },
      ],
      grossSalesTaxBrackets: [
        {
          name: 'Low Sales',
          minValue: 0,
          maxValue: 200000,
          fixedAmount: 300,
          excessRate: 0,
        },
      ],
    });
  };

  return (
    <>
      <ResponsiveModal
        open={open}
        onCancel={onClose}
        title="Add Line of Business"
        footer={[
          <Button key="debug" onClick={handleDebugFill} style={{ marginRight: 8 }}>
            Debug Fill
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Add LOB
          </Button>,
        ]}
        width={800}
        destroyOnHidden
      >
        <Text>Enter the LOB details below.</Text>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
          <Form.Item
            name="code"
            label={
              <span>
                Code<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            }
            rules={[{ required: true, message: 'Code is required' }]}
          >
            <Input placeholder="e.g., RET-001" />
          </Form.Item>

          <Form.Item
            name="name"
            label={
              <span>
                Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            }
            validateStatus={nameError ? 'error' : ''}
            help={nameError}
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input
              placeholder="e.g., Sari-sari Store"
              onBlur={(e) => validateName(e.target.value)}
              disabled={isValidating}
            />
          </Form.Item>

          <Form.Item
            name="category"
            label={
              <span>
                Category<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            }
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <Select placeholder="Select category" options={CATEGORY_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="lineOfBusiness"
            label={
              <span>
                Line of Business<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            }
            rules={[{ required: true, message: 'Line of Business is required' }]}
          >
            <Input placeholder="e.g., Retail Trade" />
          </Form.Item>

          <Form.Item
            name="description"
            label={
              <span>
                Description<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            }
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <TextArea placeholder="Description of this line of business" rows={3} />
          </Form.Item>

          <Form.List name="capitalTaxBrackets">
            {(fields, { add, remove }) => (
              <>
                <Text>Capitalization Tax Brackets</Text>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      label="Bracket Name"
                      rules={[{ required: true, message: 'Name is required' }]}
                    >
                      <Input placeholder="e.g., Small Business" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'minValue']}
                      label="Minimum Capital (₱)"
                      rules={[{ required: true, message: 'Minimum value is required' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'maxValue']} label="Maximum Capital (₱)">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        placeholder="Leave empty for no maximum"
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'fixedAmount']}
                      label="Fixed Amount (₱)"
                      rules={[{ required: true, message: 'Fixed amount is required' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'excessRate']} label="Excess Rate (%)">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="0"
                      />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)} block>
                      Remove Bracket
                    </Button>
                  </div>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Capitalization Bracket
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.List name="grossSalesTaxBrackets">
            {(fields, { add, remove }) => (
              <>
                <Text style={{ display: 'block', marginTop: 16 }}>Gross Sales Tax Brackets</Text>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      label="Bracket Name"
                      rules={[{ required: true, message: 'Name is required' }]}
                    >
                      <Input placeholder="e.g., Low Sales" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'minValue']}
                      label="Minimum Gross Sales (₱)"
                      rules={[{ required: true, message: 'Minimum value is required' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'maxValue']}
                      label="Maximum Gross Sales (₱)"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        placeholder="Leave empty for no maximum"
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'fixedAmount']}
                      label="Fixed Amount (₱)"
                      rules={[{ required: true, message: 'Fixed amount is required' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'excessRate']} label="Excess Rate (%)">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="0"
                      />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)} block>
                      Remove Bracket
                    </Button>
                  </div>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Gross Sales Bracket
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Notes">
            <TextArea placeholder="Add administrative notes for this LOB" rows={2} />
          </Form.Item>
        </Form>
      </ResponsiveModal>
      {stepUpModal}
    </>
  );
}
