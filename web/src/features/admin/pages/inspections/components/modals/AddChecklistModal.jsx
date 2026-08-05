/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useEffect } from 'react'
import { Modal, Form, Input, Grid, Button, Typography, Select, Space, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { createChecklist } from '@/features/admin/services/checklistService'
import { getInspectionItems } from '@/features/admin/services/inspectionItemService'

const { useBreakpoint } = Grid
const { Text } = Typography
const { TextArea } = Input

export default function AddChecklistModal({ open, onClose, onSuccess }) {
  const screens = useBreakpoint()
  const [loading, setLoading] = useState(false)
  const [inspectionItems, setInspectionItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    const fetchInspectionItems = async () => {
      setLoading(true)
      try {
        const items = await getInspectionItems({ isActive: true })
        setInspectionItems(items || [])
      } catch (error) {
        console.error('Failed to fetch inspection items:', error)
        message.error('Failed to load inspection items')
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      fetchInspectionItems()
    }
  }, [open])

  const moveItem = (fromIndex, toIndex) => {
    const currentItems = form.getFieldValue('items') || []
    if (fromIndex < 0 || fromIndex >= currentItems.length || toIndex < 0 || toIndex >= currentItems.length) {
      return
    }
    const newItems = [...currentItems]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    form.setFieldsValue({ items: newItems })
  }

  const addItem = (inspectionItemId) => {
    const currentItems = form.getFieldValue('items') || []
    if (!currentItems.includes(inspectionItemId)) {
      form.setFieldsValue({ items: [...currentItems, inspectionItemId] })
    }
    setSelectedItem(null)
  }

  const removeItem = (index) => {
    const currentItems = form.getFieldValue('items') || []
    const newItems = currentItems.filter((_, i) => i !== index)
    form.setFieldsValue({ items: newItems })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      // Transform items array to match backend format with order based on array index
      const transformedValues = {
        ...values,
        items: (values.items || []).map((inspectionItemId, index) => ({
          inspectionItemId,
          order: index + 1
        }))
      }
      
      await createChecklist(transformedValues)
      message.success('Checklist created successfully')
      form.resetFields()
      onSuccess()
    } catch (error) {
      console.error('Failed to create checklist:', error)
      message.error('Failed to create checklist')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.resetFields()
    setSelectedItem(null)
    onClose()
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
    <Modal
      title="Add Checklist"
      open={open}
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={loading}
      width={isMobile ? '100%' : 700}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter a name' }]}
        >
          <Input placeholder="Enter checklist name" />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="Description"
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
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    background: '#fff',
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
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
            {(form.getFieldValue('items') || []).map((itemId, index) => {
              const inspectionItem = inspectionItems.find(item => item._id === itemId)
              return (
                <div
                  key={itemId}
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #d9d9d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div>{inspectionItem?.name || 'Unknown Item'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{inspectionItem?.question || ''}</div>
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
              <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                No inspection items selected
              </div>
            )}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}
