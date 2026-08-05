import { useState } from 'react'
import { Input, Button, Typography, theme, Space, Popconfirm, Grid } from 'antd'
import { PlusOutlined, SettingOutlined, UpOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons'
import MetadataFieldsEditor from './MetadataFieldsEditor'
import { slugifyLabelToKey } from './utils'

const { Text } = Typography

export default function DropdownOptionsEditor({ field, onUpdate, showMetadataFields = true }) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const [expandedOption, setExpandedOption] = useState(null)

  const handleAddOption = () => {
    const newOptions = [...(field.dropdownOptions || []), { id: '', label: '', definition: '', whereToGet: '' }]
    onUpdate({ ...field, dropdownOptions: newOptions })
  }

  const handleRemoveOption = (idx) => {
    const newOptions = (field.dropdownOptions || []).filter((_, i) => i !== idx)
    onUpdate({ ...field, dropdownOptions: newOptions })
  }

  const handleMoveOption = (idx, dir) => {
    const newOptions = [...(field.dropdownOptions || [])]
    const target = idx + dir
    if (target < 0 || target >= newOptions.length) return
    ;[newOptions[idx], newOptions[target]] = [newOptions[target], newOptions[idx]]
    onUpdate({ ...field, dropdownOptions: newOptions })
  }

  const handleUpdateOption = (idx, updates) => {
    const newOptions = [...(field.dropdownOptions || [])]
    const option = newOptions[idx]
    const isObject = typeof option === 'object'
    
    // Auto-generate id from label when label changes (only if id is empty)
    if (updates.label && isObject && (!option.id || option.id === '')) {
      updates.id = slugifyLabelToKey(updates.label)
    }
    
    if (isObject) {
      newOptions[idx] = { ...option, ...updates }
    } else {
      newOptions[idx] = { id: option, label: option, definition: '', whereToGet: '', ...updates }
    }
    onUpdate({ ...field, dropdownOptions: newOptions })
  }

  const handleUpdateOptionMetadata = (idx, metadataFields) => {
    const newOptions = [...(field.dropdownOptions || [])]
    const option = newOptions[idx]
    const isObject = typeof option === 'object'
    
    if (isObject) {
      newOptions[idx] = { ...option, metadataFields }
    } else {
      newOptions[idx] = { id: option, label: option, definition: '', whereToGet: '', metadataFields }
    }
    onUpdate({ ...field, dropdownOptions: newOptions })
  }

  return (
    <div>
      <Text style={{ display: 'block', marginBottom: 4 }}>
        Category Options
      </Text>
      <div style={{ marginBottom: 8 }}>
        {(field.dropdownOptions || []).map((option, idx) => {
          const isObject = typeof option === 'object'
          const label = isObject ? option.label : option
          const definition = isObject ? option.definition : ''
          const whereToGet = isObject ? option.whereToGet : ''
          const isExpanded = expandedOption === idx
          const isFirst = idx === 0
          const isLast = idx === (field.dropdownOptions || []).length - 1
          
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, padding: 12, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius }}>
              {/* Compact row with inputs and controls */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  addonBefore={<span>Label <span style={{ color: token.colorError }}>*</span></span>}
                  placeholder="Label"
                  value={label}
                  onChange={(e) => handleUpdateOption(idx, { label: e.target.value })}
                  style={{ flex: 1 }}
                />
                <Space.Compact size={4}>
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => setExpandedOption(isExpanded ? null : idx)}
                    style={{ color: isExpanded ? token.colorPrimary : undefined }}
                  />
                  <Button icon={<UpOutlined />} disabled={isFirst} onClick={() => handleMoveOption(idx, -1)} />
                  <Button icon={<DownOutlined />} disabled={isLast} onClick={() => handleMoveOption(idx, 1)} />
                  <Popconfirm title="Delete this option?" onConfirm={() => handleRemoveOption(idx)} okText="Delete" okButtonProps={{ danger: true }}>
                    <Button icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space.Compact>
              </div>
              
              {/* Expanded details */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                  {screens.lg ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        addonBefore="Definition"
                        placeholder="e.g. A business owned and operated by a single individual"
                        value={definition}
                        onChange={(e) => handleUpdateOption(idx, { definition: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      <Input
                        addonBefore="Where to Get"
                        placeholder="e.g. City Engineering Office or Building Official"
                        value={whereToGet}
                        onChange={(e) => handleUpdateOption(idx, { whereToGet: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                  ) : (
                    <>
                      <Input
                        addonBefore="Definition"
                        placeholder="e.g. A business owned and operated by a single individual"
                        value={definition}
                        onChange={(e) => handleUpdateOption(idx, { definition: e.target.value })}
                      />
                      <Input
                        addonBefore="Where to Get"
                        placeholder="e.g. City Engineering Office or Building Official"
                        value={whereToGet}
                        onChange={(e) => handleUpdateOption(idx, { whereToGet: e.target.value })}
                      />
                    </>
                  )}
                  {showMetadataFields && (
                    <div style={{ marginTop: 8 }}>
                      <MetadataFieldsEditor
                        field={option}
                        onUpdate={(updatedOption) => handleUpdateOptionMetadata(idx, updatedOption.metadataFields)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddOption}
        style={{ width: '100%' }}
      >
        Add Option
      </Button>
    </div>
  )
}
