import { Form, Typography } from 'antd';
import PhilippineAddressFields from '@/shared/components/PhilippineAddressFields';
import { useFieldContext } from './FieldContext';
import { getRequestChangeReason } from './shared/useRequestChangeStyle';

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

export default function AddressField() {
  const { field, form, effectiveReadOnly, requestChangeBorder, fieldName, mode, fieldReviewDecisions, token } = useFieldContext();
  const fieldValue = form.getFieldValue(fieldName);
  const addressText = effectiveReadOnly && mode === 'preview' ? formatStoredAddress(fieldValue) : null;
  const reason = getRequestChangeReason(fieldName, field, fieldReviewDecisions);

  return (
    <div style={requestChangeBorder}>
      {reason && (
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            display: 'block',
            marginBottom: 8,
            color: token.colorVolcano,
          }}
        >
          Requested Change: {reason}
        </Text>
      )}
      {addressText ? (
        <Text>{addressText}</Text>
      ) : (
        <Form.Item style={{ marginBottom: 0 }}>
          <PhilippineAddressFields
            form={form}
            namePrefix={field.key || field.label}
            disabled={effectiveReadOnly}
            required={field.required}
            label={field.label}
          />
        </Form.Item>
      )}
    </div>
  );
}
