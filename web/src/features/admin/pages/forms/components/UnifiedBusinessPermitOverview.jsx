import { Typography } from 'antd'
import InfoGrid from '@/shared/components/InfoGrid'

const { Text } = Typography

export default function OverviewPanel({ title, description, requiredDocumentsSection, _fees, _globalFees, lastUpdated, version, notes, feeId, feeAmount, createdAt, claimableDocuments }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const infoGridItems = [
    { label: 'Form Name', value: title || 'N/A' },
    {
      label: 'Application Fee',
      value: feeId && feeAmount ? formatCurrency(feeAmount) : 'N/A',
      ...(feeId && { to: `/admin/fees?selectedId=${feeId}&tab=application_fees` }),
    },
    { label: 'Version', value: version || '1' },
    { label: 'Created on', value: createdAt ? formatRelativeTime(createdAt) : 'N/A' },
    { label: 'Last updated on', value: lastUpdated ? formatRelativeTime(lastUpdated) : 'N/A' },
    { type: 'divider' },
    { label: 'Description', value: description || 'N/A' },
    { label: 'Notes', value: notes || 'N/A' },
  ]

  // Add claimable documents list if available
  if (claimableDocuments && claimableDocuments.length > 0) {
    infoGridItems.push({
      type: 'sublist',
      title: 'Claimable Documents',
      items: claimableDocuments.map(doc => ({
        text: doc.name || '(Untitled document)',
        to: `/admin/documents?selectedId=${doc._id}&tab=claimable_documents`,
      })),
    })
    infoGridItems.push({ type: 'divider' })
  }

  // Add required documents list if available
  if (requiredDocumentsSection && requiredDocumentsSection.items) {
    infoGridItems.push({
      type: 'sublist',
      title: 'Required Documents',
      items: requiredDocumentsSection.items.map(item => ({
        text: item.label || '(Untitled document)',
      })),
    })
    infoGridItems.push({ type: 'divider' })
  }

  return (
    <div>
      <InfoGrid
        noPadding
        items={infoGridItems}
      />
    </div>
  )
}
