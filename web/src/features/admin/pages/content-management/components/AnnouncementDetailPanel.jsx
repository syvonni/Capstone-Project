import { useState, useEffect } from 'react'
import { Form, Input, Select, DatePicker, Typography, Tabs, Table } from 'antd'
import { UndoOutlined, RedoOutlined, RollbackOutlined, SaveOutlined, SendOutlined, DeleteOutlined, FileTextOutlined, StarOutlined, StarFilled, HistoryOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import DetailHeader from '@/shared/components/DetailHeader'
import { ANNOUNCEMENT_PRIORITY_SELECT_OPTIONS } from '../constants/announcements.constants'

const { TextArea } = Input
const { Text } = Typography

export default function AnnouncementDetailPanel({
  selected,
  saving,
  onSave,
  onDelete,
  onUnpublish,
  form: externalForm,
  onFillTestData,
  undoRedo,
  onPreview,
  onFormChange,
  auditLogs = [],
  auditLogsLoading = false,
  isBookmarked = false,
  onBookmarkToggle,
  onHistoryClick,
  manualSlotId,
  instructionSlotId,
}) {
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('details')
  const actualForm = externalForm || form

  useEffect(() => {
    if (selected) {
      actualForm.setFieldsValue({
        title: selected.title || '',
        body: selected.body || '',
        priority: selected.priority || 'normal',
        isActive: selected.isActive !== false,
        publishAt: selected.publishAt ? dayjs(selected.publishAt) : null,
        expiresAt: selected.expiresAt ? dayjs(selected.expiresAt) : null,
      })
    }
  }, [selected, actualForm])

  const handleSave = async (publish = false) => {
    try {
      const values = await actualForm.validateFields()
      await onSave(selected._id, values, publish)
    } catch {
      // Validation error
    }
  }

  const undoRedoButtons = undoRedo ? [
    { icon: <UndoOutlined />, onClick: undoRedo.undo, disabled: !undoRedo.canUndo, title: 'Undo' },
    { icon: <RedoOutlined />, onClick: undoRedo.redo, disabled: !undoRedo.canRedo, title: 'Redo' },
    { icon: <RollbackOutlined />, onClick: undoRedo.resetHistory, title: 'Revert All' },
  ] : []

  const iconButtons = [
    ...(onBookmarkToggle ? [{
      icon: isBookmarked ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />,
      onClick: onBookmarkToggle,
      title: isBookmarked ? 'Remove Bookmark' : 'Add Bookmark',
    }] : []),
    ...(onHistoryClick ? [{
      icon: <HistoryOutlined />,
      onClick: onHistoryClick,
      title: 'History',
    }] : []),
  ]

  const actionButtons = []
  if (selected?.status === 'draft') {
    if (onFillTestData) {
      actionButtons.push({
        text: 'Fill with test data',
        icon: <FileTextOutlined />,
        onClick: onFillTestData,
      })
    }
    actionButtons.push(
      {
        text: 'Save Draft',
        icon: <SaveOutlined />,
        onClick: () => handleSave(false),
        loading: saving,
      },
      {
        text: 'Delete',
        icon: <DeleteOutlined />,
        onClick: () => onDelete(selected._id),
        danger: true,
      }
    )
  }

  if (onPreview) {
    actionButtons.push({
      text: 'Preview',
      icon: <FileTextOutlined />,
      onClick: onPreview,
    })
  }

  const primaryButton = selected?.status === 'draft' ? {
    text: 'Publish',
    icon: <SendOutlined />,
    onClick: () => handleSave(true),
    loading: saving,
  } : selected?.status === 'published' ? {
    text: 'Unpublish',
    icon: <RollbackOutlined />,
    onClick: () => onUnpublish && onUnpublish(selected._id),
    loading: saving,
  } : null

  if (!selected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Text type="secondary">Select an announcement to edit</Text>
      </div>
    )
  }

  const auditColumns = [
    { title: 'Action', dataIndex: 'action', key: 'action' },
    { title: 'User', dataIndex: 'userId', key: 'userId' },
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', render: (ts) => dayjs(ts).format('MMM D, HH:mm') },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DetailHeader
        primaryButton={primaryButton}
        iconButtons={iconButtons}
        undoRedoButtons={undoRedoButtons}
        actionButtons={actionButtons}
        manualSlotId={manualSlotId}
        instructionSlotId={instructionSlotId}
      />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ flexShrink: 0 }}
          items={[
            {
              key: 'details',
              label: 'Details',
              children: (
                <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
                  <Form
                    form={actualForm}
                    layout="vertical"
                    onValuesChange={onFormChange}
                  >
                    <Form.Item
                      name="title"
                      label="Title"
                      rules={[{ required: true, message: 'Title is required' }]}
                    >
                      <Input placeholder="Announcement title" disabled={selected.status === 'published'} />
                    </Form.Item>
                    <Form.Item
                      name="body"
                      label="Content"
                      rules={[{ required: true, message: 'Content is required' }]}
                    >
                      <TextArea
                        rows={8}
                        placeholder="Announcement content. Include detailed information, deadlines, and instructions."
                        disabled={selected.status === 'published'}
                      />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                      <Form.Item name="priority" label="Priority">
                        <Select
                          disabled={selected.status === 'published'}
                          options={ANNOUNCEMENT_PRIORITY_SELECT_OPTIONS}
                          placeholder="Select priority level"
                        />
                      </Form.Item>
                      <Form.Item name="publishAt" label="Publish At">
                        <DatePicker
                          showTime
                          style={{ width: '100%' }}
                          disabled={selected.status === 'published'}
                          placeholder="Optional: schedule for future"
                        />
                      </Form.Item>
                      <Form.Item name="expiresAt" label="Expires At" style={{ gridColumn: 'span 2' }}>
                        <DatePicker
                          style={{ width: '100%' }}
                          disabled={selected.status === 'published'}
                          placeholder="Optional: auto-hide after this date"
                        />
                      </Form.Item>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: 'history',
              label: 'History',
              children: (
                <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
                  <Table
                    columns={auditColumns}
                    dataSource={auditLogs}
                    loading={auditLogsLoading}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
