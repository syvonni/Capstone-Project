import { Typography, Button, Tag } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function BusinessProfile({ business, onReport, onBack, token, screens }) {
  return (
    <div>
      <Button
        type="default"
        onClick={onBack}
        style={{ marginBottom: 16 }}
      >
        Back to Results
      </Button>

      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
          padding: screens.md ? '32px' : '24px',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              {business?.name}
            </Title>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Tag color={
            business?.verificationBadge === 'Active' ? 'success' :
            business?.verificationBadge === 'Expired' ? 'error' :
            business?.verificationBadge === 'Suspended' ? 'error' :
            business?.verificationBadge === 'Retired' ? 'default' :
            'default'
          }>
            {business?.verificationBadge}
          </Tag>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: screens.md ? 'repeat(2, 1fr)' : '1fr',
          gap: 16,
          marginBottom: 24,
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Permit ID
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {business?.permitNo}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Name of Owner/Proprietor/Company Representative
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {business?.ownerName}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Address of Owner/Proprietor/Company Representative
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {business?.ownerAddress}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Status
            </Text>
            <Text strong style={{ fontSize: 16, color: token.colorSuccess }}>
              {business?.status}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Permit Validity
            </Text>
            <Text strong>
              {business?.permitValidity}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Issued on:
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {business?.issuedOn}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Issued at:
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {business?.issuedAt}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Paid Under O.R. No.:
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {business?.orNumber}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Amount Paid:
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {business?.amountPaid}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Business Type
            </Text>
            <Text strong>
              {business?.businessType}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Business Address
            </Text>
            <Text strong>
              {business?.barangay}
            </Text>
          </div>
        </div>

        <Button
          danger
          size="middle"
          icon={<ExclamationCircleOutlined />}
          onClick={onReport}
          block
        >
          Report Business
        </Button>
      </div>
    </div>
  )
}
