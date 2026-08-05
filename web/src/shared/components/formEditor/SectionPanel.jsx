import { Button, Input, Collapse, Typography, Space, Popconfirm } from 'antd'
import { PlusOutlined, UpOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons'
import { createFieldWithDefaults } from './utils'
import FieldRow from './FieldRow'

const { Text } = Typography

export default function SectionPanel({ section, sectionIndex, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, token, isMobile, definitionId, readOnly }) {
  const items = section.items || []

  const updateItem = (idx, updatedItem) => {
    const newItems = [...items]
    newItems[idx] = updatedItem
    onUpdate({ ...section, items: newItems })
  }

  const deleteItem = (idx) => {
    const newItems = items.filter((_, i) => i !== idx)
    onUpdate({ ...section, items: newItems })
  }

  const moveItem = (idx, dir) => {
    const newItems = [...items]
    const target = idx + dir
    if (target < 0 || target >= newItems.length) return
    ;[newItems[idx], newItems[target]] = [newItems[target], newItems[idx]]
    onUpdate({ ...section, items: newItems })
  }

  const addItem = () => {
    const newItem = createFieldWithDefaults('text')
    onUpdate({ ...section, items: [...items, newItem] })
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      <Text>Section {sectionIndex + 1}</Text>
    </div>
  )

  const extra = readOnly ? null : (
    <Space.Compact size={4} onClick={(e) => e.stopPropagation()}>
      <Button icon={<UpOutlined />} disabled={isFirst} onClick={onMoveUp} />
      <Button icon={<DownOutlined />} disabled={isLast} onClick={onMoveDown} />
      {section.type !== 'lob_section' && (
        <Popconfirm title="Delete this section and all its fields?" onConfirm={onDelete} okText="Delete Section" okButtonProps={{ danger: true }}>
          <Button icon={<DeleteOutlined />} />
        </Popconfirm>
      )}
    </Space.Compact>
  )

  return (
    <>
      <style>{`
        .section-panel-collapse .ant-collapse-header {
          align-items: center !important;
        }
      `}</style>
      <Collapse
        defaultActiveKey={['content']}
        style={{ marginBottom: 12, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` }}
        expandIconPosition="start"
        className="section-panel-collapse"
        items={[
        {
          key: 'content',
          label: header,
          extra,
          children: (
            <div>
              {/* Section metadata */}
              {readOnly ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: section.description || section.notes ? 8 : 0 }}>
                    <div style={{ flex: 1 }}>
                      <Text>Section Name <span style={{ color: token.colorError }}>*</span></Text>
                      <div style={{ marginTop: 4 }}>{section.sectionName || '(unnamed)'}</div>
                    </div>
                  </div>
                  {section.description && (
                    <div style={{ marginBottom: section.notes ? 8 : 0 }}>
                      <Text>Section Description <span style={{ color: token.colorError }}>*</span></Text>
                      <div style={{ marginTop: 4 }}>{section.description}</div>
                    </div>
                  )}
                  {section.notes && (
                    <div>
                      <Text>Section Notes</Text>
                      <div style={{ marginTop: 4 }}>{section.notes}</div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Text>Section Name <span style={{ color: token.colorError }}>*</span></Text>
                      <Input
                        value={section.sectionName}
                        onChange={(e) => onUpdate({ ...section, sectionName: e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text>Section Notes</Text>
                      <Input.TextArea
                        value={section.notes}
                        onChange={(e) => onUpdate({ ...section, notes: e.target.value })}
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text>Section Description <span style={{ color: token.colorError }}>*</span></Text>
                    <Input.TextArea
                      value={section.description}
                      onChange={(e) => onUpdate({ ...section, description: e.target.value })}
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </>
              )}

              {/* Fields */}
              {items.length > 0 && (
                <Text style={{ display: 'block', marginBottom: 8 }}>Fields</Text>
              )}
              {items.length === 0 && (
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0', fontSize: 13 }}>
                  {section.type === 'lob_section' ? 'This section uses a specialized interface and cannot have fields added through the regular editor.' : readOnly ? 'No fields in this section.' : 'No fields yet. Add a field below.'}
                </Text>
              )}
              {items.map((item, idx) => (
                <FieldRow
                  key={item.id}
                  field={item}
                  onUpdate={(updated) => updateItem(idx, updated)}
                  onDelete={() => deleteItem(idx)}
                  onMoveUp={() => moveItem(idx, -1)}
                  onMoveDown={() => moveItem(idx, 1)}
                  isFirst={idx === 0}
                  isLast={idx === items.length - 1}
                  token={token}
                  isMobile={isMobile}
                  definitionId={definitionId}
                  readOnly={readOnly || section.type === 'lob_section'}
                />
              ))}

              {!readOnly && section.type !== 'lob_section' && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addItem()}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  Add field
                </Button>
              )}
            </div>
          ),
        },
      ]}
    />
    </>
  )
}
