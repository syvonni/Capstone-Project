import { Button, Typography, Descriptions } from 'antd';
import ResponsiveModal from '@/shared/components/ResponsiveModal';

const { Text } = Typography;

function formatDisplayValue(rawValue, key, formatters, defaultDisplay) {
  if (formatters && typeof formatters[key] === 'function') {
    return formatters[key](rawValue);
  }
  return defaultDisplay;
}

export default function ChangesSummaryModal({
  open,
  onClose,
  onConfirm,
  changedFields,
  formatters,
  fieldLabels,
  confirmLoading = false,
  title = 'Confirm Changes',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) {
  return (
    <ResponsiveModal
      open={open}
      onCancel={onClose}
      title={title}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={confirmLoading}>
          {cancelText}
        </Button>,
        <Button key="confirm" type="primary" loading={confirmLoading} onClick={onConfirm}>
          {confirmText}
        </Button>,
      ]}
    >
      <Text style={{ display: 'block', marginBottom: 16 }}>
        Are you sure you want to publish these changes? This action cannot be undone.
      </Text>
      {changedFields && changedFields.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontWeight: 500 }}>
            Changes to be saved:
          </Text>
          <Descriptions column={1} size="small" bordered>
            {changedFields.map((change, index) => {
              const label = (fieldLabels && fieldLabels[change.key]) || change.field;
              const fromDisplay = formatDisplayValue(
                change.fromValue,
                change.key,
                formatters,
                change.from
              );
              const toDisplay = formatDisplayValue(
                change.toValue,
                change.key,
                formatters,
                change.to
              );
              return (
                <Descriptions.Item key={index} label={label}>
                  <Text type="secondary" style={{ textDecoration: 'line-through', marginRight: 8 }}>
                    {fromDisplay}
                  </Text>
                  <Text>→ {toDisplay}</Text>
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        </div>
      )}
    </ResponsiveModal>
  );
}
