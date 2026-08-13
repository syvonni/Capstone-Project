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
    // For field review events, derive a human-friendly label from the actual
    // decision so officers see "Field Accepted" or "Field Changes Requested"
    // instead of the generic event name.
    let label = getEventTypeLabel(eventType) || eventType
    if (eventType === 'field_reviewed') {
      const decision = metadata.fieldDecision
      if (decision === 'accepted') {
        label = 'Field Accepted'
      } else if (decision === 'request_changes') {
        label = 'Field Changes Requested'
      }
    } else if (eventType === 'field_decisions_updated') {
      // This is the batch "save" event, so label it as a save action
      // rather than a decision (which is what field_reviewed represents).
      label = 'Field Decisions Saved'
    }

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
