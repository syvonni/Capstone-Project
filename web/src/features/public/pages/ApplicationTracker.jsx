import { useState } from 'react'
import { Typography, Input, Button, theme, Grid, Layout } from 'antd'
import HomeHeader from '../components/HomeHeader'
import FaqSection from '../components/FaqSection'
import HomeFooter from '../components/HomeFooter'
import ZipperReveal from '@/shared/components/graphics/MosaicArt.jsx'
import PanAnimation from '@/shared/components/animations/PanAnimation.jsx'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'

const { Title, Text, Paragraph } = Typography
const { useBreakpoint } = Grid
const { Content } = Layout

const MOCK_APPLICATION = {
  referenceNumber: 'BPLO-2024-001234',
  status: 'Under Review',
  statusColor: 'warning',
  submittedDate: 'May 15, 2024',
  businessName: 'Sample Business Corp',
  businessType: 'Regular Business',
}

export default function ApplicationTracker() {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [referenceNumber, setReferenceNumber] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [currentApplication, setCurrentApplication] = useState(null)

  const handleCheckStatus = () => {
    // No functionality for now - just show mock result
    setCurrentApplication(MOCK_APPLICATION)
    setShowResult(true)
  }

  const handleReset = () => {
    setReferenceNumber('')
    setShowResult(false)
    setCurrentApplication(null)
  }

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgContainer }}>
      <HomeHeader visible={true} />
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Two Panel Design */}
        <div
          style={{
            width: '100vw',
            height: screens.md ? 'calc(100vh - 72px)' : 'auto',
            display: 'flex',
            flexDirection: screens.md ? 'row' : 'column',
            gap: screens.md ? '48px' : '16px',
          }}
        >
          {/* Left Panel - Form (40% on desktop, 100% on mobile) */}
          <div style={{
            width: screens.md ? '40%' : '100%',
            background: token.colorBgContainer,
            padding: screens.md ? '32px 48px 32px 48px' : '32px 24px 32px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            overflowY: screens.md ? 'auto' : 'visible',
          }}>
            {!showResult ? (
              <BlurFade delay={0.2} duration={0.5} fullHeight={false}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                  <Title level={2} style={{ marginBottom: 16, marginTop: 8, fontSize: screens.md ? 32 : 24 }}>
                    Application Tracker
                  </Title>
                  <Paragraph style={{ marginBottom: 32, lineHeight: 1.6, color: token.colorTextSecondary }}>
                    Enter your receipt number to track the status of your business permit application.
                  </Paragraph>

                  <div style={{ marginBottom: 24 }}>
                    <Text style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                      Enter a Receipt Number
                    </Text>
                    <Input
                      placeholder="EAC1234567890"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      style={{ marginBottom: 16 }}
                    />
                    <Button
                      type="primary"
                      onClick={handleCheckStatus}
                      disabled={!referenceNumber}
                      block
                    >
                      Check Status
                    </Button>
                  </div>
                </div>
              </BlurFade>
            ) : (
              <BlurFade delay={0.2} duration={0.5} fullHeight={false}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                  <Title level={2} style={{ marginBottom: 24, marginTop: 8, fontSize: screens.md ? 32 : 24 }}>
                    Application Status Checker
                  </Title>

                  <div style={{
                    padding: 24,
                    background: '#fff',
                    borderRadius: token.borderRadius,
                    marginBottom: 16,
                    border: `1px solid ${token.colorBorder}`,
                  }}>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Receipt Number
                      </Text>
                      <Text strong style={{ fontSize: 16 }}>
                        {currentApplication?.referenceNumber || referenceNumber}
                      </Text>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Status
                      </Text>
                      <Text strong style={{ fontSize: 16, color: token.colorWarning }}>
                        {currentApplication?.status || 'Under Review'}
                      </Text>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Submitted Date
                      </Text>
                      <Text strong style={{ fontSize: 16 }}>
                        {currentApplication?.submittedDate || 'May 15, 2024'}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Business Name
                      </Text>
                      <Text strong style={{ fontSize: 16 }}>
                        {currentApplication?.businessName || 'Sample Business Corp'}
                      </Text>
                    </div>
                  </div>

                  <Button onClick={handleReset} block>
                    Check Another Case
                  </Button>
                </div>
              </BlurFade>
            )}
          </div>

          {/* Right Panel - Art (60% on desktop, hidden on mobile) */}
          {screens.md && (
            <ZipperReveal
              screens={screens}
              style={{
                width: '60%',
                height: '100%',
              }}
            >
              <PanAnimation
                imageUrl="/Mosaic.png"
                direction="southeast"
                speed={30}
                screens={screens}
              />
            </ZipperReveal>
          )}
        </div>

        {/* FAQ Section - Only show when result is displayed */}
        {showResult && (
          <div style={{ padding: screens.md ? '60px 48px' : '40px 16px', maxWidth: 400, margin: '0 auto' }}>
            <FaqSection />
          </div>
        )}
      </Content>
      <HomeFooter />
    </Layout>
  )
}
