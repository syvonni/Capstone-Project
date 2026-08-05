import { useState } from 'react'
import { Button, Input, Typography, Space, Tag, Popconfirm, message } from 'antd'
import { SettingOutlined, UpOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons'
import { FIELD_TYPES, isReservedKey, hasKeyCollision } from './utils'
import FieldTypeSelector from './FieldTypeSelector'
import ValidationConfig from './ValidationConfig'
import DownloadConfig from './fieldConfigs/DownloadConfig'
import CategoryUploadConfig from './fieldConfigs/CategoryUploadConfig'
import FileUploadConfig from './fieldConfigs/FileUploadConfig'
import RepeatableGroupConfig from './fieldConfigs/RepeatableGroupConfig'
import StandardFieldConfig from './fieldConfigs/StandardFieldConfig'
import SelectWithAddon from './SelectWithAddon'
import { generateUniqueKey } from './utils'

const { Text } = Typography

export default function FieldRow({ field, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, token, isMobile, definitionId, readOnly, _allFields = [] }) {
  const [expanded, setExpanded] = useState(false)
  const [_uploading, setUploading] = useState(false)
  const isDropdown = field.type === 'select' || field.type === 'multiselect'
  const isDownload = field.type === 'download'

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        marginBottom: 8,
        background: token.colorBgContainer,
      }}
    >
      {/* Compact row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
        }}
      >
        {/* Download icon indicator */}
        {isDownload && (
          <span style={{ color: token.colorPrimary, fontSize: 14, flexShrink: 0 }}>📥</span>
        )}
        {readOnly ? (
          <Text style={{ flex: 1, minWidth: isMobile ? '100%' : 300, fontSize: 13 }}>
            {field.label || '(untitled field)'}
          </Text>
        ) : (
          <Input
            addonBefore={<span>Label <span style={{ color: token.colorError }}>*</span></span>}
            value={field.label}
            onChange={(e) => {
              const value = e.target.value.trim()
              if (value) {
                // Auto-generate key from label if key is empty
                const newKey = (!field.key || field.key === '') ? generateUniqueKey(value, _allFields, field.id) : field.key
                onUpdate({ ...field, label: value, key: newKey })
              }
            }}
            placeholder={isDownload ? 'Form name (e.g. Duly accomplished application form)' : 'Field label'}
            style={{ flex: 1, minWidth: isMobile ? '100%' : 300 }}
            required
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', flex: 1 }}>
          {readOnly ? (
            <Tag style={{ fontSize: 11, margin: 0 }}>
              {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
            </Tag>
          ) : (
            <FieldTypeSelector field={field} onUpdate={onUpdate} isMobile={isMobile} />
          )}
          {!readOnly && (
            <Space.Compact size={4} onClick={(e) => e.stopPropagation()}>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setExpanded(!expanded)}
                style={{ color: expanded ? token.colorPrimary : undefined }}
              />
              <Button icon={<UpOutlined />} disabled={isFirst} onClick={onMoveUp} />
              <Button icon={<DownOutlined />} disabled={isLast} onClick={onMoveDown} />
              <Popconfirm title="Delete this field?" onConfirm={onDelete} okText="Delete Field" okButtonProps={{ danger: true }}>
                <Button icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space.Compact>
          )}
        </div>
      </div>

      {/* Expanded options (edit mode only) */}
      {expanded && !readOnly && (
        <div
          style={{
            padding: '8px 12px 12px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Field key - shown for all field types */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                addonBefore={<span>Key <span style={{ color: token.colorError }}>*</span></span>}
                value={field.key}
                onChange={(e) => {
                  const newKey = e.target.value.trim()
                  const oldKey = field.key
                  
                  // Check for reserved words and collisions
                  if (isReservedKey(newKey)) {
                    message.warning('This key is a reserved word. Please choose another.')
                    return
                  }
                  if (hasKeyCollision(newKey, _allFields, field.id)) {
                    message.warning('This key is already used by another field in this form.')
                    return
                  }
                  
                  // If key is being changed, warn about potential claimable document binding breakage
                  if (oldKey && newKey && oldKey !== newKey) {
                    // Note: In a full implementation, this would check if the key is used in any claimable document
                    // For now, we'll allow the change but warn the user
                    console.warn(`Field key changing from "${oldKey}" to "${newKey}" - this may break claimable document bindings`)
                  }
                  
                  onUpdate({ ...field, key: newKey })
                }}
                placeholder="e.g. businessName"
                style={{ width: '100%' }}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <SelectWithAddon
                addonBefore="Required"
                value={field.required ? 'yes' : 'no'}
                onChange={(value) => onUpdate({ ...field, required: value === 'yes' })}
                style={{ width: '100%' }}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                addonBefore="Help Text"
                value={field.helpText}
                onChange={(e) => onUpdate({ ...field, helpText: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Download type: template file upload */}
          {isDownload && (
            <DownloadConfig field={field} onUpdate={onUpdate} token={token} definitionId={definitionId} setUploading={setUploading} />
          )}

          {/* Category + Upload: dropdown options configuration */}
          {field.type === 'category_upload' && (
            <CategoryUploadConfig field={field} onUpdate={onUpdate} />
          )}

          {/* Repeatable group: sub-field editor */}
          {field.type === 'repeatable_group' && (
            <RepeatableGroupConfig field={field} onUpdate={onUpdate} token={token} />
          )}

          {/* Non-download types: standard settings */}
          {!isDownload && field.type !== 'repeatable_group' && field.type !== 'category_upload' && (
            <>
              {/* Field key (for file type: storage key used in business owner uploads) */}
              {field.type === 'file' && (
                <FileUploadConfig field={field} onUpdate={onUpdate} />
              )}

              {/* Standard field configuration */}
              <StandardFieldConfig field={field} onUpdate={onUpdate} isDropdown={isDropdown} isMobile={isMobile} />
            </>
          )}

          {/* Validation rules - show for all field types except repeatable_group */}
          {field.type !== 'repeatable_group' && (
            <ValidationConfig field={field} onUpdate={onUpdate} />
          )}
        </div>
      )}
    </div>
  )
}
