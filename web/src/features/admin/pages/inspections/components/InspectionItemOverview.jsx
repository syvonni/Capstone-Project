/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import InfoGrid from '@/shared/components/InfoGrid'

export default function InspectionItemOverview({ inspectionItem, initialValues, violation, associatedChecklists, loading = false }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const violationName = violation?.name || 'N/A'
  const violationId = violation?._id || null

  const checklistName = associatedChecklists.length === 1
    ? associatedChecklists[0]?.name || 'N/A'
    : associatedChecklists.length > 1
      ? `${associatedChecklists.length} checklists`
      : 'N/A'

  const overviewItems = [
    {
      label: 'Name',
      value: initialValues.name || 'N/A',
    },
    {
      label: 'Version',
      value: inspectionItem?.version || 'N/A',
    },
    {
      label: 'Created on',
      value: inspectionItem?.createdAt ? formatRelativeTime(inspectionItem.createdAt) : 'N/A',
    },
    {
      label: 'Last updated on',
      value: inspectionItem?.updatedAt ? formatRelativeTime(inspectionItem.updatedAt) : 'N/A',
    },
    { type: 'divider' },
    {
      label: 'Question',
      value: initialValues.question || 'N/A',
      fullWidth: true,
    },
    {
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
    },
    {
      label: 'Notes',
      value: initialValues.notes || 'N/A',
    },
  ]

  // Add associated violation at the bottom
  if (violationId) {
    overviewItems.push({
      label: 'Associated Violation',
      value: violationName,
      to: `/admin/violations?selectedId=${violationId}`,
      fullWidth: true,
    })
  }

  // Add associated checklists at the bottom
  if (associatedChecklists.length === 1) {
    overviewItems.push({
      label: 'Associated Checklist',
      value: checklistName,
      to: `/admin/inspections?selectedId=${associatedChecklists[0]?._id}&tab=checklists`,
      fullWidth: true,
    })
  } else if (associatedChecklists.length > 1) {
    overviewItems.push({
      type: 'sublist',
      title: 'Associated Checklists',
      items: associatedChecklists.map((checklist) => ({
        text: checklist.name || 'N/A',
        to: `/admin/inspections?selectedId=${checklist._id}&tab=checklists`,
      })),
      fullWidth: true,
    })
  }

  return (
    <InfoGrid
      noPadding={true}
      loading={loading}
      items={overviewItems}
    />
  )
}
