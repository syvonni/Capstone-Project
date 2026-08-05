import PanelCard from './PanelCard'
import { getEventTypeLabel } from '@/shared/config/auditEventTypes'

export default function DefaultAuditCard({ audit, selected, onSelect, showEntityName: _showEntityName = true }) {
  const metadata = audit.metadata || {}

  const metaInfo = [
    { label: 'Timestamp', value: new Date(audit.createdAt).toLocaleString() },
  ]

  if (metadata.userName || metadata.updatedByName || metadata.createdByName || metadata.deletedByName) {
    metaInfo.push({
      label: 'Author',
      value: metadata.userName || metadata.updatedByName || metadata.createdByName || metadata.deletedByName,
    })
  }

  const title = metadata.name || getEventTypeLabel(audit.eventType)
  const tags = [{ label: getEventTypeLabel(audit.eventType), color: 'default' }]

  return (
    <PanelCard
      title={title}
      metaInfo={metaInfo}
      tags={tags}
      selected={selected}
      onClick={onSelect}
    />
  )
}
