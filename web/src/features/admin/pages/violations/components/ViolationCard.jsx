/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import PanelCard from '@/shared/components/PanelCard'
import { SEVERITY_LEVELS } from '../constants/violations.constants'

export default function ViolationCard({ item, selected, onClick }) {
  const getSeverityLabel = (severity) => {
    const level = SEVERITY_LEVELS.find(l => l.value === severity)
    return level ? level.label : severity
  }

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
  tags.push({ label: getSeverityLabel(item.severity), color: 'default' })
  if (item.feeId?.amount) {
    tags.push({ label: formatCurrency(item.feeId.amount), color: 'default' })
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
