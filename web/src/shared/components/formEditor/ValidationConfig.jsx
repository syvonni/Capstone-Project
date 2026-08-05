import { Input, Typography, Grid } from 'antd'
import { VALIDATION_RULES } from './utils'
import SelectWithAddon from './SelectWithAddon'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function ValidationConfig({ field, onUpdate }) {
  const screens = useBreakpoint()
  const isMobile = !screens.md

  // Filter validation rules to only show applicable ones for the current field type
  const applicableRules = VALIDATION_RULES.filter(rule => {
    // If rule has no fieldTypes specified, show it for all types (backward compatibility)
    if (!rule.fieldTypes) return true
    // Otherwise, only show if current field type is in the rule's fieldTypes array
    return rule.fieldTypes.includes(field.type)
  })

  const handleUpdateRule = (ruleValue, newValue) => {
    const newValidation = { ...field.validation }
    if (newValue === '' || newValue === undefined || newValue === null) {
      delete newValidation[ruleValue]
    } else {
      const rule = applicableRules.find(r => r.value === ruleValue)
      newValidation[ruleValue] = rule?.inputType === 'number' ? Number(newValue) || newValue : newValue
    }
    onUpdate({ ...field, validation: newValidation })
  }

  function getAddonBeforeLabel(ruleValue) {
    const labelMap = {
      minLength: 'Min Length',
      maxLength: 'Max Length',
      pattern: 'Regex Pattern',
      minValue: 'Min Value',
      maxValue: 'Max Value',
      maxFileSize: 'Max Size',
    }
    return labelMap[ruleValue] || 'Value'
  }

  // Group rules into pairs for responsive layout
  const rulePairs = []
  for (let i = 0; i < applicableRules.length; i += 2) {
    rulePairs.push(applicableRules.slice(i, i + 2))
  }

  return (
    <div>
      <Text style={{ display: 'block', marginBottom: 8 }}>Validation Rules</Text>
      {rulePairs.map((pair, pairIdx) => (
        <div key={pairIdx} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, marginBottom: 8 }}>
          {pair.map((rule) => {
            const currentVal = field.validation?.[rule.value]
            return (
              <div key={rule.value} style={{ flex: 1 }}>
                {rule.value === 'acceptedFileTypes' ? (
                  <SelectWithAddon
                    mode="tags"
                    addonBefore="File Types"
                    value={currentVal ? (Array.isArray(currentVal) ? currentVal : currentVal.split(',').map(s => s.trim())) : []}
                    onChange={(values) => handleUpdateRule(rule.value, values.join(','))}
                    placeholder="e.g. .pdf,.jpg,.png"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <Input
                    addonBefore={getAddonBeforeLabel(rule.value)}
                    value={currentVal ?? ''}
                    onChange={(e) => handleUpdateRule(rule.value, e.target.value)}
                    style={{ width: '100%' }}
                    type={rule.inputType}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
