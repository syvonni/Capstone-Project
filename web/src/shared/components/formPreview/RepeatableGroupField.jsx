import { Form } from '@/shared/components/AppForm'
import { Input, Select, DatePicker, InputNumber, Button, Typography} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

export default function RepeatableGroupField({ field, form: _form, token, readOnly }) {
  const groupFields = field.groupFields || []
  const minRows = field.minRows || 1
  const maxRows = field.maxRows || 20

  return (
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
                <Text strong style={{ fontSize: 12 }}>{gf.label}</Text>
              </div>
            ))}
            <div style={{ width: 32, flexShrink: 0 }} />
          </div>

          {/* Rows */}
          {fields.map(({ key, name, ...restField }) => (
            <div key={key} style={{ display: 'flex', gap: 8, padding: '8px 12px', alignItems: 'flex-start' }}>
              {groupFields.map((gf, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  <Form.Item
                    {...restField}
                    name={[name, gf.key || gf.label]}
                    rules={gf.required && !readOnly ? [{ required: true, message: 'Required' }] : []}
                    style={{ marginBottom: 0 }}
                  >
                    {gf.type === 'select' || gf.type === 'multiselect' ? (
                      <Select
                        addonBefore="Select"
                        placeholder={gf.placeholder || 'Select...'}
                        style={{ width: '100%' }}
                        mode={gf.type === 'multiselect' ? 'multiple' : undefined}
                        options={(gf.dropdownOptions || []).map((o) => {
                          const isObject = typeof o === 'object'
                          return {
                            value: isObject ? o.id : o,
                            label: isObject ? o.label : o
                          }
                        })}
                        disabled={readOnly}
                      />
                    ) : gf.type === 'number' ? (
                      <InputNumber placeholder={gf.placeholder || ''} style={{ width: '100%' }} disabled={readOnly} />
                    ) : gf.type === 'date' ? (
                      <DatePicker
                        style={{ width: '100%' }}
                        disabled={readOnly}
                        format="YYYY-MM-DD"
                        getValueFromEvent={(value) => {
                          if (!value) return null
                          return dayjs.isDayjs(value) ? value : dayjs(value)
                        }}
                        normalize={(value) => {
                          if (!value) return null
                          if (dayjs.isDayjs(value)) return value
                          if (typeof value === 'string') {
                            const parsed = dayjs(value)
                            return parsed.isValid() ? parsed : null
                          }
                          if (value instanceof Date) {
                            return dayjs(value)
                          }
                          return null
                        }}
                      />
                    ) : (
                      <Input placeholder={gf.placeholder || ''} disabled={readOnly} readOnly={readOnly} />
                    )}
                  </Form.Item>
                </div>
              ))}
              {!readOnly && (
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
          ))}

          {/* Add row button */}
          {!readOnly && (
            <div style={{ padding: '6px 12px 10px', borderTop: `1px dashed ${token.colorBorderSecondary}` }}>
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
  )
}
