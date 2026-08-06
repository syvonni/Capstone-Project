import { useState } from 'react'
import AuditHistoryModal from '@/shared/components/AuditHistoryModal'

// Mock audit data
const MOCK_AUDIT_LOGS = [
  {
    id: 'audit-1',
    action: 'Form Created',
    user: 'Admin User',
    timestamp: '2024-01-15T10:30:00Z',
    details: 'Initial form created with 3 sections',
  },
  {
    id: 'audit-2',
    action: 'Section Updated',
    user: 'Admin User',
    timestamp: '2024-01-16T14:20:00Z',
    details: 'Updated Line of Business section',
  },
]

export function FormAuditHistoryModal({ open, onClose, formId }) {
  const [loading, setLoading] = useState(false)

  const fetchAuditLogs = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setLoading(false)
    return MOCK_AUDIT_LOGS
  }

  return (
    <AuditHistoryModal
      open={open}
      onClose={onClose}
      title="Form Audit History"
      fetchAuditLogs={fetchAuditLogs}
      loading={loading}
    />
  )
}
