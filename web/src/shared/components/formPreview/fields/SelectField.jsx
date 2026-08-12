import { Form } from 'antd';
import { Select } from 'antd';
import { useFieldContext } from './FieldContext';

export default function SelectField() {
  const { field, fieldName, effectiveReadOnly, rules, requestChangeStyle, label } =
    useFieldContext();
  const isMulti = field.type === 'multiselect';

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={effectiveReadOnly ? [] : rules}
      style={requestChangeStyle}
    >
      <Select
        addonBefore="Select"
        mode={isMulti ? 'multiple' : undefined}
        placeholder={field.placeholder || (isMulti ? 'Select one or more...' : 'Select...')}
        style={{ width: '100%' }}
        options={(field.dropdownOptions || []).map((o) => {
          const isObject = typeof o === 'object';
          return {
            value: isObject ? o.id : o,
            label: isObject ? o.label : o,
          };
        })}
        showSearch={!effectiveReadOnly}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        disabled={effectiveReadOnly}
      />
    </Form.Item>
  );
}
