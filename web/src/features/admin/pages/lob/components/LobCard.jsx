/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import PanelCard from '@/shared/components/PanelCard'

export default function LobCard({ item, selected, onClick }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const categoryLabel = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1).replace('_', ' ') : item.category

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green'
      case 'disabled': return 'red'
      case 'draft': return 'default'
      default: return 'default'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active'
      case 'disabled': return 'Disabled'
      case 'draft': return 'Draft'
      default: return status
    }
  }

  const tags = []
  if (item.status) {
    tags.push({ label: getStatusLabel(item.status), color: getStatusColor(item.status) })
  }
  
  tags.push({ label: categoryLabel, color: 'default' })

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
