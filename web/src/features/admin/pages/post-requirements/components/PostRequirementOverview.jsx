import { Typography } from 'antd'
import InfoGrid from '@/shared/components/InfoGrid'

const { Text } = Typography

export default function PostRequirementOverview({ postRequirement, initialValues, dependencies }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <InfoGrid
        noPadding
        items={[
          { label: 'Name', value: initialValues.name || '-' },
          { label: 'Created on', value: formatRelativeTime(postRequirement?.createdAt) },
          { label: 'Last updated on', value: formatRelativeTime(postRequirement?.updatedAt) },
          { label: 'Version', value: postRequirement?.version || '-' },
          { type: 'divider' },
          { label: 'Description', value: initialValues.description || '-' },
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
          {
            type: 'sublist',
            title: 'Custom Fields',
            items: initialValues.customFields && initialValues.customFields.length > 0 ? initialValues.customFields.map((field) => ({
              text: `${field.label} (${field.type})${field.required ? ' *' : ''}`,
            })) : [{ text: 'No custom fields configured' }],
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
            type: 'sublist',
            title: 'Associated Checklist',
            items: postRequirement?.checklistId ? [{
              text: postRequirement.checklistId.name,
              to: `/admin/inspections?tab=checklists&selectedId=${postRequirement.checklistId._id}`,
              suffix: postRequirement.checklistId.description ? ` - ${postRequirement.checklistId.description}` : undefined,
            }] : [],
          },
        ]}
      />
    </div>
  )
}
