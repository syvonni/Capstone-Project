import { Link } from 'react-router-dom'
import InfoGrid from '@/shared/components/InfoGrid'

export default function FeeOverview({ fee, _token, violations = [], loading = false, claimableDocument = null, permitForm = null }) {
  const isPenaltyFee = fee?.category === 'penalty'
  const isClaimableDocumentFee = fee?.category === 'claimable_document'
  const isApplicationFee = fee?.category === 'application_fee'

  const infoGridItems = [
    { label: 'Name', value: fee?.name || '-' },
    { label: 'Amount', value: fee?.amount ? `₱${fee.amount.toLocaleString()}` : '-' },
    { label: 'Version', value: fee?.version || '-' },
    { label: 'Created on', value: fee?.createdAt ? new Date(fee.createdAt).toLocaleDateString() : '-' },
    { label: 'Last updated on', value: fee?.updatedAt ? new Date(fee.updatedAt).toLocaleDateString() : '-' },
    { type: 'divider' },
    { label: 'Admin Notes', value: fee?.notes || '-', fullWidth: true },
    ...(isPenaltyFee ? [
      { label: 'Associated Violation', value: violations.length > 0 ? <Link to={`/admin/violations?selectedId=${violations[0]._id}`}>{violations[0].name}</Link> : '-' },
    ] : []),
    ...(isClaimableDocumentFee ? [
      { label: 'Associated Document', value: claimableDocument ? <Link to={`/admin/documents?selectedId=${claimableDocument._id}`}>{claimableDocument.name}</Link> : '-' },
    ] : []),
    ...(isApplicationFee ? [
      { label: 'Associated Permit Form', value: permitForm ? <Link to={`/admin/forms?selectedId=${permitForm._id}`}>{permitForm.name}</Link> : '-' },
    ] : []),
  ]

  return (
    <div style={{ padding: '24px' }}>
      <InfoGrid
        noPadding
        loading={loading}
        items={infoGridItems}
      />
    </div>
  )
}
