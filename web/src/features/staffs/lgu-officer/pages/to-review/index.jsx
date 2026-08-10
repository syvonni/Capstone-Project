import { useState, useCallback, useMemo } from 'react'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import SplitLayout from '@/shared/components/SplitLayout'
import useOfficerData from '../../hooks/useOfficerData'
import { useOfficerDataContext } from '../../contexts/OfficerDataContext'
import { calculatePriorityScore } from '../../hooks/useOfficerData'
import ApplicationDetailPanel from '../applications/components/ApplicationDetailPanel'
import HelpRequestDetailPanel from '../help-requests/components/HelpRequestDetailPanel'
import { CLAIM_STATUS_FILTER_OPTIONS, STATUS_CONFIG, STATUS_FILTER_OPTIONS } from '../applications/constants'
import { HELP_REQUEST_STATUS_CONFIG } from '../help-requests/constants'
import dayjs from 'dayjs'
import { getEmailStatusTag } from '../../utils/emailStatusUtils'

// Stale detection helpers (copied from useOfficerData for use in renderCard)
const STALE_THRESHOLD_HOURS = 48
const ACTIVE_APPLICATION_STATUSES = new Set(['submitted', 'under_review', 'resubmit'])
const TERMINAL_APPLICATION_STATUSES = new Set(['approved', 'rejected', 'returned', 'cancelled'])
const ACTIVE_HELP_REQUEST_STATUSES = new Set(['open', 'in_progress'])
const TERMINAL_HELP_REQUEST_STATUSES = new Set(['resolved', 'closed'])

const isStale = (item) => {
  if (!item) return false
  const itemType = item._itemType
  const status = String(item.status || item.applicationStatus || '').toLowerCase()

  if (itemType === 'application' || itemType === 'renewals' || item.applicationId) {
    if (!item.reviewedBy) return false
    if (ACTIVE_APPLICATION_STATUSES.has(status) || !TERMINAL_APPLICATION_STATUSES.has(status)) {
      const reviewedAt = item.reviewedAt
      if (!reviewedAt) return false
      const hoursSinceReview = (new Date() - new Date(reviewedAt)) / (1000 * 60 * 60)
      return hoursSinceReview > STALE_THRESHOLD_HOURS
    }
  }

  if (itemType === 'help_request' || item.requestId) {
    if (!item.claimedBy) return false
    if (ACTIVE_HELP_REQUEST_STATUSES.has(status) || !TERMINAL_HELP_REQUEST_STATUSES.has(status)) {
      const claimedAt = item.claimedAt
      if (!claimedAt) return false
      const hoursSinceClaim = (new Date() - new Date(claimedAt)) / (1000 * 60 * 60)
      return hoursSinceClaim > STALE_THRESHOLD_HOURS
    }
  }

  return false
}

const getStaleDuration = (item) => {
  if (!item) return null
  const timestamp = item.reviewedAt || item.claimedAt
  if (!timestamp) return null
  const hoursSince = (new Date() - new Date(timestamp)) / (1000 * 60 * 60)
  if (hoursSince <= 0) return null
  const days = Math.floor(hoursSince / 24)
  const hours = Math.floor(hoursSince % 24)
  if (days > 0 && hours > 0) {
    return `${days} days ${hours} hours`
  } else if (days > 0) {
    return `${days} days`
  } else {
    return `${hours} hours`
  }
}

