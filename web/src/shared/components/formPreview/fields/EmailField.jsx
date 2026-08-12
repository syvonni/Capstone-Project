import { Form } from 'antd';
import { Input } from 'antd';
import { useFieldContext } from './FieldContext';

export default function EmailField() {
  const { field, fieldName, effectiveReadOnly, rules, requestChangeStyle, label } =
    useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={effectiveReadOnly ? [] : rules}
      style={requestChangeStyle}
    >
      <Input
        type="email"
        placeholder={field.placeholder || ''}
        disabled={effectiveReadOnly}
        readOnly={effectiveReadOnly}
      />
    </Form.Item>
  );
}
