import { Form } from 'antd';
import { TimePicker } from 'antd';
import { useFieldContext } from './FieldContext';

export default function TimeField() {
  const { fieldName, effectiveReadOnly, rules, requestChangeStyle, label } = useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={effectiveReadOnly ? [] : rules}
      style={requestChangeStyle}
    >
      <TimePicker style={{ width: '100%' }} disabled={effectiveReadOnly} />
    </Form.Item>
  );
}
