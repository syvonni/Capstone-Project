import { useState, useCallback, useMemo, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import BusinessOwnerDetailPanel from './components/BusinessOwnerDetailPanel'
import BusinessOwnerRegisterModal from './components/modals/BusinessOwnerRegisterModal'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import dayjs from 'dayjs'
import BusinessOwnerService from '@/features/staffs/lgu-officer/services/businessOwnerService'
import BookmarkService from '@/features/staffs/lgu-officer/services/bookmarkService'

const OWNER_STATUS_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Pending Deletion', value: 'pending_deletion' },
]

export default function OfficerBusinessOwners() {
  const [selectedItem, setSelectedItem] = useState(null)
  const [activeFilters, setActiveFilters] = useState({ status: 'all', search: '' })
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [businessOwners, setBusinessOwners] = useState([])
  const [loading, setLoading] = useState(false)
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })

  const businessOwnerService = useMemo(() => new BusinessOwnerService(), [])
  const bookmarkService = useMemo(() => new BookmarkService(), [])

  // Check bookmark status for all business owners
  const refreshBookmarkStatus = useCallback(async () => {
    const bookmarkStatus = new Set()

    await Promise.all(
      businessOwners.map(async (owner) => {
        const ownerId = owner._id || owner.id
        try {
          const check = await bookmarkService.checkBookmark('business-owner', ownerId)
          if (check.isBookmarked) {
            bookmarkStatus.add(ownerId)
          }
        } catch {
          // Ignore errors, treat as not bookmarked
        }
      })
    )

    setBookmarkedIds(bookmarkStatus)
  }, [businessOwners, bookmarkService])

  useEffect(() => {
    refreshBookmarkStatus()
  }, [refreshBookmarkStatus])

  // Fetch business owners
  const fetchBusinessOwners = useCallback(async () => {
    try {
      setLoading(true)
      const searchParams = {
        page: pagination.page,
        limit: pagination.limit,
      }
      if (activeFilters.status !== 'all') {
        searchParams.status = activeFilters.status
      }
      if (activeFilters.search) {
        searchParams.search = activeFilters.search
      }
      
      const response = await businessOwnerService.getBusinessOwners({}, searchParams)
      const owners = response || []
      const total = response.total || 0

      // Fetch application counts for each owner from business-service
      const ownersWithCounts = await Promise.all(
        owners.map(async (owner) => {
          try {
            const appsResponse = await businessOwnerService.getBusinessOwnerApplications(owner._id || owner.id)
            const applications = appsResponse.applications || []
            const nonDraftApps = applications.filter(app => {
              const status = app.status || app.applicationStatus
              return status !== 'draft'
            })
            return {
              ...owner,
              applicationCount: nonDraftApps.length,
            }
          } catch {
            return {
              ...owner,
              applicationCount: 0,
            }
          }
        })
      )

      setBusinessOwners(ownersWithCounts)
      setPagination(prev => ({ ...prev, total }))
    } catch (err) {
      console.error('Failed to fetch business owners:', err)
      setBusinessOwners([])
    } finally {
      setLoading(false)
    }
  }, [businessOwnerService, activeFilters.status, activeFilters.search, pagination.page, pagination.limit])

  useEffect(() => {
    fetchBusinessOwners()
  }, [fetchBusinessOwners])

  const getItemId = useCallback((item) => {
    return item._id || item.userId || item.id
  }, [])

  const handleSelectBusinessOwner = useCallback((owner) => {
    setSelectedItem({ ...owner, _itemType: 'business-owners', _itemId: getItemId(owner) })
  }, [getItemId])

  const handleDrawerClose = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const handleOwnerSelectFromModal = useCallback((owner) => {
    setSelectedItem({ ...owner, _itemType: 'business-owners', _itemId: getItemId(owner) })
  }, [getItemId])

  const filteredList = useMemo(() => {
    const list = [...businessOwners]

    const filtered = list.filter(owner => {
      // Status filter
      if (activeFilters.status && activeFilters.status !== 'all') {
        if (activeFilters.status === 'active' && (!owner.isActive || owner.deletionPending)) return false
        if (activeFilters.status === 'inactive' && owner.isActive) return false
        if (activeFilters.status === 'pending_deletion' && !owner.deletionPending) return false
      }

      return true
    })

    return filtered.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime()
      const db = new Date(b.createdAt || 0).getTime()
      return db - da
    })
  }, [businessOwners, activeFilters])

  const renderCard = (owner, currentSelectedId, onSelect) => {
    const ownerId = getItemId(owner)
    const createdDate = owner.createdAt ? dayjs(owner.createdAt).format('MMMM D, YYYY') : null
    const lastLoginDate = owner.lastLoginAt ? dayjs(owner.lastLoginAt).format('MMMM D, YYYY') : null

    // Construct full name from individual fields
    const fullName = [owner.firstName, owner.middleName, owner.lastName, owner.suffix]
      .filter(Boolean)
      .join(' ')

    // Determine account status for primary tag
    let statusLabel = owner.accountStatus || 'pending_setup'
    let statusColor = 'default'
    switch (statusLabel) {
      case 'active':
        statusLabel = 'Active'
        statusColor = 'green'
        break
      case 'pending_setup':
        statusLabel = 'Pending Setup'
        statusColor = 'orange'
        break
      case 'suspended':
        statusLabel = 'Suspended'
        statusColor = 'red'
        break
      case 'locked':
        statusLabel = 'Locked'
        statusColor = 'red'
        break
      default:
        statusLabel = 'Unknown'
        statusColor = 'default'
    }
    if (owner.deletionPending) {
      statusLabel = 'Pending Deletion'
      statusColor = 'orange'
    }

    const tags = [
      { label: statusLabel, color: statusColor },
    ]
    if (owner.email) {
      tags.push({ label: owner.email.toLowerCase(), color: 'default', textTransform: 'none' })
    }
    if (owner.businessCount !== undefined) {
      tags.push({ label: `${owner.businessCount} business${owner.businessCount !== 1 ? 'es' : ''}`, color: 'default' })
    }
    const applicationCount = owner.applicationCount || 0
    tags.push({ label: `${applicationCount} application${applicationCount !== 1 ? 's' : ''}`, color: 'default' })

    const metaInfo = []
    if (createdDate) {
      metaInfo.push({ label: 'Registered on', value: createdDate })
    }
    if (lastLoginDate) {
      metaInfo.push({ label: 'Last logged in', value: lastLoginDate })
    }

    return (
      <PanelCard
        key={ownerId}
        item={owner}
        selected={currentSelectedId === ownerId}
        onClick={() => onSelect(owner)}
        title={fullName || owner.fullName || owner.name || 'Unnamed Owner'}
        description=""
        metaInfo={metaInfo}
        tags={tags}
        isBookmarked={bookmarkedIds.has(ownerId)}
      />
    )
  }

  const listContent = (
    <ListPanel
      items={filteredList}
      isLoading={loading}
      selectedId={selectedItem?._itemId}
      onSelectItem={handleSelectBusinessOwner}
      renderCard={renderCard}
      searchPlaceholder="Search business owners..."
      searchValue={activeFilters.search}
      onSearchChange={(value) => {
        setActiveFilters(prev => ({ ...prev, search: value }))
        setPagination(prev => ({ ...prev, page: 1 }))
      }}
      filterConfig={[
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: OWNER_STATUS_FILTER_OPTIONS,
          value: activeFilters.status === 'all' ? null : activeFilters.status,
        },
      ]}
      onFilterChange={(key, value) => {
        setActiveFilters(prev => ({ ...prev, [key]: value === null ? 'all' : value }))
        setPagination(prev => ({ ...prev, page: 1 }))
      }}
      onClearFilters={() => {
        setActiveFilters({ status: 'all', search: '' })
        setPagination(prev => ({ ...prev, page: 1 }))
      }}
      onRefresh={fetchBusinessOwners}
      showRefresh={true}
      customFilter={true}
      pagination={{
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
        onChange: (page) => setPagination(prev => ({ ...prev, page })),
      }}
      primaryButton={{
        label: 'Register',
        icon: <PlusOutlined />,
        onClick: () => setRegisterModalOpen(true),
      }}
    />
  )

  const detailContent = selectedItem ? (
    <BusinessOwnerDetailPanel
      businessOwner={selectedItem}
      onReviewComplete={() => {}}
    />
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle="Business Owner details"
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItem}
        mobileDrawerPlacement="bottom"
      />
      <BusinessOwnerRegisterModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onOwnerSelect={handleOwnerSelectFromModal}
      />
    </>
  )
}
