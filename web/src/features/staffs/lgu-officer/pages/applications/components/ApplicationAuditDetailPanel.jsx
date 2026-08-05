import { Typography, Descriptions, Empty } from 'antd'

const { Text } = Typography

const STATUS_CONFIG = {
  submitted: { color: 'blue', label: 'Submitted' },
  under_review: { color: 'gold', label: 'Under Review' },
  resubmit: { color: 'cyan', label: 'Resubmitted' },
  approved: { color: 'green', label: 'Approved' },
  rejected: { color: 'red', label: 'Rejected' },
  appeal_pending: { color: 'volcano', label: 'Appeal Pending' },
}

export default function ApplicationAuditDetailPanel({ audit }) {
  if (!audit) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Select an audit log to view details" />
      </div>
    )
  }

  const metadata = audit.metadata || {}

  return (
    <div style={{ padding: 16 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Event Type">
          {audit.eventType || 'Unknown Event'}
        </Descriptions.Item>
        <Descriptions.Item label="Timestamp">
          {new Date(audit.createdAt).toLocaleString()}
        </Descriptions.Item>
        
        {/* User/Officer Information */}
        {(metadata.officerName || metadata.claimedByName || metadata.releasedByName || metadata.reviewedByName || metadata.submittedByName || metadata.rejectedByName || metadata.returnedByName || metadata.inspectorName || metadata.registeredByName || metadata.updatedByName || metadata.deletedByName) && (
          <Descriptions.Item label="User">
            {metadata.officerName || metadata.claimedByName || metadata.releasedByName || metadata.reviewedByName || metadata.submittedByName || metadata.rejectedByName || metadata.returnedByName || metadata.inspectorName || metadata.registeredByName || metadata.updatedByName || metadata.deletedByName || 'Unknown'}
          </Descriptions.Item>
        )}
        
        {/* Entity Information */}
        {metadata.businessId && (
          <Descriptions.Item label="Business ID">
            {metadata.businessId}
          </Descriptions.Item>
        )}
        
        {/* Status Information */}
        {metadata.applicationStatus && (
          <Descriptions.Item label="Application Status">
            {STATUS_CONFIG[metadata.applicationStatus]?.label || metadata.applicationStatus}
          </Descriptions.Item>
        )}
        {metadata.status && (
          <Descriptions.Item label="Status Change">
            {STATUS_CONFIG[metadata.status.from]?.label || metadata.status.from}
            {' → '}
            {STATUS_CONFIG[metadata.status.to]?.label || metadata.status.to}
          </Descriptions.Item>
        )}
        {metadata.appealStatus && (
          <Descriptions.Item label="Appeal Status">
            {metadata.appealStatus}
          </Descriptions.Item>
        )}
        
        {/* Field Review Information */}
        {metadata.fieldKey && (
          <Descriptions.Item label="Field Reviewed">
            {metadata.fieldKey}
            <br />
            {metadata.decision || 'reviewed'}
          </Descriptions.Item>
        )}
        {metadata.decisionsCount && (
          <Descriptions.Item label="Decisions Made">
            {metadata.decisionsCount} field decision{metadata.decisionsCount > 1 ? 's' : ''}
          </Descriptions.Item>
        )}
        {metadata.decisions && Array.isArray(metadata.decisions) && (
          <Descriptions.Item label="Field Decisions">
            {metadata.decisions.map((decision, idx) => (
              <div key={idx} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: idx < metadata.decisions.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div>
                  Field: {decision.fieldKey}
                </div>
                <div>
                  Status: {decision.status}
                </div>
                {decision.requestCode && (
                  <div>
                    Reason Code: {decision.requestCode}
                  </div>
                )}
                {decision.requestOther && (
                  <div>
                    Other Reason: {decision.requestOther}
                  </div>
                )}
                {decision.reasonCode && (
                  <div>
                    Reason Code: {decision.reasonCode}
                  </div>
                )}
                {decision.reasonOther && (
                  <div>
                    Other Reason: {decision.reasonOther}
                  </div>
                )}
              </div>
            ))}
          </Descriptions.Item>
        )}
        
        {/* Pending Action Information */}
        {metadata.actionType && (
          <Descriptions.Item label="Action Type">
            <Text>{metadata.actionType}</Text>
          </Descriptions.Item>
        )}
        {metadata.scheduledAt && (
          <Descriptions.Item label="Scheduled For">
            {new Date(metadata.scheduledAt).toLocaleString()}
          </Descriptions.Item>
        )}
        
        {/* Permit Information */}
        {metadata.permitId && (
          <Descriptions.Item label="Permit ID">
            <Text>{metadata.permitId}</Text>
          </Descriptions.Item>
        )}
        {metadata.permitType && (
          <Descriptions.Item label="Permit Type">{metadata.permitType}</Descriptions.Item>
        )}
        
        {/* Inspection Information */}
        {metadata.inspectionId && (
          <Descriptions.Item label="Inspection ID">
            <Text>{metadata.inspectionId}</Text>
          </Descriptions.Item>
        )}
        {metadata.violationType && (
          <Descriptions.Item label="Violation Type">{metadata.violationType}</Descriptions.Item>
        )}
        
        {/* Override Information */}
        {metadata.override && (
          <Descriptions.Item label="Override">
            Overrode claim by {metadata.override.fromName || metadata.override.from}
          </Descriptions.Item>
        )}
        
        {/* Additional metadata */}
        {metadata.reason && (
          <Descriptions.Item label="Reason">{metadata.reason}</Descriptions.Item>
        )}
        {metadata.comments && (
          <Descriptions.Item label="Comments">{metadata.comments}</Descriptions.Item>
        )}
      </Descriptions>
    </div>
  )
}
