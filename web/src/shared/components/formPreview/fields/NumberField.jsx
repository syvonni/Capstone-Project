import { Form } from 'antd';
import { InputNumber } from 'antd';
import { useFieldContext } from './FieldContext';

export default function NumberField() {
  const { field, fieldName, effectiveReadOnly, rules, requestChangeStyle, label } =
    useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={effectiveReadOnly ? [] : rules}
      style={requestChangeStyle}
    >
      <InputNumber
        placeholder={field.placeholder || ''}
        style={{ width: '100%' }}
        min={field.validation?.minValue}
        max={field.validation?.maxValue}
        disabled={effectiveReadOnly}
        readOnly={effectiveReadOnly}
      />
    </Form.Item>
  );
}
