/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Typography } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import { getViolations } from '@/features/admin/services/violationService'

const { Text } = Typography
const { TextArea } = Input

export default function InspectionItemConfiguration({ form, handleFormValuesChange, initialValues }) {
  const { token } = theme.useToken()
  const [violations, setViolations] = useState([])
  const [loadingViolations, setLoadingViolations] = useState(false)

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        setLoadingViolations(true)
        const data = await getViolations({ isActive: true })
        // Show all violations for configuration tab (no filtering)
        setViolations((data || []).sort((a, b) => a.name.localeCompare(b.name)))
      } catch (error) {
        console.error('Failed to fetch violations:', error)
      } finally {
        setLoadingViolations(false)
      }
    }

    fetchViolations()
  }, [])

  return (
    <Form form={form} layout="vertical" onValuesChange={handleFormValuesChange} requiredMark={false}>
      <Form.Item
        name="name"
        label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        rules={[{ required: true, message: 'Please enter a name' }]}
      >
        <Input placeholder="Enter inspection item name" />
      </Form.Item>
      
      <Form.Item
        name="question"
        label={<span>Question<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        rules={[{ required: true, message: 'Please enter a question' }]}
      >
        <TextArea rows={4} placeholder="Enter inspection question" />
      </Form.Item>
      
      <Form.Item
        name="notes"
        label="Notes"
      >
        <TextArea rows={3} placeholder="Enter additional notes" />
      </Form.Item>

      <Form.Item
        name="violationId"
        label={<span>Violation<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        rules={[{ required: true, message: 'Please select a violation' }]}
      >
        <Select
          placeholder="Select a violation"
          loading={loadingViolations}
          showSearch
          optionFilterProp="children"
          allowClear
        >
          {violations.map((violation) => (
            <Select.Option key={violation._id} value={violation._id}>
              {violation.name}
            </Select.Option>
          ))}
        </Select>
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
                    <Input placeholder="https://nfpa.org/..." />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'title']}
                    label="Title"
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="e.g., NFPA 10 - Portable Fire Extinguishers" />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'description']}
                    label="Description"
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
  )
}
