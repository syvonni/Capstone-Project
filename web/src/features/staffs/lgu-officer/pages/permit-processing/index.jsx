import { useState, useCallback, useMemo } from 'react'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import PermitDetailPanel from './components/PermitDetailPanel'
import { usePermitStatus } from './hooks/usePermitStatus'
import { usePermitClaim } from './hooks/usePermitClaim'
import { usePermitActions } from './hooks/usePermitActions'
import { usePermitAudit } from './hooks/usePermitAudit'
import { usePermitBookmarks } from './hooks/usePermitBookmarks'
import dayjs from 'dayjs'

// Mock data for permit processing
// Reference number format: PP-YYYY-XXXXX
const MOCK_PERMITS = [
  {
    _id: 'pp-1',
    businessName: 'Sari-Sari Store ni Aling Nena',
    status: 'pending',
    createdAt: '2026-06-28T10:30:00Z',
    reviewedBy: null,
    referenceNumber: 'PP-2026-000001',
  },
  {
    _id: 'pp-2',
    businessName: 'Carinderia ni Mang Kepweng',
    status: 'in_progress',
    createdAt: '2026-06-27T14:15:00Z',
    reviewedBy: { _id: 'officer-1', name: 'Officer Cruz' },
    referenceNumber: 'PP-2026-000002',
  },
  {
    _id: 'pp-3',
    businessName: 'Tech Repair Shop',
    status: 'printing',
    createdAt: '2026-06-25T09:00:00Z',
    reviewedBy: { _id: 'current-officer-id', name: 'Officer Santos' },
    referenceNumber: 'PP-2026-000003',
  },
  {
    _id: 'pp-4',
    businessName: 'Water Refilling Station',
    status: 'ready_for_claim',
    createdAt: '2026-06-28T16:45:00Z',
    reviewedBy: { _id: 'officer-3', name: 'Officer Garcia' },
    referenceNumber: 'PP-2026-000004',
  },
  {
    _id: 'pp-5',
    businessName: 'Internet Cafe',
    status: 'claimed_by_owner',
    createdAt: '2026-06-26T11:20:00Z',
    reviewedBy: { _id: 'officer-2', name: 'Officer Reyes' },
    referenceNumber: 'PP-2026-000005',
  },
]

const STATUS_CONFIG = {
  pending: { color: 'default', label: 'Pending' },
  in_progress: { color: 'processing', label: 'In Progress' },
  printing: { color: 'processing', label: 'Printing' },
  ready_for_claim: { color: 'warning', label: 'Ready for Claim' },
  claimed_by_owner: { color: 'success', label: 'Claimed by Owner' },
  completed: { color: 'success', label: 'Completed' },
}

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Printing', value: 'printing' },
  { label: 'Ready for Claim', value: 'ready_for_claim' },
  { label: 'Claimed by Owner', value: 'claimed_by_owner' },
  { label: 'Completed', value: 'completed' },
]

export default function PermitProcessing() {
  const [selectedItem, setSelectedItem] = useState(null)
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [activeFilters, setActiveFilters] = useState({ status: 'all' })

  const getItemId = useCallback((item) => {
    return item._id
  }, [])

  const handleSelectPermit = useCallback((permit) => {
    setSelectedItem({ ...permit, _itemType: 'permits', _itemId: getItemId(permit) })
  }, [getItemId])

  const handleDrawerClose = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const handleRefresh = useCallback(() => {
    console.log('[MOCK] Refresh permit list')
  }, [])

  // Use hooks for selected permit
  const permitStatus = usePermitStatus(selectedItem)
  const { handleClaim, handleRelease, claiming, stepUpModal: claimStepUpModal } = usePermitClaim(selectedItem, handleRefresh)
  const { handlePrint, handlePrinted, handleNotifyOwner, handleMarkOwnerClaimed, handleComplete, actionLoading, stepUpModal: actionStepUpModal } = usePermitActions(selectedItem, handleRefresh)
  const { auditLogs, loading: auditLoading } = usePermitAudit(selectedItem)
  const { isBookmarked, handleBookmarkToggle } = usePermitBookmarks(selectedItem, () => {
    // Update bookmarkedIds set when bookmark toggles
    if (selectedItem) {
      const newBookmarkedIds = new Set(bookmarkedIds)
      const itemId = getItemId(selectedItem)
      if (newBookmarkedIds.has(itemId)) {
        newBookmarkedIds.delete(itemId)
      } else {
        newBookmarkedIds.add(itemId)
      }
      setBookmarkedIds(newBookmarkedIds)
    }
  })

  const filteredList = useMemo(() => {
    const list = MOCK_PERMITS

    if (activeFilters.status && activeFilters.status !== 'all') {
      return list.filter(permit => permit.status === activeFilters.status)
    }

    return list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime()
      const db = new Date(b.createdAt).getTime()
      return db - da // Newest first
    })
  }, [activeFilters])

  const renderCard = (permit, currentSelectedId, onSelect) => {
    const statusConf = STATUS_CONFIG[permit.status] || { color: 'default', label: permit.status }
    const createdDate = permit.createdAt
    const date = createdDate ? dayjs(createdDate).format('MMMM D, YYYY') : null
    const isBookmarked = bookmarkedIds.has(getItemId(permit))

    const tags = [
      { label: statusConf.label, color: statusConf.color },
    ]
    if (permit.referenceNumber) {
      tags.push({ label: permit.referenceNumber, color: 'default' })
    }

    return (
      <PanelCard
        key={getItemId(permit)}
        item={permit}
        selected={currentSelectedId === getItemId(permit)}
        onClick={() => onSelect(permit)}
        title={permit.businessName}
        description=''
        metaInfo={[
          ...(date ? [{ label: 'Created on', value: date }] : []),
          ...(permit.reviewedBy?.name ? [{ label: 'Claimed by', value: permit.reviewedBy.name }] : []),
        ]}
        tags={tags}
        isBookmarked={isBookmarked}
      />
    )
  }

  const listContent = (
    <ListPanel
      items={filteredList}
      isLoading={false}
      selectedId={selectedItem?._itemId}
      onSelectItem={handleSelectPermit}
      renderCard={renderCard}
      filterConfig={[
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_FILTER_OPTIONS,
          value: activeFilters.status === 'all' ? null : activeFilters.status,
        },
      ]}
      onFilterChange={(key, value) => setActiveFilters(prev => ({ ...prev, [key]: value === null ? 'all' : value }))}
      onClearFilters={() => setActiveFilters({ status: 'all' })}
      onRefresh={handleRefresh}
      showRefresh={true}
      customFilter={true}
    />
  )

  const detailContent = selectedItem ? (
    <PermitDetailPanel
      permit={selectedItem}
      permitStatus={permitStatus}
      onClaim={handleClaim}
      onRelease={handleRelease}
      onPrint={handlePrint}
      onPrinted={handlePrinted}
      onNotifyOwner={handleNotifyOwner}
      onMarkOwnerClaimed={handleMarkOwnerClaimed}
      onComplete={handleComplete}
      onBookmarkToggle={handleBookmarkToggle}
      onClose={handleDrawerClose}
      claiming={claiming}
      actionLoading={actionLoading}
      auditLogs={auditLogs}
      auditLoading={auditLoading}
      isBookmarked={isBookmarked}
    />
  ) : null

  return (
    <ResponsiveSplitLayout
      listContent={listContent}
      detailContent={detailContent}
      drawerTitle="Permit details"
      onDrawerClose={handleDrawerClose}
      drawerOpen={!!selectedItem}
      mobileDrawerPlacement="bottom"
    />
  )
}
