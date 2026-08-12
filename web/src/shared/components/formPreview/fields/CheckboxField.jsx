import { Form } from 'antd';
import { Checkbox } from 'antd';
import { useFieldContext } from './FieldContext';

export default function CheckboxField() {
  const { field, fieldName, effectiveReadOnly, rules } = useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      valuePropName="checked"
      rules={effectiveReadOnly ? [] : rules}
      style={{ marginBottom: 0 }}
    >
      <Checkbox disabled={effectiveReadOnly}>{field.placeholder || field.label}</Checkbox>
    </Form.Item>
  );
}