export default function OfficerToReview() {
  const [selectedItem, setSelectedItem] = useState(null)
  const [activeFilters, setActiveFilters] = useState({ itemType: null, secondaryFilter: 'needs_attention' })
  const { refreshTrigger, currentUser } = useOfficerDataContext()
  const officerData = useOfficerData('toReview', refreshTrigger)

  const handleSelectBusiness = useCallback((businessCard) => {
    setSelectedItem(businessCard)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const filteredToReview = useMemo(() => {
    const list = officerData.toReview || []

    // Flatten business cards into individual items (applications and help requests only)
    const flattenedItems = list.flatMap(card => {
      const items = []

      // Add application if exists
      if (card._requests?.application) {
        items.push({ ...card._requests.application, _itemType: 'application', _businessName: card.businessName })
      }

      // Add help request if exists
      if (card._requests?.helpRequest) {
        items.push({ ...card._requests.helpRequest, _itemType: 'help_request', _businessName: card.businessName })
      }

      return items
    })

    const filtered = flattenedItems.filter(item => {
      // Item type filter
      if (activeFilters.itemType && item._itemType !== activeFilters.itemType) {
        return false
      }

      // Secondary filter - dynamic based on item type
      if (activeFilters.secondaryFilter && activeFilters.secondaryFilter !== 'all') {
        // If itemType is null (All), filter by claim status
        if (!activeFilters.itemType) {
          const isApp = item._itemType === 'application'
          const isHelpRequest = item._itemType === 'help_request'

          let isClaimed = false
          let reviewerId = null
          let stale = isStale(item)

          if (isApp) {
            isClaimed = Boolean(item.reviewedBy)
            reviewerId = item.reviewedBy?._id || item.reviewedBy
          } else if (isHelpRequest) {
            isClaimed = Boolean(item.claimedBy)
            reviewerId = item.claimedBy?._id || item.claimedBy
          }

          if (activeFilters.secondaryFilter === 'needs_attention') {
            // Needs Attention: stale OR active work statuses OR waiting for user action
            if (stale) return true
            // Active work statuses (submitted, under_review, resubmit, officer_draft)
            const status = String(item.status || item.applicationStatus || '').toLowerCase()
            const activeWorkStatuses = new Set(['submitted', 'under_review', 'resubmit', 'officer_draft'])
            if (activeWorkStatuses.has(status)) return true
            // Waiting for user action (returned, appeal_pending)
            const waitingStatuses = new Set(['returned', 'appeal_pending'])
            if (waitingStatuses.has(status)) return true
            return false
          } else if (activeFilters.secondaryFilter === 'unclaimed') {
            if (isClaimed) return false
          } else if (activeFilters.secondaryFilter === 'claimed_by_me') {
            if (!isClaimed || String(reviewerId) !== String(currentUser?.id || currentUser?._id)) return false
          } else if (activeFilters.secondaryFilter === 'claimed_by_others') {
            if (!isClaimed || String(reviewerId) === String(currentUser?.id || currentUser?._id)) return false
          }
        }
        // If itemType is application, filter by application status
        else if (activeFilters.itemType === 'application') {
          const status = item.status || item.applicationStatus
          if (status !== activeFilters.secondaryFilter) return false
        }
        // If itemType is help_request, filter by help request status
        else if (activeFilters.itemType === 'help_request') {
          const status = item.status
          if (status !== activeFilters.secondaryFilter) return false
        }
      }

      return true
    })

    // Sort by priority score (descending) - high priority items first
    return filtered.sort((a, b) => {
      const scoreA = calculatePriorityScore({ _itemType: a._itemType, _requests: { application: a } })
      const scoreB = calculatePriorityScore({ _itemType: b._itemType, _requests: { application: b } })
      return scoreB - scoreA
    })
  }, [officerData.toReview, activeFilters, currentUser?.id, currentUser?._id])

  const renderCard = (item, currentSelectedId, onSelect) => {
    // Render individual item cards (application or help request) - matching bookmarks page
    if (item._itemType === 'application') {
      const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG[item.applicationStatus] || { color: 'default', label: item.status || item.applicationStatus }
      const permitType = item.formType === 'general_permit' ? (item.formData?.generalPermitCategory || 'General') : 'Regular'
      const date = item.createdAt || item.updatedAt ? dayjs(item.createdAt || item.updatedAt).format('MMMM D, YYYY') : null
      const stale = isStale(item)
      const staleDuration = getStaleDuration(item)

      const emailStatusTag = getEmailStatusTag(item.emailSendStatus)

      const tags = [
        { label: 'Application', color: 'blue' },
        { label: statusConf.label, color: statusConf.color },
      ]
      if (emailStatusTag) {
        tags.push(emailStatusTag)
      }
      if (stale && staleDuration) {
        tags.push({ label: `Stale for ${staleDuration}`, color: 'warning' })
      }
      if (permitType) {
        tags.push({ label: permitType, color: 'default' })
      }
      if (item.applicationReferenceNumber) {
        tags.push({ label: item.applicationReferenceNumber, color: 'default' })
      }

      return (
        <PanelCard
          key={item._id || item.applicationId}
          item={item}
          selected={currentSelectedId === (item._id || item.applicationId)}
          onClick={() => onSelect(item)}
          title={item.businessName || item.formData?.businessName || item._businessName || 'Unnamed Business'}
          description=''
          metaInfo={[
            ...(date ? [{ label: 'Last updated', value: date }] : []),
            ...(item.reviewedByName ? [{ label: 'Claimed by', value: item.reviewedByName }] : []),
          ]}
          tags={tags}
        />
      )
    }

    if (item._itemType === 'help_request') {
      const statusConf = HELP_REQUEST_STATUS_CONFIG[item.status] || { color: 'default', label: item.status }
      const date = item.createdAt ? dayjs(item.createdAt).format('MMMM D, YYYY') : null
      const stale = isStale(item)
      const staleDuration = getStaleDuration(item)

      const tags = [
        { label: 'Help Request', color: 'gold' },
        { label: statusConf.label, color: statusConf.color },
      ]
      if (stale && staleDuration) {
        tags.push({ label: `Stale for ${staleDuration}`, color: 'warning' })
      }

      return (
        <PanelCard
          key={item._id || item.requestId}
          item={item}
          selected={currentSelectedId === (item._id || item.requestId)}
          onClick={() => onSelect(item)}
          title={item.subject || 'No Subject'}
          description={item.message || ''}
          metaInfo={[
            ...(date ? [{ label: 'Created', value: date }] : []),
            ...(item.claimedByName ? [{ label: 'Claimed by', value: item.claimedByName }] : []),
          ]}
          tags={tags}
        />
      )
    }

    return null
  }

  const renderDetailPanel = (item) => {
    // Route to appropriate detail panel based on _itemType
    if (item._itemType === 'application') {
      return <ApplicationDetailPanel application={item} onClose={handleDrawerClose} />
    }
    if (item._itemType === 'help_request') {
      return <HelpRequestDetailPanel helpRequest={item} onClose={handleDrawerClose} />
    }
    return null
  }

  // Dynamic filter config based on item type
  const filterConfig = useMemo(() => {
    const config = [
      {
        key: 'itemType',
        label: 'Item Type',
        type: 'select',
        options: [
          { label: 'All', value: null },
          { label: 'Applications', value: 'application' },
          { label: 'Help Requests', value: 'help_request' },
        ],
        value: activeFilters.itemType === 'all' ? null : activeFilters.itemType,
      },
    ]

    // Add second filter based on item type
    if (!activeFilters.itemType) {
      // All selected - show claim status filter
      config.push({
        key: 'secondaryFilter',
        label: 'Claim Status',
        type: 'select',
        options: CLAIM_STATUS_FILTER_OPTIONS,
        value: activeFilters.secondaryFilter === 'all' ? null : activeFilters.secondaryFilter,
      })
    } else if (activeFilters.itemType === 'application') {
      // Applications selected - show application status filter
      config.push({
        key: 'secondaryFilter',
        label: 'Application Status',
        type: 'select',
        options: STATUS_FILTER_OPTIONS,
        value: activeFilters.secondaryFilter === 'all' ? null : activeFilters.secondaryFilter,
      })
    } else if (activeFilters.itemType === 'help_request') {
      // Help Requests selected - show help request status filter
      config.push({
        key: 'secondaryFilter',
        label: 'Help Request Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' },
        ],
        value: activeFilters.secondaryFilter === 'all' ? null : activeFilters.secondaryFilter,
      })
    }

    return config
  }, [activeFilters.itemType, activeFilters.secondaryFilter])

  // Handle filter change - reset secondaryFilter when itemType changes
  const handleFilterChange = useCallback((key, value) => {
    setActiveFilters(prev => {
      if (key === 'itemType') {
        // Reset secondaryFilter when itemType changes
        return { ...prev, [key]: value === null ? 'all' : value, secondaryFilter: 'all' }
      }
      return { ...prev, [key]: value === null ? 'all' : value }
    })
  }, [])

  return (
    <SplitLayout
      listContent={
        <ListPanel
          items={filteredToReview}
          isLoading={officerData?.loadingMap?.toReview}
          filterConfig={filterConfig}
          onFilterChange={handleFilterChange}
          onClearFilters={() => setActiveFilters({ itemType: null, secondaryFilter: 'all' })}
          renderCard={renderCard}
          onSelectItem={handleSelectBusiness}
          selectedId={selectedItem?._id || selectedItem?.businessId}
          onRefresh={officerData.refresh}
          showRefresh={true}
          customFilter={true}
          showStaleInfo={true}
        />
      }
      detailContent={selectedItem ? renderDetailPanel(selectedItem) : null}
      onDrawerClose={handleDrawerClose}
    />
  )
}
