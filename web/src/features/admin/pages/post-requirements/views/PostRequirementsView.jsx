/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { Empty, Grid } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

import PostRequirementDetailPanel from '../components/PostRequirementDetailPanel'
import PostRequirementCard from '../components/PostRequirementCard'
import AddPostRequirementModal from '../components/modals/AddPostRequirementModal'
import PostRequirementsStatsPanel from '../components/PostRequirementsStatsPanel'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { filterItemsBySearch, filterItemsByStatus } from '../utils/postRequirements.utils'
import { usePostRequirements } from '../hooks/usePostRequirements'
import { usePostRequirementsFilters } from '../hooks/usePostRequirementsFilters'
import { STATUS_OPTIONS } from '../constants/postRequirements.constants'

export default function PostRequirementsView() {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [showStats, setShowStats] = useState(!isMobile)
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync showStats with breakpoint and selectedId state
  // Stats should be enabled on desktop only when no item is selected
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    const newShowStats = !isMobile && !itemIdFromUrl
    // Only update if value actually changes to prevent infinite loop
    setShowStats(prev => {
      if (prev !== newShowStats) {
        return newShowStats
      }
      return prev
    })
  }, [isMobile, searchParams])

  const {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    refresh,
    loading,
  } = usePostRequirements()

  // Handle URL query param for direct item selection
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    if (itemIdFromUrl) {
      setSelectedItemId(itemIdFromUrl)
    }
  }, [searchParams, setSelectedItemId])

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    clearFilters,
  } = usePostRequirementsFilters()

  const handleAddClick = () => {
    setAddModalOpen(true)
  }

  const handleAddModalClose = () => {
    setAddModalOpen(false)
  }

  const handleAddModalSuccess = () => {
    refresh()
  }

  const handleStatsToggle = () => {
    setShowStats(prev => {
      const newValue = !prev
      if (newValue && selectedItemId) {
        setSelectedItemId(null)
        setSearchParams({})
      }
      return newValue
    })
  }

  const filteredItems = useMemo(() => {
    let result = items
    result = filterItemsBySearch(result, searchTerm)
    result = filterItemsByStatus(result, statusFilter)
    return result
  }, [items, searchTerm, statusFilter])

  const handleDrawerClose = () => {
    // If closing drawer and no item was selected (viewing stats), disable stats
    if (!selectedItemId) {
      setShowStats(false)
    }
    setSelectedItemId(null)
    setSearchParams({})
  }

  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
    setShowStats(false)
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    return (
      <PostRequirementCard
        item={item}
        selected={currentSelectedId === item._id}
        onClick={() => onSelect(item)}
      />
    )
  }

  const listContent = (
    <ListPanel
      items={filteredItems}
      isLoading={loading}
      selectedId={selectedItemId}
      onSelectItem={handleSelectItem}
      renderCard={renderCard}
      filterConfig={[
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS,
          value: statusFilter === '' ? null : statusFilter,
        },
      ]}
      onFilterChange={(key, value) => {
        if (key === 'status') setStatusFilter(value === null ? '' : value)
      }}
      onClearFilters={clearFilters}
      customFilter={true}
      showRefresh={true}
      onRefresh={refresh}
      search={searchTerm}
      onSearchChange={setSearchTerm}
      showStaleInfo={false}
      searchOnEnter={true}
      enableStats={true}
      statsActive={showStats}
      onStatsToggle={handleStatsToggle}
      primaryButton={{
        label: 'Add Post Requirement',
        icon: <PlusOutlined />,
        onClick: handleAddClick,
      }}
    />
  )

  const detailContent = selectedItemId ? (
    <PostRequirementDetailPanel
      postRequirementId={selectedItemId}
      postRequirement={selectedItemId === 'new' ? null : selectedItem}
      onSave={refresh}
    />
  ) : showStats ? (
    <PostRequirementsStatsPanel />
  ) : isMobile ? null : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Empty description="Select a post requirement to view details" />
    </div>
  )

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle={showStats ? 'Post Requirements Overview' : 'Post-Requirement Detail'}
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId || showStats}
        mobileDrawerPlacement="bottom"
      />
      <AddPostRequirementModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddModalSuccess}
      />
    </>
  )
}
