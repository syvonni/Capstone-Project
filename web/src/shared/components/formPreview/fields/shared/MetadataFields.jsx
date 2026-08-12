import { Form, Input, DatePicker } from 'antd'
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields'
import AlaminosAddressFields from '@/shared/components/AlaminosAddressFields'

function makeName(metadataFieldName, key, label) {
  const safeKey = key || label
  if (Array.isArray(metadataFieldName)) {
    return [...metadataFieldName, safeKey]
  }
  return [metadataFieldName, safeKey]
}

export default function MetadataFields({ form, token, metadataFieldName, metadataFields, effectiveReadOnly }) {
  if (!Array.isArray(metadataFields) || metadataFields.length === 0) return null

  return (
    <div>
      {metadataFields.map((metaField, metaIdx) => {
        if (metaField.type === 'address') {
          return (
            <div key={metaIdx} style={{ marginBottom: 8 }}>
              <PhilippineAddressFields
                form={form}
                namePrefix={makeName(metadataFieldName, metaField.key, metaField.label)}
                required={metaField.required}
                disabled={effectiveReadOnly}
                label={metaField.label}
              />
            </div>
          )
        }
        if (metaField.type === 'address_alaminos') {
          return (
            <div key={metaIdx} style={{ marginBottom: 8 }}>
              <AlaminosAddressFields
                form={form}
                namePrefix={makeName(metadataFieldName, metaField.key, metaField.label)}
                required={metaField.required}
                disabled={effectiveReadOnly}
                label={metaField.label}
              />
            </div>
          )
        }
        return (
          <Form.Item
            key={metaIdx}
            name={makeName(metadataFieldName, metaField.key, metaField.label)}
            label={
              <span>
                {metaField.label}
                {metaField.required && <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>}
              </span>
            }
            rules={
              effectiveReadOnly
                ? []
                : [
                    ...(metaField.required
                      ? [{ required: true, message: `Please enter ${metaField.label.toLowerCase()}` }]
                      : []),
                    ...(metaField.type === 'text' && metaField.validation ? [metaField.validation] : []),
                  ]
            }
            style={{ marginBottom: 8 }}
          >
            {metaField.type === 'date' ? (
              <DatePicker style={{ width: '100%' }} disabled={effectiveReadOnly} />
            ) : (
              <Input placeholder={metaField.placeholder || ''} disabled={effectiveReadOnly} />
            )}
          </Form.Item>
        )
      })}
    </div>
  )
}
