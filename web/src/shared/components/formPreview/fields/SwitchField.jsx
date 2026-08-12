import { Form } from 'antd';
import { Switch } from 'antd';
import { useFieldContext } from './FieldContext';

export default function SwitchField() {
  const { fieldName, effectiveReadOnly, rules, requestChangeStyle, label } = useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      valuePropName="checked"
      rules={effectiveReadOnly ? [] : rules}
      style={requestChangeStyle}
    >
      <Switch disabled={effectiveReadOnly} />
    </Form.Item>
  );
}
