import { useState, useEffect } from 'react'
import { Button, Form, Input, Upload, Typography, List, theme } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import DocumentPreviewModal from '@/shared/components/document/DocumentPreviewModal'

const { Text } = Typography
const { useToken } = theme

const APPEAL_FEE = 500

// Helper to detect file type
const detectFileType = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (['pdf'].includes(ext)) return 'pdf'
  return 'other'
}

export default function AppealModal({ open, onCancel, onSubmit, submitting }) {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState([])
  const [previewModal, setPreviewModal] = useState({ open: false, url: null, label: '', type: 'other' })
  const { token } = useToken()

  useEffect(() => {
    if (open) {
      form.resetFields()
      setFileList([])
    }
  }, [open, form])

  const handleOk = () => {
    form.submit()
  }

  const handleCancel = () => {
    if (!submitting) {
      onCancel()
      form.resetFields()
      setFileList([])
    }
  }

  const uploadProps = {
    listType: 'picture-card',
    fileList,
    onChange: ({ fileList: fl }) => setFileList(fl),
    beforeUpload: () => false,
    multiple: true,
    maxCount: 5,
    onPreview: (file) => {
      const url = file.originFileObj ? URL.createObjectURL(file.originFileObj) : file.url || file.thumbUrl || null
      const isBlob = url?.startsWith('blob:')
      const fileType = detectFileType(file.name)
      setPreviewModal({ open: true, url, label: file.name, type: fileType, isBlob })
    },
  }

  const handleSubmit = (values) => {
    onSubmit({
      description: values.description,
      appealType: 'rejection_appeal', // Default to rejection appeal
      evidence: fileList,
    })
  }

  return (
    <>
      <ResponsiveModal
        title="File Appeal"
        open={open}
        onCancel={handleCancel}
        footer={
          <Button type="primary" onClick={handleOk} loading={submitting}>
            Continue to Payment
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="description"
            label={<span>Appeal Letter <span style={{ color: 'red' }}>*</span></span>}
            rules={[{ required: true, message: 'Please provide appeal details' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Describe why you are appealing this rejection..."
            />
          </Form.Item>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>
              Supporting Documents (Optional)
            </Text>
            <Upload {...uploadProps}>
              {fileList.length < 5 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </div>
          <div style={{ marginTop: 16 }}>
            <Text style={{ display: 'block', marginBottom: 12, }}>
              Appeal Fee Breakdown
            </Text>
            <List
              size="small"
              bordered
              dataSource={[{ label: 'Appeal Fee', amount: APPEAL_FEE }]}
              renderItem={(item) => (
                <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{item.label}</Text>
                  <Text strong>₱{(item.amount || 0).toFixed(2)}</Text>
                </List.Item>
              )}
              footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Total Amount Due</Text>
                  <Text strong style={{ color: token.colorPrimary, fontSize: 16 }}>₱{APPEAL_FEE.toFixed(2)}</Text>
                </div>
              }
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
              * Payment will be processed after appeal submission
            </Text>
          </div>
        </Form>
      </ResponsiveModal>
      <DocumentPreviewModal
        open={previewModal.open}
        onClose={() => setPreviewModal({ open: false, url: null, label: '', type: 'other' })}
        url={previewModal.url}
        label={previewModal.label}
        type={previewModal.type}
        isBlob={previewModal.url?.startsWith('blob:')}
      />
    </>
  )
}
