import { Form } from 'antd';
import { Input, Select, InputNumber, DatePicker, Button, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFieldContext } from './FieldContext';
import { fromDateEvent, parseDayjs, getDateValueProps } from './shared/dateHelpers';

const { Text } = Typography;

function GroupFieldControl({ groupField, readOnly }) {
  const commonProps = {
    placeholder: groupField.placeholder || '',
    disabled: readOnly,
    style: { width: '100%' },
  };

  if (groupField.type === 'select' || groupField.type === 'multiselect') {
    return (
      <Select
        {...commonProps}
        mode={groupField.type === 'multiselect' ? 'multiple' : undefined}
        options={(groupField.dropdownOptions || []).map((o) => {
          const isObject = typeof o === 'object';
          return {
            value: isObject ? o.id : o,
            label: isObject ? o.label : o,
          };
        })}
        showSearch={!readOnly}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      />
    );
  }

  if (groupField.type === 'number') {
    return (
      <InputNumber
        {...commonProps}
        min={groupField.validation?.minValue}
        max={groupField.validation?.maxValue}
      />
    );
  }

  if (groupField.type === 'date') {
    return (
      <DatePicker
        {...commonProps}
        format="YYYY-MM-DD"
        getValueFromEvent={fromDateEvent}
        normalize={parseDayjs}
        getValueProps={getDateValueProps}
      />
    );
  }

  return <Input {...commonProps} readOnly={readOnly} />;
}

export default function RepeatableGroupField() {
  const fieldContext = useFieldContext();
  const { field, effectiveReadOnly, label, token, renderFieldActions } = fieldContext;
  const groupFields = field.groupFields || [];
  const minRows = field.minRows || 1;
  const maxRows = field.maxRows || 20;

  return (
    <Form.Item label={label} style={{ marginBottom: 0 }}>
      <Form.List name={field.key} initialValue={[{}]}>
        {(fields, { add, remove }) => (
          <div
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadius,
              overflow: 'hidden',
            }}
          >
            {/* Column headers */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '8px 12px',
                background: token.colorFillQuaternary,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              {groupFields.map((gf, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    {gf.label}
                  </Text>
                </div>
              ))}
              <div style={{ width: 32, flexShrink: 0 }} />
            </div>

            {/* Rows */}
            {fields.map(({ key, name, ...restField }) => {
              const rowActions = effectiveReadOnly && renderFieldActions
                ? renderFieldActions({ ...fieldContext, rowIndex: name })
                : null
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '8px 12px',
                    alignItems: 'flex-start',
                  }}
                >
                  {groupFields.map((gf, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0 }}>
                      <Form.Item
                        {...restField}
                        name={[name, gf.key || gf.label]}
                        rules={
                          gf.required && !effectiveReadOnly
                            ? [{ required: true, message: 'Required' }]
                            : []
                        }
                        style={{ marginBottom: 0 }}
                      >
                        <GroupFieldControl groupField={gf} readOnly={effectiveReadOnly} />
                      </Form.Item>
                    </div>
                  ))}
                  {rowActions && (
                    <div style={{ flexShrink: 0 }}>{rowActions}</div>
                  )}
                  {!effectiveReadOnly && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={fields.length <= minRows}
                      onClick={() => remove(name)}
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </div>
              )
            })}

            {/* Add row button */}
            {!effectiveReadOnly && (
              <div
                style={{
                  padding: '6px 12px 10px',
                  borderTop: `1px dashed ${token.colorBorderSecondary}`,
                }}
              >
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  disabled={fields.length >= maxRows}
                  onClick={() => add()}
                  style={{ width: '100%' }}
                >
                  Add row
                </Button>
              </div>
            )}
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
}
