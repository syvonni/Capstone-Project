import { Card, Row, Col, Statistic, Typography, Tag, Alert, List } from 'antd'
import { ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

export default function FeatureMonitoringDashboard({
  title,
  overviewStats,
  recentActivity,
  healthIssues,
  performanceStats,
  criticalAlerts,
  loading = false,
}) {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>{title}</Title>

      {criticalAlerts && criticalAlerts.length > 0 && (
        <Alert
          message="Critical Alerts"
          description={
            <List
              size="small"
              dataSource={criticalAlerts}
              renderItem={(alert) => (
                <List.Item>
                  <Text type="danger">{alert}</Text>
                </List.Item>
              )}
            />
          }
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {/* Overview Stats */}
        {overviewStats && (
          <>
            {overviewStats.map((stat, index) => (
              <Col xs={24} sm={12} md={8} lg={6} key={index}>
                <Card loading={loading}>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    suffix={stat.suffix}
                    valueStyle={{ color: stat.color }}
                  />
                </Card>
              </Col>
            ))}
          </>
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Health Issues */}
        <Col xs={24} md={12}>
          <Card title="Health Issues" loading={loading}>
            {healthIssues && healthIssues.length > 0 ? (
              <List
                size="small"
                dataSource={healthIssues}
                renderItem={(issue) => (
                  <List.Item>
                    <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text>{issue}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">No health issues detected</Text>
            )}
          </Card>
        </Col>

        {/* Performance Stats */}
        <Col xs={24} md={12}>
          <Card title="Performance" loading={loading}>
            {performanceStats && performanceStats.length > 0 ? (
              performanceStats.map((stat, index) => (
                <div key={index} style={{ marginBottom: 12 }}>
                  <Text type="secondary">{stat.label}:</Text>
                  <div style={{ fontSize: 20, fontWeight: 500, color: stat.color || '#52c41a' }}>
                    {stat.value}
                  </div>
                </div>
              ))
            ) : (
              <Text type="secondary">No performance data available</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Card title="Recent Activity" style={{ marginTop: 16 }} loading={loading}>
        {recentActivity && recentActivity.length > 0 ? (
          <List
            size="small"
            dataSource={recentActivity}
            renderItem={(activity) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                  title={activity.action}
                  description={
                    <span>
                      <Text type="secondary">{activity.who}</Text>
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        {activity.when}
                      </Tag>
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">No recent activity</Text>
        )}
      </Card>
    </div>
  )
}
