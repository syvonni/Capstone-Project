import { Form } from 'antd';
import { Radio } from 'antd';
import { useFieldContext } from './FieldContext';

export default function RadioField() {
  const { field, fieldName, effectiveReadOnly, rules, requestChangeStyle, label } =
    useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={effectiveReadOnly ? [] : rules}
      style={requestChangeStyle}
    >
      <Radio.Group disabled={effectiveReadOnly}>
        {(field.dropdownOptions || []).map((o, idx) => {
          const isObject = typeof o === 'object';
          return (
            <Radio key={idx} value={isObject ? o.id : o}>
              {isObject ? o.label : o}
            </Radio>
          );
        })}
      </Radio.Group>
    </Form.Item>
  );
}
