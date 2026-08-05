import { Input, Button, Typography, theme } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import SelectWithAddon from './SelectWithAddon'
import { generateUniqueKey } from './utils'

const { Text } = Typography

export default function MetadataFieldsEditor({ field, onUpdate, label = 'Metadata Fields' }) {
  const { token } = theme.useToken()
  const handleAddField = () => {
    const newMetadataField = {
      key: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
    }
    onUpdate({ ...field, metadataFields: [...(field.metadataFields || []), newMetadataField] })
  }

  const handleUpdateField = (idx, updates) => {
    const newMetadataFields = [...(field.metadataFields || [])]
    const currentField = newMetadataFields[idx]
    
    // Auto-generate key from label when label changes (only if key is empty)
    if (updates.label && (!currentField.key || currentField.key === '')) {
      updates.key = `metadata_${generateUniqueKey(updates.label, field.metadataFields || [], currentField.key)}`
    }
    
    newMetadataFields[idx] = { ...currentField, ...updates }
    onUpdate({ ...field, metadataFields: newMetadataFields })
  }

  const handleRemoveField = (idx) => {
    const newMetadataFields = (field.metadataFields || []).filter((_, i) => i !== idx)
    onUpdate({ ...field, metadataFields: newMetadataFields })
  }

  return (
    <div>
      {label && (
        <Text style={{ display: 'block', marginBottom: 8 }}>{label}</Text>
      )}
      {(field.metadataFields || []).map((mf, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, padding: 12, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              addonBefore={<span>Label <span style={{ color: token.colorError }}>*</span></span>}
              value={mf.label}
              onChange={(e) => {
                const value = e.target.value.trim()
                if (value) {
                  handleUpdateField(idx, { label: value })
                }
              }}
              style={{ flex: 1 }}
              required
            />
            <Input
              addonBefore="Placeholder"
              value={mf.placeholder || ''}
              onChange={(e) => handleUpdateField(idx, { placeholder: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SelectWithAddon
              addonBefore="Type"
              value={mf.type}
              onChange={(value) => handleUpdateField(idx, { type: value })}
              style={{ flex: 1 }}
              options={[
                { value: 'text', label: 'Text' },
                { value: 'number', label: 'Number' },
                { value: 'date', label: 'Date' },
                { value: 'address', label: 'Address' },
                { value: 'address_alaminos', label: 'Alaminos Address' },
              ]}
            />
            <SelectWithAddon
              addonBefore="Required"
              value={mf.required ? 'yes' : 'no'}
              onChange={(value) => handleUpdateField(idx, { required: value === 'yes' })}
              style={{ flex: 1 }}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
            <Button
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveField(idx)}
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddField}
        style={{ width: '100%' }}
      >
        Add Metadata Field
      </Button>
    </div>
  )
}
