import { Form, Input, Select, Button, Typography } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { SEVERITY_LEVELS } from '../constants/violations.constants'

const { Text } = Typography
const { TextArea } = Input

export default function ViolationConfiguration({ form, handleFormValuesChange, token }) {

  return (
    <div>
      <Form form={form} layout="vertical" onValuesChange={handleFormValuesChange} requiredMark={false}>
        <Form.Item
          name="name"
          label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="e.g., Missing Fire Extinguisher" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea placeholder="Description of this violation" rows={3} />
        </Form.Item>

        <Form.Item
          name="correctiveAction"
          label="Corrective Action"
        >
          <TextArea placeholder="Required action to fix this violation" rows={3} />
        </Form.Item>

        <Form.Item
          name="severity"
          label={<span>Severity<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          rules={[{ required: true, message: 'Severity is required' }]}
        >
          <Select placeholder="Select severity">
            {SEVERITY_LEVELS.map(level => (
              <Select.Option key={level.value} value={level.value}>{level.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea placeholder="Additional notes or comments" rows={2} />
        </Form.Item>

        <Text style={{ marginBottom: 8, display: 'block' }}>Legal Basis</Text>
        <Form.List name="legalBasis">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    background: token.colorBgContainer,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Form.Item
                      name={[field.name, 'url']}
                      label="URL"
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="https://officialgazette.gov.ph/..." />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'title']}
                      label="Title"
                      initialValue=""
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="e.g., RA 1234 - Law Name" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'description']}
                      label="Description"
                      initialValue=""
                      style={{ marginBottom: 0 }}
                    >
                      <TextArea rows={2} placeholder="Brief description of the legal reference" />
                    </Form.Item>
                    <Button
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                      block
                    >
                      Remove Legal Basis
                    </Button>
                  </div>
                </div>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Legal Basis
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </div>
  )
}
