import { Form } from 'antd';
import { DatePicker, Row, Col } from 'antd';
import { useFieldContext } from './FieldContext';
import {
  fromDateEvent,
  parseDayjs,
  getDateValueProps,
  isDateLike,
  createEndDateAfterStartValidator,
} from './shared/dateHelpers';

function getDateRangeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const start = value.startDate || value.start || value.start_date || null;
  const end = value.endDate || value.end || value.end_date || null;
  if (start || end) return { start, end };
  return null;
}

export default function DateRangeField() {
  const { field, fieldName, form, effectiveReadOnly, requestChangeBorder, label } = useFieldContext();
  const fieldValue = form.getFieldValue(fieldName);
  const startFieldName = `${fieldName}_start`;
  const endFieldName = `${fieldName}_end`;
  // The form stores date ranges as split _start / _end fields. If the parent
  // fieldName value is not set (preview / read-only modes), build the display
  // range from the split values.
  const objectRange =
    getDateRangeObject(fieldValue) ||
    getDateRangeObject({
      start: form.getFieldValue(startFieldName),
      end: form.getFieldValue(endFieldName),
    });

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

  return (
    <div style={requestChangeBorder}>
      <div style={{ marginBottom: 8 }}>{label}</div>
      <Row gutter={[8, 16]}>
        <Col span={12}>
          <Form.Item
            name={startFieldName}
            label="Start date"
            rules={startRules}
            getValueFromEvent={fromDateEvent}
            normalize={parseDayjs}
            getValueProps={getDateValueProps}
            initialValue={objectRange?.start}
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
            initialValue={objectRange?.end}
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
