import { useState } from 'react'
import { Empty } from 'antd'
import PermitDetailHeader from './PermitDetailHeader'
import PermitDetailPanelContent from './PermitDetailPanelContent'
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal'
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

/**
 * PermitDetailPanel
 * 
 * Main detail panel component for permit processing.
 * Wraps the header and content, manages audit history modal state.
 * 
 * TODO: Add action buttons for print, notify, complete based on status
 */
export default function PermitDetailPanel({
  permit,
  permitStatus,
  onClaim,
  onRelease,
  onPrint,
  onPrinted,
  onNotifyOwner,
  onMarkOwnerClaimed,
  onComplete,
  onBookmarkToggle,
  onClose,
  claiming,
  actionLoading,
  auditLogs,
  auditLoading,
  isBookmarked,
}) {
  const [auditModalOpen, setAuditModalOpen] = useState(false)

  if (!permit) {
    return <Empty description="Select a permit to view details" />
  }

  const handleHistoryClick = () => {
    setAuditModalOpen(true)
  }

  return (
    <div>
      <PermitDetailHeader
        permitStatus={permitStatus}
        claiming={claiming}
        onClaim={onClaim}
        onRelease={onRelease}
        onHistoryClick={handleHistoryClick}
        isBookmarked={isBookmarked}
        onBookmarkToggle={onBookmarkToggle}
      />
      <PermitDetailPanelContent permit={permit} />
      <AuditHistoryModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        DetailPanelComponent={(props) => (
          <AuditEventDetails
            {...props}
            priorityFields={[
              'eventType',
              'createdAt',
              'userName',
              'version',
              'updatedByName',
              'createdByName',
              'deletedByName',
            ]}
          />
        )}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('permit') || e.event.startsWith('owner'))}
      />
    </div>
  )
}
