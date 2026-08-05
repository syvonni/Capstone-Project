import { useEffect, useState } from 'react'
import { Form, Input, Button, Typography, message, theme, Space, Tooltip, Card, Grid, Tag, Dropdown } from 'antd'
import { SaveOutlined, PlusOutlined, MinusCircleOutlined, HistoryOutlined, UndoOutlined, RedoOutlined, RollbackOutlined, MoreOutlined } from '@ant-design/icons'
import AuditHistoryModal from '@/shared/components/AuditHistoryModal'
import CmsAuditDetailPanel from './CmsAuditDetailPanel'
import useCmsUndoRedo from '../hooks/useCmsUndoRedo'
import useCmsAutosave from '../hooks/useCmsAutosave'
import { useCmsAudit } from '../hooks/useCmsAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { TextArea } = Input
const { Text, Title } = Typography
const { useBreakpoint } = Grid

export default function InstructionEditor({ selected, onSave }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [auditModalOpen, setAuditModalOpen] = useState(false)

  const { audits } = useCmsAudit(selected?._id)

  const initialData = {
    description: selected?.description || '',
    bulletPoints: selected?.bulletPoints || [],
    faqItems: selected?.faqItems || [],
  }

  const { data, updateData, undo, redo, resetHistory, canUndo, canRedo } = useCmsUndoRedo(initialData)

  const hasChanges = JSON.stringify(data) !== JSON.stringify(initialData)

  let statusTag = null
  if (saving) {
    statusTag = <Tag>Saving...</Tag>
  } else if (hasChanges) {
    statusTag = <Tag color="warning">Unsaved changes</Tag>
  } else {
    statusTag = <Tag color="success">Published</Tag>
  }

  const handleAutosave = async (formData) => {
    try {
      await onSave(selected.slotId, formData, false) // false = draft save
    } catch (err) {
      console.error('Autosave failed:', err)
    }
  }

  useCmsAutosave(data, handleAutosave, !!selected)

  useEffect(() => {
    if (selected) {
      const formData = {
        description: selected.description || '',
        bulletPoints: selected.bulletPoints || [],
        faqItems: selected.faqItems || [],
      }
      form.setFieldsValue(formData)
      resetHistory(formData)
    }
  }, [selected, form, resetHistory])

  const handlePublish = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      await onSave(selected.slotId, values, true) // true = publish
      message.success('Instruction content published')
      // Reset history after successful publish
      resetHistory(values)
    } catch (err) {
      message.error(err?.message || 'Failed to publish instruction content')
    } finally {
      setSaving(false)
    }
  }

  const handleRevert = async () => {
    try {
      setSaving(true)
      const originalData = {
        description: selected.description || '',
        bulletPoints: selected.bulletPoints || [],
        faqItems: selected.faqItems || [],
      }
      form.setFieldsValue(originalData)
      resetHistory(originalData)
      await onSave(selected.slotId, originalData)
      message.success('Reverted to last saved version')
    } catch {
      message.error('Failed to revert')
    } finally {
      setSaving(false)
    }
  }

  const handleFormChange = () => {
    const values = form.getFieldsValue()
    updateData(values)
  }

  if (!selected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Text type="secondary">Select an instruction slot to edit</Text>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: token.colorBgContainer }}>
      <div
        style={{
          padding: 16,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        {/* First row: title, status tag, last updated */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>
            {selected.slotId}
          </Title>
          <div style={{ marginLeft: 8 }}>
            {statusTag}
          </div>
          {selected.updatedAt && (
            <Tag>
              Updated {dayjs(selected.updatedAt).fromNow()}
            </Tag>
          )}
        </div>

        {/* Second row: buttons separated into two groups */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Tooltip title="View audit history">
              <Button icon={<HistoryOutlined />} onClick={() => setAuditModalOpen(true)}>
                History
              </Button>
            </Tooltip>
            {isMobile ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'undo',
                      label: 'Undo',
                      icon: <UndoOutlined />,
                      onClick: undo,
                      disabled: !canUndo,
                    },
                    {
                      key: 'redo',
                      label: 'Redo',
                      icon: <RedoOutlined />,
                      onClick: redo,
                      disabled: !canRedo,
                    },
                    {
                      key: 'revert',
                      label: 'Revert All',
                      icon: <RollbackOutlined />,
                      onClick: handleRevert,
                      disabled: !hasChanges,
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            ) : (
              <>
                <Tooltip title="Undo last change">
                  <Button icon={<UndoOutlined />} onClick={undo} disabled={!canUndo}>
                    Undo
                  </Button>
                </Tooltip>
                <Tooltip title="Redo last undone change">
                  <Button icon={<RedoOutlined />} onClick={redo} disabled={!canRedo}>
                    Redo
                  </Button>
                </Tooltip>
                <Tooltip title="Revert all changes to last saved version">
                  <Button icon={<RollbackOutlined />} onClick={handleRevert} loading={saving} disabled={!hasChanges}>
                    Revert All
                  </Button>
                </Tooltip>
              </>
            )}
          </Space>
          <Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={handlePublish} loading={saving}>
              Publish
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, padding: 16 }}>
        <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Main description text" />
          </Form.Item>

          <Form.List name="bulletPoints">
            {(fields, { add, remove }) => (
              <Card size="small" style={{ marginBottom: 24, background: token.colorBgLayout }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text strong>What can you do?</Text>
                </div>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {fields.map(({ key, name }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                      <Text type="secondary" style={{ lineHeight: '32px', minWidth: 20, textAlign: 'right', flexShrink: 0 }}>
                        {name + 1}.
                      </Text>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Form.Item name={[name, 'title']} rules={[{ required: true, message: 'Title is required' }]} style={{ marginBottom: 4 }}>
                          <Input placeholder="Action title" />
                        </Form.Item>
                        <Form.Item name={[name, 'content']} rules={[{ required: true, message: 'Content is required' }]} style={{ marginBottom: 0 }}>
                          <TextArea rows={2} placeholder="Action description" />
                        </Form.Item>
                      </div>
                      <Tooltip title="Remove this action">
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          style={{ flexShrink: 0 }}
                        />
                      </Tooltip>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <Text type="secondary" italic style={{ fontSize: 12 }}>
                      No actions added yet. Click &quot;Add Action&quot; to add one.
                    </Text>
                  )}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ title: '', content: '' })}
                    block
                  >
                    Add Action
                  </Button>
                </Space>
              </Card>
            )}
          </Form.List>

          <Form.List name="faqItems">
            {(fields, { add, remove }) => (
              <Card size="small" style={{ background: token.colorBgLayout }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text strong>FAQ Items (embedded in this instruction)</Text>
                </div>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {fields.map(({ key, name }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                      <Text type="secondary" style={{ lineHeight: '32px', minWidth: 20, textAlign: 'right', flexShrink: 0 }}>
                        {name + 1}.
                      </Text>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Form.Item name={[name, 'key']} hidden>
                          <Input />
                        </Form.Item>
                        <Form.Item name={[name, 'question']} rules={[{ required: true, message: 'Question is required' }]} style={{ marginBottom: 4 }}>
                          <Input placeholder="Question" />
                        </Form.Item>
                        <Form.Item name={[name, 'answer']} rules={[{ required: true, message: 'Answer is required' }]} style={{ marginBottom: 0 }}>
                          <TextArea rows={3} placeholder="Answer" />
                        </Form.Item>
                      </div>
                      <Tooltip title="Remove this FAQ">
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          style={{ flexShrink: 0 }}
                        />
                      </Tooltip>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <Text type="secondary" italic style={{ fontSize: 12 }}>
                      No FAQ items added yet. Click &quot;Add FAQ&quot; to add one.
                    </Text>
                  )}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ key: `faq-${Date.now()}`, question: '', answer: '' })}
                    block
                  >
                    Add FAQ
                  </Button>
                </Space>
              </Card>
            )}
          </Form.List>
        </Form>
      </div>

      <AuditHistoryModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        auditLogs={audits}
        loading={false}
        DetailPanelComponent={CmsAuditDetailPanel}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('faq') || e.event.startsWith('instruction'))}
      />
    </div>
  )
}
