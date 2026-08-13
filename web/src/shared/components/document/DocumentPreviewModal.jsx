import { Button, Typography, Space, Image, theme } from 'antd';
import { EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import ResponsiveModal from '@/shared/components/ResponsiveModal';

const { Text } = Typography;

export default function DocumentPreviewModal({ open, onClose, url, label, type, isBlob }) {
  const { token } = theme.useToken();

  return (
    <ResponsiveModal
      title={label}
      open={open}
      onCancel={onClose}
      width={type === 'image' ? 560 : 720}
      zIndex={1100}
      footer={[
        <Button
          key="openTab"
          icon={<EyeOutlined />}
          onClick={() => url && window.open(url, '_blank')}
        >
          Open in new tab
        </Button>,
        ...(url && !isBlob
          ? [
              <Button key="download" type="primary" icon={<DownloadOutlined />} href={url} download>
                Download
              </Button>,
            ]
          : []),
      ]}
    >
      {open && url && (
        <div
          style={{
            minHeight: 200,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            overflow: 'auto',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          {type === 'image' && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Image
                src={url}
                alt={label}
                style={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
                preview={{
                  mask: (
                    <Space direction="vertical" size={4}>
                      <EyeOutlined style={{ fontSize: 16 }} />
                      <Text style={{ fontSize: 12, color: '#fff' }}>Zoom</Text>
                    </Space>
                  ),
                }}
                onError={(e) => {
                  // If image fails to load, try iframe fallback
                  e.target.style.display = 'none';
                  const iframe = document.createElement('iframe');
                  iframe.src = url;
                  iframe.style.width = '100%';
                  iframe.style.height = '70vh';
                  iframe.style.border = `1px solid ${token.colorBorderSecondary}`;
                  iframe.style.borderRadius = token.borderRadius;
                  e.target.parentNode.appendChild(iframe);
                }}
              />
            </div>
          )}
          {type === 'pdf' && !isBlob && (
            <iframe
              title={label}
              src={url}
              sandbox="allow-same-origin allow-scripts"
              style={{
                width: '100%',
                height: '70vh',
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
              }}
            />
          )}
          {type === 'pdf' && isBlob && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Text style={{ display: 'block', marginBottom: 12 }}>
                This local PDF cannot be embedded. Use &quot;Open in new tab&quot; to view it.
              </Text>
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => url && window.open(url, '_blank')}
              >
                Open PDF in new tab
              </Button>
            </div>
          )}
          {type === 'other' && !isBlob && (
            <iframe
              title={label}
              src={url}
              sandbox="allow-same-origin allow-scripts"
              style={{
                width: '100%',
                height: '70vh',
                minHeight: 320,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
              }}
            />
          )}
          {type === 'other' && isBlob && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Text style={{ display: 'block', marginBottom: 12 }}>
                This local file cannot be embedded in the preview modal because your Content
                Security Policy blocks `blob:` URLs in frames.
              </Text>
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => url && window.open(url, '_blank')}
              >
                Open file in new tab
              </Button>
            </div>
          )}
        </div>
      )}
    </ResponsiveModal>
  );
}
