import { Typography } from 'antd'
import { Link } from 'react-router-dom'
import InfoGrid from '@/shared/components/InfoGrid'

const { Text } = Typography

const CALCULATION_METHOD_OPTIONS = [
  { value: 'floor_area', label: 'Floor Area' },
  { value: 'capitalization', label: 'Capitalization' },
  { value: 'bracketed', label: 'Bracketed' },
  { value: 'classification', label: 'Classification' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'custom', label: 'Custom' },
]

export default function VariableFeeOverview({ rule, _token, _dependentLobs = [], _loadingLobs = false, _derivedCategoryOptions = [], associatedVariables = [], _loadingVariables = false }) {
  const displayValues = {
    name: rule?.name || '-',
    calculationMethod: rule?.calculationMethod,
    baseRate: rule?.baseRate ?? 0,
    unit: rule?.unit || '-',
    brackets: rule?.brackets || [],
    classifications: rule?.classifications || [],
    notes: rule?.notes || '-',
    question: rule?.question || '-',
  }

  const infoGridItems = [
    { label: 'Variable Fee Name', value: displayValues.name },
    { label: 'Calculation Method', value: CALCULATION_METHOD_OPTIONS.find(m => m.value === displayValues.calculationMethod)?.label || '-' },
    { label: 'Created on', value: rule?.createdAt ? new Date(rule.createdAt).toLocaleDateString() : '-' },
    { label: 'Last updated on', value: rule?.updatedAt ? new Date(rule.updatedAt).toLocaleDateString() : '-' },
    { type: 'divider' },
    { label: 'Question', value: displayValues.question, fullWidth: true },
    {
      type: 'sublist',
      title: 'Calculation Details',
      items: (() => {
        if (displayValues.calculationMethod === 'bracketed' && displayValues.brackets && displayValues.brackets.length > 0) {
          return displayValues.brackets.map((bracket) => {
            const range = bracket.maxValue !== undefined && bracket.maxValue !== null
              ? `${bracket.minValue} - ${bracket.maxValue}`
              : `${bracket.minValue}+`
            return {
              text: `₱${bracket.fixedAmount?.toLocaleString() || 0} for ${range} ${displayValues.unit}s`,
            }
          })
        } else if (displayValues.calculationMethod === 'per_unit' && displayValues.baseRate) {
          return [{
            text: `₱${displayValues.baseRate?.toLocaleString() || 0} per ${displayValues.unit || 'unit'}`,
          }]
        } else if (displayValues.calculationMethod === 'yes_no' && displayValues.fixedAmount) {
          return [{
            text: `₱${displayValues.fixedAmount?.toLocaleString() || 0} per ${displayValues.unit || 'unit'}`,
          }]
        } else if (displayValues.calculationMethod === 'classification' && displayValues.classifications && displayValues.classifications.length > 0) {
          return displayValues.classifications.map((classification) => {
            const amount = classification.fixedAmount || classification.fee
            return {
              text: amount ? `₱${amount?.toLocaleString() || 0} - ${classification.name || classification.label}` : (classification.name || classification.label),
            }
          })
        }
        return []
      })(),
    },
    { label: 'Admin Notes', value: displayValues.notes, fullWidth: true },
    { label: 'Associated Variables', value: associatedVariables.length === 1 
      ? <Link to={`/admin/variables?selectedId=${associatedVariables[0]._id}`}>{associatedVariables[0].name}</Link>
      : associatedVariables.length > 1 
        ? `${associatedVariables.length} variables`
        : '-'
    },
  ]

  return (
    <div>
      <InfoGrid
        noPadding
        items={infoGridItems}
      />
    </div>
  )
}
