import { Input, Button, Typography, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { createId, slugifyLabelToKey } from '../utils'
import SelectWithAddon from '../SelectWithAddon'

const { Text } = Typography

export default function RepeatableGroupConfig({ field, onUpdate, token }) {
  const handleAddColumn = () => {
    const newGf = {
      id: createId(),
      label: '',
      type: 'text',
      key: '',
      required: true,
      placeholder: '',
      helpText: '',
      span: 8,
      validation: {},
      dropdownSource: 'static',
      dropdownOptions: [],
    }
    onUpdate({ ...field, groupFields: [...(field.groupFields || []), newGf] })
  }

  const handleUpdateColumn = (gfIdx, updates) => {
    const updated = [...field.groupFields]
    const currentColumn = updated[gfIdx]
    
    // Auto-generate key from label when label changes
    if (updates.label) {
      updates.key = `group_${slugifyLabelToKey(updates.label)}`
    }
    
    updated[gfIdx] = { ...currentColumn, ...updates }
    onUpdate({ ...field, groupFields: updated })
  }

  const handleRemoveColumn = (gfIdx) => {
    const updated = field.groupFields.filter((_, i) => i !== gfIdx)
    onUpdate({ ...field, groupFields: updated })
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Input
            addonBefore="Min"
            type="number"
            value={field.minRows ?? 1}
            onChange={(e) => onUpdate({ ...field, minRows: Number(e.target.value) || 0 })}
            min={0}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            addonBefore="Max"
            type="number"
            value={field.maxRows ?? 20}
            onChange={(e) => onUpdate({ ...field, maxRows: Number(e.target.value) || 20 })}
            min={1}
          />
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text>Columns (sub-fields per row)</Text>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddColumn}
          >
            Add column
          </Button>
        </div>
        {(field.groupFields || []).length === 0 && (
          <Text style={{ display: 'block', textAlign: 'center', padding: '8px 0' }}>
            No columns defined yet. Add a column above.
          </Text>
        )}
        {(field.groupFields || []).map((gf, gfIdx) => (
          <div
            key={gf.id || gfIdx}
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadius,
              padding: '8px 10px',
              marginBottom: 6,
              background: token.colorFillQuaternary,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Input
                addonBefore="Label"
                value={gf.label}
                onChange={(e) => {
                  const value = e.target.value.trim()
                  if (value) {
                    handleUpdateColumn(gfIdx, { label: value })
                  }
                }}
                style={{ flex: 1 }}
                required
              />
              <SelectWithAddon
                addonBefore="Type"
                value={gf.type}
                onChange={(val) => handleUpdateColumn(gfIdx, { 
                  type: val, 
                  dropdownOptions: val === 'select' || val === 'multiselect' ? gf.dropdownOptions : [] 
                })}
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'number', label: 'Number' },
                  { value: 'date', label: 'Date' },
                  { value: 'select', label: 'Dropdown' },
                  { value: 'multiselect', label: 'Multi-select' },
                ]}
                style={{ width: 120 }}
                popupMatchSelectWidth={false}
              />
              <SelectWithAddon
                addonBefore="Required"
                value={gf.required ? 'yes' : 'no'}
                onChange={(value) => handleUpdateColumn(gfIdx, { required: value === 'yes' })}
                style={{ width: 100 }}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
              />
              <Popconfirm
                title="Remove this column?"
                onConfirm={() => handleRemoveColumn(gfIdx)}
                okText="Remove Column"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Input
                addonBefore="Placeholder"
                value={gf.placeholder}
                onChange={(e) => handleUpdateColumn(gfIdx, { placeholder: e.target.value })}
                style={{ flex: 1, minWidth: 120 }}
              />
            </div>
            {(gf.type === 'select' || gf.type === 'multiselect') && (
              <div style={{ marginTop: 6 }}>
                <Input
                  addonBefore="Options"
                  value={(gf.dropdownOptions || []).join(', ')}
                  onChange={(e) => {
                    const opts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    handleUpdateColumn(gfIdx, { dropdownOptions: opts })
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
