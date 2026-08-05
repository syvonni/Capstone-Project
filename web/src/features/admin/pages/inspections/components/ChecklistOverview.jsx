/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import InfoGrid from '@/shared/components/InfoGrid'

export default function ChecklistOverview({ checklist, initialValues }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const overviewItems = [
    {
      label: 'Name',
      value: initialValues.name || 'N/A',
    },
    {
      label: 'Created on',
      value: checklist?.createdAt ? formatRelativeTime(checklist.createdAt) : 'N/A',
    },
    {
      label: 'Last updated on',
      value: checklist?.updatedAt ? formatRelativeTime(checklist.updatedAt) : 'N/A',
    },
    { type: 'divider' },
    {
      label: 'Description',
      value: initialValues.description || 'N/A',
    },
    {
      label: 'Notes',
      value: initialValues.notes || 'N/A',
    },
  ]

  if (initialValues.legalBasis && initialValues.legalBasis.length > 0) {
    overviewItems.push({
      label: 'Legal Basis',
      value: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(initialValues.legalBasis || []).map((item, index) => (
            <span key={index}>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  {item.title}
                </a>
              ) : (
                <span>{item.title}</span>
              )}
              {item.description && ` - ${item.description}`}
            </span>
          ))}
        </div>
      ),
      fullWidth: true,
    })
  }

  // Add inspection items as sublist - use checklist data directly, not form values
  if (checklist?.items && checklist.items.length > 0) {
    overviewItems.push({
      type: 'sublist',
      title: 'Inspection Items',
      items: checklist.items.map((item) => {
        const inspectionItem = item.inspectionItemId
        return {
          text: `${item.order}. ${inspectionItem?.name || 'Unknown Item'}`,
          to: `/admin/inspections?selectedId=${inspectionItem?._id}&tab=inspection_items`,
        }
      }),
    })
  }

  // Add associated post requirement as sublist
  if (checklist?.postRequirementId) {
    overviewItems.push({
      type: 'sublist',
      title: 'Associated Post Requirement',
      items: [{
        text: checklist.postRequirementId.name,
        to: `/admin/post-requirements?selectedId=${checklist.postRequirementId._id}`,
        suffix: checklist.postRequirementId.description ? ` - ${checklist.postRequirementId.description}` : undefined,
      }],
    })
  }

  // Add associated variable as sublist
  if (checklist?.variableId) {
    overviewItems.push({
      type: 'sublist',
      title: 'Associated Variable',
      items: [{
        text: checklist.variableId.name,
        to: `/admin/variables?selectedId=${checklist.variableId._id}`,
        suffix: checklist.variableId.description ? ` - ${checklist.variableId.description}` : undefined,
      }],
    })
  }

  // Add associated document as sublist
  if (checklist?.documentId) {
    overviewItems.push({
      type: 'sublist',
      title: 'Associated Document',
      items: [{
        text: checklist.documentId.name,
        to: `/admin/documents?selectedId=${checklist.documentId._id}`,
      }],
    })
  }

  return (
    <InfoGrid
      noPadding={true}
      items={overviewItems}
    />
  )
}
