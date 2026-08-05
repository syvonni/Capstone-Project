/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import PanelCard from '@/shared/components/PanelCard'

export default function InspectionItemCard({ item, selected, onClick }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const tags = []
  if (item.isActive !== undefined) {
    tags.push({ label: item.isActive ? 'Active' : 'Inactive', color: item.isActive ? 'green' : 'red' })
  }

  const metaInfo = []
  if (item.version !== undefined) {
    metaInfo.push({ label: 'Version', value: item.version })
  }
  if (item.createdAt) {
    metaInfo.push({ label: 'Created on', value: formatRelativeTime(item.createdAt) })
  }
  if (item.updatedAt) {
    metaInfo.push({ label: 'Last updated on', value: formatRelativeTime(item.updatedAt) })
  }

  return (
    <PanelCard
      title={item.name}
      description={item.description}
      metaInfo={metaInfo}
      tags={tags}
      selected={selected}
      onClick={onClick}
    />
  )
}
