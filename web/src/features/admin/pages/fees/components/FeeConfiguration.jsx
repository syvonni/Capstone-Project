import { Form, Input, InputNumber } from 'antd'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'

const { TextArea } = Input

export default function FeeConfiguration({ form, handleFormValuesChange, token, initialValues }) {
  return (
    <div style={{ padding: '24px' }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleFormValuesChange}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          label={<span>Fee Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="Enter fee name" />
        </Form.Item>

        <Form.Item
          name="notes"
          label={<span>Admin Notes</span>}
        >
          <TextArea placeholder="Enter notes (for admin reference, regulatory basis, etc.)" rows={3} />
        </Form.Item>

        <Form.Item
          name="amount"
          label={<span>Amount (₱)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          rules={[{ required: true, message: 'Amount is required' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            precision={2}
            placeholder="Enter amount"
            formatter={currencyFormatter}
            parser={currencyParser}
          />
        </Form.Item>
      </Form>
    </div>
  )
}
