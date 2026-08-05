import PanelCard from '@/shared/components/PanelCard'

export default function ClaimableDocumentCard({ item, selected, onClick }) {
  const isSelected = selected

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
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
      selected={isSelected}
      onClick={onClick}
    />
  )
}
