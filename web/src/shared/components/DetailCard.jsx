import { Card, Typography, Space, theme } from 'antd'

const { Text } = Typography

export default function DetailCard({
  icon: Icon,
  title,
  details = [],
  onClick,
}) {
  const { token } = theme.useToken()

  return (
    <Card
      size="small"
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        cursor: onClick ? 'pointer' : 'default',
      }}
      styles={{
        body: { padding: 16 }
      }}
      onClick={onClick}
    >
      {/* Header */}
      <Space style={{ marginBottom: 12 }}>
        {Icon && (
          <Icon style={{ fontSize: 20, color: token.colorTextSecondary }} />
        )}
        <Text strong style={{ fontSize: 16, color: token.colorText }}>
          {title}
        </Text>
      </Space>

      {/* Details */}
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {details.map((detail, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: token.colorTextSecondary }}>
              {detail.label}
            </Text>
            <Space size={4}>
              <Text strong style={{ fontSize: 14, color: token.colorText }}>
                {detail.value}
              </Text>
              {detail.trend && (
                <Text style={{ fontSize: 12, color: detail.trend.startsWith('+') ? '#52c41a' : '#8c8c8c' }}>
                  {detail.trend}
                </Text>
              )}
            </Space>
          </div>
        ))}
      </Space>
    </Card>
  )
}
