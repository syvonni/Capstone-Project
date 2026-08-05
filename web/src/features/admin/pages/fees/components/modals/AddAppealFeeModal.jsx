import { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Button, message, Typography, theme } from 'antd'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createFee } from '@/features/admin/services/feeService'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'

const { Text } = Typography
const { useToken } = theme

const { TextArea } = Input

export default function AddAppealFeeModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { token } = useToken()

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [open, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // Manual validation for required fields
      if (!values.name || !values.description || values.amount === undefined || values.amount === null) {
        message.error('Please fill in all required fields')
        return
      }
      
      setLoading(true)

      await runWithStepUp(async (stepUpToken) => {
        await createFee(values, { stepUpToken })
      })

      message.success('Appeal fee created successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create appeal fee:', error)
        message.error(error.message || 'Failed to create appeal fee')
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
        title="Add Appeal Fee"
        footer={[
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Create Appeal Fee
          </Button>,
        ]}
        width={500}
        destroyOnHidden
      >
        <div style={{ padding: 16 }}>
          <Text>Enter the appeal fee details below.</Text>
          <Form key={open ? 'form-open' : 'form-closed'} form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
            <Form.Item
              name="name"
              label={<span>Appeal Fee Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Appeal fee name is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input placeholder="Enter appeal fee name" />
            </Form.Item>

            <Form.Item
              name="description"
              label={<span>Description<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim() === '') {
                      return Promise.reject('Description is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <TextArea rows={4} placeholder="Enter appeal fee description" />
            </Form.Item>

            <Form.Item
              name="amount"
              label={<span>Amount<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null || value === '') {
                      return Promise.reject('Amount is required')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter amount"
                min={0}
                precision={2}
                formatter={currencyFormatter}
                parser={currencyParser}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
      {stepUpModal}
    </>
  )
}
