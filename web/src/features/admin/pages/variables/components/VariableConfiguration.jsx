import { Form, Input, Typography, Button, Select } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { getChecklists } from '@/features/admin/services/checklistService'
import { UNIT_PRESETS, UNIT_SINGULAR_PRESETS, UNIT_PLURAL_PRESETS, UNIT_CONTEXT_SINGULAR_PRESETS, UNIT_CONTEXT_PLURAL_PRESETS } from '@/shared/constants/units.constants'

const { Text } = Typography
const { TextArea } = Input

export default function VariableConfiguration({ form, handleFormValuesChange, token }) {
  const [checklists, setChecklists] = useState([])
  const [loadingChecklists, setLoadingChecklists] = useState(false)

  useEffect(() => {
    const fetchChecklists = async () => {
      setLoadingChecklists(true)
      try {
        const items = await getChecklists({ isActive: true })
        setChecklists(items || [])
      } catch (error) {
        console.error('Failed to fetch checklists:', error)
      } finally {
        setLoadingChecklists(false)
      }
    }
    fetchChecklists()
  }, [])
  return (
    <Form 
      form={form} 
      layout="vertical" 
      requiredMark={false}
      onValuesChange={handleFormValuesChange}
    >
      <Form.Item
        label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="name"
        rules={[{ required: true, message: 'Name is required' }]}
      >
        <Input placeholder="e.g., Parking Space Fee" />
      </Form.Item>

      <Form.Item
        label={<span>Description<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="description"
        rules={[{ required: true, message: 'Description is required' }]}
      >
        <TextArea rows={3} placeholder="Description of this variable" />
      </Form.Item>

      <Form.Item
        label={<span>Question<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="question"
        rules={[{ required: true, message: 'Question is required' }]}
      >
        <Input placeholder="e.g., What is the total parking area in square meters?" />
      </Form.Item>

      <Form.Item
        label="Notes"
        name="notes"
      >
        <TextArea rows={3} placeholder="Admin notes, guides, or comments (for staff reference only)" />
      </Form.Item>

      <Form.Item
        label={<span>Unit (generic)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="unit"
        rules={[{ required: true, message: 'Unit is required' }]}
      >
        <Select
          placeholder="Select or type a unit"
          options={UNIT_PRESETS}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        label={<span>Unit (singular form)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="unitSingular"
        rules={[{ required: true, message: 'Unit singular form is required' }]}
      >
        <Select
          placeholder="Select or type a unit"
          options={UNIT_SINGULAR_PRESETS}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        label={<span>Unit (plural form)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="unitPlural"
        rules={[{ required: true, message: 'Unit plural form is required' }]}
      >
        <Select
          placeholder="Select or type a unit"
          options={UNIT_PLURAL_PRESETS}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        label={<span>Context-specific unit (singular)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="unitContextSingular"
        rules={[{ required: true, message: 'Context-specific unit (singular) is required' }]}
      >
        <Select
          placeholder="Select or type a unit"
          options={UNIT_CONTEXT_SINGULAR_PRESETS}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        label={<span>Context-specific unit (plural)<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        name="unitContextPlural"
        rules={[{ required: true, message: 'Context-specific unit (plural) is required' }]}
      >
        <Select
          placeholder="Select or type a unit"
          options={UNIT_CONTEXT_PLURAL_PRESETS}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        label="Checklist"
        name="checklistId"
      >
        <Select
          placeholder="Select a checklist to associate with this variable"
          loading={loadingChecklists}
          allowClear
          options={checklists
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(c => ({
              value: c._id,
              label: c.name,
            }))}
        />
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
                    label={<span>Title<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
                    rules={[{ required: true, message: 'Title is required' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="e.g., RA 1234 - Law Name" />
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
