import { Form } from 'antd';
import { Slider } from 'antd';
import { useFieldContext } from './FieldContext';

export default function SliderField() {
  const { field, fieldName, effectiveReadOnly, rules, requestChangeStyle, label } =
    useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={effectiveReadOnly ? [] : rules}
      style={requestChangeStyle}
    >
      <Slider
        disabled={effectiveReadOnly}
        min={field.validation?.minValue}
        max={field.validation?.maxValue}
      />
    </Form.Item>
  );
}
