/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import PanelCard from '@/shared/components/PanelCard'

export default function FeeCard({ item, selected, onClick }) {
  const formatCurrency = (amount) => {
    if (!amount) return null
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const tags = []
  if (item.isActive !== undefined) {
    tags.push({ label: item.isActive ? 'Active' : 'Disabled', color: item.isActive ? 'green' : 'red' })
  }
  if (item.amount) {
    tags.push({ label: formatCurrency(item.amount), color: 'default' })
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
      description={item.notes}
      metaInfo={metaInfo}
      tags={tags}
      selected={selected}
      onClick={onClick}
    />
  )
}
