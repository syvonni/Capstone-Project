/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useEffect } from 'react'
import { Form, Input, Grid, Button, Typography, Select, Space, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import { getInspectionItems } from '@/features/admin/services/inspectionItemService'
import { getPostRequirements } from '@/features/admin/services/postRequirementService'

const { useBreakpoint } = Grid
const { Text } = Typography
const { TextArea } = Input

export default function ChecklistConfiguration({ form, handleFormValuesChange }) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [inspectionItems, setInspectionItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [postRequirements, setPostRequirements] = useState([])
  const [loadingPostRequirements, setLoadingPostRequirements] = useState(false)

  useEffect(() => {
    const fetchInspectionItems = async () => {
      setLoadingItems(true)
      try {
        const items = await getInspectionItems({ isActive: true })
        setInspectionItems((items || []).sort((a, b) => a.name.localeCompare(b.name)))
      } catch (error) {
        console.error('Failed to fetch inspection items:', error)
        message.error('Failed to load inspection items')
      } finally {
        setLoadingItems(false)
      }
    }
    fetchInspectionItems()
  }, [])

  useEffect(() => {
    const fetchPostRequirements = async () => {
      setLoadingPostRequirements(true)
      try {
        const items = await getPostRequirements({ isActive: true })
        setPostRequirements(items || [])
      } catch (error) {
        console.error('Failed to fetch post requirements:', error)
      } finally {
        setLoadingPostRequirements(false)
      }
    }
    fetchPostRequirements()
  }, [])

  const moveItem = (fromIndex, toIndex) => {
    const currentItems = form.getFieldValue('items') || []
    if (fromIndex < 0 || fromIndex >= currentItems.length || toIndex < 0 || toIndex >= currentItems.length) {
      return
    }
    const newItems = [...currentItems]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    form.setFieldsValue({ items: newItems })
    handleFormValuesChange({ items: newItems }, form.getFieldsValue())
  }

  const addItem = (inspectionItemId) => {
    const currentItems = form.getFieldValue('items') || []
    if (!currentItems.includes(inspectionItemId)) {
      form.setFieldsValue({ items: [...currentItems, inspectionItemId] })
      handleFormValuesChange({ items: [...currentItems, inspectionItemId] }, form.getFieldsValue())
    }
    setSelectedItem(null)
  }

  const removeItem = (index) => {
    const currentItems = form.getFieldValue('items') || []
    const newItems = currentItems.filter((_, i) => i !== index)
    form.setFieldsValue({ items: newItems })
    handleFormValuesChange({ items: newItems }, form.getFieldsValue())
  }

  const isMobile = !screens.lg

  const availableOptions = inspectionItems
    .filter(item => !(form.getFieldValue('items') || []).includes(item._id))
    .map(item => ({
      value: item._id,
      label: item.name,
      description: item.question,
    }))

  return (
    <Form form={form} layout="vertical" onValuesChange={handleFormValuesChange} requiredMark={false}>
      <Form.Item
        name="name"
        label={<span>Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        rules={[{ required: true, message: 'Please enter a name' }]}
      >
        <Input placeholder="Enter checklist name" />
      </Form.Item>
      
      <Form.Item
        name="description"
        label={<span>Description<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
        rules={[{ required: true, message: 'Please enter a description' }]}
      >
        <Input.TextArea rows={4} placeholder="Enter description" />
      </Form.Item>
      
      <Form.Item
        name="notes"
        label="Notes"
      >
        <Input.TextArea rows={3} placeholder="Enter additional notes" />
      </Form.Item>

      <Form.Item
        label="Associated Post Requirement"
        name="postRequirementId"
      >
        <Select
          placeholder="Select a post requirement to associate with this checklist"
          loading={loadingPostRequirements}
          allowClear
          options={postRequirements.map(pr => ({
            value: pr._id,
            label: pr.name,
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

      <Form.Item name="items" initialValue={[]} label="Inspection Items">
        <Select
          placeholder="Select inspection items to add..."
          options={availableOptions}
          value={selectedItem}
          onSelect={addItem}
          showSearch
          filterOption={(input, option) =>
            (option.label?.toLowerCase() ?? '').includes(input.toLowerCase()) ||
            (option.description?.toLowerCase() ?? '').includes(input.toLowerCase())
          }
          style={{ marginBottom: 8 }}
        />
        <div style={{ maxHeight: 400, overflowY: 'auto', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6, padding: 8 }}>
          {(form.getFieldValue('items') || []).map((itemId, index) => {
            const inspectionItem = inspectionItems.find(item => item._id === itemId)
            return (
              <div
                key={itemId}
                style={{
                  padding: 8,
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div>{inspectionItem?.name || 'Unknown Item'}</div>
                  <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{inspectionItem?.question || ''}</div>
                </div>
                <Space size="small">
                  <Button
                    type="text"
                    icon={<ArrowUpOutlined />}
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                    size="small"
                  />
                  <Button
                    type="text"
                    icon={<ArrowDownOutlined />}
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === (form.getFieldValue('items') || []).length - 1}
                    size="small"
                  />
                  <Button
                    type="text"
                    icon={<MinusCircleOutlined />}
                    onClick={() => removeItem(index)}
                    size="small"
                  />
                </Space>
              </div>
            )
          })}
          {(form.getFieldValue('items') || []).length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: token.colorTextSecondary }}>
              No inspection items selected
            </div>
          )}
        </div>
      </Form.Item>
    </Form>
  )
}
