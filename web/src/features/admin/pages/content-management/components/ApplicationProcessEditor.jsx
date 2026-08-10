import { useState, useEffect, useCallback } from 'react'
import {
  Card, Typography, Space, Button, Modal, Drawer, Input, Tag,
  Grid, Tooltip, App, Spin, Switch, Empty,
} from 'antd'
import {
  EditOutlined, PlusOutlined, MinusCircleOutlined, ArrowUpOutlined,
  ArrowDownOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DollarOutlined, FileTextOutlined, UserOutlined, SearchOutlined,
  SafetyOutlined, TrophyOutlined, CloudUploadOutlined, StopOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { get, put, post } from '@/lib/http.js'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

const ICON_OPTIONS = {
  UserOutlined: <UserOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
  DollarOutlined: <DollarOutlined />,
  SearchOutlined: <SearchOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  TrophyOutlined: <TrophyOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  CloudUploadOutlined: <CloudUploadOutlined />,
}

function getIconComponent(iconName) {
  return ICON_OPTIONS[iconName] || <FileTextOutlined />
}

function createEmptyStep(order) {
  return {
    stepId: `step-${Date.now()}-${order}`,
    title: '',
    description: '',
    icon: 'FileTextOutlined',
    optional: false,
    estimatedTime: '',
    estimatedCost: '',
    requirements: [],
    order,
  }
}

export default function ApplicationProcessEditor() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingProcess, setEditingProcess] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const fetchProcesses = useCallback(async () => {
    try {
      setLoading(true)
      const res = await get('/api/admin/application-processes')
      setProcesses(Array.isArray(res) ? res : [])
    } catch {
      message.error('Failed to load application processes')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => { fetchProcesses() }, [fetchProcesses])

  const handleEdit = (process) => {
    setEditingProcess(process)
    setEditForm({
      title: process.title || '',
      description: process.description || '',
      steps: [...(process.steps || [])],
      totalEstimatedTime: process.totalEstimatedTime || '',
      totalEstimatedCost: process.totalEstimatedCost || '',
    })
  }

  const handleClose = () => {
    setEditingProcess(null)
    setEditForm(null)
  }

  const handleSave = async () => {
    if (!editForm || !editingProcess) return

    // Basic validation
    if (!editForm.title.trim()) {
      message.error('Title is required')
      return
    }
    if (!editForm.description.trim()) {
      message.error('Description is required')
      return
    }
    for (let i = 0; i < editForm.steps.length; i++) {
      const step = editForm.steps[i]
      if (!step.title.trim()) {
        message.error(`Step ${i + 1} must have a title`)
        return
      }
      if (!step.description.trim()) {
        message.error(`Step ${i + 1} must have a description`)
        return
      }
    }

    try {
      setSaving(true)
      await put(`/api/admin/application-processes/${editingProcess._id}`, editForm)
      message.success('Application process updated')
      handleClose()
      await fetchProcesses()
    } catch (err) {
      message.error(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (process) => {
    try {
      await post(`/api/admin/application-processes/${process._id}/publish`)
      message.success('Application process published')
      await fetchProcesses()
    } catch (err) {
      message.error(err?.message || 'Failed to publish')
    }
  }

  const handleArchive = async (process) => {
    try {
      await post(`/api/admin/application-processes/${process._id}/archive`)
      message.success('Application process archived')
      await fetchProcesses()
    } catch (err) {
      message.error(err?.message || 'Failed to archive')
    }
  }

  const handleUnarchive = async (process) => {
    try {
      await post(`/api/admin/application-processes/${process._id}/unarchive`)
      message.success('Application process restored')
      await fetchProcesses()
    } catch (err) {
      message.error(err?.message || 'Failed to restore')
    }
  }

  // Step editing helpers
  const updateStep = (index, field, value) => {
    const newSteps = [...editForm.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setEditForm({ ...editForm, steps: newSteps })
  }

  const addStep = () => {
    const newStep = createEmptyStep(editForm.steps.length)
    setEditForm({ ...editForm, steps: [...editForm.steps, newStep] })
  }

  const removeStep = (index) => {
    const newSteps = editForm.steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i }))
    setEditForm({ ...editForm, steps: newSteps })
  }

  const moveStep = (fromIndex, toIndex) => {
    const steps = [...editForm.steps]
    const [moved] = steps.splice(fromIndex, 1)
    steps.splice(toIndex, 0, moved)
    setEditForm({ ...editForm, steps: steps.map((s, i) => ({ ...s, order: i })) })
  }

  const addRequirement = (stepIndex) => {
    const newSteps = [...editForm.steps]
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      requirements: [...(newSteps[stepIndex].requirements || []), ''],
    }
    setEditForm({ ...editForm, steps: newSteps })
  }

  const updateRequirement = (stepIndex, reqIndex, value) => {
    const newSteps = [...editForm.steps]
    const reqs = [...(newSteps[stepIndex].requirements || [])]
    reqs[reqIndex] = value
    newSteps[stepIndex] = { ...newSteps[stepIndex], requirements: reqs }
    setEditForm({ ...editForm, steps: newSteps })
  }

  const removeRequirement = (stepIndex, reqIndex) => {
    const newSteps = [...editForm.steps]
    const reqs = (newSteps[stepIndex].requirements || []).filter((_, i) => i !== reqIndex)
    newSteps[stepIndex] = { ...newSteps[stepIndex], requirements: reqs }
    setEditForm({ ...editForm, steps: newSteps })
  }

  // Status tag
  const getStatusTag = (status) => {
    const map = {
      draft: { color: 'default', text: 'Draft' },
      published: { color: 'success', text: 'Published' },
      archived: { color: 'warning', text: 'Archived' },
    }
    const s = map[status] || map.draft
    return <Tag color={s.color}>{s.text}</Tag>
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 48 }}>
        <Spin />
      </div>
    )
  }

  if (processes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Empty description="No application processes found. Run the seeder to create initial data." />
      </div>
    )
  }

  // Editor form content (used in both Modal and Drawer)
  const editorContent = editForm && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: isMobile ? 16 : 0 }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Title</Text>
        <Input
          value={editForm.title}
          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          placeholder="Application process title"
          maxLength={200}
        />
      </div>

      <div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Description</Text>
        <TextArea
          value={editForm.description}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          placeholder="Brief description of this application process"
          autoSize={{ minRows: 2, maxRows: 4 }}
          maxLength={1000}
        />
      </div>

      <Space size={16} wrap>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Total Estimated Time</Text>
          <Input
            value={editForm.totalEstimatedTime}
            onChange={(e) => setEditForm({ ...editForm, totalEstimatedTime: e.target.value })}
            placeholder="e.g., 7-12 business days"
            style={{ width: 200 }}
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Total Estimated Cost</Text>
          <Input
            value={editForm.totalEstimatedCost}
            onChange={(e) => setEditForm({ ...editForm, totalEstimatedCost: e.target.value })}
            placeholder="e.g., ₱2,000 - ₱15,000"
            style={{ width: 200 }}
          />
        </div>
      </Space>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong>Processing Steps ({editForm.steps.length})</Text>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addStep} size="small">
            Add Step
          </Button>
        </div>

        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {editForm.steps.map((step, index) => (
            <Card
              key={step.stepId}
              size="small"
              style={{ background: '#fafafa' }}
              title={
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Step {index + 1}</Text>
                  {step.optional && <Tag color="orange" style={{ fontSize: 10 }}>Optional</Tag>}
                </Space>
              }
              extra={
                <Space size={4}>
                  <Tooltip title="Move up">
                    <Button
                      type="text" size="small" icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => moveStep(index, index - 1)}
                    />
                  </Tooltip>
                  <Tooltip title="Move down">
                    <Button
                      type="text" size="small" icon={<ArrowDownOutlined />}
                      disabled={index === editForm.steps.length - 1}
                      onClick={() => moveStep(index, index + 1)}
                    />
                  </Tooltip>
                  <Tooltip title="Remove step">
                    <Button
                      type="text" danger size="small" icon={<MinusCircleOutlined />}
                      onClick={() => removeStep(index)}
                    />
                  </Tooltip>
                </Space>
              }
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                  placeholder="Step title"
                  addonBefore="Title"
                />
                <TextArea
                  value={step.description}
                  onChange={(e) => updateStep(index, 'description', e.target.value)}
                  placeholder="Step description"
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  maxLength={500}
                />
                <Space size={8} wrap>
                  <Input
                    value={step.estimatedTime}
                    onChange={(e) => updateStep(index, 'estimatedTime', e.target.value)}
                    placeholder="e.g., 1-2 days"
                    style={{ width: 160 }}
                    prefix={<ClockCircleOutlined style={{ color: '#999' }} />}
                  />
                  <Input
                    value={step.estimatedCost}
                    onChange={(e) => updateStep(index, 'estimatedCost', e.target.value)}
                    placeholder="e.g., ₱500"
                    style={{ width: 160 }}
                    prefix={<DollarOutlined style={{ color: '#999' }} />}
                  />
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Optional:</Text>
                    <Switch
                      size="small"
                      checked={step.optional}
                      onChange={(val) => updateStep(index, 'optional', val)}
                    />
                  </Space>
                </Space>

                {/* Requirements */}
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Requirements ({(step.requirements || []).length})
                  </Text>
                  {(step.requirements || []).map((req, reqIdx) => (
                    <div key={reqIdx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <Input
                        value={req}
                        onChange={(e) => updateRequirement(index, reqIdx, e.target.value)}
                        placeholder={`Requirement ${reqIdx + 1}`}
                        size="small"
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="text" danger size="small" icon={<MinusCircleOutlined />}
                        onClick={() => removeRequirement(index, reqIdx)}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed" size="small" icon={<PlusOutlined />}
                    onClick={() => addRequirement(index)}
                    block
                  >
                    Add Requirement
                  </Button>
                </div>
              </Space>
            </Card>
          ))}
        </Space>
      </div>
    </div>
  )

  // Process cards
  return (
    <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Application Processes</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Configure the process steps, fees, and time estimates shown on the public landing page.
        </Text>
      </div>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {processes.map((process) => (
          <Card
            key={process._id}
            size="small"
            hoverable
            onClick={() => handleEdit(process)}
            style={{ cursor: 'pointer' }}
            title={
              <Space>
                {getIconComponent(process.steps?.[0]?.icon)}
                <Text strong>{process.title}</Text>
                {getStatusTag(process.status)}
              </Space>
            }
            extra={
              <Space size={4} onClick={(e) => e.stopPropagation()}>
                {process.status === 'draft' && (
                  <Tooltip title="Publish">
                    <Button type="text" size="small" icon={<CheckCircleOutlined />} onClick={() => handlePublish(process)} />
                  </Tooltip>
                )}
                {process.status === 'published' && (
                  <Tooltip title="Archive">
                    <Button type="text" size="small" icon={<StopOutlined />} onClick={() => handleArchive(process)} />
                  </Tooltip>
                )}
                {process.status === 'archived' && (
                  <Tooltip title="Restore">
                    <Button type="text" size="small" icon={<UndoOutlined />} onClick={() => handleUnarchive(process)} />
                  </Tooltip>
                )}
                <Tooltip title="Edit">
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(process)} />
                </Tooltip>
              </Space>
            }
          >
            <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 12, marginBottom: 8 }}>
              {process.description}
            </Paragraph>
            <Space size={16} wrap>
              <Text style={{ fontSize: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {process.totalEstimatedTime || 'Not set'}
              </Text>
              <Text style={{ fontSize: 12 }}>
                <DollarOutlined style={{ marginRight: 4 }} />
                {process.totalEstimatedCost || 'Not set'}
              </Text>
              <Text style={{ fontSize: 12 }}>
                {process.steps?.length || 0} steps
              </Text>
            </Space>
          </Card>
        ))}
      </Space>

      {/* Edit Modal (desktop) / Drawer (mobile) */}
      {isMobile ? (
        <Drawer
          open={!!editingProcess}
          onClose={handleClose}
          title={`Edit: ${editingProcess?.title || ''}`}
          placement="bottom"
          size="100%"
          extra={
            <Space>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
            </Space>
          }
          styles={{ body: { overflow: 'auto' } }}
        >
          {editorContent}
        </Drawer>
      ) : (
        <Modal
          open={!!editingProcess}
          onCancel={handleClose}
          title={`Edit: ${editingProcess?.title || ''}`}
          width={800}
          footer={[
            <Button key="cancel" onClick={handleClose}>Cancel</Button>,
            <Button key="save" type="primary" onClick={handleSave} loading={saving}>Save</Button>,
          ]}
          styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
        >
          {editorContent}
        </Modal>
      )}
    </div>
  )
}
