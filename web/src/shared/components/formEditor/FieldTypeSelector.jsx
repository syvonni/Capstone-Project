import { FIELD_TYPES } from './utils'
import { applyFieldTypeDefaults } from './utils'
import SelectWithAddon from './SelectWithAddon'
import { createFieldWithDefaults } from './utils'

export default function FieldTypeSelector({ field, onUpdate, isMobile: _isMobile }) {
  const handleChange = (val) => {
    // Find the selected type from the grouped structure
    let selectedType = null
    FIELD_TYPES.forEach(group => {
      if (group.options) {
        const found = group.options.find(t => t.value === val)
        if (found) selectedType = found
      }
    })
    
    if (selectedType?.isTemplate) {
      // This is a template - create a field with the template's configuration
      const newItem = createFieldWithDefaults(selectedType.templateType, {
        label: selectedType.templateConfig.label,
        helpText: selectedType.templateConfig.helpText,
        dropdownOptions: selectedType.templateConfig.dropdownOptions,
        metadataFields: selectedType.templateConfig.metadataFields,
      })
      onUpdate(newItem)
    } else {
      // Regular field type
      onUpdate(applyFieldTypeDefaults(field, val))
    }
  }

  return (
    <SelectWithAddon
      addonBefore="Type"
      value={field.type}
      onChange={handleChange}
      options={FIELD_TYPES}
      style={{ width: '100%' }}
      popupMatchSelectWidth={false}
    />
  )
}
