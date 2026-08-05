/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import PanelCard from '@/shared/components/PanelCard'

export default function VariableFeeCard({ item, selected, onClick }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const tags = []
  if (item.isActive !== undefined) {
    tags.push({ label: item.isActive ? 'Active' : 'Disabled', color: item.isActive ? 'green' : 'red' })
  }

  // Add rate/unit tag based on calculation method
  if (item.calculationMethod === 'bracketed' && item.brackets && item.brackets.length > 0) {
    const amounts = item.brackets.map(b => b.fixedAmount).filter(a => a !== null && a !== undefined)
    if (amounts.length > 0) {
      const minAmount = Math.min(...amounts)
      const maxAmount = Math.max(...amounts)
      const rangeLabel = minAmount === maxAmount
        ? `₱${minAmount.toLocaleString()}/${item.unit}`
        : `₱${minAmount.toLocaleString()} - ₱${maxAmount.toLocaleString()}/${item.unit}`
      tags.push({ label: rangeLabel, color: 'default' })
    } else {
      tags.push({ label: `/${item.unit}`, color: 'default' })
    }
  } else if (item.calculationMethod === 'classification' && item.classifications && item.classifications.length > 0) {
    const fees = item.classifications.map(c => c.fee).filter(f => f !== null && f !== undefined)
    if (fees.length > 0) {
      const minFee = Math.min(...fees)
      const maxFee = Math.max(...fees)
      const rangeLabel = minFee === maxFee
        ? `₱${minFee.toLocaleString()}/${item.unit}`
        : `₱${minFee.toLocaleString()} - ₱${maxFee.toLocaleString()}/${item.unit}`
      tags.push({ label: rangeLabel, color: 'default' })
    } else {
      tags.push({ label: `/${item.unit}`, color: 'default' })
    }
  } else if (item.baseRate !== null && item.baseRate !== undefined) {
    tags.push({ label: `₱${item.baseRate}/${item.unit}`, color: 'default' })
  } else if (item.fixedAmount !== null && item.fixedAmount !== undefined) {
    tags.push({ label: `₱${item.fixedAmount}`, color: 'default' })
  } else {
    tags.push({ label: `/${item.unit}`, color: 'default' })
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

  const description = item.notes && item.notes.trim() 
    ? item.notes
    : item.question || ''

  return (
    <PanelCard
      title={item.name}
      description={description}
      metaInfo={metaInfo}
      tags={tags}
      selected={selected}
      onClick={onClick}
    />
  )
}
