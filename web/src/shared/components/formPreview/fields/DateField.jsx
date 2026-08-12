import { Form } from 'antd';
import { DatePicker } from 'antd';
import { useFieldContext } from './FieldContext';
import { fromDateEvent, parseDayjs, getDateValueProps, isDateLike } from './shared/dateHelpers';

export default function DateField() {
  const { fieldName, effectiveReadOnly, rules, requestChangeStyle, label } = useFieldContext();

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={
        effectiveReadOnly
          ? []
          : [
              ...rules,
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (isDateLike(value)) return Promise.resolve();
                  return Promise.reject(new Error('Invalid date format'));
                },
              },
            ]
      }
      getValueFromEvent={fromDateEvent}
      normalize={parseDayjs}
      getValueProps={getDateValueProps}
      style={requestChangeStyle}
    >
      <DatePicker style={{ width: '100%' }} disabled={effectiveReadOnly} format="YYYY-MM-DD" />
    </Form.Item>
  );
}
