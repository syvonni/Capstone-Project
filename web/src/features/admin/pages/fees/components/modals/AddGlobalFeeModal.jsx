import { useState, useEffect } from 'react'
import { Form, Input, InputNumber, Button, App, Typography, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { useStepUp } from '@/shared/hooks/useStepUp'
import { createFee } from '@/features/admin/services/feeService'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'
import { useNameValidation } from '@/shared/hooks/useNameValidation'

const { Text } = Typography
const { useToken } = theme

const { TextArea } = Input

export default function AddUniversalFeeModal({ open, onClose, onSuccess }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { runWithStepUp, stepUpModal } = useStepUp()
  const { token } = useToken()
  const { validateName, isValidating, error: nameError, clearError } = useNameValidation('Fee')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
      clearError()
    }
  }, [open, form, clearError])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Manual validation for required fields
      if (!values.name || values.amount === undefined || values.amount === null) {
        message.error('Please fill in all required fields')
        return
      }

      setLoading(true)

      await runWithStepUp(async (stepUpToken) => {
        await createFee(values, { stepUpToken })
      })

      message.success('Fee created successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error?.message !== 'Step-up cancelled') {
        console.error('Failed to create fee:', error)
        message.error(error.message || 'Failed to create fee')
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
      <ResponsiveModal
        open={open}
        onCancel={handleCancel}
        title="Add Global Application Fee"
        footer={[
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            Add Global Application Fee
          </Button>,
        ]}
        width={500}
        destroyOnHidden
      >
        <Text>Enter the fee details below.</Text>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
          <Form.Item
            name="name"
            label={<span>Global Application Fee Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
            validateStatus={nameError ? 'error' : ''}
            help={nameError}
            rules={[
              {
                validator: (_, value) => {
                  if (!value || value.trim() === '') {
                    return Promise.reject('Global application fee name is required')
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input
              placeholder="Enter fee name"
              onBlur={(e) => validateName(e.target.value)}
              disabled={isValidating}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label={<span>Admin Notes</span>}
          >
            <TextArea placeholder="Enter notes (for admin reference, regulatory basis, etc.)" rows={3} />
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
      </ResponsiveModal>
      {stepUpModal}
    </>
  )
}
