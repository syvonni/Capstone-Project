import { Form, Typography } from 'antd';
import { DatePicker, Row, Col } from 'antd';
import { useFieldContext } from './FieldContext';
import {
  fromDateEvent,
  parseDayjs,
  getDateValueProps,
  isDateLike,
  createEndDateAfterStartValidator,
} from './shared/dateHelpers';

const { Text } = Typography;

function getDateRangeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const start = value.startDate || value.start || value.start_date || null;
  const end = value.endDate || value.end || value.end_date || null;
  if (start || end) return { start, end };
  return null;
}

function formatRangeDate(value) {
  if (!value) return '';
  const parsed = parseDayjs(value);
  return parsed ? parsed.format('YYYY-MM-DD') : String(value);
}

export default function DateRangeField() {
  const { field, fieldName, form, effectiveReadOnly, requestChangeBorder } = useFieldContext();
  const fieldValue = form.getFieldValue(fieldName);
  const objectRange = getDateRangeObject(fieldValue);
  const startFieldName = `${fieldName}_start`;
  const endFieldName = `${fieldName}_end`;

  const dateRule = {
    validator: (_, value) => {
      if (!value) return Promise.resolve();
      if (isDateLike(value)) return Promise.resolve();
      return Promise.reject(new Error('Invalid date format'));
    },
  };

  const startRules = effectiveReadOnly
    ? []
    : [
        ...(field.required ? [{ required: true, message: 'Please select start date' }] : []),
        dateRule,
      ];

  const endRules = effectiveReadOnly
    ? []
    : [
        ...(field.required ? [{ required: true, message: 'Please select end date' }] : []),
        dateRule,
        { validator: createEndDateAfterStartValidator(startFieldName, form) },
      ];

  if (effectiveReadOnly && objectRange) {
    const startStr = formatRangeDate(objectRange.start);
    const endStr = formatRangeDate(objectRange.end);
    const display = startStr && endStr ? `${startStr} — ${endStr}` : startStr || endStr || '—';
    return (
      <div style={requestChangeBorder}>
        <Text>{display}</Text>
      </div>
    );
  }

  return (
    <div style={requestChangeBorder}>
      <Row gutter={[8, 16]}>
        <Col span={12}>
          <Form.Item
            name={startFieldName}
            label="Start date"
            rules={startRules}
            getValueFromEvent={fromDateEvent}
            normalize={parseDayjs}
            getValueProps={getDateValueProps}
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              placeholder="Start date"
              style={{ width: '100%' }}
              disabled={effectiveReadOnly}
              format="YYYY-MM-DD"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={endFieldName}
            label="End date"
            dependencies={[startFieldName]}
            rules={endRules}
            getValueFromEvent={fromDateEvent}
            normalize={parseDayjs}
            getValueProps={getDateValueProps}
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              placeholder="End date"
              style={{ width: '100%' }}
              disabled={effectiveReadOnly}
              format="YYYY-MM-DD"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
