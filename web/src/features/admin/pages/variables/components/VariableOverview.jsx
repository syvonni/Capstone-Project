import { Typography } from 'antd'
import InfoGrid from '@/shared/components/InfoGrid'

const { Text } = Typography

export default function VariableOverview({ variable, initialValues, dependencies, _token, loading = false }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <InfoGrid
        noPadding
        loading={loading}
        items={[
          { label: 'Name', value: initialValues.name || '-' },
          { label: 'Created on', value: formatRelativeTime(variable?.createdAt) },
          { label: 'Last updated on', value: formatRelativeTime(variable?.updatedAt) },
          { label: 'Version', value: variable?.version || '-' },
          { type: 'divider' },
          { label: 'Description', value: initialValues.description || '-' },
          { label: 'Question', value: initialValues.question || '-', fullWidth: true },
          {
            type: 'sublist',
            title: 'Variable Fee Structure',
            items: (() => {
              if (variable?.calculationMethod === 'bracketed' && variable.brackets && variable.brackets.length > 0) {
                return variable.brackets.map((bracket) => {
                  const range = bracket.maxValue !== undefined && bracket.maxValue !== null
                    ? `${bracket.minValue} - ${bracket.maxValue}`
                    : `${bracket.minValue}+`
                  return {
                    text: `₱${bracket.fixedAmount?.toLocaleString() || 0} for ${range} ${variable.unit}s`,
                  }
                })
              } else if (variable?.calculationMethod === 'per_unit' && variable.baseRate) {
                return [{
                  text: `₱${variable.baseRate?.toLocaleString() || 0} per ${variable.unit || 'unit'}`,
                }]
              } else if (variable?.calculationMethod === 'yes_no' && variable.fixedAmount) {
                return [{
                  text: `₱${variable.fixedAmount?.toLocaleString() || 0} per ${variable.unit || 'unit'}`,
                }]
              } else if (variable?.calculationMethod === 'classification' && variable.classifications && variable.classifications.length > 0) {
                return variable.classifications.map((classification) => {
                  const amount = classification.fixedAmount || classification.fee
                  return {
                    text: amount ? `₱${amount?.toLocaleString() || 0} - ${classification.name || classification.label}` : (classification.name || classification.label),
                  }
                })
              }
              return []
            })(),
          },
          {
            type: 'sublist',
            title: 'Legal Basis',
            items: initialValues.legalBasis && initialValues.legalBasis.length > 0 ? initialValues.legalBasis.map((item) => ({
              text: item.title,
              to: item.url,
              suffix: item.description ? ` - ${item.description}` : undefined,
            })) : [],
          },
          { label: 'Notes', value: initialValues.notes || '-' },
          { type: 'divider' },
          {
            label: 'Associated Checklist',
            value: variable?.checklistId?.name || 'N/A',
            ...(variable?.checklistId?._id && { to: `/admin/inspections?selectedId=${variable.checklistId._id}&tab=checklists` }),
            fullWidth: true
          },
          {
            type: 'sublist',
            title: dependencies.length === 1 ? 'Associated Line of Business' : 'Associated Lines of Business',
            items: dependencies.length > 0 ? dependencies.map((lob) => ({
              text: lob.name,
              to: `/admin/lob?selectedId=${lob._id}`,
              suffix: lob.description ? ` - ${lob.description}` : undefined,
            })) : [],
          },
          {
            label: 'Associated Variable Fee',
            value: variable?.feeId?.name || 'N/A',
            ...(variable?._id && { to: `/admin/fees?selectedId=${variable._id}&tab=variables` }),
            fullWidth: true
          },
        ]}
      />
    </div>
  )
}
