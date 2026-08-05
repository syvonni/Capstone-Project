import { Typography } from 'antd'
import { DROPDOWN_SOURCES, FIELD_SPAN_OPTIONS } from '../utils'
import SelectWithAddon from '../SelectWithAddon'

const { Text } = Typography

export default function StandardFieldConfig({ field, onUpdate, isDropdown, _isMobile }) {
  const isAttachmentField = ['file', 'category_upload', 'download'].includes(field.type)

  return (
    <>
      {/* Dropdown source for select/multiselect */}
      {isDropdown && (
        <div>
          <SelectWithAddon
            addonBefore="Source"
            value={field.dropdownSource || 'static'}
            onChange={(val) => onUpdate({ ...field, dropdownSource: val || 'static' })}
            options={DROPDOWN_SOURCES}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Dropdown options for static source */}
      {isDropdown && field.dropdownSource === 'static' && (
        <div>
          <SelectWithAddon
            mode="tags"
            addonBefore="Options"
            value={field.dropdownOptions || []}
            onChange={(values) => onUpdate({ ...field, dropdownOptions: values })}
            placeholder="Add or remove options"
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Row 0: Width / span - only show for non-attachment fields */}
      {!isAttachmentField && (
        <div>
          <SelectWithAddon
            addonBefore="Field Width"
            value={field.span ?? 24}
            onChange={(val) => onUpdate({ ...field, span: val })}
            options={FIELD_SPAN_OPTIONS}
          />
        </div>
      )}
    </>
  )
}
