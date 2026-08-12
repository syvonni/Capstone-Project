import PanelCard from "@/shared/components/PanelCard";
import { getEventTypeLabel } from '@/shared/config/auditEventTypes'

export default function DefaultAuditCard({ audit, selected, onSelect, showEntityName: _showEntityName = true }) {
  const metadata = audit.metadata || {}

  const metaInfo = [
    { label: 'Timestamp', value: new Date(audit.createdAt).toLocaleString() },
  ]

  const performer = metadata.userName || metadata.updatedByName || metadata.createdByName || metadata.deletedByName || audit.userName
  if (performer) {
    metaInfo.push({
      label: 'Performed By',
      value: performer
    })
  }

  if (metadata.version) {
    metaInfo.push({ label: 'Version', value: metadata.version })
  }

  const tags = []
  const eventType = metadata.eventType || audit.eventType
  if (eventType) {
    const label = getEventTypeLabel(eventType) || eventType
    // Use different colors based on event type
    const isDisabled = eventType.toLowerCase().includes('disabled') || 
                      metadata.isActive === false ||
                      audit.isActive === false
    const isCreated = eventType.toLowerCase().includes('created')
    const isUpdated = eventType.toLowerCase().includes('updated')
    
    let color = 'blue'
    if (isDisabled) color = 'red'
    else if (isCreated) color = 'green'
    else if (isUpdated) color = 'orange'
    
    tags.push({ label, color })
  }

  return (
    <PanelCard
      selected={selected}
      onClick={onSelect}
      metaInfo={metaInfo}
      title={metadata.name || metadata.applicationReferenceNumber || metadata.applicationId || (audit.eventType?.startsWith('application_') ? 'Application' : 'Unknown Entity')}
      tags={tags}
    />
  )
}
