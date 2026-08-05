/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import PanelCard from '@/shared/components/PanelCard'
import { CALCULATION_METHOD_OPTIONS } from '../constants/variables.constants'

export default function VariableCard({ item, selected, onClick }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const getCalculationMethodLabel = (method) => {
    const option = CALCULATION_METHOD_OPTIONS.find(opt => opt.value === method)
    return option?.label || method
  }

  const tags = [
    { label: item.isActive ? 'Active' : 'Disabled', color: item.isActive ? 'green' : 'red' },
    { label: getCalculationMethodLabel(item.calculationMethod), color: 'default' },
  ]

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
      description={item.description || item.question}
      metaInfo={metaInfo}
      tags={tags}
      selected={selected}
      onClick={onClick}
    />
  )
}
