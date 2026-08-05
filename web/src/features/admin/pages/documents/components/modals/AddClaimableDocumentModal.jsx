import { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Button, message, Typography, theme, Select } from 'antd'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createDocument } from '@/features/admin/services/documentService'
import { getChecklists } from '@/features/admin/services/checklistService'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'

const { Text } = Typography
const { useToken } = theme

const { TextArea } = Input

export default function AddClaimableDocumentModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [checklists, setChecklists] = useState([])
  const [loadingChecklists, setLoadingChecklists] = useState(false)
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { token } = useToken()

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [open, form])

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        setLoadingChecklists(true)
        const response = await getChecklists({ isActive: true })
        setChecklists(response || [])
      } catch (error) {
        console.error('Failed to fetch checklists:', error)
        message.error('Failed to load checklists')
      } finally {
        setLoadingChecklists(false)
      }
    }
    fetchChecklists()
  }, [])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Manual validation for required fields
      if (!values.name) {
        message.error('Please fill in all required fields')
        return
      }

      setLoading(true)

      const payload = {
        name: values.name,
        notes: values.notes || null,
        feeAmount: values.feeAmount,
        isActive: true,
        version: 1,
        effectiveDate: new Date(),
      }

      await runWithStepUp(async (stepUpToken) => {
        await createDocument(payload, { stepUpToken })
      })

      message.success('Document created successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create document:', error)
        message.error(error.message || 'Failed to create document')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <>
      <Modal
        open={open}
        onCancel={handleCancel}
        title="Add Document"
        footer={[
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Create Document
          </Button>,
        ]}
        width={500}
        destroyOnHidden
      >
        <div style={{ padding: 16 }}>
          <Text>Enter the document details below.</Text>
          <Form key={open ? 'form-open' : 'form-closed'} form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
            <Form.Item
              name="name"
              label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Document name is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input placeholder="e.g., Fire Safety Inspection Certificate" />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea rows={4} placeholder="Add any additional notes..." />
            </Form.Item>

            <Form.Item
              name="checklistId"
              label="Checklist"
            >
              <Select
                placeholder="Select a checklist to associate with this document (optional)"
                loading={loadingChecklists}
                allowClear
                options={checklists.map(c => ({
                  value: c._id,
                  label: c.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="feeAmount"
              label={<span>Fee Amount (₱)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              required={false}
              rules={[
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null || value === '') {
                      return Promise.reject('Fee amount is required')
                    }
                    if (value < 0) {
                      return Promise.reject('Fee amount cannot be negative')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter fee amount"
                min={0}
                precision={2}
                formatter={currencyFormatter}
                parser={currencyParser}
              />
            </Form.Item>

            <div style={{ marginTop: 8, padding: 12, background: token.colorInfoBg, border: `1px solid ${token.colorInfoBorder}`, borderRadius: 6 }}>
              <Text style={{ color: token.colorInfoText, fontSize: 12 }}>
                A fee will be automatically created for this document. You can edit the fee details in the Fees section after creation.
              </Text>
            </div>
          </Form>
        </div>
      </Modal>
      {stepUpModal}
    </>
  )
}
