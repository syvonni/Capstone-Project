import { Form } from 'antd';
import { Input } from 'antd';
import { useFieldContext } from './FieldContext';

export default function TextAreaField() {
  const { field, fieldName, effectiveReadOnly, rules, textareaStyle, label } = useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={effectiveReadOnly ? [] : rules}
      style={textareaStyle}
    >
      <Input.TextArea
        placeholder={field.placeholder || ''}
        disabled={effectiveReadOnly}
        readOnly={effectiveReadOnly}
      />
    </Form.Item>
  );
}
