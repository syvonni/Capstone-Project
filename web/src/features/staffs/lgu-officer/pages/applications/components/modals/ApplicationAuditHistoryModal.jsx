import React from 'react'
import AuditHistoryModal from '@/shared/components/AuditHistoryModal'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'
import { useApplicationAudit } from '../../hooks/useApplicationAudit'
import ApplicationAuditDetailPanel from '../ApplicationAuditDetailPanel'

export default function ApplicationAuditHistoryModal({ open, onClose, application }) {
  const { auditLogs, loading, error } = useApplicationAudit(application, open)

  // Transform audit logs to match shared component format
  const transformedLogs = React.useMemo(() => {
    return auditLogs.map(audit => ({
      ...audit,
      timestamp: audit.createdAt,
      userName: audit.metadata?.officerName || audit.metadata?.claimedByName || audit.metadata?.releasedByName ||
                 audit.metadata?.reviewedByName || audit.metadata?.submittedByName || audit.metadata?.rejectedByName ||
                 audit.metadata?.returnedByName || audit.metadata?.inspectorName || audit.metadata?.registeredByName ||
                 audit.metadata?.updatedByName || audit.metadata?.deletedByName || 'Unknown',
    }))
  }, [auditLogs])

  // Custom search filter for application audit logs
  const searchFilter = (audit, searchValue) => {
    const searchLower = searchValue.toLowerCase()
    const metadata = audit.metadata || {}
    const user = metadata.officerName || metadata.claimedByName || metadata.releasedByName ||
           metadata.reviewedByName || metadata.submittedByName || metadata.rejectedByName ||
           metadata.returnedByName || metadata.inspectorName || metadata.registeredByName ||
           metadata.updatedByName || metadata.deletedByName || 'Unknown'
    const eventType = audit.eventType || ''
    return user.toLowerCase().includes(searchLower) || eventType.toLowerCase().includes(searchLower)
  }

  return (
    <AuditHistoryModal
      open={open}
      onClose={onClose}
      auditLogs={transformedLogs}
      eventDescriptions={AUDIT_EVENT_INFO}
      loading={loading}
      error={error}
      DetailPanelComponent={ApplicationAuditDetailPanel}
      searchFilter={searchFilter}
    />
  )
}
