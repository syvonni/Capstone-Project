import { useState } from 'react'
import { Typography, Input, Button, theme, Grid, Layout, Upload, message, Alert } from 'antd'
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons'
import HomeHeader from '../components/HomeHeader'
import ZipperReveal from '@/shared/components/graphics/MosaicArt.jsx'
import PanAnimation from '@/shared/components/animations/PanAnimation.jsx'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'
import DocumentPreviewModal from '@/shared/components/document/DocumentPreviewModal'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { useBreakpoint } = Grid
const { Content } = Layout

export default function HelpPage() {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [form, setForm] = useState({
    subject: '',
    message: '',
    contactEmail: '',
    businessPermitNumber: '',
  })
  const [fileList, setFileList] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState('')
  const [error, setError] = useState('')
  const [previewModal, setPreviewModal] = useState({ open: false, url: null, label: '', type: 'other' })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.subject.trim()) return setError('Subject is required')
    if (!form.message.trim()) return setError('Message is required')
    if (!form.contactEmail.trim() || !form.contactEmail.includes('@')) return setError('A valid email is required')

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        subject: form.subject.trim(),
        message: form.message.trim(),
        contactEmail: form.contactEmail.trim(),
        businessPermitNumber: form.businessPermitNumber.trim() || undefined,
        attachments: [], // IPFS CIDs would go here
      }

      const res = await fetch('/api/help-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to submit')
      setSubmitted(true)
      setSubmittedId(data.requestId || '')
      message.success('Help request submitted successfully!')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm({ subject: '', message: '', contactEmail: '', businessPermitNumber: '' })
    setFileList([])
    setSubmitted(false)
    setSubmittedId('')
    setError('')
  }

  return (
    <Layout style={{ height: '100vh', background: token.colorBgContainer }}>
      <HomeHeader visible={true} onNavigate={(path) => window.location.href = path} />
      <Content style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: screens.md ? 72 : 64 }}>
        {/* Two Panel Design */}
        <div
          style={{
            width: '100vw',
            height: screens.md ? 'calc(100vh - 72px)' : 'auto',
            display: 'flex',
            flexDirection: screens.md ? 'row' : 'column',
            flex: 1,
          }}
        >
          {/* Left Panel - Form (40% on desktop, 100% on mobile) */}
          <div style={{
            width: screens.md ? '40%' : '100%',
            background: token.colorBgContainer,
            padding: '48px 48px',
            paddingLeft: screens.md ? 48 : 16,
            paddingRight: screens.md ? 48 : 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: screens.md ? 'center' : 'flex-start',
            overflowY: 'auto',
          }}>
            {!submitted ? (
              <BlurFade delay={0.2} duration={0.5} fullHeight={false}>
                <div style={{ width: '100%' }}>
                  <Title level={2} style={{ marginBottom: 8, marginTop: 8, fontSize: screens.md ? 32 : 24 }}>
                    Need Help?
                  </Title>
                  <Paragraph style={{ marginBottom: 32, lineHeight: 1.6, color: token.colorTextSecondary }}>
                    Submit a help request and our team will get back to you as soon as possible.
                  </Paragraph>

                  {error && (
                    <Alert
                      message={error}
                      type="error"
                      showIcon
                      closable
                      onClose={() => setError('')}
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                        Subject <span style={{ color: token.colorError }}>*</span>
                      </Text>
                      <Input
                        placeholder="Brief description of your issue"
                        value={form.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        maxLength={200}
                      />
                    </div>

                    <div>
                      <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                        Message <span style={{ color: token.colorError }}>*</span>
                      </Text>
                      <TextArea
                        placeholder="Describe your concern in detail..."
                        value={form.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        rows={4}
                        maxLength={2000}
                        showCount
                      />
                    </div>

                    <div>
                      <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                        Contact Email <span style={{ color: token.colorError }}>*</span>
                      </Text>
                      <Input
                        placeholder="your.email@example.com"
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => handleChange('contactEmail', e.target.value)}
                      />
                    </div>

                    <div>
                      <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                        Business Permit Number <Text type="secondary" style={{ fontSize: 12 }}>(optional)</Text>
                      </Text>
                      <Input
                        placeholder="e.g. BP-2024-001234"
                        value={form.businessPermitNumber}
                        onChange={(e) => handleChange('businessPermitNumber', e.target.value)}
                      />
                    </div>

                    <div>
                      <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                        Attachments <Text type="secondary" style={{ fontSize: 12 }}>(optional)</Text>
                      </Text>
                      <Upload
                        listType="picture-card"
                        fileList={fileList}
                        onChange={({ fileList: fl }) => setFileList(fl)}
                        beforeUpload={() => false}
                        multiple
                        maxCount={5}
                        onPreview={(file) => {
                          const url = file.originFileObj ? URL.createObjectURL(file.originFileObj) : file.url || file.thumbUrl || null
                          const isBlob = url?.startsWith('blob:')
                          setPreviewModal({ open: true, url, label: file.name, type: 'other', isBlob })
                        }}
                      >
                        {fileList.length < 5 && (
                          <div>
                            <UploadOutlined />
                            <div style={{ marginTop: 8 }}>Upload</div>
                          </div>
                        )}
                      </Upload>
                    </div>

                    <Button
                      type="primary"
                      onClick={handleSubmit}
                      loading={submitting}
                      block
                      style={{ marginTop: 8 }}
                    >
                      Submit Request
                    </Button>
                    <Button
                      onClick={() => setForm({
                        subject: 'Test Subject - Issue with Business Permit',
                        message: 'This is a test message describing an issue with a business permit. The system is not allowing me to complete the application process.',
                        contactEmail: 'stephendiaz.syv@gmail.com',
                        businessPermitNumber: 'BP-2024-001234',
                      })}
                      block
                      style={{ marginTop: 8 }}
                    >
                      Debug: Fill Form
                    </Button>
                  </div>
                </div>
              </BlurFade>
            ) : (
              <BlurFade delay={0.2} duration={0.5} fullHeight={false}>
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <CheckCircleOutlined style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 16 }} />
                  <Title level={3} style={{ marginBottom: 8 }}>
                    Request Submitted
                  </Title>
                  <Paragraph style={{ color: token.colorTextSecondary, marginBottom: 24 }}>
                    A confirmation email has been sent to your address. Our team will respond as soon as possible.
                  </Paragraph>

                  {submittedId && (
                    <div style={{
                      padding: 16,
                      background: token.colorBgLayout,
                      borderRadius: token.borderRadius,
                      marginBottom: 24,
                    }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Reference Number
                      </Text>
                      <Text strong style={{ fontSize: 18, fontFamily: 'monospace', color: token.colorPrimary }}>
                        {submittedId}
                      </Text>
                    </div>
                  )}

                  <Button onClick={handleReset} block>
                    Submit Another Request
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

        <DocumentPreviewModal
          open={previewModal.open}
          onClose={() => setPreviewModal({ open: false, url: null, label: '', type: 'other' })}
          url={previewModal.url}
          label={previewModal.label}
          type={previewModal.type}
          isBlob={previewModal.url?.startsWith('blob:')}
        />

      </Content>
    </Layout>
  )
}
