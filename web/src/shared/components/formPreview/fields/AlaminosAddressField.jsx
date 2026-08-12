import { Form, Typography } from 'antd';
import AlaminosAddressFields from '@/shared/components/AlaminosAddressFields';
import { useFieldContext } from './FieldContext';

const { Text } = Typography;

function formatStoredAddress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const parts = [
    value.streetAddress || value.street,
    value.barangayName || value.barangay,
    value.cityName || value.city,
    value.provinceName || value.province,
    value.postalCode || value.zipCode,
  ].filter(Boolean);
  if (!parts.length) {
    return value.address || value.fullAddress || null;
  }
  return parts.join(', ');
}

export default function AlaminosAddressField() {
  const { field, form, effectiveReadOnly, requestChangeBorder, fieldName } = useFieldContext();
  const fieldValue = form.getFieldValue(fieldName);
  const addressText = effectiveReadOnly ? formatStoredAddress(fieldValue) : null;

  return (
    <div style={requestChangeBorder}>
      {addressText ? (
        <Text>{addressText}</Text>
      ) : (
        <Form.Item style={{ marginBottom: 0 }}>
          <AlaminosAddressFields
            form={form}
            namePrefix={field.key || field.label}
            required={field.required}
            disabled={effectiveReadOnly}
            label={field.label}
          />
        </Form.Item>
      )}
    </div>
  );
}
