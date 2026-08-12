import { createElement } from 'react';
import { Form } from 'antd';
import { Typography, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getFileIcon, formatFileSize } from '@/features/business-owner/utils/formUtils';
import { useFieldContext } from './FieldContext';

const { Text } = Typography;

export default function DownloadField() {
  const { field, label, token } = useFieldContext();

  return (
    <Form.Item label={label} style={{ marginBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: token.colorFillQuaternary,
          borderRadius: token.borderRadius,
          border: `1px dashed ${token.colorBorder}`,
        }}
      >
        <span style={{ fontSize: 24, color: token.colorPrimary }}>
          {createElement(getFileIcon(field.downloadFileType))}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, display: 'block' }}>
            {field.downloadFileName || 'Template file'}
          </Text>
          {field.downloadFileSize > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {field.downloadFileType?.toUpperCase()} · {formatFileSize(field.downloadFileSize)}
            </Text>
          )}
        </div>
        {field.downloadFileUrl && (
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href={field.downloadFileUrl}
            target="_blank"
          >
            Download
          </Button>
        )}
      </div>
    </Form.Item>
  );
}
