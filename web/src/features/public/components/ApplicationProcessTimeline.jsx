import { useState, useEffect, useRef } from 'react'
import { Typography, theme, Steps, Grid, Space, Modal, Drawer, Tag, Divider, List } from 'antd'
import {
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  SearchOutlined,
  SafetyOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { useBreakpoint } = Grid

const ICON_MAP = {
  UserOutlined: <UserOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
  DollarOutlined: <DollarOutlined />,
  SearchOutlined: <SearchOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  TrophyOutlined: <TrophyOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  CloudUploadOutlined: <CloudUploadOutlined />,
}

function getIcon(iconName) {
  return ICON_MAP[iconName] || <FileTextOutlined />
}

// Hardcoded fallback steps (same as original)
const FALLBACK_STEPS = [
  {
    title: 'Create Account',
    description: 'Register your business account to get started with the application process.',
    icon: 'UserOutlined',
    optional: false,
  },
  {
    title: 'Submit Requirements',
    description: 'Upload and submit all required documents for your business permit application.',
    icon: 'FileTextOutlined',
    optional: false,
  },
  {
    title: 'Initial Verification',
    description: 'BPLO staff reviews your submitted documents for completeness and accuracy.',
    icon: 'CheckCircleOutlined',
    optional: false,
  },
  {
    title: 'Assessment & Fees',
    description: 'Your application is assessed and applicable fees are calculated based on business type.',
    icon: 'DollarOutlined',
    optional: false,
  },
  {
    title: 'Inspection',
    description: 'If applicable, an on-site inspection is scheduled to verify business location compliance.',
    icon: 'SearchOutlined',
    optional: true,
  },
  {
    title: 'Approval',
    description: 'Upon successful verification and payment, your permit application is approved.',
    icon: 'SafetyOutlined',
    optional: false,
  },
  {
    title: 'Permit Release',
    description: 'Your business permit is issued and ready for download or pickup.',
    icon: 'TrophyOutlined',
    optional: false,
  },
]

// Simple in-memory cache for API response
const cache = { data: null, timestamp: 0 }
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchProcessData() {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data
  }
  try {
    const res = await fetch('/api/public/application-processes/permit')
    if (!res.ok) return null
    const json = await res.json()
    const data = json
    if (data && data.steps && data.steps.length > 0) {
      cache.data = data
      cache.timestamp = Date.now()
      return data
    }
    return null
  } catch {
    return null
  }
}

export default function ApplicationProcessTimeline() {
  const screens = useBreakpoint()
  const { token } = theme.useToken()
  const [processData, setProcessData] = useState(null)
  const [selectedStep, setSelectedStep] = useState(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchProcessData().then((data) => {
      if (data) setProcessData(data)
    })
  }, [])

  const steps = processData?.steps || FALLBACK_STEPS

  const stepItems = steps.map((step, index) => ({
    key: index,
    title: (
      <Space direction="vertical" size={4}>
        <Text strong style={{ fontSize: '14px' }}>
          {step.title}
          {step.optional && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
              (if applicable)
            </Text>
          )}
        </Text>
      </Space>
    ),
    description: (
      <Text type="secondary" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {step.description}
      </Text>
    ),
    icon: getIcon(step.icon),
  }))

  const handleStepClick = (index) => {
    setSelectedStep(steps[index])
  }

  const handleClose = () => {
    setSelectedStep(null)
  }

  // Detail content for modal/drawer
  const detailContent = selectedStep && (
    <div style={{ padding: screens.md ? 0 : 16 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Space align="center" size={8}>
            {getIcon(selectedStep.icon)}
            <Title level={5} style={{ margin: 0 }}>{selectedStep.title}</Title>
            {selectedStep.optional && <Tag color="orange">Optional</Tag>}
          </Space>
        </div>

        <Paragraph style={{ margin: 0, fontSize: 14 }}>
          {selectedStep.description}
        </Paragraph>

        {(selectedStep.estimatedTime || selectedStep.estimatedCost) && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <Space size={24} wrap>
              {selectedStep.estimatedTime && (
                <Space size={6}>
                  <ClockCircleOutlined style={{ color: token.colorPrimary }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Estimated Time</Text>
                    <Text strong style={{ fontSize: 13 }}>{selectedStep.estimatedTime}</Text>
                  </div>
                </Space>
              )}
              {selectedStep.estimatedCost && (
                <Space size={6}>
                  <DollarOutlined style={{ color: token.colorSuccess }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Estimated Cost</Text>
                    <Text strong style={{ fontSize: 13 }}>{selectedStep.estimatedCost}</Text>
                  </div>
                </Space>
              )}
            </Space>
          </>
        )}

        {selectedStep.requirements && selectedStep.requirements.length > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                <FileTextOutlined style={{ marginRight: 6 }} />
                Requirements
              </Text>
              <List
                size="small"
                dataSource={selectedStep.requirements}
                renderItem={(item) => (
                  <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                    <Text style={{ fontSize: 13 }}>• {item}</Text>
                  </List.Item>
                )}
              />
            </div>
          </>
        )}
      </Space>
    </div>
  )

  return (
    <section id="application-process-timeline" style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: screens.md ? '0 20px' : '0 16px' }}>
      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: screens.md ? '32px 36px' : '24px 20px',
          background: token.colorBgLayout,
        }}
      >
        <Title
          level={4}
          style={{
            marginTop: 0,
            marginBottom: screens.md ? 12 : 8,
            textAlign: screens.md ? 'left' : 'center',
            fontSize: screens.md ? 20 : 18,
          }}
        >
          Application Process Timeline
        </Title>
        <Paragraph
          type="secondary"
          style={{
            marginBottom: screens.md ? 4 : 4,
            textAlign: screens.md ? 'left' : 'center',
            fontSize: screens.md ? 14 : 13,
            lineHeight: 1.6,
          }}
        >
          Understand the step-by-step process before registering your business.
        </Paragraph>
        {processData && (
          <Space size={16} style={{ marginBottom: screens.md ? 20 : 12 }} wrap>
            {processData.totalEstimatedTime && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                Total: {processData.totalEstimatedTime}
              </Text>
            )}
            {processData.totalEstimatedCost && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <DollarOutlined style={{ marginRight: 4 }} />
                Est. Cost: {processData.totalEstimatedCost}
              </Text>
            )}
          </Space>
        )}
        {!processData && <div style={{ marginBottom: screens.md ? 20 : 12 }} />}
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          Click on a step to view full details, costs, and requirements.
        </Text>
        <Steps
          direction={screens.md ? 'horizontal' : 'vertical'}
          current={-1}
          items={stepItems.map((item, index) => ({
            ...item,
            style: { cursor: 'pointer' },
            onClick: () => handleStepClick(index),
          }))}
          style={{ textAlign: 'left' }}
          size={screens.md ? 'default' : 'small'}
        />
      </div>

      {/* Step detail - Modal (desktop) / Drawer (mobile) */}
      {screens.md ? (
        <Modal
          open={!!selectedStep}
          onCancel={handleClose}
          title={null}
          footer={null}
          width={560}
        >
          {detailContent}
        </Modal>
      ) : (
        <Drawer
          open={!!selectedStep}
          onClose={handleClose}
          placement="bottom"
          height="auto"
          styles={{ body: { padding: 0 } }}
        >
          {detailContent}
        </Drawer>
      )}
    </section>
  )
}
